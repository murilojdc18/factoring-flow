alter table public.anexos
  alter column entidade_id type text using entidade_id::text;

drop index if exists public.idx_anexos_entidade;
create index idx_anexos_entidade
  on public.anexos(entidade_tipo, entidade_id)
  where status <> 'Removido';