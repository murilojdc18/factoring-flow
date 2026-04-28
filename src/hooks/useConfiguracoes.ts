import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseEnabled } from "@/lib/dataSource";

/**
 * Parâmetros financeiros globais do sistema.
 * Mesmo shape consumido por `src/pages/Configuracoes.tsx` no modo mock.
 */
export interface ParametrosFinanceiros {
  taxaFatorMensal: number;
  tarifaFixa: number;
  tarifaPorTitulo: number;
  percentualRetencao: number;
  prazoMaximoDias: number;
  limiteClientePadrao: number;
  limiteSacadoPadrao: number;
  diasToleranciaAtraso: number;
  observacaoPadrao: string;
  moeda: string;
}

export const PARAMETROS_DEFAULT: ParametrosFinanceiros = {
  taxaFatorMensal: 3.5,
  tarifaFixa: 150,
  tarifaPorTitulo: 25,
  percentualRetencao: 5,
  prazoMaximoDias: 90,
  limiteClientePadrao: 250000,
  limiteSacadoPadrao: 100000,
  diasToleranciaAtraso: 3,
  observacaoPadrao:
    "Operação sujeita à análise de crédito e revisão jurídica. Valores estimados.",
  moeda: "BRL",
};

const CHAVE = "parametros_financeiros";
const QUERY_KEY = ["configuracoes_financeiras", CHAVE] as const;

function parseValor(valor: unknown): ParametrosFinanceiros {
  if (!valor || typeof valor !== "object") return PARAMETROS_DEFAULT;
  return { ...PARAMETROS_DEFAULT, ...(valor as Partial<ParametrosFinanceiros>) };
}

/**
 * Hook reativo dos parâmetros financeiros.
 * - Se a flag `USE_SUPABASE.configuracoes` estiver desligada, retorna o
 *   default estático (modo mock) com `save` em memória.
 * - Se ligada, lê/escreve de `configuracoes_financeiras` (chave única).
 */
export function useConfiguracoes() {
  const enabled = isSupabaseEnabled("configuracoes");
  const queryClient = useQueryClient();

  // Modo mock — estado local, mesmo comportamento da implementação anterior.
  const [mockState, setMockState] = useState<ParametrosFinanceiros>(
    PARAMETROS_DEFAULT,
  );

  const query = useQuery({
    queryKey: QUERY_KEY,
    enabled,
    queryFn: async (): Promise<ParametrosFinanceiros> => {
      const { data, error } = await supabase
        .from("configuracoes_financeiras")
        .select("valor")
        .eq("chave", CHAVE)
        .maybeSingle();
      if (error) throw error;
      return parseValor(data?.valor);
    },
  });

  const mutation = useMutation({
    mutationFn: async (params: ParametrosFinanceiros) => {
      const { error } = await supabase
        .from("configuracoes_financeiras")
        .upsert(
          [{
            chave: CHAVE,
            valor: params as unknown as Record<string, unknown>,
            descricao: "Parâmetros financeiros globais do sistema",
          }],
          { onConflict: "chave" },
        );
      if (error) throw error;
      return params;
    },
    onSuccess: (params) => {
      queryClient.setQueryData(QUERY_KEY, params);
    },
  });

  // Sincroniza o mock local quando o Supabase carrega (caso flag ligue).
  useEffect(() => {
    if (enabled && query.data) setMockState(query.data);
  }, [enabled, query.data]);

  if (!enabled) {
    return {
      params: mockState,
      isLoading: false,
      isSaving: false,
      error: null as unknown,
      save: async (next: ParametrosFinanceiros) => {
        setMockState(next);
      },
      source: "mock" as const,
    };
  }

  return {
    params: query.data ?? PARAMETROS_DEFAULT,
    isLoading: query.isLoading,
    isSaving: mutation.isPending,
    error: query.error ?? mutation.error ?? null,
    save: async (next: ParametrosFinanceiros) => {
      await mutation.mutateAsync(next);
    },
    source: "supabase" as const,
  };
}