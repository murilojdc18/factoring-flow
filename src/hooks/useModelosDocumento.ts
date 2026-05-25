import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseEnabled } from "@/lib/dataSource";
import { mockModelosContrato, type ModeloContrato } from "@/data/mockContratos";
import { rowToModeloDocumento } from "@/lib/mappers/modeloDocumento";

const QUERY_KEY = ["modelos_documentos"] as const;

/**
 * Hook de LEITURA dos modelos de documento (sub-tarefa 2.5a).
 *
 * O que faz: lista os modelos de `modelos_documentos` (contrato master, cessão,
 * aditivo, borderô, recompra, notificação) já mapeados para o shape
 * `ModeloContrato` que a UI consome do mock.
 * - Modo mock: estado local a partir de `mockModelosContrato`.
 * - Modo Supabase: TanStack Query + supabase.from("modelos_documentos"),
 *   ordenado por created_at desc, cada linha via rowToModeloDocumento.
 *
 * O que NÃO faz: nenhum CRUD (criar/editar/duplicar/ativar/excluir). A escrita
 * de modelos pela UI fica desativada nesta fase (decisão D5); vira tarefa futura
 * (2.5c). Por isso o hook não expõe mutations.
 *
 * Sem lookup: modelos não têm FK para cliente/sacado/operação — diferente de
 * useTitulos/useOperacoes, não há nomes a resolver.
 *
 * ATENÇÃO: a flag `modelos_documentos` em dataSource.ts controla SOMENTE os
 * consumidores que passam por este hook — a lista de modelos em Contratos.tsx e
 * o dropdown de modelo no GerarDocumentoDialog. A geração e a persistência de
 * documentos gerados são outra flag (`documentos`, hook useDocumentosGerados,
 * sub-tarefa 2.5b).
 */
export function useModelosDocumento() {
  const enabled = isSupabaseEnabled("modelos_documentos");

  // Sem setter: não há escrita; o mock é apenas a fonte de leitura no modo mock.
  const [mockState] = useState<ModeloContrato[]>(mockModelosContrato);

  const query = useQuery({
    queryKey: QUERY_KEY,
    enabled,
    queryFn: async (): Promise<ModeloContrato[]> => {
      const { data, error } = await supabase
        .from("modelos_documentos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToModeloDocumento);
    },
  });

  if (!enabled) {
    return {
      modelos: mockState,
      isLoading: false,
      error: null as unknown,
      source: "mock" as const,
    };
  }

  return {
    modelos: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ?? null,
    source: "supabase" as const,
  };
}
