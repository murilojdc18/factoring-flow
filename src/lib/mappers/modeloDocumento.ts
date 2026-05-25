import type {
  ContratoStatus,
  ContratoTipo,
  ModeloContrato,
} from "@/data/mockContratos";
import type { Database } from "@/integrations/supabase/types";

/**
 * Mapper de modelos de documento (sub-tarefa 2.5a).
 *
 * Converte entre a linha de `modelos_documentos` (snake_case, banco) e o shape
 * `ModeloContrato` que a UI já consome do mock (camelCase). No fluxo da 2.5 só a
 * leitura (rowTo...) é usada — a escrita de modelo pela UI fica para tarefa
 * futura (decisão D5) — mas o caminho de volta já vai pronto para quando existir.
 *
 * Notas de mapeamento (plano-2.5.md, D2/D3):
 * - `versao` é integer no banco e string no front. Ida: String(versao) -> "1".
 *   Volta: parseInt(versao, 10), com fallback 1 se NaN. O mock usava "1.0"/"1.2"/
 *   "2.0" (cosmético); o padrão atual é integer começando em 1, então "1.2" vira
 *   1 na volta — o sufixo decimal legado é descartado de propósito.
 * - `tipo`: text livre no banco, mas usa os valores do enum `ContratoTipo`.
 * - `status`: casa 1:1 com o enum do banco (`modelo_documento_status`).
 * - `variaveis` (jsonb): NÃO usado (o mock não tem o campo); na escrita deixamos
 *   o banco aplicar o default ('{}').
 * - `descricao` (banco) <-> `observacoes` (front); `conteudo` <-> `texto`;
 *   `updated_at` -> `atualizadoEm`.
 */

export type ModeloDocumentoRow =
  Database["public"]["Tables"]["modelos_documentos"]["Row"];
export type ModeloDocumentoInsert =
  Database["public"]["Tables"]["modelos_documentos"]["Insert"];

/** Converte uma linha de `modelos_documentos` no ModeloContrato consumido pela UI. */
export function rowToModeloDocumento(row: ModeloDocumentoRow): ModeloContrato {
  return {
    id: row.id,
    nome: row.nome ?? "",
    tipo: (row.tipo ?? "") as ContratoTipo,
    versao: String(row.versao ?? 1),
    status: (row.status as ContratoStatus) ?? "Rascunho",
    atualizadoEm: row.updated_at ?? "",
    texto: row.conteudo ?? "",
    observacoes: row.descricao ?? "",
  };
}

/**
 * Converte um ModeloContrato (ou parcial) na linha gravável de
 * `modelos_documentos`. NÃO inclui id/created_at/updated_at/created_by (gerados
 * pelo banco) nem `variaveis` (default do banco).
 */
export function modeloDocumentoToRow(
  m: Partial<ModeloContrato>,
): Omit<
  ModeloDocumentoInsert,
  "id" | "created_at" | "updated_at" | "created_by"
> {
  const versaoParsed = parseInt(m.versao ?? "", 10);
  return {
    nome: m.nome ?? "",
    tipo: m.tipo ?? "",
    descricao: m.observacoes ?? "",
    conteudo: m.texto ?? "",
    status: m.status ?? "Rascunho",
    versao: Number.isNaN(versaoParsed) ? 1 : versaoParsed,
  };
}
