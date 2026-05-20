-- Fase 1.8 — RLS de SELECT: Forma A (mínima viável)
-- SELECT liberado apenas para perfis 'administrador' e 'diretoria'.
-- Qualquer outro perfil, ou usuário sem perfil → deny-all (RLS nega por padrão).
-- NÃO altera user_roles, profiles, usuarios_perfis, integracao_logs.
-- NÃO altera policies de INSERT/UPDATE/DELETE.
-- Idempotente: drop if exists + create or replace.

begin;

-- 1) Função helper única (evita repetir o array em 12 policies).
--    SECURITY DEFINER + reuso de has_any_role (já testada) = fonte única
--    de verdade sobre "como lemos user_roles". STABLE pra cache no plano.
create or replace function public.is_admin_or_diretoria()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_role(
    auth.uid(),
    array['administrador','diretoria']::app_role[]
  )
$$;

comment on function public.is_admin_or_diretoria() is
  'Fase 1.8: true se o usuário atual tem role administrador ou diretoria. Usada nas policies de SELECT (Forma A).';

-- 2) Reescreve o SELECT das 12 tabelas: drop da policy aberta + create nova.
--    Padrão repetido por tabela:
--      drop policy if exists "<nome antigo>" on public.<tabela>;
--      create policy "admin_diretoria ve <tabela>" on public.<tabela>
--        for select to authenticated
--        using (public.is_admin_or_diretoria());

drop policy if exists "auth ve clientes" on public.clientes;
create policy "admin_diretoria ve clientes" on public.clientes
  for select to authenticated using (public.is_admin_or_diretoria());

drop policy if exists "auth ve sacados" on public.sacados;
create policy "admin_diretoria ve sacados" on public.sacados
  for select to authenticated using (public.is_admin_or_diretoria());

drop policy if exists "auth ve titulos" on public.titulos;
create policy "admin_diretoria ve titulos" on public.titulos
  for select to authenticated using (public.is_admin_or_diretoria());

drop policy if exists "auth ve operacoes" on public.operacoes;
create policy "admin_diretoria ve operacoes" on public.operacoes
  for select to authenticated using (public.is_admin_or_diretoria());

drop policy if exists "auth ve operacao_titulos" on public.operacao_titulos;
create policy "admin_diretoria ve operacao_titulos" on public.operacao_titulos
  for select to authenticated using (public.is_admin_or_diretoria());

drop policy if exists "auth ve operacao_historico" on public.operacao_historico;
create policy "admin_diretoria ve operacao_historico" on public.operacao_historico
  for select to authenticated using (public.is_admin_or_diretoria());

drop policy if exists "auth ve modelos" on public.modelos_documentos;
create policy "admin_diretoria ve modelos_documentos" on public.modelos_documentos
  for select to authenticated using (public.is_admin_or_diretoria());

drop policy if exists "auth ve documentos_gerados" on public.documentos_gerados;
create policy "admin_diretoria ve documentos_gerados" on public.documentos_gerados
  for select to authenticated using (public.is_admin_or_diretoria());

drop policy if exists "auth ve cobrancas" on public.cobrancas_historico;
create policy "admin_diretoria ve cobrancas_historico" on public.cobrancas_historico
  for select to authenticated using (public.is_admin_or_diretoria());

drop policy if exists "auth ve config_fin" on public.configuracoes_financeiras;
create policy "admin_diretoria ve configuracoes_financeiras" on public.configuracoes_financeiras
  for select to authenticated using (public.is_admin_or_diretoria());

drop policy if exists "auth ve compliance" on public.compliance_analises;
create policy "admin_diretoria ve compliance_analises" on public.compliance_analises
  for select to authenticated using (public.is_admin_or_diretoria());

-- P1: anexos — substitui o filtro 'status <> Removido' por Forma A.
-- Trade-off aceito: admin/diretoria passam a enxergar inclusive anexos
-- com status 'Removido'. Filtro de "removido" volta na camada da aplicação
-- se/quando precisar.
drop policy if exists "auth ve anexos" on public.anexos;
create policy "admin_diretoria ve anexos" on public.anexos
  for select to authenticated using (public.is_admin_or_diretoria());

commit;
