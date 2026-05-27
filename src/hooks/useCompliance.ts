import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseEnabled } from "@/lib/dataSource";
import {
  AnaliseCompliance,
  EscopoAnalise,
  PoliticaInterna,
  complianceStore,
  mockPoliticas,
} from "@/data/mockCompliance";
import { analiseToRow, rowToAnalise } from "@/lib/mappers/compliance";
import { agruparCorrentes } from "@/lib/complianceAgregado";

const QUERY_KEY = ["compliance_analises"] as const;

/**
 * Políticas internas — constante estática de referência (sem tabela; fora de
 * escopo da migração, ver §7 do plano). O hook só expõe para leitura na UI.
 */
export const POLITICAS: PoliticaInterna[] = mockPoliticas;

/**
 * Hook de compliance — análises de risco PLD/FT (sub-tarefa 2.9.3).
 * Substitui o `useCompliance`/`complianceStore` em memória como fonte para a UI
 * (a página /compliance migra na 2.9.4). Espelha o padrão de `useCobrancas` (2.8).
 *
 * O QUE FAZ: leitura das análises ATUAIS por alvo (com `historico`),
 * `registrarAnalise(input)` (grava uma análise) e `obterAnalisePorAlvo`.
 *
 * REATIVIDADE entre telas:
 * - Modo mock: `complianceStore` (pub/sub em memória) — subscribe re-renderiza.
 * - Modo Supabase: TanStack Query na QUERY_KEY; a mutation invalida a query.
 *
 * APPEND-ONLY (D1): `registrarAnalise` é sempre um INSERT — nunca UPDATE. Cada
 * salvar/revisar cria uma nova linha. A análise atual de um alvo é a mais recente.
 *
 * AGREGAÇÃO: no modo Supabase a query traz TODAS as linhas e delega a
 * `agruparCorrentes` (função pura) a redução para a atual por alvo + `historico`.
 * No modo mock o `complianceStore` já mantém uma análise por alvo com `historico`.
 *
 * RESPONSAVEL (decisão 2.9): vem do FORMULÁRIO (o analista digita) — diferente de
 * cobranças, NÃO é auto-resolvido de `profiles`. `created_by` (uuid) é gravado do
 * auth como âncora de auditoria.
 *
 * POLITICAS: estáticas (constante `POLITICAS`); o hook não as modifica.
 *
 * O QUE NÃO FAZ: DELETE físico; workflow de `status` (aprovação humana — Fase 3;
 * grava sempre o default neutro 'Em análise', D6).
 */

/**
 * Traduz erros do Postgres ao gravar análises para mensagens amigáveis.
 * 23502 = not_null_violation; 23503 = foreign_key_violation (cliente/operação
 * removido); 23505 = unique_violation. Sempre retorna um Error para o toast.
 */
function traduzirErroCompliance(error: {
  code?: string;
  message: string;
}): Error {
  switch (error.code) {
    case "23502":
      return new Error("Algum dado obrigatório está faltando.");
    case "23503":
      return new Error("Cliente ou operação referenciada não existe mais.");
    case "23505":
      return new Error("Já existe um registro com este identificador.");
    default:
      return error instanceof Error ? error : new Error(error.message);
  }
}

export function useCompliance() {
  const enabled = isSupabaseEnabled("compliance");
  const queryClient = useQueryClient();

  // Reatividade no modo mock: espelha o pub/sub do complianceStore.
  const [mockAnalises, setMockAnalises] = useState<AnaliseCompliance[]>(
    complianceStore.listarAnalises(),
  );
  useEffect(() => {
    // subscribe devolve um unsub que retorna boolean; o bloco descarta p/ void.
    const unsub = complianceStore.subscribe(() =>
      setMockAnalises(complianceStore.listarAnalises()),
    );
    return () => {
      unsub();
    };
  }, []);

  const query = useQuery({
    queryKey: QUERY_KEY,
    enabled,
    queryFn: async (): Promise<AnaliseCompliance[]> => {
      const { data, error } = await supabase
        .from("compliance_analises")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Append-only: várias linhas por alvo → agrupa na atual + histórico.
      return agruparCorrentes((data ?? []).map(rowToAnalise));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: Partial<AnaliseCompliance>): Promise<void> => {
      // created_by (uuid) do auth — âncora de auditoria; nullable sem sessão.
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("compliance_analises")
        .insert([
          { ...analiseToRow(input), created_by: userData.user?.id ?? null },
        ])
        .select("*")
        .single();
      if (error) throw traduzirErroCompliance(error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const analises = enabled ? query.data ?? [] : mockAnalises;
  const obterAnalisePorAlvo = (
    escopo: EscopoAnalise,
    alvoId: string,
  ): AnaliseCompliance | undefined =>
    analises.find((a) => a.escopo === escopo && a.alvoId === alvoId);

  if (!enabled) {
    return {
      analises,
      politicas: POLITICAS,
      isLoading: false,
      error: null as unknown,
      source: "mock" as const,
      obterAnalisePorAlvo,
      registrarAnalise: async (
        input: Partial<AnaliseCompliance>,
      ): Promise<void> => {
        complianceStore.salvar({
          escopo: input.escopo ?? "Cliente",
          alvoId: input.alvoId ?? "",
          alvoNome: input.alvoNome ?? "",
          nivelRisco: input.nivelRisco ?? "Baixo",
          justificativa: input.justificativa ?? "",
          responsavel: input.responsavel ?? "",
          respostas: input.respostas ?? [],
          observacoes: input.observacoes,
        });
      },
    };
  }

  return {
    analises,
    politicas: POLITICAS,
    isLoading: query.isLoading,
    error: query.error ?? null,
    source: "supabase" as const,
    obterAnalisePorAlvo,
    registrarAnalise: async (
      input: Partial<AnaliseCompliance>,
    ): Promise<void> => {
      await createMutation.mutateAsync(input);
    },
  };
}
