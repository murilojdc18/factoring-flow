import { useEffect, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseEnabled } from "@/lib/dataSource";
import { mockClientes, type Cliente } from "@/data/mockClientes";
import { clienteToRow, rowToCliente } from "@/lib/mappers/cliente";

const QUERY_KEY = ["clientes"] as const;

/**
 * Traduz erros do Postgres/Supabase para mensagens amigáveis ao usuário.
 * 23505 = unique_violation; o único campo único em `clientes` é o CNPJ.
 * Sempre retorna uma instância de Error para o toast da página exibir a mensagem.
 */
function traduzirErroCliente(error: { code?: string; message: string }): Error {
  if (error.code === "23505") {
    return new Error("Já existe um cliente cadastrado com este CNPJ.");
  }
  return error instanceof Error ? error : new Error(error.message);
}

/**
 * Hook unificado para CRUD de clientes.
 * - Modo mock: estado local (mesma semântica anterior).
 * - Modo Supabase: TanStack Query + supabase.from("clientes").
 *
 * Todos os consumidores de clientes hoje passam por este hook: Clientes,
 * Titulos (lista + TituloForm), Operacoes, OperacaoDetalhes, OperacaoSimulador,
 * GerarDocumentoDialog e Relatorios (migrado na 2.5.3). useTitulos e
 * useOperacoes também consomem este hook internamente para resolver
 * cedenteNome via lookup. `preencherDocumento.ts` recebe o cedente por
 * parâmetro (função pura).
 */
export function useClientes() {
  const enabled = isSupabaseEnabled("clientes");
  const queryClient = useQueryClient();

  const [mockState, setMockState] = useState<Cliente[]>(mockClientes);

  const query = useQuery({
    queryKey: QUERY_KEY,
    enabled,
    queryFn: async (): Promise<Cliente[]> => {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToCliente);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: Partial<Cliente>): Promise<Cliente> => {
      // Registra quem cadastrou (auditoria). created_by é nullable; sem sessão,
      // segue como null em vez de bloquear o insert.
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("clientes")
        .insert([{ ...clienteToRow(input), created_by: userData.user?.id ?? null }])
        .select("*")
        .single();
      if (error) throw traduzirErroCliente(error);
      return rowToCliente(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Cliente>;
    }): Promise<Cliente> => {
      const { data, error } = await supabase
        .from("clientes")
        .update(clienteToRow(patch))
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw traduzirErroCliente(error);
      return rowToCliente(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  // Mantém o mock state alinhado quando o Supabase carrega.
  useEffect(() => {
    if (enabled && query.data) setMockState(query.data);
  }, [enabled, query.data]);

  if (!enabled) {
    return {
      clientes: mockState,
      isLoading: false,
      error: null as unknown,
      source: "mock" as const,
      create: async (input: Partial<Cliente>) => {
        const novo: Cliente = {
          id: `CLI-${String(mockState.length + 1).padStart(4, "0")}`,
          razaoSocial: "",
          nomeFantasia: "",
          cnpj: "",
          inscricaoEstadual: "",
          inscricaoMunicipal: "",
          emailPrincipal: "",
          telefone: "",
          whatsapp: "",
          cep: "",
          endereco: "",
          numero: "",
          complemento: "",
          bairro: "",
          cidade: "",
          estado: "",
          responsavelLegal: "",
          cpfResponsavel: "",
          emailResponsavel: "",
          telefoneResponsavel: "",
          banco: "",
          agencia: "",
          conta: "",
          chavePix: "",
          status: "Em análise",
          limiteOperacional: 0,
          observacoes: "",
          totalEmAberto: 0,
          totalVencido: 0,
          qtdTitulos: 0,
          criadoEm: new Date().toISOString().slice(0, 10),
          ...input,
        };
        setMockState((prev) => [novo, ...prev]);
        return novo;
      },
      update: async (id: string, patch: Partial<Cliente>) => {
        let updated: Cliente | null = null;
        setMockState((prev) =>
          prev.map((c) => {
            if (c.id !== id) return c;
            updated = { ...c, ...patch };
            return updated;
          }),
        );
        return updated as unknown as Cliente;
      },
    };
  }

  return {
    clientes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ?? null,
    source: "supabase" as const,
    create: async (input: Partial<Cliente>) =>
      createMutation.mutateAsync(input),
    update: async (id: string, patch: Partial<Cliente>) =>
      updateMutation.mutateAsync({ id, patch }),
  };
}