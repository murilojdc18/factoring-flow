import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseEnabled } from "@/lib/dataSource";
import { mockOperacoes, type Operacao } from "@/data/mockOperacoes";
import { rowToOperacao, type OperacaoLookup } from "@/lib/mappers/operacao";
import { useClientes } from "@/hooks/useClientes";

const QUERY_KEY = ["operacoes"] as const;

/**
 * Hook de LEITURA de operações (sub-tarefa 2.4a).
 * - Modo mock: lê `mockOperacoes` (mesma semântica anterior).
 * - Modo Supabase: TanStack Query + supabase.from("operacoes") com JOIN
 *   embutido em `operacao_titulos` (vira `titulosIds`) e `operacao_historico`
 *   (vira `historico`, ordenado cronologicamente). `cedenteNome` é resolvido
 *   por lookup contra useClientes.
 *
 * SEM create/update/delete aqui ainda: a escrita (criar operação de forma
 * atômica via RPC `criar_operacao`, com status "Em análise" e marcando os
 * títulos como "Operado") é a sub-tarefa 2.4b.
 *
 * `historico[].por` (nome de quem agiu) seria resolvido de `created_by` via a
 * tabela `profiles`; em 2.4a a tabela `operacoes` está vazia (sem histórico
 * para resolver), então o lookup de responsáveis fica de fora por ora.
 *
 * ATENÇÃO: a flag `operacoes` em dataSource.ts controla SOMENTE os consumidores
 * que passam por este hook — a página Operacoes (lista) e OperacaoDetalhes
 * (leitura). Relatorios, GerarDocumentoDialog/preencherDocumento e Compliance
 * ainda leem `mockOperacoes` direto e NÃO são afetados pela flag; cada um migra
 * quando suas entidades forem ligadas. Decisão consciente da 2.4 (espelha a 2.3).
 */
export function useOperacoes() {
  const enabled = isSupabaseEnabled("operacoes");

  // Em leitura pura o mock não muda; mantém o array estável entre renders.
  const [mockState] = useState<Operacao[]>(mockOperacoes);

  // Resolve cedenteNome ao ler do Supabase.
  const { clientes } = useClientes();

  const lookup: OperacaoLookup = useMemo(
    () => ({
      cedentes: new Map(clientes.map((c) => [c.id, c.razaoSocial])),
    }),
    [clientes],
  );

  const query = useQuery({
    // clientes.length entra na chave para re-mapear os nomes quando a lista de
    // clientes terminar de carregar (espelha useTitulos).
    queryKey: [...QUERY_KEY, clientes.length],
    enabled,
    queryFn: async (): Promise<Operacao[]> => {
      const { data, error } = await supabase
        .from("operacoes")
        .select("*, operacao_titulos(titulo_id), operacao_historico(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => {
        const titulosIds = (row.operacao_titulos ?? []).map(
          (vinculo) => vinculo.titulo_id,
        );
        // Histórico cronológico (mais antigo primeiro), como o mock.
        const historico = [...(row.operacao_historico ?? [])].sort((a, b) =>
          (a.created_at ?? "").localeCompare(b.created_at ?? ""),
        );
        return rowToOperacao(row, { titulosIds, historico }, lookup);
      });
    },
  });

  if (!enabled) {
    return {
      operacoes: mockState,
      isLoading: false,
      error: null as unknown,
      source: "mock" as const,
    };
  }

  return {
    operacoes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ?? null,
    source: "supabase" as const,
  };
}
