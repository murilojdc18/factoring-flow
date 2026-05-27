import type { EventoCobranca } from "@/data/mockCobrancas";
import type { Database } from "@/integrations/supabase/types";

/**
 * Mapper de cobranças — eventos de contato (sub-tarefa 2.8.2).
 *
 * Converte entre a linha de `cobrancas_historico` (snake_case, banco) e o shape
 * `EventoCobranca` (camelCase) que a UI consome — o mesmo que o `cobrancasStore`
 * em memória servia. Espelha o padrão de `lib/mappers/recompra.ts` (2.6).
 *
 * D1 (resultado = enum): `resultado` é uma das 6 categorias de
 * `cobranca_resultado`, escolhida num dropdown. A narrativa livre do contato vai
 * para `observacoes`. `EventoCobranca.resultado` é `ResultadoCobranca` (mesmos
 * valores do enum), então o valor trafega sem cast.
 *
 * D3 (tipo alinhado ao enum): `tipo` é `cobranca_tipo` (Ligação, E-mail,
 * WhatsApp, Visita, Carta, Outro) e o `TipoContato` do mock lista exatamente os
 * mesmos valores (alinhados na 2.8.4) — sem cast entre eles.
 *
 * D4 (proxima_acao = texto livre): coluna adicionada na migration 2.8.1 e já
 * nativa no `types.ts` (regenerado na 2.8.5) — lida e gravada direto.
 *
 * D5 (operacaoId vem do contexto): `operacao_id` é nullable e resolvido por
 * back-link automático no hook (via `operacaoLookup`), não vem do EventoCobranca.
 * Entra aqui pelo `CobrancaContext`.
 *
 * SNAPSHOT: a tabela NÃO tem colunas de nome (titulo_numero/cedente_nome/...).
 * `rowToEvento` devolve esses campos vazios; a página os deriva cruzando o
 * `titulo_id` com a lista de títulos já carregada (decisão da 2.8, §4 do plano).
 */

export type CobrancaRow =
  Database["public"]["Tables"]["cobrancas_historico"]["Row"];
export type CobrancaInsert =
  Database["public"]["Tables"]["cobrancas_historico"]["Insert"];

/** Dados que a UI não carrega no EventoCobranca mas o banco aceita na escrita. */
export interface CobrancaContext {
  operacaoId?: string;
}

/** Converte uma linha de `cobrancas_historico` no EventoCobranca consumido pela UI. */
export function rowToEvento(row: CobrancaRow): EventoCobranca {
  return {
    id: row.id,
    tituloId: row.titulo_id,
    // Snapshots não existem na tabela — derivados do título no read (§4 do plano).
    tituloNumero: "",
    cedenteNome: "",
    sacadoNome: "",
    dataHora: row.data_contato,
    usuario: row.responsavel,
    tipoContato: row.tipo, // D3: TipoContato == cobranca_tipo
    resultado: row.resultado, // D1: ResultadoCobranca == cobranca_resultado
    proximaAcao: row.proxima_acao, // D4: coluna nativa (NOT NULL default '')
    proximaAcaoData: row.proximo_contato ?? "",
    observacoes: row.observacoes,
  };
}

/**
 * Converte um EventoCobranca (ou parcial) na linha gravável de
 * `cobrancas_historico`. NÃO inclui id/created_at/created_by (gerados pelo banco;
 * a tabela não tem updated_at). `operacao_id` vem do `ctx` (D5). `data_contato`
 * indefinido é omitido no insert → o banco aplica o default `now()`. `tipo`/
 * `resultado` defaultam para o valor neutro `Outro` (ambos válidos nos enums).
 */
export function eventoToRow(
  e: Partial<EventoCobranca>,
  ctx: CobrancaContext,
): Omit<CobrancaInsert, "id" | "created_at" | "created_by"> {
  return {
    titulo_id: e.tituloId ?? "",
    operacao_id: ctx.operacaoId ?? null,
    data_contato: e.dataHora, // undefined → omitido → DB default now()
    tipo: e.tipoContato ?? "Outro",
    resultado: e.resultado ?? "Outro",
    responsavel: e.usuario ?? "",
    observacoes: e.observacoes ?? "",
    proxima_acao: e.proximaAcao ?? "", // D4
    proximo_contato: e.proximaAcaoData || null,
  };
}
