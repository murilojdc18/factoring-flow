# Plano 2.9 — migrar compliance (análises de risco) pro Supabase

> Tarefa: ligar a página /compliance ao Supabase. É a **última flag de domínio
> em mock** (`compliance: false` em `dataSource.ts`). Migra as **análises** de
> PLD/FT para `compliance_analises`; **políticas** e **checklists** ficam como
> constantes estáticas de referência (não são dados de usuário). Fecha a Fase 2
> de migração mock→Supabase.
> **Decisões D1–D6 aprovadas por Murilo em 2026-05-27.** Segue o molde de
> `useCobrancas` + `lib/mappers/cobranca.ts` + `lib/cobrancaEstado.ts` (2.8).
> **2.9 CONCLUÍDA em 2026-05-27** — e com ela a **Fase 2 de migração mock→Supabase
> está 100%** (compliance era a última flag de domínio em mock). Migration +
> mapper + agregação pura + hook dual + UI migrada + flag ligada. Teste manual
> e2e OK (registro, persistência no F5, revisão append-only, Crítico distinto).
> `tsc -p tsconfig.app.json` limpo, 116 testes verdes.

---

## 1. Descoberta (estado encontrado)

- A tabela **`compliance_analises` já existe** (migration original do Lovable,
  `20260426215910`), **vazia**, com **RLS já endurecida** — SELECT `admin`/
  `diretoria` (`is_admin_or_diretoria`), INSERT/UPDATE `compliance`/`administrador`,
  DELETE `administrador`. **Nada a fazer em RLS.**
- FKs: `cliente_id → clientes` e `operacao_id → operacoes` (ambas **ON DELETE
  CASCADE**, nullable), `created_by → auth.users` (SET NULL). **CHECK**:
  `cliente_id IS NOT NULL OR operacao_id IS NOT NULL` (pelo menos um alvo).
