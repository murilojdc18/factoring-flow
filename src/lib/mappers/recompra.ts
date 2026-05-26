import type {
  SolicitacaoRecompra,
  StatusRecompra,
  TipoAcaoRecompra,
} from "@/data/mockRecompras";
import type { Database } from "@/integrations/supabase/types";

/**
 * Mapper de recompras (sub-tarefa 2.6.2).
 *
 * Converte entre a linha de `recompras` (snake_case, banco) e o shape
 * `SolicitacaoRecompra` (camelCase) que a UI consome — o mesmo que o
 * `recomprasStore` em memória servia.
 *
 * SNAPSHOT (D4): `titulo_numero`, `cedente_nome`, `sacado_nome` e
 * `operacao_numero` são colunas próprias congeladas no momento do registro
 * (igual `documentos_gerados`). NÃO há lookup: a leitura usa os snapshots direto
 * e a escrita os recebe já resolvidos do título que o dialog tem.
 *
 * SOFT DELETE (D8): cancelar uma solicitação = status `Cancelado` (5º valor do
 * enum `recompra_status`), nunca DELETE físico — preserva a trilha jurídica. O
 * `StatusRecompra` do front ainda tem só 4 valores (sem `Cancelado`); o cast em
 * `rowToRecompra` carrega o valor do banco fielmente (dívida: ampliar o tipo
 * quando a UI tratar o cancelamento — 2.6.5).
 *
 * CONTEXTO NA ESCRITA: `cedente_id` e `valor` não existem no `SolicitacaoRecompra`
 * e entram por `RecompraContext`, resolvidos pelo hook/dialog no create.
 * `operacao_id` é nullable (2.6.1c): recompra criada em /cobranças pode não ter
 * operação → `ctx.operacaoId` é opcional e vira `null`. `valor` é proforma (D1) →
 * default 0 até a máquina de estados financeira existir.
 */

export type RecompraRow = Database["public"]["Tables"]["recompras"]["Row"];
export type RecompraInsert =
  Database["public"]["Tables"]["recompras"]["Insert"];

/** Converte uma linha de `recompras` no SolicitacaoRecompra consumido pela UI. */
export function rowToRecompra(row: RecompraRow): SolicitacaoRecompra {
  return {
    id: row.id,
    tituloId: row.titulo_id,
    tituloNumero: row.titulo_numero,
    cedenteNome: row.cedente_nome,
    sacadoNome: row.sacado_nome,
    operacaoId: row.operacao_id ?? "",
    operacaoNumero: row.operacao_numero,
    tipoAcao: row.acao as TipoAcaoRecompra,
    motivo: row.motivo,
    observacoes: row.observacoes,
    responsavel: row.responsavel,
    status: row.status as StatusRecompra,
    criadoEm: row.created_at,
    resolvidoEm: row.resolvido_em ?? undefined,
  };
}

/** Dados que a UI não carrega no SolicitacaoRecompra mas o banco exige na escrita. */
export interface RecompraContext {
  cedenteId: string;
  operacaoId?: string;
  valor?: number;
}

/**
 * Converte um SolicitacaoRecompra (ou parcial) na linha gravável de `recompras`.
 * NÃO inclui id/created_at/updated_at/created_by (gerados pelo banco). `cedente_id`,
 * `operacao_id` e `valor` vêm do `ctx` (ver cabeçalho).
 */
export function recompraToRow(
  r: Partial<SolicitacaoRecompra>,
  ctx: RecompraContext,
): Omit<RecompraInsert, "id" | "created_at" | "updated_at" | "created_by"> {
  return {
    acao: r.tipoAcao ?? "Análise interna",
    cedente_id: ctx.cedenteId,
    cedente_nome: r.cedenteNome ?? "",
    motivo: r.motivo ?? "",
    observacoes: r.observacoes ?? "",
    operacao_id: ctx.operacaoId ?? null,
    operacao_numero: r.operacaoNumero ?? "",
    resolvido_em: r.resolvidoEm ?? null,
    responsavel: r.responsavel ?? "",
    sacado_nome: r.sacadoNome ?? "",
    status: r.status ?? "Em análise de recompra",
    titulo_id: r.tituloId ?? "",
    titulo_numero: r.tituloNumero ?? "",
    valor: ctx.valor ?? 0,
  };
}
