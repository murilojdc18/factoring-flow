import { useEffect, useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseEnabled } from "@/lib/dataSource";
import { mockTitulos, type Titulo } from "@/data/mockTitulos";
import { rowToTitulo, tituloToRow, type NameLookup } from "@/lib/mappers/titulo";
import { useClientes } from "@/hooks/useClientes";
import { useSacados } from "@/hooks/useSacados";

const QUERY_KEY = ["titulos"] as const;

/**
 * Traduz erros do Postgres/Supabase para mensagens amigáveis ao usuário.
 * 23503 = foreign_key_violation: o cedente ou sacado escolhido não existe mais.
 * As FKs cedente_id/sacado_id são ON DELETE RESTRICT, então isso ocorre quando
 * a parte foi removida entre o carregamento das listas e o envio do formulário.
 * 23514 = check_violation: algum valor fere uma restrição da tabela. Sempre
 * retorna uma instância de Error para o toast da página exibir a mensagem.
 */
function traduzirErroTitulo(error: { code?: string; message: string }): Error {
  if (error.code === "23503") {
    return new Error(
      "O cedente ou sacado selecionado não existe mais. Atualize a página e selecione novamente.",
    );
  }
  if (error.code === "23514") {
    return new Error(
      "Algum dado do título é inválido (verifique tipo, status e valor de face).",
    );
  }
  return error instanceof Error ? error : new Error(error.message);
}

/**
 * Hook unificado para CRUD de títulos.
 * - Modo mock: estado local (mesma semântica anterior).
 * - Modo Supabase: TanStack Query + supabase.from("titulos"). Os nomes de
 *   cedente/sacado são resolvidos por lookup contra useClientes/useSacados.
 *
 * ATENÇÃO: a flag `titulos` em dataSource.ts controla SOMENTE os consumidores
 * que passam por este hook — hoje a página Titulos (lista + TituloForm).
 * Cobrancas, OperacaoDetalhes, OperacaoSimulador, Relatorios e preencherDocumento
 * ainda leem `mockTitulos` direto e NÃO são afetados pela flag; cada um migra
 * quando suas entidades (operacoes/cobrancas/relatorios/documentos) forem
 * ligadas. Decisão consciente da sub-tarefa 2.3 (espelha a 2.2).
 */
export function useTitulos() {
  const enabled = isSupabaseEnabled("titulos");
  const queryClient = useQueryClient();
  const [mockState, setMockState] = useState<Titulo[]>(mockTitulos);

  // Para resolver nomes de cedente/sacado quando lendo do Supabase.
  const { clientes } = useClientes();
  const { sacados } = useSacados();

  const lookup: NameLookup = useMemo(
    () => ({
      clientes: new Map(clientes.map((c) => [c.id, c.razaoSocial])),
      sacados: new Map(sacados.map((s) => [s.id, s.nome])),
    }),
    [clientes, sacados],
  );

  const query = useQuery({
    queryKey: [...QUERY_KEY, clientes.length, sacados.length],
    enabled,
    queryFn: async (): Promise<Titulo[]> => {
      const { data, error } = await supabase
        .from("titulos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => rowToTitulo(r, lookup));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: Partial<Titulo>): Promise<Titulo> => {
      // Registra quem cadastrou (auditoria). created_by é nullable; sem sessão,
      // segue como null em vez de bloquear o insert.
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("titulos")
        .insert([{ ...tituloToRow(input), created_by: userData.user?.id ?? null }])
        .select("*")
        .single();
      if (error) throw traduzirErroTitulo(error);
      return rowToTitulo(data, lookup);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Titulo>;
    }): Promise<Titulo> => {
      const { data, error } = await supabase
        .from("titulos")
        .update(tituloToRow(patch))
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw traduzirErroTitulo(error);
      return rowToTitulo(data, lookup);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  useEffect(() => {
    if (enabled && query.data) setMockState(query.data);
  }, [enabled, query.data]);

  if (!enabled) {
    return {
      titulos: mockState,
      isLoading: false,
      error: null as unknown,
      source: "mock" as const,
      create: async (input: Partial<Titulo>) => {
        const novo: Titulo = {
          id: `TIT-${10300 + mockState.length}`,
          numero: "",
          tipo: "Duplicata",
          cedenteId: "",
          cedenteNome: "",
          sacadoId: "",
          sacadoNome: "",
          dataEmissao: new Date().toISOString().slice(0, 10),
          dataVencimento: new Date().toISOString().slice(0, 10),
          valorFace: 0,
          numeroNotaFiscal: "",
          chaveNotaFiscal: "",
          descricao: "",
          status: "Disponível",
          observacoes: "",
          anexos: [],
          criadoEm: new Date().toISOString().slice(0, 10),
          ...input,
        };
        setMockState((prev) => [novo, ...prev]);
        return novo;
      },
      update: async (id: string, patch: Partial<Titulo>) => {
        let updated: Titulo | null = null;
        setMockState((prev) =>
          prev.map((t) => {
            if (t.id !== id) return t;
            updated = { ...t, ...patch };
            return updated;
          }),
        );
        return updated as unknown as Titulo;
      },
    };
  }

  return {
    titulos: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ?? null,
    source: "supabase" as const,
    create: async (input: Partial<Titulo>) =>
      createMutation.mutateAsync(input),
    update: async (id: string, patch: Partial<Titulo>) =>
      updateMutation.mutateAsync({ id, patch }),
  };
}