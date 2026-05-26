# Plano 2.6 — Recompras e substituições

> Tarefa: ligar ao Supabase o módulo de **recompra / substituição / análise
> interna** de títulos. Hoje é 100% mock em memória (`recomprasStore` em
> `src/data/mockRecompras.ts`), some no F5.
> Etapa 0 (investigação) concluída em 2026-05-26. **2.6 CONCLUÍDA em 2026-05-26**:
> migrations 2.6.1/2.6.1b/2.6.1c aplicadas, mapper+hook+dialog+consumidores
> ligados, flag `recompras` = `true`. Decisões D1–D8 implementadas conforme
> recomendado. **Dívida conhecida:** /cobranças ainda lê do mock — ver §8.

---

## 1. O que existe hoje (investigação)

### Front (mock)
- **`src/data/mockRecompras.ts`** concentra tudo:
  - Tipos: `TipoAcaoRecompra` (`Recompra` | `Substituição` | `Análise interna`),
    `StatusRecompra` (`Em análise de recompra` | `Recompra solicitada` |
    `Substituição solicitada` | `Resolvido`), `SolicitacaoRecompra`,
    `EstadoRecompraTitulo`.
  - Helpers: `statusInicialPorAcao`, `STATUS_RECOMPRA`, `TIPOS_ACAO_RECOMPRA`.
  - `recomprasStore`: store **em memória** com pub/sub (`let solicitacoes`,
    `let estados`). Sem localStorage — **nada persiste**.
  - `useRecompras()`: hook reativo (mora dentro do mock) que devolve
    `solicitacoes`, `estado(tituloId)`, `porOperacao(operacaoId)`.
- **`RecompraDialog.tsx`**: modal compartilhado (/operacoes e /cobrancas).
  Chama `recomprasStore.criar(...)`. Alerta "fluxo proforma — não gera cobrança,
  não altera valores financeiros".
- **`RecompraStatusBadge.tsx`**: badge dos 4 status.
- **Consumidores**:
  - `OperacaoDetalhes.tsx`: badge de estado por título na tabela de títulos +
    card "Recompras e substituições" (lista `porOperacao` + dropdown que chama
    `recomprasStore.atualizarStatus`).
  - `Cobrancas.tsx`: badge de estado por título (`getEstadoRecompra`) + abre o
    dialog via "Marcar para recompra/substituição".

### Banco (Supabase, via MCP read-only)
- **NÃO existe tabela `recompras` nem `substituicoes`** (0 tabelas no schema).
- **Mas o scaffolding parcial já está lá** (migration inicial do Lovable
  `20260426215910_...`):
  - enum **`recompra_acao`** = `Recompra`, `Substituição`, `Análise interna`
    → bate 100% com `TipoAcaoRecompra` do mock.
  - enum **`titulo_status`** tem **11 valores**: os 7 financeiros
    (`Disponível`, `Em análise`, `Operado`, `Liquidado`, `Vencido`,
    `Recomprado`, `Cancelado`) **+ 4 de recompra** (`Em análise de recompra`,
    `Recompra solicitada`, `Substituição solicitada`, `Resolvido`).
  - enum **`operacao_status`** inclui `Recomprada`.
- Padrão de RPC atômica já existe: `criar_operacao(payload jsonb) returns uuid`
  (`SECURITY DEFINER`, checagem manual de papel via `has_any_role`, erros
  `P0001`–`P0004`).
- Estado das tabelas vizinhas: `operacoes` 2 linhas, `titulos` 6, `clientes` 1,
  `operacao_historico` 2, `cobrancas_historico` 0.

### Flag
- `dataSource.ts` **não tem flag `recompras` ainda**. Será adicionada
  (consumidores no escopo: `RecompraDialog`, `OperacaoDetalhes`, `Cobrancas`).

---

## 2. Drift / conflito de design encontrado (decisão central)

O banco e o mock **discordam** sobre onde mora o status de recompra:

| | Mock (`mockRecompras.ts`) | Banco (enum `titulo_status`) |
|---|---|---|
| Status de recompra | estado **separado** por título (`EstadoRecompraTitulo`), independente do status financeiro | embutido como **valores do `titulo_status`** |
| Status financeiro do título durante recompra | preservado (ex.: título "Operado" + recompra "Resolvido") | seria sobrescrito |
| `TituloStatus` do front | só os **7** financeiros | banco tem **11** |

Ou seja: o Lovable previu fundir o status de recompra dentro do título, mas o
mock manteve separado (e mais correto: um título pode estar "Operado" **e** ter
uma recompra "Resolvido" ao mesmo tempo). Isso é o **D3** abaixo.

---

## 3. Schema proposto (recomendação — sujeito a D1–D7)

