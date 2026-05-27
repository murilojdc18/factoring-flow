# Plano 2.8 — migrar cobranças (eventos + estados) pro Supabase

> Tarefa: ligar a página /cobranças ao Supabase de verdade. O `cobrancasStore`
> (eventos de contato + estado de cobrança por título) ainda vive em memória —
> flag `cobrancas: false` em `dataSource.ts`, tudo some no F5. Fecha a última
> dívida grande da Fase 2 (registrada em §6 do `plano-2.7.md`).
> **Decisões D1–D5 aprovadas por Murilo em 2026-05-27.** Segue o molde de
> `useRecompras` + `lib/mappers/recompra.ts` (2.6).
> **2.8 CONCLUÍDA em 2026-05-27.** Migration + mapper + util compartilhado +
> derivação pura + hook dual + UI migrada + flag ligada. Teste manual e2e OK
> (testes 1–5: registro, persistência no F5, badges derivando, "Marcar como" →
> evento, observação → `Outro`). `tsc -p tsconfig.app.json` limpo, 102 testes
> verdes.

---

## 1. Descoberta (estado encontrado)

A investigação (2.8.0) mapeou o terreno antes de qualquer código:

- A tabela **`cobrancas_historico` já existe** (criada na migration original do
  Lovable, `20260426215910`), **vazia** (0 linhas), com FKs corretas:
  - `titulo_id → titulos(id)` **ON DELETE CASCADE**
  - `operacao_id → operacoes(id)` **ON DELETE SET NULL** (nullable)
  - `created_by → auth.users(id)` **ON DELETE SET NULL**
- A **RLS já está endurecida** (não é `using(true)`) desde a migration
  `20260519110208`: SELECT para `admin`/`diretoria`, INSERT/UPDATE para
  `cobranca`+`administrador`, DELETE só `administrador`. **Não há nada a fazer em
  RLS nesta tarefa.**
- Os enums de apoio já existem:
  - `cobranca_tipo`: `Ligação`, `E-mail`, `WhatsApp`, `Visita`, `Carta`, `Outro`
  - `cobranca_resultado`: `Promessa de pagamento`, `Sem retorno`, `Negociado`,
    `Recusado`, `Pagamento confirmado`, `Outro`
- O mock (`src/data/mockCobrancas.ts`) tem **dois** conceitos distintos:
  - **Eventos** (`EventoCobranca`) — encaixam na tabela `cobrancas_historico`,
    com 3 atritos (ver §4).
  - **Estado por título** (`EstadoCobranca`: status visual + última/próxima ação)
    — **não tem tabela nem enum** no banco.

### Atritos identificados (eventos)

| Campo no mock (UI) | Coluna no banco | Situação |
|---|---|---|
| `dataHora`, `observacoes`, `proximaAcaoData` | `data_contato`, `observacoes`, `proximo_contato` | encaixa |
| `tipoContato`: Telefone / Presencial | `tipo` (enum): Ligação / Visita | nomes diferentes (D3) |
| `resultado`: **texto livre** | `resultado`: **enum** (6 categorias) | conflito de tipo (D1) |
| `proximaAcao`: **texto livre** | *(não existe coluna)* | sem lugar (D4) |
| `tituloNumero`, `cedenteNome`, `sacadoNome` (snapshot) | *(não existe)* | derivado do título no read |

---

## 2. Decisões tomadas

| # | Decisão | Escolha | Razão |
|---|---|---|---|
| **D1** | Campo "resultado" do contato | **Dropdown (enum `cobranca_resultado`) + narrativa no campo "Observações"** | Aproveita o enum que já existe; gera dado categorizado útil para relatório/régua futura. Sem alteração de schema neste ponto. |
| **D2** | Estado de cobrança por título | **Derivado** (título + dias de vencimento + categoria do último evento) — **sem tabela/enum novo** | O enum `cobranca_resultado` mapeia direto para os status visuais; evita +1 tabela, +1 enum, +1 hook e lógica de upsert. |
| **D3** | Rótulos de "tipo de contato" | **Alinhar a UI ao enum do banco** | Fonte única de verdade; evita uma camada de tradução que pode desalinhar. Muda 2 rótulos visíveis: *Telefone→Ligação*, *Presencial→Visita* (e a UI ganha *Carta*). |
| **D4** | "Próxima ação" (texto livre) | **Adicionar coluna `proxima_acao text` em `cobrancas_historico`** (migration aditiva idempotente) | Único ajuste de schema. Preserva o texto livre da próxima ação que a UI já tem (a *data* já cabe em `proximo_contato`). Sem isso, a coluna "Próxima ação" da tela perderia o texto. |
| **D5** | `operacao_id` do evento + reuso de código | **Preencher por back-link** (operação mais recente do título), defensivo → `null` se não resolver; **extrair `resolverOperacaoDoTitulo` para util compartilhado** | Mesma lógica já provada em `useRecompras` (2.7.1); dá rastreabilidade. Centralizar evita duplicar a query. |

