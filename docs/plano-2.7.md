# Plano 2.7 — /cobranças lê do Supabase + back-link da operação na recompra

> Tarefa: fechar a dívida deixada pela 2.6 (§8 do `plano-2.6.md`): **/cobranças
> ainda lia `mockTitulos`**, então a reatividade R2 entre /operacoes ↔ /cobranças
> não valia e o badge de recompra não refletia o banco. Durante o teste manual,
> um **bug latente** apareceu: criar recompra a partir de /cobranças nascia com
> `operacao_id` NULL (a recompra DUP-002 já no banco era uma órfã), o que
> quebrava o card "Recompras e substituições" da operação e arriscava violação de
> FK em fluxos futuros.
> **2.7 + 2.7.1 CONCLUÍDAS em 2026-05-27.** /cobranças passou a ler via
> `useTitulos`, o `useRecompras.create` ganhou back-link automático da operação e
> a DUP-002 foi corrigida por migration. Teste manual end-to-end OK (4 testes).

---

## 1. Descoberta (origem da tarefa)

A 2.6 entregou recompras ligadas ao Supabase, mas registrou em §8 que **/cobranças
ainda lia do mock** (`mockTitulos`), não do `useTitulos`. Consequência prática:

- O badge de estado de recompra em /cobranças não refletia o banco (a R2 da 2.6
  só valia dentro de /operacoes).
- No teste manual desta etapa, ao exercitar o fluxo de criar recompra **a partir
  de /cobranças**, ficou claro um **bug latente**:
  - a recompra nascia com **`operacao_id` NULL** (o dialog em /cobranças não tinha
    o contexto da operação que o de /operacoes tinha);
  - havia **1 órfã já persistida** (`DUP-002`, id `9b44824d-…`), criada antes
    desta correção;
  - o **card "Recompras e substituições"** da operação ficava vazio para
    recompras sem `operacao_id`, e o fluxo arriscava **violação de FK** conforme
    a tabela evoluísse.

---

## 2. Correção (o que foi feito)

- **2.7** — Migrar /cobranças para `useTitulos` (parar de ler `mockTitulos`),
  alinhando o badge de recompra à fonte real. `LoadingState`/`ErrorState` como nos
  demais consumidores ligados ao Supabase.
- **2.7.1** — **Back-link automático** da operação no `useRecompras.create`
  (resolve `operacao_id`/`operacao_numero` via `operacao_titulos`) + **back-fill**
  da órfã DUP-002 via migration.

---

## 3. Sub-tarefas (ordem de execução)

| # | Sub-tarefa | Conteúdo | Status |
|---|---|---|---|
| **2.7.0** | Investigação | Mapear a fonte de dados real de /cobranças, confirmar a órfã DUP-002 no banco e a FK `recompras.operacao_id → operacoes(id)` (via `pg_constraint`, não `information_schema`). | ✅ |
| **2.7.1** | Refactor /cobranças | `Cobrancas.tsx` lê títulos via `useTitulos` (não `mockTitulos`); `LoadingState`/`ErrorState`; badge de recompra alinhado ao Supabase. | ✅ |
| **2.7.2** | Back-link automático | `useRecompras.create` resolve `operacao_id`/`operacao_numero` a partir de `operacao_titulos` (Opção A — no hook, centralizado). Qualquer caller herda o back-link. | ✅ |
| **2.7.3** | Back-fill DUP-002 | Migration `20260527131447_backfill_recompra_dup002_operacao.sql`: `UPDATE` idempotente (`AND operacao_id IS NULL`) preenchendo `operacao_id`/`operacao_numero` da recompra DUP-002. | ✅ |
| **2.7.4** | Teste manual e2e | 4 testes no navegador: badge/card em /cobranças refletindo o banco + criar recompra nova com back-link preenchido + DUP-002 corrigida (0 órfãs). | ✅ |

---

## 4. Decisões tomadas

| # | Decisão | Escolha | Razão |
|---|---|---|---|
| **D1** | Onde ler os títulos de /cobranças | **Migrar para `useTitulos`** — **não** criar tabela `cobrancas` ainda | A dívida era só a fonte de dados; tabela de cobranças (eventos + estados) é escopo bem maior, fica para sub-tarefa futura. |
| **D2** | Onde resolver o back-link da operação | **No hook (`useRecompras.create`) — Opção A** | Centralizado: qualquer caller (dialog de /operacoes, de /cobranças, futuros) herda o back-link automaticamente, sem duplicar lógica no componente. |
| **D3** | Como corrigir a órfã DUP-002 | **Migration** (não `execute_sql`) | Deixa histórico no ledger de migrations; reproduzível em outro ambiente. |
| **D4** | Resolver operação por 2 queries vs embed | **2 queries** (KISS) | Buscar `operacao_titulos` e montar o vínculo em 2 passos é mais simples e legível que um embed aninhado; volume é baixo. |

---

## 5. Lições aprendidas

- **`pg_constraint` é a fonte autoritativa para FKs** — `information_schema`
  pode mentir sobre foreign keys. Conferir constraint sempre por `pg_constraint`.
- **Probe `SELECT 1` via `apply_migration` polui o ledger** — cada probe vira uma
  entrada de migration órfã (timestamp da hora da aplicação). Já documentado;
  reconciliado nesta sessão (ver §7).
- **O plano deve mapear a FONTE DE DADOS de cada consumidor antes de assumir
  comportamento.** A 2.6 assumiu reatividade entre /operacoes ↔ /cobranças sem
  conferir que /cobranças lia do mock — o ponto cego virou esta tarefa inteira.

---

## 6. Dívidas remanescentes

- **Tabela `cobrancas` (eventos + estados) ainda em memória** — flag
  `cobrancas: false` em `dataSource.ts`. /cobranças agora lê **títulos** do
  Supabase, mas os eventos/estados de cobrança propriamente ditos seguem mock.
  Sub-tarefa futura dedicada.
- **`cobrancasStore` órfão** até a flag `cobrancas` virar — mantido como fallback
  do modo mock; remoção numa limpeza futura, com os demais mocks.
- **4 status órfãos em `titulo_status`** (`Em análise de recompra`,
  `Recompra solicitada`, `Substituição solicitada`, `Resolvido`) — já documentados
  desde a 2.6 (§7 do `plano-2.6.md`): vivem no enum do banco mas o front usa o
  enum dedicado `recompra_status`. Remover valor de enum no Postgres é custoso;
  ficam como dívida registrada.

---

## 7. Reconciliação do ledger (desta sessão)

Esta sessão criou 2 entradas no ledger de migrations com timestamp da **hora da
aplicação** (não do arquivo):

- `probe_write_check` — órfã do probe `SELECT 1` que confirmou modo escrita do MCP.
- `backfill_recompra_dup002_operacao` — gravada com `version` da hora, não com o
  `20260527131447` do nome do arquivo.

Reconciliadas via `execute_sql` (transação atômica): `DELETE` das 2 entradas com
timestamp errado/órfão + `INSERT` da entrada correta `20260527131447 ·
backfill_recompra_dup002_operacao`.
