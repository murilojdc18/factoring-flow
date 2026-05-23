# Plano 2.5 — Documentos gerados + Modelos de contrato

> Tarefa: ligar ao Supabase as entidades de **modelos de documentos** e
> **documentos gerados**. Escopo: opção A mínima (sem editor de modelos pela
> UI, sem audit trail avançado). Criado em 2026-05-23.

## Decisões (D1–D6, aprovadas)

| # | Decisão | Resolução |
|---|---|---|
| D1 | Semear modelos? | **Sim** — os 8 modelos de `mockContratos.ts` via migration (única forma sem editor na UI). |
| D2 | Campos faltantes em `documentos_gerados` | **Desnormalizar** (ADD COLUMN): o documento vira snapshot histórico imutável, coerente com as FKs `ON DELETE SET NULL`. |
| D3 | `versao` int × string | Banco mantém `integer`; o seed grava `1` para todos; o front exibe `v{n}`. |
| D4 | Feature flags | **Duas flags**: renomear `contratos`→`modelos_documentos` e adicionar `documentos`. |
| D5 | CRUD de modelo na UI | Ligar **só leitura**; desabilitar/ocultar criar/editar/duplicar/ativar. Escrita de modelo = tarefa futura. |
| D6 | Pegadinha de RLS (SELECT só admin/diretoria) | **Não bloqueia agora** (só admin usa). Dívida registrada para quando o sócio comercial entrar. |

## Estado pré-2.5

- Tabelas `modelos_documentos` e `documentos_gerados` **já existem** (criadas pelo Lovable), com RLS e enums prontos, **ambas vazias** (0 linhas).
- Enums do banco batem 100% com o front (`documento_gerado_status`, `modelo_documento_status`).
- `documentosStore` é **em memória** (`let docs`), não localStorage — some no F5, **sem persistência**. Nada a migrar, apenas substituir por hook.
- Flag atual relevante: `contratos: false` (será renomeada).

## Sub-tarefas

### 2.5a — Modelos (leitura)
- Mapper `lib/mappers/modeloDocumento.ts` (row ↔ `ModeloContrato`).
- Hook `useModelosDocumento` (padrão `useClientes`: flag + fallback mock→Supabase).
- Flag `modelos_documentos`.
- `Contratos.tsx` e `GerarDocumentoDialog` passam a ler modelos do banco.
- Desabilitar a escrita de modelo na UI (D5).

### 2.5b — Documentos (gravação + leitura)
- Mapper `lib/mappers/documentoGerado.ts` (row ↔ `DocumentoGerado`, com os campos de snapshot).
- Hook `useDocumentosGerados` (substitui `documentosStore`): list + create + updateStatus.
- Flag `documentos`.
- Ligar consumidores: `Contratos.tsx`, `Relatorios.tsx`, `OperacaoDetalhes.tsx`.
- **Risco #1**: a geração (`GerarDocumentoDialog` + `montarPlaceholders`) hoje usa
  `mockOperacoes/mockClientes/mockTitulos`. Para gravar `operacao_id` válido (FK real),
  migrar o dialog para `useOperacoes` e refatorar `montarPlaceholders` para receber
  dados reais. Maior pedaço de 2.5b.

## Schema final esperado

### modelos_documentos (sem alteração estrutural — só seed)
- `id` uuid PK · `nome` text · `tipo` text · `descricao` text · `conteudo` text
- `variaveis` jsonb · `status` `modelo_documento_status` · `versao` integer
- `created_by` uuid · `created_at`/`updated_at` timestamptz
- **8 linhas** após o seed.

### documentos_gerados (+ 4 colunas de snapshot — Migration 1)
- (existentes) `id` · `modelo_id` · `modelo_nome` · `operacao_id` · `cliente_id` ·
  `conteudo` · `variaveis_preenchidas` jsonb · `status` · `created_by` · `created_at`/`updated_at`
- (novas) **`tipo_documento` text NOT NULL DEFAULT ''**, **`modelo_versao` integer NOT NULL DEFAULT 1**,
  **`operacao_numero` text NOT NULL DEFAULT ''**, **`observacoes` text NOT NULL DEFAULT ''**
- **0 linhas** (preenchida em runtime na 2.5b).

## Migrations desta etapa
1. `..._alter_documentos_gerados_snapshot_fields.sql` — ADD COLUMN (idempotente, `IF NOT EXISTS`).
2. `..._seed_modelos_documentos.sql` — INSERT dos 8 modelos (`ON CONFLICT (id) DO NOTHING`).

## Ordem de execução
1. Migrations 1 e 2 (esta etapa).
2. Atualizar `dataSource.ts` (flags).
3. Implementar 2.5a, depois 2.5b.
4. Verificação manual ponta a ponta: gerar documento de operação real → aparece em Contratos, Relatórios e na operação → exporta PDF.
