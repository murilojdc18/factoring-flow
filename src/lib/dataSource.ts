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
  clientes: false,
  sacados: false,
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