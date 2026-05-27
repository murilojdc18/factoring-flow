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
  // Ligar `clientes` ativa o Supabase APENAS nos consumidores que passam pelo
  // hook useClientes (página Clientes e lookup de cedente em Titulos).
  // OperacaoSimulador, Relatorios, OperacaoDetalhes e preencherDocumento leem
  // `mockClientes` direto e NÃO mudam com esta flag —
  // cada um migra quando titulos/operacoes forem ligadas (decisão da 2.1).
  clientes: true,
  // Ligar `sacados` ativa o Supabase APENAS nos consumidores que passam pelo
  // hook useSacados (página Sacados e filtro de sacado em Titulos).
  // Relatorios e preencherDocumento leem `mockSacados` direto e NÃO mudam com
  // esta flag — cada um migra quando titulos/relatorios/documentos forem
  // ligados (decisão da 2.2).
  sacados: true,
  // Ligar `titulos` ativa o Supabase APENAS nos consumidores que passam pelo
  // hook useTitulos (páginas Titulos: lista + TituloForm; e Cobrancas).
  // OperacaoDetalhes, OperacaoSimulador, Relatorios e preencherDocumento leem
  // `mockTitulos` direto e NÃO mudam com esta flag — cada um migra quando
  // operacoes/relatorios/documentos forem ligados (decisão da 2.3).
  // Cobrancas migrada para useTitulos na 2.7. Esta flag agora controla também
  // a página de cobranças.
  titulos: true,
  // Ligar `operacoes` ativa o Supabase APENAS nos consumidores que passam pelo
  // hook useOperacoes (página Operacoes: lista + KPIs; e OperacaoDetalhes:
  // leitura da operação/títulos/histórico). Relatorios,
  // GerarDocumentoDialog/preencherDocumento e Compliance leem `mockOperacoes`
  // direto e NÃO mudam com esta flag — cada um migra quando sua entidade
  // (relatorios/documentos/compliance) for ligada. A criação de operação
  // (escrita atômica via RPC) é a sub-tarefa 2.4b. Decisão da 2.4a.
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
  compliance: false,
} as const;

export type DataSourceModule = keyof typeof USE_SUPABASE;

export function isSupabaseEnabled(module: DataSourceModule): boolean {
  return USE_SUPABASE[module];
}