### Novo enum `recompra_status`
```
'Em análise de recompra', 'Recompra solicitada',
'Substituição solicitada', 'Resolvido', 'Cancelado'
```
- Os 4 primeiros são os rótulos do mock, mas como tipo próprio — **não**
  reaproveita os órfãos de `titulo_status` (ver D3).
- **`Cancelado`** é novo (D8): soft delete. Cancelar uma solicitação = mudar
  status para `Cancelado`; **nunca** DELETE físico (preserva audit jurídico).

### Tabela `public.recompras` (como APLICADA)
> Reflete o banco após 2.6.1 + 2.6.1b + 2.6.1c. Diverge da proposta original nos
> pontos ⚠️: a aplicada **adicionou `cedente_id` e `valor`**, manteve as FKs em
> `ON DELETE RESTRICT` (mais conservador que CASCADE/SET NULL) e usou `date` em
> `resolvido_em`.

| coluna | tipo | regra |
|---|---|---|
| `id` | uuid | PK, `gen_random_uuid()` |
| `titulo_id` | uuid | NOT NULL, FK → `titulos(id)` ⚠️ ON DELETE **RESTRICT** |
| `operacao_id` | uuid | ⚠️ **NULL** (relaxado na 2.6.1c), FK → `operacoes(id)` ON DELETE RESTRICT |
| `cedente_id` | uuid | ⚠️ **NOT NULL** (novo), FK → `clientes(id)` ON DELETE RESTRICT |
| `acao` | `recompra_acao` | NOT NULL |
| `status` | `recompra_status` | NOT NULL DEFAULT `'Em análise de recompra'` |
| `motivo` | text | NOT NULL DEFAULT '' |
| `valor` | numeric(15,2) | ⚠️ **novo** — NOT NULL DEFAULT 0 (proforma; 0 hoje — D1) |
| `observacoes` | text | NOT NULL DEFAULT '' |
| `resolvido_em` | ⚠️ **date** | NULL (preenchido no hook quando status = 'Resolvido' — D7) |
| `titulo_numero` | text | NOT NULL DEFAULT '' (snapshot — D4) |
| `cedente_nome` | text | NOT NULL DEFAULT '' (snapshot) |
| `sacado_nome` | text | NOT NULL DEFAULT '' (snapshot) |
| `operacao_numero` | text | NOT NULL DEFAULT '' (snapshot) |
| `responsavel` | text | NOT NULL DEFAULT '' (adicionado na 2.6.1b) |
| `created_by` | uuid | NULL, FK → `auth.users(id)` ON DELETE SET NULL |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() (trigger `set_updated_at`) |

- Índices aplicados: `idx_recompras_titulo_id`, `idx_recompras_operacao_id` (o
  índice em `status` proposto **não** foi criado — sem necessidade).
- **Estado por título** (`EstadoRecompraTitulo`) **não virou coluna nem tabela**
  — é **derivado** no hook (`estadoDerivado`: recompra mais recente por título,
  ignorando `Cancelado` — R3/D8). Fonte única = a própria tabela.

### RLS (espelha `cobrancas_historico` — ver D6)
- SELECT: `is_admin_or_diretoria()` (consistente com todo o app; dívida D6 da 2.5).
- INSERT / UPDATE: `has_any_role(... ['administrador','operacional','cobranca'])`.
- **DELETE: nenhuma policy** (D8 — soft delete via status `Cancelado`, sem
  remoção física). Sem `DELETE` o RLS já bloqueia qualquer exclusão por padrão.

### Sem RPC (proforma) — ver D5
Como o fluxo é proforma (1 tabela só), `create` = INSERT e `updateStatus` =
UPDATE diretos no hook (padrão `useDocumentosGerados`, 2.5b). **Não** precisa de
RPC atômica como `criar_operacao` — isso só se justificaria se a recompra
mexesse em título/operação na mesma transação (D1).

---

## 4. Decisões pendentes (responder antes da Etapa 1)