- Enums prontos: `compliance_risco` (Baixo/Médio/Alto/**Crítico**) e
  `compliance_status` (Em análise/Aprovado/Aprovado com ressalvas/Reprovado/
  Pendente).
- O mock (`src/data/mockCompliance.ts`) tem **3 conceitos**:
  - **Análises** (`AnaliseCompliance`) → migram para `compliance_analises`.
  - **Políticas internas** (`mockPoliticas`) → conteúdo estático de referência →
    ficam como constante.
  - **Checklists** (`CHECKLIST_ONBOARDING`/`CHECKLIST_OPERACAO`) → definições
    estáticas → ficam como constantes.

### Atritos (análises → tabela)

| Campo no mock | Coluna no banco | Situação |
|---|---|---|
| `escopo` + `alvoId` | `cliente_id` **ou** `operacao_id` | escopo = qual FK está preenchida (derivado) |
| `alvoNome` (snapshot) | *(não existe)* | derivado no read via clientes/operações |
| `nivelRisco` (Baixo/Médio/Alto) | `nivel_risco` (enum, +**Crítico**) | 3 vs 4 valores (D2) |
| `justificativa` (obrigatório) | *(não existe)* | nova coluna (D3) |
| `observacoes` | `observacoes` | direto |
| `respostas` (checklist) | `checklist` (jsonb) | respostas no jsonb (D4) |
| `responsavel` (campo do form) | `responsavel` | direto (analista digita) |
| `dataAnalise` | `created_at` (read) / `data_analise` default | direto |
| `historico[]` (versionamento) | *(não existe)* | modelo append-only (D1) |
| — | `status` (enum) | mock/UI não tem status → default neutro (D6) |

### Correção de fonte de dados (lição da 2.7)

O mock calcula pendências e a lista de alvos lendo `mockClientes`/`mockOperacoes`
**direto** — mas clientes/operações já estão no Supabase. A migração **obriga**
trocar para `useClientes`/`useOperacoes`, senão as pendências ficam contra dados
velhos e há risco de FK (alvoId mock que não existe no banco).

---

## 2. Decisões tomadas

| # | Decisão | Escolha | Razão |
|---|---|---|---|
| **D1** | Histórico/revisões | **Append-only** — cada salvar = nova linha; atual = mais recente por alvo; revisões = linhas anteriores. Sem tabela/coluna de histórico. | Idiomático no projeto (recompras/operacao_historico); bônus regulatório (trilha imutável); histórico vira consulta. |
| **D2** | Nível de risco | **Adicionar "Crítico"** — UI alinhada ao enum. | Alinhar ao banco (mesma filosofia do D3 de cobranças); dá o 4º nível para casos graves. |
| **D3** | `justificativa` | **Coluna nova** `justificativa text NOT NULL default ''` (migration aditiva). | Compliance regulatório exige justificar o risco; separar de `observacoes` permite auditoria/consulta. |
| **D4** | Respostas do checklist | `checklist` jsonb (`{ respostas: [...] }`). | A coluna jsonb já existe para isso; detalhe de mapper. |
| **D5** | `alvoNome`/`escopo` + fonte dos alvos | `escopo` = qual FK; `alvoNome` derivado no read; alvos/pendências de **`useClientes`/`useOperacoes`**. | Snapshot de nome não persiste (deriva como em cobranças); correção de fonte evita bug latente de FK. |
| **D6** | `status` | Grava default **'Em análise'**, não exibe; **não auto-aprova**. | Aprovação de compliance é decisão humana, não conclusão de checklist; workflow é Fase 3. |

**Nota sobre `responsavel`:** ao contrário de cobranças (resolvido de
`profiles.nome_completo`), aqui o **analista digita** o responsável no formulário
(campo existente no `AnaliseDialog`). Mantém-se o campo do form; `created_by`
(uuid) é a âncora de auditoria.

---

## 3. Sub-tarefas (ordem de execução)

| # | Sub-tarefa | Conteúdo | Status |
|---|---|---|---|
| **2.9.0** | Investigação | Schema/RLS/FKs/CHECK/enums de `compliance_analises`; mock (análises × políticas × checklists); atritos; correção de fonte. | ✅ |
| **2.9.1** | Migration aditiva | `add column if not exists justificativa text NOT NULL default ''`. Idempotente, não toca RLS. | ✅ |
| **2.9.2** | Mapper + funções puras + testes | `lib/mappers/compliance.ts`: `rowToAnalise`/`analiseToRow` + `agruparCorrentes` (rows → análise atual por alvo + `historico`). Testes. | ✅ |
| **2.9.3** | Hook `useCompliance` | Dual mock/Supabase (espelha `useCobrancas`): query todas as linhas → map → agrupar; `salvar` = **insert** (append, `created_by` resolvido); `obterAnalisePorAlvo` do agrupado; `politicas` estáticas. | ✅ |
| **2.9.4** | UI (Compliance.tsx + AnaliseDialog) | **Mini-plano próprio antes do código** (arquivo de 454 linhas). Migra pro hook; +Crítico; alvos/pendências de dados reais; enriquece `alvoNome`; loading/error; KPI de Crítico. | ✅ |
| **2.9.5** | Flag + types | `compliance: true` em `dataSource.ts` + regenerar `types.ts` (entra `justificativa`). | ✅ |
| **2.9.6** | Teste manual e2e | Registrar análise → persiste no F5; revisar → vira nova linha + contador de revisões sobe; pendências refletindo clientes/operações reais. | ✅ |
| **2.9.7** | Docs + memória + ledger | Fechar `docs/plano-2.9.md`, `estado-2.9`, reconciliar probes do ledger. | ✅ |

---

## 4. Mapa de campos (análise → `compliance_analises`)

| `AnaliseCompliance` (UI) | Coluna | Observação |
|---|---|---|
| `escopo`=Cliente + `alvoId` | `cliente_id` | `operacao_id` null |
| `escopo`=Operação + `alvoId` | `operacao_id` | `cliente_id` null |
| `nivelRisco` | `nivel_risco` (enum) | +Crítico (D2) |
| `justificativa` | `justificativa` (text) | **coluna nova** (D3) |
| `observacoes` | `observacoes` (text) | direto |
| `respostas` | `checklist` (jsonb) | `{ respostas: [{itemId, conferido, observacao?}] }` (D4) |
| `responsavel` | `responsavel` (text) | campo do form |
| `dataAnalise` | `created_at` (read) | `data_analise` (date) default CURRENT_DATE |
| — | `status` (enum) | default 'Em análise' (D6) |
| — | `created_by` (uuid) | resolvido do auth |
| `alvoNome` | *(não gravado)* | derivado no read (clientes/operações) |
| `historico[]` | *(não gravado)* | linhas anteriores do mesmo alvo (D1) |

---

## 5. Modelo append-only (D1)

- **Salvar** (nova ou revisão) = sempre `INSERT`. Nunca UPDATE.
- **Análise atual** de um alvo = linha mais recente (`order by created_at desc`)
  daquele `(escopo, alvoId)`.
- **`historico`** = as linhas anteriores do mesmo alvo, mapeadas a
  `RevisaoAnalise`. **`revisões`** (contador da tela) = quantidade de anteriores.
- `agruparCorrentes(analises)` é **função pura e testável** (igual `deriveEstado`
  da 2.8): recebe a lista mapeada, devolve a atual por alvo com `historico`
  preenchido.

---

## 6. Mudanças na UI / alinhamento (D2, D5)

- `NivelRisco` ganha **"Crítico"** — tipo + `NIVEIS_RISCO` + `corDoRisco` +
  `RiscoBadge` + KPI de Crítico.
- `alvosDisponiveis`/`alvosSemAnalise` passam a usar **`useClientes`/
  `useOperacoes`** (não `mockClientes`/`mockOperacoes`).
- `alvoNome` enriquecido na página (que já carrega clientes/operações), padrão do
  `eventosEnriquecidos` da 2.8.
- `AnaliseDialog`: nível de risco com 4 opções; `salvar` async + try/catch/toast;
  não passa mais `alvoNome` (derivado no read). `LoadingState`/`ErrorState` na
  página como nos demais consumidores ligados ao Supabase.

---

## 7. Fora de escopo (deliberado)

- **Políticas internas** (`mockPoliticas`) e **checklists** (`CHECKLIST_*`) —
  constantes estáticas de referência, sem tabela; ficam como estão.
- **`complianceStore`** — mantido como fallback do modo mock até a limpeza geral
  dos mocks no fim da Fase 2.
- **Workflow de `status`** (aprovação/reprovação humana) — Fase 3.

---

## 8. Riscos

1. **`Compliance.tsx` (454 linhas)** — toque grande; a 2.9.4 tem **mini-plano
   próprio antes de editar** (como na 2.8.4).
2. **`NivelRisco` +Crítico** ripa para `RiscoBadge`/`corDoRisco`/seed do mock —
   o `tsc -p tsconfig.app.json` pega o que faltar.
3. **Append + agrupamento** — "Revisar" insere nova linha; a tela deve mostrar só
   a atual por alvo (agrupada). Erro aqui duplica linhas na lista → por isso
   função pura + testes.
4. **Enriquecimento de `alvoNome`** depende de clientes+operações carregados;
   alvo ausente (ex.: removido) → nome vazio (defensivo).
5. **Type-check**: usar **`npx tsc -p tsconfig.app.json`** (o `--noEmit` na raiz é
   no-op — ver memória técnica).

---

## 8. Lições aprendidas

- **Union aditivo × subtrativo.** Adicionar `"Crítico"` a `NivelRisco` (2.9.4) é
  **aditivo** → não quebra consumidores; `tsc` ficou verde mesmo antes de migrar a
  página (diferente da 2.8.4, que **removeu** `Telefone`/`Presencial` de
  `TipoContato` e quebrou a página). Antecipar o tipo de impacto ao planejar.
  Corolário: adicionar valor a union obriga novo `case` em `switch` exaustivo
  (`corDoRisco` precisou de `case "Crítico"`).
- **`KpiCard` usa cor de ÍCONE, não classes de badge.** `corDoRisco` devolve
  `bg/text/border` (badge), que não encaixa no `KpiCard` (baseado em cor de ícone
  Lucide). O KPI Crítico ficou com `AlertOctagon text-destructive`; a cor sólida do
  `corDoRisco` vive no `RiscoBadge` da tabela.
- **Ponte temporária × boundary cast.** `ComJustificativa` era **ponte** (saiu na
  regen de types da 2.9.5); o `checklist ... as unknown as Json` é **boundary**
  permanente (objeto tipado → coluna jsonb sempre precisa do cast). Distinguir os
  dois evita "limpar" um cast que é estrutural.
- **Append-only para domínios regulatórios.** Cada salvar = nova linha → trilha de
  auditoria imutável de graça (PLD/FT); o histórico vira consulta (`agruparCorrentes`)
  em vez de coluna/tabela dedicada. Mesmo padrão de recompras/operacao_historico.

---

## 9. Dívidas remanescentes

- **`complianceStore`/`mockCompliance` órfãos** — store + helpers de seed viram
  vestigiais (fallback do modo mock). Removidos na limpeza geral dos mocks no fim
  da Fase 2.
- **4 status órfãos em `titulo_status`** — dívida antiga (2.6), não tocada.
- **Workflow de `status` de compliance** (aprovação/reprovação humana, `compliance_status`
  além de 'Em análise') — Fase 3 (regulatório); a coluna existe e grava o default neutro.
