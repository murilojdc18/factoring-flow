# Mappers

Funções de conversão entre o formato do banco (snake_case, tipos do Supabase)
e o shape consumido pela UI (camelCase, mesmos tipos dos mocks em
`src/data/mock*.ts`).

Cada entidade tem seu próprio arquivo:

- `cliente.ts` — `rowToCliente` / `clienteToRow`
- `sacado.ts` — `rowToSacado` / `sacadoToRow`
- `titulo.ts` — `rowToTitulo` / `tituloToRow`
- `operacao.ts` — `rowToOperacao` / `operacaoToRow`
- `documento.ts` — `rowToDocumento` / `documentoToRow`
- `cobranca.ts` — `rowToEvento` / `eventoToRow`
- `compliance.ts` — `rowToAnalise` / `analiseToRow`

**Regra central:** o shape de saída deve ser idêntico ao do mock equivalente
para que componentes de UI não precisem mudar quando a flag em
`src/lib/dataSource.ts` é virada.