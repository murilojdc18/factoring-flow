import type {
  HistoricoStatus,
  Operacao,
  OperacaoStatus,
} from "@/data/mockOperacoes";
import type { Database } from "@/integrations/supabase/types";

type OperacaoRow = Database["public"]["Tables"]["operacoes"]["Row"];
type OperacaoInsert = Database["public"]["Tables"]["operacoes"]["Insert"];
type OperacaoHistoricoRow =
  Database["public"]["Tables"]["operacao_historico"]["Row"];

/**
 * Linhas auxiliares de uma operação que vivem em tabelas separadas no banco,
 * mas que o tipo `Operacao` do front guarda embutidas:
 * - `titulosIds`: os `titulo_id` de cada vínculo em `operacao_titulos`.
 * - `historico`: as linhas de `operacao_historico` desta operação (cronológico).
 */
export interface OperacaoRelacionados {
  titulosIds?: string[];
  historico?: OperacaoHistoricoRow[];
}

/**
 * Resolve nomes que não existem como coluna na tabela `operacoes`:
 * - `cedentes`: cedente_id -> razão social (preenche `cedenteNome`).
 * - `responsaveis`: user_id -> nome (preenche `historico[].por` a partir de
 *   `created_by`; opcional — sem ele o `por` fica vazio).
 */
export interface OperacaoLookup {
  cedentes: Map<string, string>;
  responsaveis?: Map<string, string>;
}

/**
 * Converte uma linha do banco em Operacao. O cedenteNome, os titulosIds e o
 * histórico vêm de outras tabelas (clientes, operacao_titulos,
 * operacao_historico) e são passados em `relacionados`/`lookup` — mantendo o
 * mesmo shape que a UI já consome do mock.
 */
export function rowToOperacao(
  row: OperacaoRow,
  relacionados: OperacaoRelacionados = {},
  lookup?: OperacaoLookup,
): Operacao {
  const titulosIds = relacionados.titulosIds ?? [];

  const historico: HistoricoStatus[] = (relacionados.historico ?? []).map(
    (h) => ({
      status: (h.status as OperacaoStatus) ?? "Rascunho",
      data: h.created_at?.slice(0, 10) ?? "",
      por: (h.created_by && lookup?.responsaveis?.get(h.created_by)) || "",
      observacao: h.observacao ?? "",
    }),
  );

  return {
    id: row.id,
    numero: row.numero,
    cedenteId: row.cedente_id,
    cedenteNome: lookup?.cedentes.get(row.cedente_id) ?? "",
    dataOperacao: row.data_operacao,
    status: (row.status as OperacaoStatus) ?? "Rascunho",
    titulosIds,
    quantidadeTitulos: row.quantidade_titulos ?? titulosIds.length,
    valorBruto: Number(row.valor_bruto ?? 0),
    valorDesagio: Number(row.valor_desagio ?? 0),
    valorTarifas: Number(row.valor_tarifas ?? 0),
    valorRetencao: Number(row.valor_retencao ?? 0),
    valorLiquido: Number(row.valor_liquido ?? 0),
    prazoMedio: Number(row.prazo_medio ?? 0),
    taxaAplicada: Number(row.taxa_aplicada ?? 0),
    responsavelInterno: row.responsavel_interno ?? "",
    observacoes: row.observacoes ?? "",
    historico,
  };
}

/**
 * Converte uma Operacao (ou parcial) no cabeçalho gravável de `operacoes`.
 * NÃO serializa titulosIds nem historico — esses vínculos vão para
 * operacao_titulos/operacao_historico (escritos pela RPC na 2.4b).
 * O default de status é "Rascunho" (default da coluna no banco); o fluxo de
 * criação da 2.4b passa "Em análise" explicitamente.
 */
export function operacaoToRow(
  o: Partial<Operacao>,
): Omit<OperacaoInsert, "id" | "created_at" | "updated_at" | "created_by"> {
  return {
    numero: o.numero ?? "",
    cedente_id: o.cedenteId ?? "",
    data_operacao: o.dataOperacao ?? new Date().toISOString().slice(0, 10),
    status: o.status ?? "Rascunho",
    quantidade_titulos: o.quantidadeTitulos ?? 0,
    valor_bruto: o.valorBruto ?? 0,
    valor_desagio: o.valorDesagio ?? 0,
    valor_tarifas: o.valorTarifas ?? 0,
    valor_retencao: o.valorRetencao ?? 0,
    valor_liquido: o.valorLiquido ?? 0,
    prazo_medio: o.prazoMedio ?? 0,
    taxa_aplicada: o.taxaAplicada ?? 0,
    responsavel_interno: o.responsavelInterno ?? "",
    observacoes: o.observacoes ?? "",
  };
}
