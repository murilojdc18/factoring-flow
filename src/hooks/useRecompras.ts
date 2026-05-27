import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseEnabled } from "@/lib/dataSource";
import {
  EstadoRecompraTitulo,
  SolicitacaoRecompra,
  StatusRecompra,
  recomprasStore,
  statusInicialPorAcao,
} from "@/data/mockRecompras";
import {
  recompraToRow,
  rowToRecompra,
  type RecompraContext,
} from "@/lib/mappers/recompra";

const QUERY_KEY = ["recompras"] as const;

/**
 * Traduz erros do Postgres/Supabase ao gravar recompras para mensagens
 * amigáveis. 23502 = not_null_violation; 23503 = foreign_key_violation (título,
 * operação ou cedente removido); 23505 = unique_violation. Sempre retorna uma
 * instância de Error para o toast da página exibir `.message`.
 */
function traduzirErroRecompra(error: {
  code?: string;
  message: string;
}): Error {
  switch (error.code) {
    case "23502":
      return new Error("Algum dado obrigatório está faltando.");
    case "23503":
      return new Error(
        "Título, operação ou cedente referenciado não existe mais.",
      );
    case "23505":
      return new Error("Já existe uma solicitação com este identificador.");
    default:
      return error instanceof Error ? error : new Error(error.message);
  }
}

/**
 * Estado de recompra mais recente de um título (R3 + D8). Deriva da própria
 * lista (fonte única): filtra pelo título, IGNORA as `Cancelado` (soft delete —
 * uma solicitação cancelada não trava o badge), ordena por `criadoEm desc` com
 * desempate por `id desc`, e devolve a primeira. `undefined` se não houver.
 */
function estadoDerivado(
  recompras: SolicitacaoRecompra[],
  tituloId: string,
): EstadoRecompraTitulo | undefined {
  const ultima = recompras
    .filter((r) => r.tituloId === tituloId && r.status !== "Cancelado")
    .sort(
      (a, b) =>
        b.criadoEm.localeCompare(a.criadoEm) || b.id.localeCompare(a.id),
    )[0];
  if (!ultima) return undefined;
  return {
    status: ultima.status,
    ultimaSolicitacaoId: ultima.id,
    atualizadoEm: ultima.resolvidoEm ?? ultima.criadoEm,
  };
}

/**
 * Back-link automático (2.7.1): resolve a operação mais recente que contém o
 * título, para preencher `operacao_id`/`operacao_numero` quando a recompra
 * nasce sem operação (ex.: criada em /cobranças). São duas leituras — o vínculo
 * em `operacao_titulos` (ordenado pelo `created_at` do vínculo, que acompanha a
 * criação da operação) e o `numero` em `operacoes` para o snapshot. Qualquer
 * falha/ausência devolve `null`: o create segue gravando `operacao_id` null
 * (defensivo — título nunca operado não bloqueia o registro).
 */
