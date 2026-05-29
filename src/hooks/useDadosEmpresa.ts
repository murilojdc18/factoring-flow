import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { isSupabaseEnabled } from "@/lib/dataSource";

/**
 * Dados cadastrais da empresa de factoring (razão social, CNPJ, endereço).
 *
 * Separados dos parâmetros financeiros (decisão 3.4): dado cadastral != parâmetro
 * operacional. Persistidos na MESMA tabela key/value `configuracoes_financeiras`
 * (store genérico chave→valor jsonb, apesar do nome) sob a chave `dados_empresa`.
 * Espelha 1:1 o padrão de `useConfiguracoes` — sem mapper, o blob jsonb entra/sai
 * direto via `parseValor`.
 *
 * Consumidores: geração de documentos (montarPlaceholders, via GerarDocumentoDialog),
 * cabeçalho do PDF (exportarDocumentoPdf, via Contratos) e a seção "Dados da empresa"
 * em Configuracoes.tsx. Enquanto a flag `configuracoes` estiver `false`, serve o
 * default estático; quando ligar, lê/escreve o jsonb (sem migration).
 */
export interface DadosEmpresa {
  razaoSocial: string;
  cnpj: string;
  endereco: string;
  cidade: string;
}

export const DADOS_EMPRESA_DEFAULT: DadosEmpresa = {
  razaoSocial: "FactorPro Fomento Mercantil LTDA",
  cnpj: "00.123.456/0001-77",
  endereco: "Av. Paulista, 1000 — Bela Vista, São Paulo/SP, CEP 01310-100",
  cidade: "São Paulo",
};

const CHAVE = "dados_empresa";
const QUERY_KEY = ["configuracoes_dados_empresa", CHAVE] as const;

function parseValor(valor: unknown): DadosEmpresa {
  if (!valor || typeof valor !== "object") return DADOS_EMPRESA_DEFAULT;
  return { ...DADOS_EMPRESA_DEFAULT, ...(valor as Partial<DadosEmpresa>) };
}

/**
 * Hook reativo dos dados cadastrais da empresa.
 * - Flag `configuracoes` desligada: default estático (mock) com `save` em memória.
 * - Ligada: lê/escreve de `configuracoes_financeiras` na chave `dados_empresa`.
 */
export function useDadosEmpresa() {
  const enabled = isSupabaseEnabled("configuracoes");
  const queryClient = useQueryClient();

  // Modo mock — estado local, mesmo comportamento de useConfiguracoes.
  const [mockState, setMockState] = useState<DadosEmpresa>(DADOS_EMPRESA_DEFAULT);

  const query = useQuery({
    queryKey: QUERY_KEY,
    enabled,
    queryFn: async (): Promise<DadosEmpresa> => {
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
    mutationFn: async (dados: DadosEmpresa) => {
      const { error } = await supabase
        .from("configuracoes_financeiras")
        .upsert(
          [{
            chave: CHAVE,
            valor: dados as unknown as Json,
            descricao: "Dados cadastrais da empresa de factoring",
          }],
          { onConflict: "chave" },
        );
      if (error) throw error;
      return dados;
    },
    onSuccess: (dados) => {
      queryClient.setQueryData(QUERY_KEY, dados);
    },
  });

  // Sincroniza o mock local quando o Supabase carrega (caso flag ligue).
  useEffect(() => {
    if (enabled && query.data) setMockState(query.data);
  }, [enabled, query.data]);

  if (!enabled) {
    return {
      dados: mockState,
      isLoading: false,
      isSaving: false,
      error: null as unknown,
      save: async (next: DadosEmpresa) => {
        setMockState(next);
      },
      source: "mock" as const,
    };
  }

  return {
    dados: query.data ?? DADOS_EMPRESA_DEFAULT,
    isLoading: query.isLoading,
    isSaving: mutation.isPending,
    error: query.error ?? mutation.error ?? null,
    save: async (next: DadosEmpresa) => {
      await mutation.mutateAsync(next);
    },
    source: "supabase" as const,
  };
}
