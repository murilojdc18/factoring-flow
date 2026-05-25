import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseEnabled } from "@/lib/dataSource";
import {
  DocumentoGerado,
  DocumentoStatus,
} from "@/data/mockDocumentosGerados";
import {
  documentoGeradoToRow,
  rowToDocumentoGerado,
  type DocumentoGeradoLookup,
} from "@/lib/mappers/documentoGerado";
import { documentosStore } from "@/lib/documentosStore";
import { useClientes } from "@/hooks/useClientes";

const QUERY_KEY = ["documentos_gerados"] as const;

/**
 * Traduz erros do Postgres/Supabase ao gravar documentos para mensagens
 * amigáveis. 23505 = unique_violation; 23503 = foreign_key_violation (modelo,
 * operação ou cedente removido); 23502 = not_null_violation. Sempre retorna uma
 * instância de Error para o toast da página exibir `.message`.
 */
function traduzirErroDocumento(error: {
  code?: string;
  message: string;
}): Error {
  switch (error.code) {
    case "23505":
      return new Error("Já existe documento com este identificador.");
    case "23503":
      return new Error(
        "Modelo, operação ou cedente referenciado não existe mais.",
      );
    case "23502":
      return new Error("Algum dado obrigatório está faltando.");
    default:
      return error instanceof Error ? error : new Error(error.message);
  }
}

/**
 * Hook de documentos gerados (sub-tarefa 2.5b). Substitui o `documentosStore`
 * como fonte para a UI.
 *
 * O que faz: leitura da lista, `create` (gerar documento) e `updateStatus`
 * (mudar o status na aba de documentos).
 *
 * Reatividade entre telas:
 * - Modo mock: continua usando o `documentosStore` (pub/sub em memória) — um
 *   `create` em Operação reflete na lista de Contratos/Relatórios via subscribe.
 * - Modo Supabase: TanStack Query com a mesma `QUERY_KEY`; create/updateStatus
 *   invalidam a query, então todas as telas que usam o hook re-buscam.
 * `cedenteNome` é resolvido por lookup contra useClientes (igual useOperacoes).
 *
 * O que NÃO faz: delete (fora do escopo da 2.5).
 *
 * ATENÇÃO: a flag `documentos` em dataSource.ts controla SOMENTE os consumidores
 * que passam por este hook — a aba "Documentos gerados" em Contratos, a lista de
 * Relatorios e o salvar do GerarDocumentoDialog (aberto por Contratos e
 * OperacaoDetalhes). A leitura dos MODELOS é outra flag (`modelos_documentos`,
 * hook useModelosDocumento). Decisão da 2.5b.
 */
export function useDocumentosGerados() {
  const enabled = isSupabaseEnabled("documentos");
  const queryClient = useQueryClient();

  // Reatividade no modo mock: espelha o pub/sub do documentosStore.
  const [mockDocs, setMockDocs] = useState<DocumentoGerado[]>(
    documentosStore.get(),
  );
  useEffect(() => documentosStore.subscribe(setMockDocs), []);

  // Resolve cedenteNome ao ler do Supabase (clientes = cedentes).
  const { clientes } = useClientes();
  const lookup: DocumentoGeradoLookup = useMemo(
    () => ({ cedentes: new Map(clientes.map((c) => [c.id, c.razaoSocial])) }),
    [clientes],
  );

  const query = useQuery({
    // clientes.length entra na chave para re-mapear os nomes quando a lista de
    // clientes terminar de carregar (espelha useOperacoes).
    queryKey: [...QUERY_KEY, clientes.length],
    enabled,
    queryFn: async (): Promise<DocumentoGerado[]> => {
      const { data, error } = await supabase
        .from("documentos_gerados")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => rowToDocumentoGerado(row, lookup));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (
      input: Partial<DocumentoGerado>,
    ): Promise<DocumentoGerado> => {
      // Registra quem gerou (auditoria). created_by é nullable; sem sessão,
      // segue como null em vez de bloquear o insert.
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("documentos_gerados")
        .insert([
          {
            ...documentoGeradoToRow(input),
            created_by: userData.user?.id ?? null,
          },
        ])
        .select("*")
        .single();
      if (error) throw traduzirErroDocumento(error);
      return rowToDocumentoGerado(data, lookup);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: DocumentoStatus;
    }): Promise<void> => {
      const { error } = await supabase
        .from("documentos_gerados")
        .update({ status })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw traduzirErroDocumento(error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  if (!enabled) {
    return {
      documentos: mockDocs,
      isLoading: false,
      error: null as unknown,
      source: "mock" as const,
      create: async (
        input: Partial<DocumentoGerado>,
      ): Promise<DocumentoGerado> => {
        const doc: DocumentoGerado = {
          id: `DOC-${Date.now()}`,
          tipoDocumento: "Contrato de cessão de direitos creditórios",
          modeloId: "",
          modeloNome: "",
          modeloVersao: "1",
          operacaoId: "",
          operacaoNumero: "",
          cedenteId: "",
          cedenteNome: "",
          geradoEm: new Date().toISOString().slice(0, 10),
          status: "Rascunho",
          textoFinal: "",
          observacoes: "",
          ...input,
        };
        documentosStore.add(doc);
        return doc;
      },
      updateStatus: async (id: string, status: DocumentoStatus) => {
        documentosStore.update(id, { status });
      },
    };
  }

  return {
    documentos: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ?? null,
    source: "supabase" as const,
    create: async (input: Partial<DocumentoGerado>): Promise<DocumentoGerado> =>
      createMutation.mutateAsync(input),
    updateStatus: async (id: string, status: DocumentoStatus): Promise<void> => {
      await updateStatusMutation.mutateAsync({ id, status });
    },
  };
}
