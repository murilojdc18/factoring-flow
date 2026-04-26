
create type public.integracao_status as enum ('sucesso', 'erro', 'pendente');

create table public.integracao_logs (
  id uuid primary key default gen_random_uuid(),
  evento text not null,
  destino text not null default 'n8n',
  entidade_tipo text not null default '',
  entidade_id uuid,
  payload_enviado jsonb not null default '{}'::jsonb,
  http_status integer,
  resposta text,
  erro text,
  status integracao_status not null default 'pendente',
  tentativas integer not null default 1,
  duracao_ms integer,
  disparado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_integracao_logs_evento on public.integracao_logs(evento);
create index idx_integracao_logs_status on public.integracao_logs(status);
create index idx_integracao_logs_entidade on public.integracao_logs(entidade_tipo, entidade_id);
create index idx_integracao_logs_created on public.integracao_logs(created_at desc);

alter table public.integracao_logs enable row level security;

create policy "admin/compliance veem logs integracao"
  on public.integracao_logs for select
  to authenticated
  using (public.has_any_role(auth.uid(), array['administrador','compliance']::app_role[]));

create policy "admin remove logs integracao"
  on public.integracao_logs for delete
  to authenticated
  using (public.has_role(auth.uid(), 'administrador'::app_role));
