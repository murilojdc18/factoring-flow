/**
 * Feature flags da migração incremental Mock → Supabase.
 *
 * Cada flag controla se a página/módulo correspondente lê dados reais do
 * Supabase ou continua usando os mocks em `src/data/mock*.ts`.
 *
 * Regras:
 * - Toda flag começa em `false` (mock). Vire para `true` apenas quando o
 *   hook real estiver implementado e os dados estiverem semeados.
 * - Os mocks NÃO devem ser removidos enquanto qualquer flag estiver em `false`.
 * - Mappers em `src/lib/mappers/` garantem que o shape consumido pela UI
 *   permanece idêntico ao dos mocks.
 */
export const USE_SUPABASE = {
  configuracoes: false,
  // Ligar `clientes` ativa o Supabase em todos os consumidores que passam pelo
  // hook useClientes (páginas Clientes, Titulos, Operacoes, OperacaoDetalhes,
  // OperacaoSimulador, GerarDocumentoDialog, Relatorios; também é dependência
  // interna de useTitulos/useOperacoes para resolver cedenteNome). A única
  // função que ainda toca `Cliente` como tipo é `preencherDocumento.ts`, que
  // é pura e recebe o cedente por parâmetro — não bypassa esta flag.
  clientes: true,
  // Ligar `sacados` ativa o Supabase em todos os consumidores que passam pelo
  // hook useSacados (páginas Sacados, Titulos, GerarDocumentoDialog,
  // Relatorios; também é dependência interna de useTitulos para resolver
  // sacadoNome). `preencherDocumento.ts` recebe os sacados por parâmetro
  // (função pura) — não bypassa esta flag.
  sacados: true,
  // Ligar `titulos` ativa o Supabase em todos os consumidores que passam pelo
  // hook useTitulos (páginas Titulos: lista + TituloForm; Cobrancas;
  // OperacaoDetalhes; OperacaoSimulador; GerarDocumentoDialog; Relatorios).
  // `preencherDocumento.ts` recebe os títulos por parâmetro (função pura) —
  // não bypassa esta flag.
  titulos: true,
  // Ligar `operacoes` ativa o Supabase em todos os consumidores que passam pelo
  // hook useOperacoes (páginas Operacoes, OperacaoDetalhes, OperacaoSimulador,
  // GerarDocumentoDialog, Relatorios). `preencherDocumento.ts` recebe a
  // operação por parâmetro (função pura) — não bypassa esta flag. Compliance
  // tem flag própria e usa seed estático em mockCompliance.ts. A criação de
  // operação (escrita atômica via RPC) foi entregue na 2.4b.
  operacoes: true,
  // Ligar `modelos_documentos` ativa o Supabase APENAS nos consumidores que
  // passam pelo hook useModelosDocumento (página Contratos: leitura dos modelos;
  // e GerarDocumentoDialog). A escrita de modelos pela UI segue desativada
  // (decisão D5 da 2.5). Decisão da 2.5a.
  modelos_documentos: true,
  // Ligar `documentos` ativa o Supabase APENAS nos consumidores que passam pelo
  // hook useDocumentosGerados (Contratos, Relatorios, OperacaoDetalhes), que
  // substitui o documentosStore em memória. Decisão da 2.5b.
  documentos: true,
  // Ligar `recompras` ativa o Supabase APENAS nos consumidores que passam pelo
  // hook useRecompras (RecompraDialog, OperacaoDetalhes, Cobrancas). Fluxo
  // proforma (D1): registra a solicitação, não mexe em status financeiro de
  // título/operação. Vira `true` na 2.6.6, depois de dialog + consumidores
  // ligados (2.6.4/2.6.5). Decisão da 2.6.3. Virada na 2.6.6.
  recompras: true,
  // Ligar `cobrancas` ativa o Supabase nos consumidores que passam pelo hook
  // useCobrancas (página /cobranças: registro de eventos + estado de cobrança
  // derivado por título). Virada na 2.8.5, após migration (2.8.1),
  // mapper/derivação (2.8.2), hook (2.8.3) e UI (2.8.4). Decisão da 2.8.
  cobrancas: true,
  // Ligar `compliance` ativa o Supabase nos consumidores que passam pelo hook
  // useCompliance (página /compliance: análises de risco append-only + agregação
  // da atual por alvo com histórico). Políticas/checklists seguem estáticos.
  // Virada na 2.9.5, após migration (2.9.1), mapper/agregação (2.9.2), hook
  // (2.9.3) e UI (2.9.4). Decisão da 2.9.
  compliance: true,
} as const;

export type DataSourceModule = keyof typeof USE_SUPABASE;

export function isSupabaseEnabled(module: DataSourceModule): boolean {
  return USE_SUPABASE[module];
}