| # | Decisão | Recomendação |
|---|---|---|
| **D1** | **Escopo financeiro.** 2.6 só **persiste a solicitação** (proforma, espelha o mock, NÃO mexe no status financeiro de título/operação)? Ou já implementa a **máquina de estados** (recompra → título vira `Recomprado` e operação vira `Recomprada`, gera valor a cobrar)? | **Proforma agora.** Espelha o que a UI já faz. Máquina de estados é sub-tarefa futura, deliberada (envolve estorno da operação, cobrança do cedente, valor de recompra). |
| **D2** | **Uma tabela ou duas.** Tabela única `recompras` com coluna `acao` (Recompra/Substituição/Análise interna), ou separar recompra de substituição? | **Uma tabela.** O mock e o enum `recompra_acao` já tratam como um conceito só com discriminador. |
| **D3** | **Enum de status.** Criar `recompra_status` dedicado, ou reaproveitar os 4 valores que já existem (órfãos) dentro de `titulo_status`? | **Enum dedicado `recompra_status`.** Mantém status financeiro e de recompra independentes (igual mock). Os 4 órfãos em `titulo_status` ficam (remover valor de enum no Postgres é custoso) — registro como dívida. |
| **D4** | **Snapshot vs lookup.** Gravar `titulo_numero`/`cedente_nome`/`sacado_nome`/`operacao_numero` como snapshot na linha (igual `documentos_gerados`, D2 da 2.5), ou guardar só os ids e resolver nomes por lookup? | **Snapshot.** Consistente com a 2.5; histórico sobrevive a alteração/deleção do título; evita lookup extra de sacado no hook. |
| **D5** | **RPC ou insert/update direto.** Confirmar que, sendo proforma (1 tabela), basta INSERT + UPDATE diretos no hook (sem RPC). | **Insert/update direto.** RPC só se D1 = máquina de estados. |
| **D6** | **Quem registra/atualiza (RLS).** INSERT/UPDATE para administrador + operacional + cobrança (dialog é compartilhado entre /operacoes e /cobranças)? SELECT só admin/diretoria como o resto do app? | **INSERT/UPDATE: admin+operacional+cobrança. SELECT: admin/diretoria** (mantém o padrão; dívida: um usuário `cobranca` não enxergaria a recompra que ele mesmo criou — não morde hoje porque só o admin usa). |
| **D7** | **`resolvido_em`.** Setar no hook quando o status vira "Resolvido" (sem trigger), ou via trigger no banco? | **No hook.** Simples e explícito; espelha o `atualizarStatus` do mock. |
| **D8** | **Exclusão.** Permitir DELETE físico de solicitação, ou soft delete? | **Soft delete** (aprovado). Status `Cancelado` no enum `recompra_status`; **sem** DELETE físico nem policy de DELETE. Razão: a recompra é documento jurídico — preserva trilha de auditoria. |

> **Status `Cancelado` (D8) na lógica:** a derivação do estado por título (R3)
> deve considerar a recompra **mais recente que não esteja `Cancelado`** — uma
> solicitação cancelada não "trava" o badge do título. O `RecompraStatusBadge`
> ganha um 5º estilo (`Cancelado`) e o dropdown/menu de ações passa a oferecer
> "Cancelar solicitação" (→ status `Cancelado`).

---

## 5. Sub-tarefas (ordem de execução)

> Etapa 1 começa só depois de D1–D7 respondidas. **Religar escrita no MCP**
> antes da 2.6.1 (Murilo).

| # | Sub-tarefa | Conteúdo | Status |
|---|---|---|---|
| **2.6.1** | Migration | enum `recompra_status` + tabela `recompras` + índices + RLS + trigger `set_updated_at`. Aplicada em **3 migrations**: `..._create_recompras_table`, `..._alter_recompras_add_responsavel` (2.6.1b), `..._alter_recompras_operacao_id_nullable` (2.6.1c). `types.ts` editado à mão (MCP não regenera). | ✅ |
| **2.6.2** | Mapper + teste | `lib/mappers/recompra.ts` (row ↔ `SolicitacaoRecompra`, com `RecompraContext` p/ `cedente_id`/`operacao_id`/`valor`) + `recompra.test.ts` (12 testes). | ✅ |
| **2.6.3** | Hook | `hooks/useRecompras.ts` fora do mock: `recompras`, `porOperacao`, `estado` (derivado), `create(input, ctx)`, `updateStatus` (seta `resolvido_em` — D7); flag + fallback mock→Supabase. `mockRecompras.ts` mantém store+tipos como fallback. | ✅ |
| **2.6.4** | RecompraDialog | `recomprasStore.criar` → `useRecompras().create`; loading/erro; default `responsavel` "" + placeholder. | ✅ |
| **2.6.5** | Consumidores | `OperacaoDetalhes` e `Cobrancas` usam o hook novo; dropdown usa `updateStatus`; `RecompraStatusBadge` ganhou estilo `Cancelado`; menu "Cancelar solicitação" (D8) só em `OperacaoDetalhes`. | ✅ |
| **2.6.6** | Flag | `recompras: false → true` em `dataSource.ts`. | ✅ |
| **2.6.7** | Teste manual | recompra criada em /operacoes (dados reais) → card + badge + status + cancelar OK. Reflexo em /cobranças **não** validado: a tela lê `mockTitulos` (ver §8). | ✅ (com ressalva §8) |

