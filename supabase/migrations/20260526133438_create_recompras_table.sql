-- Migration: create_recompras_table
-- Data: 2026-05-26
-- Autor: Murilo (murilojdc18)
-- Motivo: sub-tarefa 2.6.1 — cria a tabela `recompras` (e o enum recompra_status)
--         que registra pedidos de recompra / substituição / análise interna de
--         títulos. Campos de snapshot (D4) congelam número/nomes no momento do
--         registro; FKs ON DELETE RESTRICT preservam a integridade do histórico;
--         soft delete via status 'Cancelado' (D8 — sem policy de DELETE).
-- Idempotente: enum via DO/EXCEPTION (padrão do projeto), tabela/índices com
--         IF NOT EXISTS, trigger via drop+create, policies via drop+create.
-- Espelha o padrão de: anexos (20260426220738), documentos_gerados (20260428121913)
--         e RLS Forma A (20260519110208).

begin;

-- A) Enum de status da recompra.
--    Padrão do projeto (anexos / documento_gerado_status): DO + EXCEPTION em vez
--    de DROP TYPE IF EXISTS. Motivo: DROP TYPE num enum já em uso exigiria CASCADE
--    e derrubaria colunas dependentes — o bloco abaixo é idempotente e seguro.
do $$ begin
  create type public.recompra_status as enum (
    'Em análise de recompra',
    'Recompra solicitada',
    'Substituição solicitada',
    'Resolvido',
    'Cancelado'   -- D8: soft delete
  );
exception when duplicate_object then null; end $$;

-- B) Tabela recompras.
create table if not exists public.recompras (
  id            uuid primary key default gen_random_uuid(),

  -- FKs ON DELETE RESTRICT: não deixam apagar título/operação/cedente referenciado
  -- enquanto houver recompra apontando pra ele (preserva o snapshot/histórico).
  titulo_id     uuid not null references public.titulos(id)   on delete restrict,
  operacao_id   uuid not null references public.operacoes(id) on delete restrict,
  cedente_id    uuid not null references public.clientes(id)  on delete restrict,

  acao          public.recompra_acao   not null,
  status        public.recompra_status not null default 'Em análise de recompra',
  motivo        text          not null default '',
  valor         numeric(15,2) not null default 0,
  observacoes   text          not null default '',
  resolvido_em  date          null,   -- preenchido quando status = 'Resolvido'

  -- Snapshot fields (D4) — congelados no momento do registro.
  titulo_numero   text not null default '',
  cedente_nome    text not null default '',
  sacado_nome     text not null default '',
  operacao_numero text not null default '',

  -- Audit.
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- C) Índices (nomeados + IF NOT EXISTS para idempotência; CREATE INDEX anônimo
--    não é idempotente). Espelha idx_anexos_* da migration de anexos.
create index if not exists idx_recompras_titulo_id   on public.recompras(titulo_id);
create index if not exists idx_recompras_operacao_id on public.recompras(operacao_id);

-- D) Trigger de updated_at — reusa public.set_updated_at() (já existe no projeto).
--    Padrão do projeto: drop + create (em vez de CREATE OR REPLACE TRIGGER).
drop trigger if exists trg_recompras_updated_at on public.recompras;
create trigger trg_recompras_updated_at
  before update on public.recompras
  for each row execute function public.set_updated_at();

-- E) RLS.
alter table public.recompras enable row level security;

-- F) Policies (D6).
-- SELECT: admin/diretoria (Forma A — espelha a RLS de 20260519110208).
drop policy if exists "admin_diretoria ve recompras" on public.recompras;
create policy "admin_diretoria ve recompras"
  on public.recompras for select
  to authenticated
  using (public.is_admin_or_diretoria());

-- INSERT: administrador / operacional / cobranca.
drop policy if exists "operacional/admin/cobranca criam recompras" on public.recompras;
create policy "operacional/admin/cobranca criam recompras"
  on public.recompras for insert
  to authenticated
  with check (
    public.has_any_role(
      auth.uid(),
      array['administrador','operacional','cobranca']::app_role[]
    )
  );

-- UPDATE: administrador / operacional / cobranca.
drop policy if exists "operacional/admin/cobranca editam recompras" on public.recompras;
create policy "operacional/admin/cobranca editam recompras"
  on public.recompras for update
  to authenticated
  using (
    public.has_any_role(
      auth.uid(),
      array['administrador','operacional','cobranca']::app_role[]
    )
  );

-- D8: NÃO há policy de DELETE. Remoção lógica via status = 'Cancelado'.

commit;
