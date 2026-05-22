# Plano 2.3 — Ligar cadastro de TÍTULOS ao Supabase (feature flag, Caminho B). Status: APROVADO 2026-05-22, executar na próxima sessão (não executado ainda).

**Pré-requisito (manual, painel Supabase):** limpar dados-lixo e cadastrar 1 cedente real + 2 sacados reais ANTES do teste manual.

## Etapas (nesta ordem)
1. Etapa 1 — `src/hooks/useTitulos.ts`: `created_by` no insert (`auth.getUser`), `traduzirErroTitulo` (23503 FK / 23514 CHECK), comentário de escopo (espelha useSacados).
2. Etapa 3 — `src/lib/mappers/titulo.test.ts` (novo): espelha sacado.test.ts (rowToTitulo, tituloToRow, ida/volta, anexos JSONB).
3. Etapa 4 — `src/lib/dataSource.ts`: comentário de escopo acima da flag `titulos`.
4. VERIFICAR: `npx tsc --noEmit` + `npx vitest run` (flag ainda false).
5. Etapa 2 — `src/components/titulos/TituloForm.tsx`: trocar mockClientes/mockSacados por `useClientes()`/`useSacados()`; loading = disabled + "Carregando…"; tratar lista vazia.
6. VERIFICAR: `npx tsc --noEmit` (UI mexida, flag ainda false).
7. Etapa 5 — `dataSource.ts`: virar `titulos: false → true`.
8. VERIFICAR FINAL: tsc + vitest (~41 testes, 4 arquivos). Mostrar diffs por arquivo.

## Decisões aprovadas (ambiguidades)
4 status só-do-banco (8–11, recompra/substituição) = ignorar agora (tratar na fase de recompra); loading = disabled+"Carregando…"; deleção concorrente = confiar na FK RESTRICT + erro 23503; `numero` = digitado manual (sem UNIQUE no banco); status inicial = "Disponível"; tabela inicia vazia (sem seed).

## Commits (3 separados)
1. `test(titulos): cobre mapper titulo + created_by/traduzirErroTitulo/escopo no hook` (Etapas 1, 3, 4)
2. `fix(titulos): TituloForm passa a usar useClientes/useSacados (sai do mock)` (Etapa 2)
3. `feat(titulos): liga cadastro de titulos ao Supabase via feature flag (2.3)` (Etapa 5)

## Notas do banco (confirmado read-only 2026-05-22)
titulos: 17 colunas, RLS ok, FKs cedente_id/sacado_id NOT NULL ON DELETE RESTRICT, 0 linhas. Enums tipo_titulo (6) e titulo_status (7 do front = valores 1–7, acentos idênticos) → insert seguro. Escrever arquivos novos em UTF-8 sem BOM.
