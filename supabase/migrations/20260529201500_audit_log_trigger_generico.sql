-- =============================================================================
-- 3.1 — Audit trail (trilha de auditoria) — espinha dorsal via trigger genérico
-- =============================================================================
--
-- O QUE FAZ
--   Cria uma tabela `audit_log` e um trigger genérico `audit()` instalado em 9
--   tabelas de domínio sensíveis ao regulatório (PLD/COAF/fiscalização). Toda
--   INSERT/UPDATE/DELETE nessas tabelas grava uma linha imutável com a linha
--   inteira antes/depois (jsonb), quem fez (auth.uid()) e quando.
--
--   Arquitetura HÍBRIDA: este trigger é a espinha dorsal forense. As tabelas
--   *_historico existentes (operacao_historico, cobrancas_historico) permanecem
--   como estão — elas seguem sendo a "narrativa de negócio" semântica; o
--   audit_log é a trilha crua e completa por baixo.
--
-- APPEND-ONLY FORTE
--   A `audit_log` só aceita INSERT (feito pelo trigger) e SELECT (admin/diretoria).
--   RLS habilitada com APENAS uma policy de SELECT; não há policy de INSERT,
--   UPDATE nem DELETE -> com RLS ligada, ausência de policy = ninguém faz pela
--   aplicação, NEM o admin. O INSERT do trigger passa porque a função audit() é
--   SECURITY DEFINER: roda como owner da tabela, e o owner NÃO é alcançado por
--   RLS (por isso NÃO usamos FORCE ROW LEVEL SECURITY — se usássemos, o próprio
--   trigger seria barrado por não haver policy de INSERT). Resultado: nem o
--   administrador consegue editar ou apagar o log pela aplicação.
--
-- CASO ator NULL
--   `ator` = auth.uid(). Quando a mudança NÃO vem de uma sessão de usuário
--   (SQL Editor do painel, service_role, migrations, jobs), não há JWT e
--   auth.uid() retorna NULL. Isso é registrado como ator NULL e a view traduz
--   para "Sistema / acesso direto". O evento é gravado de qualquer forma — é o
--   que torna a trilha robusta contra alterações feitas fora da aplicação.
--
-- CAVEAT registro_id uuid
--   `registro_id` é UUID porque as 9 tabelas auditadas têm PK `id uuid` simples
--   (confirmado, inclusive operacao_titulos e user_roles). Se um dia auditarmos
--   uma tabela com PK não-uuid ou composta, este campo precisa virar `text` e o
--   cast `(... ->> 'id')::uuid` sai da função audit(). Hoje não é o caso.
--
-- IDEMPOTÊNCIA
--   create table if not exists / create or replace / drop ... if exists.
--   Reaplicável sem erro.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Tabela audit_log + índices
-- -----------------------------------------------------------------------------
create table if not exists public.audit_log (
  id             uuid primary key default gen_random_uuid(),
  tabela         text        not null,
  operacao       text        not null check (operacao in ('INSERT','UPDATE','DELETE')),
  registro_id    uuid,                            -- id da linha afetada (todas as 9 são uuid)
  dados_antigos  jsonb,                           -- to_jsonb(OLD); null em INSERT
  dados_novos    jsonb,                           -- to_jsonb(NEW); null em DELETE
  ator           uuid,                            -- auth.uid(); null = sem sessão (acesso direto)
  ator_nome      text,                            -- snapshot do nome no momento do evento
  created_at     timestamptz not null default now()
);

create index if not exists idx_audit_log_tabela_registro on public.audit_log (tabela, registro_id);
create index if not exists idx_audit_log_created_at      on public.audit_log (created_at desc);
create index if not exists idx_audit_log_ator            on public.audit_log (ator);

-- -----------------------------------------------------------------------------
-- 2) Função genérica audit() — trigger function SECURITY DEFINER
-- -----------------------------------------------------------------------------
create or replace function public.audit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_old   jsonb;
  v_new   jsonb;
  v_rid   uuid;
  v_uid   uuid := auth.uid();
  v_nome  text;
