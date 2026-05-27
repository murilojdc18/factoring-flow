import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseEnabled } from "@/lib/dataSource";
import {
  EstadoCobranca,
  EventoCobranca,
  StatusCobranca,
  cobrancasStore,
} from "@/data/mockCobrancas";
import {
  eventoToRow,
  rowToEvento,
  type CobrancaContext,
} from "@/lib/mappers/cobranca";
import { resolverOperacaoDoTitulo } from "@/lib/operacaoLookup";

const QUERY_KEY = ["cobrancas_historico"] as const;

/**
 * Hook de cobranças — eventos de contato + estado derivado por título (2.8.3).
 * Substitui o `useCobrancas`/`cobrancasStore` em memória como fonte para a UI
 * (a página /cobranças migra na 2.8.4). Espelha o padrão de `useRecompras` (2.6).
 *
 * O QUE FAZ: leitura da lista de eventos, `registrarEvento(input, ctx?)` (grava
 * um contato) e a leitura derivada `estado(tituloId)`.
 *
 * REATIVIDADE entre telas:
 * - Modo mock: `cobrancasStore` (pub/sub em memória) — subscribe re-renderiza.
 * - Modo Supabase: TanStack Query na QUERY_KEY; a mutation invalida a query,
 *   então toda tela que usa o hook re-busca.
 *
 * O QUE NÃO FAZ: DELETE físico (sem cancelamento de evento — histórico é
 * append-only; a policy de DELETE existe só pro admin, fora do app). Também não
 * grava status "solto": com a derivação (D2), "Marcar como" vira evento rápido
 * na página (§6 do plano).
 *
 * ESTADO DERIVADO (D2 — decisão: evento-only no hook): `estado(tituloId)` é o
 * estado do ÚLTIMO evento daquele título — papel do "override" que o store
 * mantinha. Cobre o nível 3 da precedência (categoria do resultado → status). Os
 * níveis 1/2/4 (título Liquidado/Recomprado e vencimento) precisam do `Titulo`,
 * que o hook não enxerga — entram no `estadoEfetivo`/`deriveEstado` da página na
 * 2.8.4. Fonte única = a própria lista de eventos, idêntico nos 2 modos.
 *
 * CONSUMIDORES: controlados pela flag `cobrancas` em `dataSource.ts` (vira `true`
 * na 2.8.5). Enquanto `false`, o hook serve o `cobrancasStore` (mock).
 *
 * RESPONSAVEL (decisão 2.8.3): resolvido de `profiles.nome_completo` pelo user.id
 * logado (fallback e-mail). `created_by` (uuid) é sempre gravado como âncora de
 * auditoria. BACK-LINK (D5): `operacao_id` herda a operação mais recente do
 * título via `operacaoLookup`, defensivo (null se não resolver).
 */

/**
 * Traduz erros do Postgres/Supabase ao gravar eventos de cobrança para mensagens
 * amigáveis. 23502 = not_null_violation; 23503 = foreign_key_violation (título ou
 * operação removido); 23505 = unique_violation. Sempre retorna uma instância de
 * Error para o toast da página exibir `.message`.
 */
function traduzirErroCobranca(error: { code?: string; message: string }): Error {
  switch (error.code) {
    case "23502":
      return new Error("Algum dado obrigatório está faltando.");
    case "23503":
      return new Error("Título ou operação referenciado não existe mais.");
    case "23505":
      return new Error("Já existe um registro com este identificador.");
    default:
      return error instanceof Error ? error : new Error(error.message);
  }
}

/** Mapeia a categoria do resultado (último evento) para um status de cobrança. */
function statusDoResultado(resultado: string): StatusCobranca {
  switch (resultado) {
    case "Promessa de pagamento":
      return "Promessa de pagamento";
    case "Negociado":
      return "Em negociação";
    case "Pagamento confirmado":
      return "Liquidado";
    default:
      // Recusado / Sem retorno / Outro / texto livre antigo → contato em curso.
      return "Em cobrança";
  }
}

/**
 * Estado do último evento de um título (nível 3 da precedência). Filtra pelo
 * título, ordena por `dataHora desc` com desempate por `id desc`, e devolve o
 * primeiro. `undefined` se o título não tem eventos. Fonte única = a lista.
 */