async function resolverOperacaoDoTitulo(
  tituloId: string,
): Promise<{ operacaoId: string; operacaoNumero: string } | null> {
  const { data: vinculo, error: vinculoErro } = await supabase
    .from("operacao_titulos")
    .select("operacao_id, created_at")
    .eq("titulo_id", tituloId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (vinculoErro || !vinculo) return null;

  const { data: operacao } = await supabase
    .from("operacoes")
    .select("numero")
    .eq("id", vinculo.operacao_id)
    .maybeSingle();

  return {
    operacaoId: vinculo.operacao_id,
    operacaoNumero: operacao?.numero ?? "",
  };
}

/**
 * Hook de recompras / substituições / análises internas (sub-tarefa 2.6.3).
 * Substitui o `useRecompras`/`recomprasStore` em memória como fonte para a UI
 * (RecompraDialog, OperacaoDetalhes, Cobrancas — ligados na 2.6.4/2.6.5).
 *
 * O que faz: leitura da lista, `create(input, ctx)` (registrar solicitação),
 * `updateStatus(id, status)` (mudar o status pelo dropdown) e duas leituras
 * derivadas — `porOperacao(operacaoId)` e `estado(tituloId)`.
 *
 * Reatividade entre telas (R2): um create/updateStatus em /operacoes precisa
 * refletir o badge em /cobranças e vice-versa.
 * - Modo mock: `recomprasStore` (pub/sub em memória) — subscribe re-renderiza.
 * - Modo Supabase: TanStack Query na mesma QUERY_KEY; as mutations invalidam a
 *   query, então toda tela que usa o hook re-busca.
 *
 * Estado derivado por título (R3 + D8): `estado(tituloId)` é a solicitação mais
 * recente daquele título IGNORANDO as `Cancelado`. Fonte única = a própria lista.
 *
 * Status inicial: o `create` calcula `statusInicialPorAcao(tipoAcao)` (igual o
 * store fazia); o mapper continua tradutor puro.
 *
 * O que NÃO faz: DELETE físico (D8 — cancelar = status `Cancelado`, que entra na
 * 2.6.5 junto com a expansão do tipo `StatusRecompra`). `valor` é proforma (D1)
 * → não é capturado aqui (mapper aplica default 0).
 */
export function useRecompras() {
  const enabled = isSupabaseEnabled("recompras");
  const queryClient = useQueryClient();

  // Reatividade no modo mock: espelha o pub/sub do recomprasStore.
  const [mockSolicitacoes, setMockSolicitacoes] = useState<
    SolicitacaoRecompra[]
  >(recomprasStore.getSolicitacoes());
  useEffect(
    () =>
      recomprasStore.subscribe(() =>
        setMockSolicitacoes(recomprasStore.getSolicitacoes()),
      ),
    [],
  );

  const query = useQuery({
    queryKey: QUERY_KEY,
    enabled,
    queryFn: async (): Promise<SolicitacaoRecompra[]> => {
      const { data, error } = await supabase
        .from("recompras")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToRecompra);
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({
      input,
      ctx,
    }: {
      input: Partial<SolicitacaoRecompra>;
      ctx: RecompraContext;
    }): Promise<SolicitacaoRecompra> => {
      // Back-link (2.7.1): recompra criada sem operação (ex.: /cobranças) herda
      // a operação mais recente do título, para o card da operação enxergá-la.
      // Defensivo: se a resolução falhar, segue com operacao_id null.
      let ctxEfetivo = ctx;
      let inputEfetivo = input;
      if (!ctx.operacaoId && input.tituloId) {
        try {
          const operacao = await resolverOperacaoDoTitulo(input.tituloId);
          if (operacao) {
            ctxEfetivo = { ...ctx, operacaoId: operacao.operacaoId };
            inputEfetivo = { ...input, operacaoNumero: operacao.operacaoNumero };
          }
        } catch (erro) {
          console.warn(
            "[useRecompras] back-link da operação falhou; gravando operacao_id null",
            erro,
          );
        }
      }

      // Registra quem solicitou (auditoria). created_by é nullable; sem sessão,
      // segue como null em vez de bloquear o insert.
      const { data: userData } = await supabase.auth.getUser();
      const status =
        inputEfetivo.status ??
        statusInicialPorAcao(inputEfetivo.tipoAcao ?? "Análise interna");
      const { data, error } = await supabase
        .from("recompras")
        .insert([
          {
            ...recompraToRow({ ...inputEfetivo, status }, ctxEfetivo),
            created_by: userData.user?.id ?? null,
          },
        ])
        .select("*")
        .single();
      if (error) throw traduzirErroRecompra(error);
      return rowToRecompra(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: StatusRecompra;
    }): Promise<void> => {
      // D7: ao resolver, grava resolvido_em (data de hoje); nos demais status,
      // só atualiza o status e preserva o resolvido_em existente.
      const patch =
        status === "Resolvido"
          ? { status, resolvido_em: new Date().toISOString().slice(0, 10) }
          : { status };
      const { error } = await supabase
        .from("recompras")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw traduzirErroRecompra(error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  // Lista unificada + leituras derivadas (idênticas nos 2 modos; R3).
  const recompras = enabled ? query.data ?? [] : mockSolicitacoes;
  const porOperacao = (operacaoId: string): SolicitacaoRecompra[] =>
    recompras.filter((r) => r.operacaoId === operacaoId);
  const estado = (tituloId: string): EstadoRecompraTitulo | undefined =>
    estadoDerivado(recompras, tituloId);

  if (!enabled) {
    return {
      recompras,
      isLoading: false,
      error: null as unknown,
      source: "mock" as const,
      // ctx é ignorado no mock: a store em memória não guarda cedenteId/valor.
      create: async (
        input: Partial<SolicitacaoRecompra>,
        _ctx: RecompraContext,
      ): Promise<SolicitacaoRecompra> =>
        recomprasStore.criar({
          tituloId: input.tituloId ?? "",
          tituloNumero: input.tituloNumero ?? "",
          cedenteNome: input.cedenteNome ?? "",
          sacadoNome: input.sacadoNome ?? "",
          operacaoId: input.operacaoId,
          operacaoNumero: input.operacaoNumero,
          tipoAcao: input.tipoAcao ?? "Análise interna",
          motivo: input.motivo ?? "",
          observacoes: input.observacoes ?? "",
          responsavel: input.responsavel ?? "",
        }),
      updateStatus: async (
        id: string,
        status: StatusRecompra,
      ): Promise<void> => {
        recomprasStore.atualizarStatus(id, status);
      },
      porOperacao,
      estado,
    };
  }

  return {
    recompras,
    isLoading: query.isLoading,
    error: query.error ?? null,
    source: "supabase" as const,
    create: async (
      input: Partial<SolicitacaoRecompra>,
      ctx: RecompraContext,
    ): Promise<SolicitacaoRecompra> =>
      createMutation.mutateAsync({ input, ctx }),
    updateStatus: async (id: string, status: StatusRecompra): Promise<void> => {
      await updateStatusMutation.mutateAsync({ id, status });
    },
    porOperacao,
    estado,
  };
}