---

## 6. Riscos

| # | Risco | Mitigação |
|---|---|---|
| R1 | **Drift de enum**: `titulo_status` tem 4 valores de recompra que o front (`TituloStatus`, 7 valores) não conhece. | D3 = não fundir; enum dedicado. Não remover os órfãos. Registrar dívida. |
| R2 | **Reatividade entre telas** (badge aparece em /operacoes e /cobranças). | Mesma `QUERY_KEY` + `invalidateQueries` no create/updateStatus (padrão `useDocumentosGerados`). |
| R3 | **Estado derivado** (linha mais recente por título): empate de `created_at`; solicitações `Cancelado` não devem travar o badge. | Filtrar `status <> 'Cancelado'`, ordenar por `created_at desc, id desc`, pegar a 1ª por `titulo_id` (D8). |
| R4 | **Snapshot vs join** (D4). | Snapshot resolvido no `create` a partir do `titulo` que o dialog já tem. |
| R5 | **Escopo financeiro** (D1): tentação de já mexer em status de operação/título. | Trava de escopo: 2.6 é proforma. Máquina de estados = tarefa futura. |
| R6 | **`resolvido_em`** não preenchido num `.update({status})` simples. | D7 = hook seta `resolvido_em` junto quando status = "Resolvido". |
| R7 | **RLS SELECT** só admin/diretoria: `cobranca` não veria a própria recompra. | Não morde hoje (só admin usa). Dívida registrada (D6). |

---

## 7. Observações

- `Cobrancas.tsx` tem um status de exibição **"Para recompra"** derivado de
  `titulo.status === "Recomprado"` — isso é display da aba de cobrança, **não**
  faz parte da tabela `recompras`. Fica como está.
- O `useRecompras` hoje mora **dentro** de `mockRecompras.ts`. A 2.6.3 cria
  `hooks/useRecompras.ts` e os componentes passam a importar de lá; os **tipos**
  (`SolicitacaoRecompra`, `StatusRecompra`, etc.) continuam exportados do mock
  (igual `Titulo` em `mockTitulos.ts`).
- **Status órfãos de `titulo_status` documentados no código** (pedido junto com
  D8): os 4 valores de recompra que existem no enum `titulo_status` do banco mas
  o front não usa (`Em análise de recompra`, `Recompra solicitada`,
  `Substituição solicitada`, `Resolvido`) foram marcados como **deprecated / não
  usar** num comentário em `src/data/mockTitulos.ts` (junto ao tipo
  `TituloStatus`) e com uma nota no cast de `src/lib/mappers/titulo.ts`. O status
  de recompra vive na tabela `recompras` (enum `recompra_status`), separado do
  financeiro (D3).
- **Dívida do `StatusRecompra` resolvida na 2.6.5:** o tipo do front passou de 4
  para **5 valores** (`+ "Cancelado"`), alinhado com o enum `recompra_status` do
  banco. `RecompraStatusBadge` ganhou o estilo `Cancelado`; `updateStatus` aceita
  o valor. `STATUS_RECOMPRA` (array do dropdown de transições) ficou em 4 de
  propósito — cancelar é ação dedicada (D8), não troca de status comum.
- **`useRecompras` do mock ficou órfão:** após a 2.6.5 nenhum consumidor importa
  `useRecompras` de `mockRecompras.ts` — todos usam `hooks/useRecompras`. O
  `useRecompras` antigo, o `recomprasStore` e os tipos seguem no mock como
  **fallback** do modo mock (o hook usa `recomprasStore` quando a flag está
  `false`; com a flag em `true`, ficam dormentes). Remoção fica para uma limpeza
  futura, quando os mocks forem descontinuados em bloco.

---

## 8. Dívidas técnicas

- **/cobranças ainda lê do mock (`mockTitulos`), não do `useTitulos`.**
  Consequência: a reatividade R2 entre /operacoes ↔ /cobranças **não** funciona
  como o plano original assumiu. A funcionalidade de recompra está **completa em
  /operacoes** (dados reais — criar/atualizar/cancelar + badge/card); o badge em
  /cobranças só aparecerá quando uma sub-tarefa futura (sugerida: **"2.x — Migrar
  /cobranças para `useTitulos`"**) for executada. **Ponto cego do plano-2.6.md
  original** — deveria ter mapeado a fonte de dados de /cobranças antes de assumir
  a R2. Descoberto no teste manual da 2.6.7.
- **`useRecompras`/`recomprasStore` do mock ficaram órfãos** (ver §7): nenhum
  consumidor importa o hook antigo; mantidos como fallback do modo mock. Remoção
  numa limpeza futura quando os mocks forem descontinuados em bloco.
