-- Bucket privado para anexos
insert into storage.buckets (id, name, public)
values ('anexos', 'anexos', false)
on conflict (id) do nothing;

-- Enum de status do anexo
do $$ begin
  create type public.anexo_status as enum ('Ativo', 'Arquivado', 'Removido');
exception when duplicate_object then null; end $$;

-- Enum de tipo de entidade vinculada
do $$ begin
  create type public.anexo_entidade as enum ('cliente', 'titulo', 'operacao', 'documento', 'cobranca');
exception when duplicate_object then null; end $$;

-- Tabela de metadados
create table if not exists public.anexos (
  id uuid primary key default gen_random_uuid(),
  nome_arquivo text not null,
  storage_path text not null unique,
  tipo_mime text not null,
  tamanho_bytes bigint not null,
  entidade_tipo public.anexo_entidade not null,
  entidade_id uuid not null,
  observacoes text not null default '',
  status public.anexo_status not null default 'Ativo',
  enviado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_anexos_entidade
  on public.anexos(entidade_tipo, entidade_id)
  where status <> 'Removido';

create index if not exists idx_anexos_enviado_por
  on public.anexos(enviado_por);

-- Trigger para atualizar updated_at
drop trigger if exists tg_anexos_updated_at on public.anexos;
create trigger tg_anexos_updated_at
  before update on public.anexos
  for each row execute function public.set_updated_at();

-- RLS
alter table public.anexos enable row level security;

drop policy if exists "auth ve anexos" on public.anexos;
create policy "auth ve anexos"
  on public.anexos for select
  to authenticated
  using (status <> 'Removido');

drop policy if exists "auth envia anexos" on public.anexos;
create policy "auth envia anexos"
  on public.anexos for insert
  to authenticated
  with check (
    auth.uid() = enviado_por
    and public.has_any_role(
      auth.uid(),
      array['administrador','operacional','financeiro','compliance','cobranca']::app_role[]
    )
  );

drop policy if exists "autor ou admin atualiza anexo" on public.anexos;
create policy "autor ou admin atualiza anexo"
  on public.anexos for update
  to authenticated
  using (
    auth.uid() = enviado_por
    or public.has_role(auth.uid(), 'administrador'::app_role)
  );

drop policy if exists "admin remove anexo" on public.anexos;
create policy "admin remove anexo"
  on public.anexos for delete
  to authenticated
  using (public.has_role(auth.uid(), 'administrador'::app_role));

-- Storage policies (bucket privado)
drop policy if exists "auth lista anexos storage" on storage.objects;
create policy "auth lista anexos storage"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'anexos');

drop policy if exists "auth envia anexos storage" on storage.objects;
create policy "auth envia anexos storage"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'anexos'
    and auth.uid() = owner
    and public.has_any_role(
      auth.uid(),
      array['administrador','operacional','financeiro','compliance','cobranca']::app_role[]
    )
  );

drop policy if exists "autor ou admin remove storage" on storage.objects;
create policy "autor ou admin remove storage"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'anexos'
    and (auth.uid() = owner or public.has_role(auth.uid(), 'administrador'::app_role))
  );