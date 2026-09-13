-- Migration: rls_operacoes_somente_via_rpc
-- Data: 2026-09-13
-- Motivo: antes de liberar acesso via API/Claude a um usuário com o combo
--   diretoria+operacional+cobranca, fechar a escrita DIRETA nas tabelas de
--   operação. Hoje (20260426215910:360-377):
--     - INSERT em operacoes: administrador, operacional
--     - UPDATE em operacoes: administrador, operacional, diretoria, financeiro
--     - INSERT em operacao_titulos: administrador, operacional
--     - INSERT em operacao_historico: 6 roles (histórico forjável)
--   Isso permite gravar status/valores sem a máquina de estados e sem o cálculo
--   do servidor. O front NÃO usa escrita direta nessas tabelas (só SELECT em
--   useOperacoes.ts e operacaoLookup.ts); toda escrita passa pelas RPCs
--   criar_operacao / alterar_status_operacao / editar_operacao, que são
--   SECURITY DEFINER e portanto NÃO são afetadas por estas policies.
-- Resultado: escrita direta só para administrador (correção manual de exceção).
-- Idempotente: drop policy if exists antes de cada create.

-- operacoes
drop policy if exists "operacional/admin criam operacoes" on public.operacoes;
drop policy if exists "admin cria operacoes direto" on public.operacoes;
create policy "admin cria operacoes direto" on public.operacoes
  for insert to authenticated
  with check (public.has_role(auth.uid(), 'administrador'::app_role));

drop policy if exists "operacional/admin/diretoria/financeiro editam operacoes" on public.operacoes;
drop policy if exists "admin edita operacoes direto" on public.operacoes;
create policy "admin edita operacoes direto" on public.operacoes
  for update to authenticated
  using (public.has_role(auth.uid(), 'administrador'::app_role));

-- operacao_titulos
drop policy if exists "operacional/admin gerenciam operacao_titulos ins" on public.operacao_titulos;
drop policy if exists "admin vincula operacao_titulos direto" on public.operacao_titulos;
create policy "admin vincula operacao_titulos direto" on public.operacao_titulos
  for insert to authenticated
  with check (public.has_role(auth.uid(), 'administrador'::app_role));

-- operacao_historico
drop policy if exists "auth registra operacao_historico" on public.operacao_historico;
drop policy if exists "admin registra operacao_historico direto" on public.operacao_historico;
create policy "admin registra operacao_historico direto" on public.operacao_historico
  for insert to authenticated
  with check (public.has_role(auth.uid(), 'administrador'::app_role));
