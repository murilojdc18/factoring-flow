import type {
  DocumentoGerado,
  DocumentoStatus,
} from "@/data/mockDocumentosGerados";
import type { ContratoTipo } from "@/data/mockContratos";
import type { Database } from "@/integrations/supabase/types";

/**
 * Mapper de documentos gerados (sub-tarefa 2.5b).
 *
 * Converte entre a linha de `documentos_gerados` (snake_case, banco) e o shape
 * `DocumentoGerado` que a UI consome (camelCase) — o mesmo que o `documentosStore`
 * em memória servia.
 *
 * Estratégia de SNAPSHOT (decisão D2): o documento é um registro histórico
 * imutável. Os campos que descrevem o documento no momento da geração são
 * desnormalizados em colunas próprias (`modelo_nome`, `modelo_versao`,
 * `tipo_documento`, `operacao_numero`, `observacoes`, `conteudo`), de modo que
 * mudanças posteriores no modelo/operação não reescrevem o documento. As FKs
 * (`modelo_id`, `operacao_id`, `cliente_id`) são ON DELETE SET NULL.
 *
 * Notas de mapeamento:
 * - `cedenteNome` NÃO é coluna: é resolvido por lookup a partir de `cliente_id`
 *   (clientes = cedentes), igual ao mapper de operacao. Sem lookup, fica "".
 *   Diferente das demais, essa informação não é congelada — se o cedente for
 *   renomeado, o documento passa a exibir o nome atual (dívida aceita na 2.5b).
 * - `modelo_versao` é integer no banco e string no front (mesma regra do
 *   modeloDocumento): ida `String()`, volta `parseInt(…,10)` com fallback 1.
 * - `geradoEm` vem de `created_at` (só a data, slice 0..10); na escrita o banco
 *   preenche `created_at` (default now()), então não emitimos esse campo.
 * - FKs uuid são nullable: string vazia "" na escrita vira `null` (evita uuid
 *   inválido). Na prática sempre vêm preenchidas.
 * - `variaveis_preenchidas` (jsonb) não é modelado no front: na escrita deixamos
 *   o banco aplicar o default ('{}'); na leitura é ignorado.
 */

export type DocumentoGeradoRow =
  Database["public"]["Tables"]["documentos_gerados"]["Row"];
export type DocumentoGeradoInsert =
  Database["public"]["Tables"]["documentos_gerados"]["Insert"];

/** Resolve `cedenteNome` a partir de `cliente_id` (clientes = cedentes). */
export interface DocumentoGeradoLookup {
  cedentes: Map<string, string>;
}

/** Converte uma linha de `documentos_gerados` no DocumentoGerado consumido pela UI. */
export function rowToDocumentoGerado(
  row: DocumentoGeradoRow,
  lookup?: DocumentoGeradoLookup,
): DocumentoGerado {
  return {
    id: row.id,
    tipoDocumento: (row.tipo_documento ?? "") as ContratoTipo,
    modeloId: row.modelo_id ?? "",
    modeloNome: row.modelo_nome ?? "",
    modeloVersao: String(row.modelo_versao ?? 1),
    operacaoId: row.operacao_id ?? "",
    operacaoNumero: row.operacao_numero ?? "",
    cedenteId: row.cliente_id ?? "",
    cedenteNome: (row.cliente_id && lookup?.cedentes.get(row.cliente_id)) || "",
    geradoEm: row.created_at?.slice(0, 10) ?? "",
    status: (row.status as DocumentoStatus) ?? "Rascunho",
    textoFinal: row.conteudo ?? "",
    observacoes: row.observacoes ?? "",
  };
}

/**
 * Converte um DocumentoGerado (ou parcial) na linha gravável de
 * `documentos_gerados`. NÃO inclui id/created_at/updated_at/created_by (gerados
 * pelo banco) nem `variaveis_preenchidas` (default do banco).
 */
export function documentoGeradoToRow(
  doc: Partial<DocumentoGerado>,
): Omit<
  DocumentoGeradoInsert,
  "id" | "created_at" | "updated_at" | "created_by"
> {
  const versaoParsed = parseInt(doc.modeloVersao ?? "", 10);
  return {
    cliente_id: doc.cedenteId || null,
    conteudo: doc.textoFinal ?? "",
    modelo_id: doc.modeloId || null,
    modelo_nome: doc.modeloNome ?? "",
    modelo_versao: Number.isNaN(versaoParsed) ? 1 : versaoParsed,
    observacoes: doc.observacoes ?? "",
    operacao_id: doc.operacaoId || null,
    operacao_numero: doc.operacaoNumero ?? "",
    status: doc.status ?? "Rascunho",
    tipo_documento: doc.tipoDocumento ?? "",
  };
}