begin
  if (tg_op = 'DELETE') then
    v_old := to_jsonb(old);
    v_new := null;
    v_rid := (v_old->>'id')::uuid;
  elsif (tg_op = 'INSERT') then
    v_old := null;
    v_new := to_jsonb(new);
    v_rid := (v_new->>'id')::uuid;
  else  -- UPDATE
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_rid := (v_new->>'id')::uuid;
  end if;

  -- Snapshot do nome do ator (null-safe: só consulta se houver sessão).
  if v_uid is not null then
    select nome_completo into v_nome from public.profiles where id = v_uid;
  end if;

  insert into public.audit_log (
    tabela, operacao, registro_id, dados_antigos, dados_novos, ator, ator_nome
  ) values (
    tg_table_name, tg_op, v_rid, v_old, v_new, v_uid, v_nome
  );

  return null;  -- AFTER trigger: valor de retorno é ignorado
end;
$function$;

-- -----------------------------------------------------------------------------
-- 3) Triggers AFTER INSERT/UPDATE/DELETE nas 9 tabelas auditadas (idempotentes)
-- -----------------------------------------------------------------------------
drop trigger if exists trg_audit_operacoes on public.operacoes;
create trigger trg_audit_operacoes
  after insert or update or delete on public.operacoes
  for each row execute function public.audit();

drop trigger if exists trg_audit_operacao_titulos on public.operacao_titulos;
create trigger trg_audit_operacao_titulos
  after insert or update or delete on public.operacao_titulos
  for each row execute function public.audit();

drop trigger if exists trg_audit_recompras on public.recompras;
create trigger trg_audit_recompras
  after insert or update or delete on public.recompras
  for each row execute function public.audit();

drop trigger if exists trg_audit_titulos on public.titulos;
create trigger trg_audit_titulos
  after insert or update or delete on public.titulos
  for each row execute function public.audit();

drop trigger if exists trg_audit_clientes on public.clientes;
create trigger trg_audit_clientes
  after insert or update or delete on public.clientes
  for each row execute function public.audit();

drop trigger if exists trg_audit_sacados on public.sacados;
create trigger trg_audit_sacados
  after insert or update or delete on public.sacados
  for each row execute function public.audit();

drop trigger if exists trg_audit_compliance_analises on public.compliance_analises;
create trigger trg_audit_compliance_analises
  after insert or update or delete on public.compliance_analises
  for each row execute function public.audit();

drop trigger if exists trg_audit_configuracoes_financeiras on public.configuracoes_financeiras;
create trigger trg_audit_configuracoes_financeiras
  after insert or update or delete on public.configuracoes_financeiras
  for each row execute function public.audit();

drop trigger if exists trg_audit_user_roles on public.user_roles;
create trigger trg_audit_user_roles
  after insert or update or delete on public.user_roles
  for each row execute function public.audit();

-- -----------------------------------------------------------------------------
-- 4) RLS — append-only forte
--    enable (SEM force); revoke all; grant select; policy só de SELECT.
-- -----------------------------------------------------------------------------
alter table public.audit_log enable row level security;

revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

drop policy if exists "audit_log_select_admin_diretoria" on public.audit_log;
create policy "audit_log_select_admin_diretoria"
  on public.audit_log for select
  to authenticated
  using (public.is_admin_or_diretoria());

-- -----------------------------------------------------------------------------
-- 5) View legível para fiscalização (security_invoker -> respeita RLS da base)
-- -----------------------------------------------------------------------------
create or replace view public.audit_log_legivel as
select
  al.id,
  al.created_at,
  al.tabela,
  al.operacao,
  al.registro_id,
  al.ator,
  coalesce(nullif(al.ator_nome, ''), nullif(p.nome_completo, ''), 'Sistema / acesso direto') as ator_nome,
  ur.role as ator_papel,
  al.dados_antigos,
  al.dados_novos
from public.audit_log al
left join public.profiles   p  on p.id      = al.ator
left join public.user_roles ur on ur.user_id = al.ator;

-- security_invoker garante que a view roda com os privilégios de quem consulta
-- e portanto RESPEITA o RLS da audit_log (independente da versão do Postgres).
alter view public.audit_log_legivel set (security_invoker = on);

revoke all on public.audit_log_legivel from anon, authenticated;
grant select on public.audit_log_legivel to authenticated;
