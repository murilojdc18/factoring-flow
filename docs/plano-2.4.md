# Plano 2.4 — Ligar OPERAÇÕES (antecipações) ao Supabase. Status: APROVADO 2026-05-23. 2.4a executar HOJE; 2.4b próxima sessão.

> Modelo de negócio: VÁRIOS títulos por operação (N:N). Banco já modela isso (`operacao_titulos`).
> Diferença das 2.1/2.2/2.3: NÃO existe fluxo de criação no front (botão "Gerar operação" só dá toast).
> Mapper, teste e hook de operação NÃO existem — tudo do zero. Arquivos novos em UTF-8 sem BOM.

**Pré-requisito (manual, painel Supabase), ANTES do teste da 2.4b:** 1 cedente "Ativo" + ≥2 títulos "Disponível" reais.

## 2.4a — Leitura + infraestrutura (HOJE, baixo risco)
1. `src/lib/mappers/operacao.ts` (novo): `rowToOperacao(row, {cedentes, titulosIds, historico})` monta cedenteNome via lookup, titulosIds de `operacao_titulos`, historico de `operacao_historico` (`por` resolvido de created_by→profiles ou vazio); `operacaoToRow` só cabeçalho.
2. `src/lib/mappers/operacao.test.ts` (novo): espelha titulo.test.ts (rowToOperacao com joins/lookup/defaults; operacaoToRow sem campos derivados).
3. `src/hooks/useOperacoes.ts` (novo): SÓ LEITURA. Query junta operacoes + operacao_titulos + operacao_historico + lookup clientes. Comentário de escopo (Relatorios/documentos/compliance NÃO afetados pela flag).
4. Migrar `src/pages/Operacoes.tsx`: `mockOperacoes` → `useOperacoes()`.
5. Migrar `src/pages/OperacaoDetalhes.tsx` (leitura): operação/títulos/histórico via hook; recompra/documento/anexo FICAM mock.
6. `src/lib/dataSource.ts`: comentário de escopo + virar `operacoes: false → true` (lista inicia vazia — sem seed).
7. VERIFICAR: `npx tsc --noEmit` + `npx vitest run`.

## 2.4b — Escrita atômica via RPC (próxima sessão, alto risco)
1. Migration (idempotente, timestamp): função `criar_operacao(payload)` numa transação — insert operacoes (status "Em análise") → insert operacao_titulos[] → `update titulos set status='Operado' where id in (...) and status='Disponível'` (aborta se contagem < selecionados) → insert operacao_historico.
2. `useOperacoes.create` chama a RPC; `traduzirErroOperacao` (23505 numero/título repetido; 23503 FK; 23502 not-null; contagem<sel = título já operado).
3. Migrar `src/pages/OperacaoSimulador.tsx`: `mockClientes`/`mockTitulos` → `useClientes()`/`useTitulos()` (títulos reais "Disponível"); ligar botão "Gerar operação" ao `create` (loading = disabled+"Gerando…"). Envia o `SimuladorResultado` já calculado (cálculo é fonte única do front).
4. `numero` gerado no front (`BOR-{AAAA}-{seq}`); `responsavelInterno` = nome do usuário logado.
5. Teste manual end-to-end com dados reais semeados.

## Decisões aprovadas (ambiguidades — Parte C)
1. Simulador migra junto (B-coerente; sem ele não há cadastro). 2. OperacaoDetalhes migra parcial (recompra/doc/anexo seguem mock). 3. Create ATÔMICO via RPC. 4. Concorrência: `update ... where status='Disponível'` + checa contagem. 5. Líquido pré-calculado no front e enviado pronto (não recalcula no banco). **6+7. Status inicial = "Em análise" + título vira "Operado" NA CRIAÇÃO (reserva) — resolve a tensão conceitual.** 8. `numero` gerado no front + tratar 23505. 9. responsavelInterno = usuário logado. 10. Tabela inicia vazia (sem seed). 11. Geração de contrato fica para 2.5.

## Riscos de regressão (Parte D)
- **Simulador (Alta):** lista de títulos some se banco sem "Disponível" → EmptyState + pré-requisito semeado. Testar antes.
- **Status "Operado" do banco (Média):** títulos mock "Operado" só no mock; Relatorios ainda lê mockTitulos+mockOperacoes (coerente consigo). Duas verdades até próximas sub-tarefas.
- **Dashboard/KPIs (Média):** confirmar se soma mockOperacoes; se sim, fica mock (não migra) → coerente.
- **Relatorios (Baixa):** fica mock; aviso "dados mockados" já na tela.
- **preencherDocumento/GerarDocumentoDialog/compliance (Baixa):** consomem o shape Operacao; mapper preserva shape → não quebram. Mock até 2.5+.

## Commits
- 2.4a: `test(operacoes): mapper operacao + teste`; depois `refactor(operacoes): lista e detalhes leem via useOperacoes (flag 2.4a)`.
- 2.4b: `feat(operacoes): RPC criar_operacao atomica (operacoes+operacao_titulos+historico)`; depois `feat(operacoes): liga simulador ao Supabase via feature flag (2.4)`.

## Notas do banco (read-only 2026-05-23)
- `operacoes` (0 linhas): numero NOT NULL+UNIQUE; cedente_id NOT NULL FK→clientes ON DELETE RESTRICT; status default 'Rascunho'; SEM CHECK. created_by/updated_at presentes.
- `operacao_titulos` (0): operacao_id FK→operacoes CASCADE; titulo_id FK→titulos RESTRICT; UNIQUE(operacao_id,titulo_id).
- `operacao_historico` (0): operacao_id FK CASCADE; status NOT NULL SEM default; SEM coluna "por" (só created_by uuid).
- Enum `operacao_status` = 8 status do front, idênticos (acentos iguais) → insert seguro.
- RLS completa por papel (SELECT/INSERT/UPDATE/DELETE); admin passa em tudo, inclusive UPDATE titulos→'Operado'.
- SEM triggers (set_updated_at existe como função, não ligado). SEM RPC ainda → criar na 2.4b.
- Tipos gerados já incluem as 3 tabelas em `integrations/supabase/types.ts`.
