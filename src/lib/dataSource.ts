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
  // OperacaoSimulador, Relatorios, OperacaoDetalhes, TituloForm e
  // preencherDocumento leem `mockClientes` direto e NÃO mudam com esta flag —
  // cada um migra quando titulos/operacoes forem ligadas (decisão da 2.1).
  clientes: true,
  // Ligar `sacados` ativa o Supabase APENAS nos consumidores que passam pelo
  // hook useSacados (página Sacados e filtro de sacado em Titulos). TituloForm,
  // Relatorios e preencherDocumento leem `mockSacados` direto e NÃO mudam com
  // esta flag — cada um migra quando titulos/relatorios/documentos forem
  // ligados (decisão da 2.2).
  sacados: true,
  titulos: false,
  operacoes: false,
  contratos: false,
  cobrancas: false,
  compliance: false,
} as const;

export type DataSourceModule = keyof typeof USE_SUPABASE;

export function isSupabaseEnabled(module: DataSourceModule): boolean {
  return USE_SUPABASE[module];
}