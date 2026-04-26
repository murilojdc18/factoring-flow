-- 1. Enum de perfis internos
create type public.app_role as enum (
  'administrador',
  'diretoria',
  'operacional',
  'cobranca',
  'financeiro',
  'compliance',
  'somente_leitura'
);

-- 2. Tabela profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome_completo text not null default '',
  email text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.profiles enable row level security;

-- 3. Tabela user_roles (separada para evitar privilege escalation)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamp with time zone not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- 4. Função SECURITY DEFINER para checar role (evita recursão de RLS)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- 5. Função para retornar todos os roles de um usuário
create or replace function public.get_user_roles(_user_id uuid)
returns setof public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles where user_id = _user_id;
$$;

-- 6. Políticas RLS — profiles
create policy "Usuários veem o próprio profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

create policy "Administradores veem todos os profiles"
on public.profiles for select
to authenticated
using (public.has_role(auth.uid(), 'administrador'));

create policy "Usuários atualizam o próprio profile"
on public.profiles for update
to authenticated
using (auth.uid() = id);

create policy "Administradores atualizam qualquer profile"
on public.profiles for update
to authenticated
using (public.has_role(auth.uid(), 'administrador'));

-- 7. Políticas RLS — user_roles
create policy "Usuários veem os próprios roles"
on public.user_roles for select
to authenticated
using (auth.uid() = user_id);

create policy "Administradores veem todos os roles"
on public.user_roles for select
to authenticated
using (public.has_role(auth.uid(), 'administrador'));

create policy "Apenas administradores criam roles"
on public.user_roles for insert
to authenticated
with check (public.has_role(auth.uid(), 'administrador'));

create policy "Apenas administradores atualizam roles"
on public.user_roles for update
to authenticated
using (public.has_role(auth.uid(), 'administrador'));

create policy "Apenas administradores removem roles"
on public.user_roles for delete
to authenticated
using (public.has_role(auth.uid(), 'administrador'));

-- 8. Trigger: ao criar usuário, cria profile + role padrão "somente_leitura"
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome_completo, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome_completo', ''),
    new.email
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'somente_leitura');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 9. Trigger para updated_at em profiles
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();