### Regra da D5 (refactoring de código em produção)

Como o `resolverOperacaoDoTitulo` hoje vive dentro de `useRecompras.ts` e está
**no ar**, a extração segue regra estrita para não regredir:

1. Extrair para **`src/lib/operacaoLookup.ts`** (sem mudar a lógica).
2. **`useRecompras.ts`** passa a **importar** o util — sem alterar comportamento.
3. **`useCobrancas.ts`** usa o **mesmo** util.
4. Rodar **`tsc` + `vitest` ANTES de avançar** — esperado: **86 testes verdes**.
5. Se quebrar: **reverter** a extração e **duplicar** o código no `useCobrancas`.
   *(DRY violation é preferível a regressão em código de produção.)*

---

## 3. Sub-tarefas (ordem de execução)

| # | Sub-tarefa | Conteúdo | Status |
|---|---|---|---|
| **2.8.0** | Investigação | Mapear schema/enums/RLS/FKs de `cobrancas_historico` (via `list_tables` + `pg_constraint`), confirmar tabela vazia, identificar os 2 conceitos do mock e os 3 atritos de eventos. Eleger o molde (`useRecompras`/`recompra.ts`). | ✅ |
| **2.8.1** | Migration aditiva | `..._alter_cobrancas_historico_add_proxima_acao.sql`: `ADD COLUMN IF NOT EXISTS proxima_acao text NOT NULL DEFAULT ''`. Aditiva, idempotente, **não** toca RLS. | ✅ |
| **2.8.2** | Mapper + extração D5 + testes | `lib/mappers/cobranca.ts` (`rowToEvento`/`eventoToRow` + funções **puras** `deriveStatus`/`deriveEstado`). Extrair `src/lib/operacaoLookup.ts` (regra D5). Testes em `cobranca.test.ts`. | ✅ |
| **2.8.3** | Hook | `src/hooks/useCobrancas.ts`: TanStack Query + fallback mock (espelha `useRecompras`). `registrarEvento` resolve `created_by`/`responsavel` do usuário logado + back-link `operacao_id` via util. Estado derivado da lista (`estado(tituloId)`). | ✅ |
| **2.8.4** | UI `Cobrancas.tsx` | Trocar import `mockCobrancas` → `useCobrancas`. Diálogo "Registrar contato": `tipo` e `resultado` viram selects do enum; textarea narrativa → "Observações"; "Próxima ação" (texto + data). `estadoEfetivo` usa o derivado. "Marcar como" vira evento rápido (§6). | ✅ |
| **2.8.5** | Virar a flag + types | `cobrancas: true` em `dataSource.ts` + regenerar `integrations/supabase/types.ts`. **Avisar Murilo para ligar/desligar o MCP.** | ✅ |
| **2.8.6** | Teste manual e2e | Registrar contato → aparece no histórico e no banco; status derivado correto por categoria; **F5 persiste** (não some mais). | ✅ |
| **2.8.7** | Docs + memória | Fechar `docs/plano-2.8.md` + atualizar `MEMORY.md`/`estado-2.8`. | ✅ |

---

## 4. Mapa de campos (eventos → `cobrancas_historico`)

| `EventoCobranca` (UI) | Coluna (`cobrancas_historico`) | Observação |
|---|---|---|
| `dataHora` (ISO completo) | `data_contato` (timestamptz) | direto |
| `tipoContato` | `tipo` (enum `cobranca_tipo`) | UI alinhada ao enum (D3) |
| *(novo)* resultado categórico | `resultado` (enum `cobranca_resultado`) | dropdown (D1) |
| `resultado` narrativa atual + `observacoes` | `observacoes` (text) | narrativa entra aqui (D1) |
| `proximaAcao` (texto livre) | `proxima_acao` (text) | **nova coluna** (D4) |
| `proximaAcaoData` | `proximo_contato` (date) | direto |
| `usuario` ("Usuário atual") | `responsavel` (text) + `created_by` (uuid) | resolvido do usuário logado |
| — | `operacao_id` (uuid, nullable) | back-link defensivo (D5) |
| `tituloNumero`/`cedenteNome`/`sacadoNome` | *(não gravados)* | **derivados do título no read** (a tela já tem `useTitulos`) |

Os snapshots de nome **não** são persistidos: a tabela referencia `titulo_id` e
a página enriquece os eventos cruzando com a lista de títulos já carregada.

---

