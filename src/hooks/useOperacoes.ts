import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseEnabled } from "@/lib/dataSource";
import { mockOperacoes, type Operacao } from "@/data/mockOperacoes";
import {
  operacaoToRow,
  rowToOperacao,
  type OperacaoLookup,
} from "@/lib/mappers/operacao";
import { useClientes } from "@/hooks/useClientes";

const QUERY_KEY = ["operacoes"] as const;

/**
 * Payload aceito por `create` — o mesmo shape que a RPC `criar_operacao` espera:
 * o cabeçalho gravável de operacoes (snake_case, via operacaoToRow) + os ids dos
 * títulos selecionados. A RPC ignora `status`/`quantidade_titulos` do payload:
 * ela própria fixa o status "Em análise" e deriva a quantidade do array.
 */
export type CriarOperacaoPayload = ReturnType<typeof operacaoToRow> & {
  titulo_ids: string[];
};

/**
 * Traduz erros da RPC `criar_operacao` (e do Postgres) em mensagens amigáveis.
 * P0001–P0004 são os SQLSTATE customizados da função; P0002/P0004 já vêm em
 * pt-BR do banco, então repassamos a mensagem original. 42501 = sem privilégio;
 * 23505/23503/23502 são violações padrão do Postgres. Sempre retorna uma
 * instância de Error para o toast da página exibir `.message`.
 */
function traduzirErroOperacao(error: {
  code?: string;
  message: string;
}): Error {
  switch (error.code) {
    case "P0001":
      return new Error("Algum dado obrigatório está faltando ou é inválido.");
    case "P0002":
      return new Error(error.message);
    case "P0003":
      return new Error(
        "Um ou mais títulos já foram operados. Atualize a página e tente novamente.",
      );
    case "P0004":
      return new Error(error.message);
    case "42501":
      return new Error("Você não tem permissão para criar operações.");
    case "23505":
      return new Error("Já existe operação com este número. Tente outro.");
    case "23503":
      return new Error("Algum cedente ou título referenciado não existe mais.");
    case "23502":
      return new Error("Algum dado obrigatório está faltando.");
    default:
      return error instanceof Error ? error : new Error(error.message);
  }
}

/**
 * Hook de LEITURA de operações (2.4a) + criação atômica (2.4b).
 * - Modo mock: lê `mockOperacoes` (mesma semântica anterior).
 * - Modo Supabase: TanStack Query + supabase.from("operacoes") com JOIN
 *   embutido em `operacao_titulos` (vira `titulosIds`) e `operacao_historico`
 *   (vira `historico`, ordenado cronologicamente). `cedenteNome` é resolvido
 *   por lookup contra useClientes.
 *
 * `create` cria a operação de forma atômica via RPC `criar_operacao` (2.4b):
 * status inicial "Em análise" e os títulos viram "Operado" na mesma transação;
 * invalida as queries de operações e de títulos e retorna o uuid criado. Ainda
 * SEM update/delete por aqui.
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
  const queryClient = useQueryClient();

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

  // Criação atômica via RPC `criar_operacao` (2.4b). A RPC valida cedente/títulos,
  // grava operação + vínculos + histórico e reserva os títulos como "Operado".
  const createMutation = useMutation({
    mutationFn: async (payload: CriarOperacaoPayload): Promise<string> => {
      const { data, error } = await supabase.rpc("criar_operacao", { payload });
      if (error) throw traduzirErroOperacao(error);
      return data as string;
    },
    onSuccess: () => {
      // Operações mudaram E os títulos viraram "Operado" -> invalida ambos.
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["titulos"] });
    },
  });

  if (!enabled) {
    return {
      operacoes: mockState,
      isLoading: false,
      error: null as unknown,
      source: "mock" as const,
      // Criar operação é intrinsecamente a RPC atômica do Supabase; não há
      // equivalente mock fiel. Mantém a assinatura para o tipo de retorno ficar
      // consistente entre os modos (a flag `operacoes` já está ligada).
      create: async (_payload: CriarOperacaoPayload): Promise<string> => {
        throw new Error(
          "Criação de operação requer o Supabase ativo (flag operacoes).",
        );
      },
    };
  }

  return {
    operacoes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ?? null,
    source: "supabase" as const,
    create: async (payload: CriarOperacaoPayload): Promise<string> =>
      createMutation.mutateAsync(payload),
  };
}
