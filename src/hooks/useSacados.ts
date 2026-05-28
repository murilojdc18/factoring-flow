import { useEffect, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseEnabled } from "@/lib/dataSource";
import { mockSacados, type Sacado } from "@/data/mockSacados";
import { rowToSacado, sacadoToRow } from "@/lib/mappers/sacado";

const QUERY_KEY = ["sacados"] as const;

/**
 * Traduz erros do Postgres/Supabase para mensagens amigáveis ao usuário.
 * 23505 = unique_violation; o único campo único em `sacados` é o documento
 * (CPF ou CNPJ, guardados na mesma coluna). Sempre retorna uma instância de
 * Error para o toast da página exibir a mensagem.
 */
function traduzirErroSacado(error: { code?: string; message: string }): Error {
  if (error.code === "23505") {
    return new Error("Já existe um sacado cadastrado com este CPF/CNPJ.");
  }
  return error instanceof Error ? error : new Error(error.message);
}

/**
 * Hook unificado para CRUD de sacados.
 * - Modo mock: estado local (mesma semântica anterior).
 * - Modo Supabase: TanStack Query + supabase.from("sacados").
 *
 * Todos os consumidores de sacados hoje passam por este hook: Sacados,
 * Titulos (lista + TituloForm), GerarDocumentoDialog e Relatorios (migrado
 * na 2.5.3). useTitulos também consome este hook internamente para resolver
 * sacadoNome via lookup. `preencherDocumento.ts` recebe os sacados por
 * parâmetro (função pura).
 */
export function useSacados() {
  const enabled = isSupabaseEnabled("sacados");
  const queryClient = useQueryClient();
  const [mockState, setMockState] = useState<Sacado[]>(mockSacados);

  const query = useQuery({
    queryKey: QUERY_KEY,
    enabled,
    queryFn: async (): Promise<Sacado[]> => {
      const { data, error } = await supabase
        .from("sacados")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToSacado);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: Partial<Sacado>): Promise<Sacado> => {
      // Registra quem cadastrou (auditoria). created_by é nullable; sem sessão,
      // segue como null em vez de bloquear o insert.
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("sacados")
        .insert([{ ...sacadoToRow(input), created_by: userData.user?.id ?? null }])
        .select("*")
        .single();
      if (error) throw traduzirErroSacado(error);
      return rowToSacado(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Sacado>;
    }): Promise<Sacado> => {
      const { data, error } = await supabase
        .from("sacados")
        .update(sacadoToRow(patch))
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw traduzirErroSacado(error);
      return rowToSacado(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  useEffect(() => {
    if (enabled && query.data) setMockState(query.data);
  }, [enabled, query.data]);

  if (!enabled) {
    return {
      sacados: mockState,
      isLoading: false,
      error: null as unknown,
      source: "mock" as const,
      create: async (input: Partial<Sacado>) => {
        const novo: Sacado = {
          id: `SAC-${String(mockState.length + 1).padStart(4, "0")}`,
          tipo: "PJ",
          nome: "",
          nomeFantasia: "",
          documento: "",
          email: "",
          telefone: "",
          whatsapp: "",
          cep: "",
          endereco: "",
          numero: "",
          complemento: "",
          bairro: "",
          cidade: "",
          estado: "",
          pessoaContato: "",
          cargoContato: "",
          limiteConcentracao: 0,
          scoreInterno: 0,
          status: "Em análise",
          observacoes: "",
          totalEmAberto: 0,
          totalVencido: 0,
          titulosPagos: 0,
          titulosEmAtraso: 0,
          criadoEm: new Date().toISOString().slice(0, 10),
          ...input,
        };
        setMockState((prev) => [novo, ...prev]);
        return novo;
      },
      update: async (id: string, patch: Partial<Sacado>) => {
        let updated: Sacado | null = null;
        setMockState((prev) =>
          prev.map((s) => {
            if (s.id !== id) return s;
            updated = { ...s, ...patch };
            return updated;
          }),
        );
        return updated as unknown as Sacado;
      },
    };
  }

  return {
    sacados: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ?? null,
    source: "supabase" as const,
    create: async (input: Partial<Sacado>) =>
      createMutation.mutateAsync(input),
    update: async (id: string, patch: Partial<Sacado>) =>
      updateMutation.mutateAsync({ id, patch }),
  };
}