## 5. Regra de derivação de status (D2)

`deriveStatus(titulo, ultimoEvento?)` — precedência de cima para baixo:

1. título `status === "Liquidado"` → **"Liquidado"**
2. título `status === "Recomprado"` → **"Para recompra"**
3. há último evento? pela categoria do `resultado`:
   - `Pagamento confirmado` → **"Liquidado"**
   - `Promessa de pagamento` → **"Promessa de pagamento"**
   - `Negociado` → **"Em negociação"**
   - `Recusado` / `Sem retorno` / `Outro` → cai para a regra de vencimento (4)
4. senão (sem evento decisivo): `dias < 0` → **"Em cobrança"**; senão → **"A vencer"**

`deriveEstado` complementa:

- `ultimaAcao` = último evento ? `"{tipo} — {resultado}"` : `"—"`
- `proximaAcao` = último evento `proxima_acao` || (`dias < 0` ? `"Iniciar contato"` : `"Aguardar vencimento"`)
- `proximaAcaoData` = último evento `proximo_contato` || `titulo.dataVencimento`

Ambas são **funções puras** → cobertas por teste unitário (atende a exigência do
CLAUDE de testar lógica financeira/de estado antes de produção).

---

## 6. Mudança do botão "Marcar como" (§5 do plano de revisão)

Com o estado **derivado**, o atalho "Marcar como" não pode mais setar um campo
solto. Ele passa a **registrar um evento rápido**:

| Item do menu | Vira evento com `resultado` = |
|---|---|
| Promessa de pagamento | `Promessa de pagamento` |
| Em negociação | `Negociado` |
| Liquidado | `Pagamento confirmado` |
| ~~Para recompra~~ | **removido** — já existe "Marcar para recompra/substituição" (abre `RecompraDialog`) |

É a **única** mudança de comportamento da tela — implícita na escolha "derivar"
(D2).

---

## 7. Fora de escopo (deliberado)

- **Régua automática** / envio de e-mail / SMS / WhatsApp.
- **Remoção do `cobrancasStore`** — mantido como fallback do modo mock até a
  limpeza geral dos mocks.
- **4 status órfãos em `titulo_status`** (`Em análise de recompra`,
  `Recompra solicitada`, `Substituição solicitada`, `Resolvido`) — dívida antiga
  registrada desde a 2.6, não tocada aqui.

---

## 8. Lições aprendidas

- **`tsc --noEmit` na raiz era no-op.** O `tsconfig.json` da raiz tem `"files": []`
  + `references`, e o script `build` é só `vite build` (não type-checa). O comando
  correto é **`tsc -p tsconfig.app.json`**. As sub-tarefas 2.1–2.8.3 rodaram só
  com vitest + visual; o type-check estava silencioso o tempo todo — sem bug
  acumulado por sorte (ao rodar o comando certo na 2.8.4, só apareceu um ripple
  esperado da própria 2.8.4). Registrado na memória técnica.
- **Probe `SELECT 1` via `apply_migration` polui o ledger** — nesta tarefa rodou
  3× (1 na 2.8.1 + 2 na 2.8.5), além da própria migration gravada com o timestamp
  da hora (não do arquivo). Reconciliado no fechamento (§7 do `plano-2.7.md` tinha
  o mesmo padrão). Lição reforçada: usar o probe com parcimônia e reconciliar no fim.
- **Mapear a FONTE DE DADOS de cada consumidor antes de assumir comportamento**
  (já registrado na 2.7) — reforçado: o `Cobrancas.tsx` tinha o `cobrancasStore`
  e o `useTitulos` como fontes distintas; só a leitura cuidadosa revelou os 2
  conceitos (eventos × estado) e o descompasso com a tabela pré-existente.
- **Bases antes de UI** — fazer E+F+C (tipos/mock, mapper, derivação pura com
  testes) **antes** de A+B+D (página de 810 linhas) deixou a UI compilar em passos
  e isolou regressão. Estratégia que funcionou; repetir em telas grandes.

---

## 9. Dívidas remanescentes

- **`cobrancasStore`/`mockCobrancas` órfãos** — o store em memória e o mapa
  `estados`/`setStatus` viraram vestigiais (o hook deriva tudo dos eventos).
  Mantidos como fallback do modo mock; remoção em bloco na limpeza geral dos
  mocks no fim da Fase 2.
- **Performance do `eventosEnriquecidos`** — o enriquecimento é O(eventos × títulos)
  via `Map` de títulos (na prática O(eventos) após montar o Map). Aceitável até a
  ordem de ~1.000 títulos; reavaliar se o volume crescer.
- **4 status órfãos em `titulo_status`** — dívida antiga (2.6), não tocada.
