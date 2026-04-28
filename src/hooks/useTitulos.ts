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
      const { data, error } = await supabase
        .from("titulos")
        .insert([tituloToRow(input)])
        .select("*")
        .single();
      if (error) throw error;
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
      if (error) throw error;
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