function estadoDoUltimoEvento(
  eventos: EventoCobranca[],
  tituloId: string,
): EstadoCobranca | undefined {
  const ultimo = eventos
    .filter((e) => e.tituloId === tituloId)
    .sort(
      (a, b) =>
        b.dataHora.localeCompare(a.dataHora) || b.id.localeCompare(a.id),
    )[0];
  if (!ultimo) return undefined;
  return {
    status: statusDoResultado(ultimo.resultado),
    ultimaAcao: `${ultimo.tipoContato} — ${ultimo.resultado}`,
    proximaAcao: ultimo.proximaAcao || "—",
    proximaAcaoData: ultimo.proximaAcaoData || "",
  };
}

export function useCobrancas() {
  const enabled = isSupabaseEnabled("cobrancas");
  const queryClient = useQueryClient();

  // Reatividade no modo mock: espelha o pub/sub do cobrancasStore.
  const [mockEventos, setMockEventos] = useState<EventoCobranca[]>(
    cobrancasStore.getEventos(),
  );
  useEffect(
    () =>
      cobrancasStore.subscribe(() =>
        setMockEventos(cobrancasStore.getEventos()),
      ),
    [],
  );

  const query = useQuery({
    queryKey: QUERY_KEY,
    enabled,
    queryFn: async (): Promise<EventoCobranca[]> => {
      const { data, error } = await supabase
        .from("cobrancas_historico")
        .select("*")
        .order("data_contato", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToEvento);
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({
      input,
      ctx,
    }: {
      input: Partial<EventoCobranca>;
      ctx: CobrancaContext;
    }): Promise<void> => {
      // Back-link (D5): evento sem operação herda a operação mais recente do
      // título. Defensivo: se a resolução falhar, segue com operacao_id null.
      let ctxEfetivo = ctx;
      if (!ctx.operacaoId && input.tituloId) {
        try {
          const operacao = await resolverOperacaoDoTitulo(input.tituloId);
          if (operacao) ctxEfetivo = { ...ctx, operacaoId: operacao.operacaoId };
        } catch (erro) {
          console.warn(
            "[useCobrancas] back-link da operação falhou; gravando operacao_id null",
            erro,
          );
        }
      }

      // Auditoria: created_by (uuid) sempre; responsavel (texto) de
      // profiles.nome_completo, com fallback pro e-mail (decisão 2.8.3).
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      let responsavel = "";
      if (uid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("nome_completo, email")
          .eq("id", uid)
          .maybeSingle();
        responsavel =
          profile?.nome_completo || profile?.email || userData.user?.email || "";
      }

      const { error } = await supabase
        .from("cobrancas_historico")
        .insert([
          {
            ...eventoToRow({ ...input, usuario: responsavel }, ctxEfetivo),
            created_by: uid,
          },
        ])
        .select("*")
        .single();
      if (error) throw traduzirErroCobranca(error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  // Lista unificada + leitura derivada (idêntica nos 2 modos).
  const eventos = enabled ? query.data ?? [] : mockEventos;
  const estado = (tituloId: string): EstadoCobranca | undefined =>
    estadoDoUltimoEvento(eventos, tituloId);

  if (!enabled) {
    return {
      eventos,
      isLoading: false,
      error: null as unknown,
      source: "mock" as const,
      // ctx é ignorado no mock: a store em memória não guarda operacao_id.
      registrarEvento: async (
        input: Partial<EventoCobranca>,
        _ctx?: CobrancaContext,
      ): Promise<void> => {
        cobrancasStore.registrarEvento({
          tituloId: input.tituloId ?? "",
          tituloNumero: input.tituloNumero ?? "",
          cedenteNome: input.cedenteNome ?? "",
          sacadoNome: input.sacadoNome ?? "",
          dataHora: input.dataHora ?? new Date().toISOString(),
          usuario: input.usuario ?? "Usuário atual",
          tipoContato: input.tipoContato ?? "Outro",
          resultado: input.resultado ?? "Outro",
          proximaAcao: input.proximaAcao ?? "",
          proximaAcaoData: input.proximaAcaoData ?? "",
          observacoes: input.observacoes ?? "",
        });
      },
      estado,
    };
  }

  return {
    eventos,
    isLoading: query.isLoading,
    error: query.error ?? null,
    source: "supabase" as const,
    registrarEvento: async (
      input: Partial<EventoCobranca>,
      ctx: CobrancaContext = {},
    ): Promise<void> => {
      await createMutation.mutateAsync({ input, ctx });
    },
    estado,
  };
}
