
-- =====================================================
-- ENUMS
-- =====================================================
create type public.cliente_status as enum ('Ativo', 'Inativo', 'Em análise', 'Bloqueado');
create type public.sacado_status as enum ('Ativo', 'Em análise', 'Bloqueado', 'Inativo');
create type public.tipo_pessoa as enum ('PJ', 'PF');
create type public.titulo_status as enum ('Disponível', 'Em análise', 'Operado', 'Liquidado', 'Vencido', 'Recomprado', 'Cancelado', 'Em análise de recompra', 'Recompra solicitada', 'Substituição solicitada', 'Resolvido');
create type public.tipo_titulo as enum ('Duplicata', 'Nota promissória', 'Cheque', 'Boleto', 'Contrato', 'Outro');
create type public.operacao_status as enum ('Rascunho', 'Em análise', 'Aprovada', 'Formalizada', 'Liquidada', 'Em atraso', 'Recomprada', 'Cancelada');
create type public.modelo_documento_status as enum ('Ativo', 'Inativo', 'Rascunho');
create type public.cobranca_tipo as enum ('Ligação', 'E-mail', 'WhatsApp', 'Visita', 'Carta', 'Outro');
create type public.cobranca_resultado as enum ('Promessa de pagamento', 'Sem retorno', 'Negociado', 'Recusado', 'Pagamento confirmado', 'Outro');
create type public.recompra_acao as enum ('Recompra', 'Substituição', 'Análise interna');
create type public.compliance_risco as enum ('Baixo', 'Médio', 'Alto', 'Crítico');
create type public.compliance_status as enum ('Em análise', 'Aprovado', 'Aprovado com ressalvas', 'Reprovado', 'Pendente');

-- =====================================================
-- FUNÇÕES UTILITÁRIAS
-- =====================================================

-- Reuso do has_role já existente. Adicionamos helper para checagem em múltiplos roles.
create or replace function public.has_any_role(_user_id uuid, _roles app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = any(_roles)
  )
$$;

-- =====================================================
-- TABELA: clientes (cedentes)
-- =====================================================
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  nome_fantasia text not null default '',
  cnpj text not null unique,
  inscricao_estadual text not null default '',
  inscricao_municipal text not null default '',
  email_principal text not null default '',
  telefone text not null default '',
  whatsapp text not null default '',
  cep text not null default '',
  endereco text not null default '',
  numero text not null default '',
  complemento text not null default '',
  bairro text not null default '',
  cidade text not null default '',
  estado text not null default '',
  responsavel_legal text not null default '',
  cpf_responsavel text not null default '',
  email_responsavel text not null default '',
  telefone_responsavel text not null default '',
  banco text not null default '',
  agencia text not null default '',
  conta text not null default '',
  chave_pix text not null default '',
  status cliente_status not null default 'Em análise',
  limite_operacional numeric(15,2) not null default 0,
  observacoes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_clientes_status on public.clientes(status);
create index idx_clientes_cnpj on public.clientes(cnpj);

-- =====================================================
-- TABELA: sacados
-- =====================================================
create table public.sacados (
  id uuid primary key default gen_random_uuid(),
  tipo tipo_pessoa not null default 'PJ',
  nome text not null,
  nome_fantasia text not null default '',
  documento text not null unique,
  email text not null default '',
  telefone text not null default '',
  whatsapp text not null default '',
  cep text not null default '',
  endereco text not null default '',
  numero text not null default '',
  complemento text not null default '',
  bairro text not null default '',
  cidade text not null default '',
  estado text not null default '',
  pessoa_contato text not null default '',
  cargo_contato text not null default '',
  limite_concentracao numeric(15,2) not null default 0,
  score_interno integer not null default 0 check (score_interno between 0 and 1000),
  status sacado_status not null default 'Em análise',
  observacoes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_sacados_status on public.sacados(status);
create index idx_sacados_documento on public.sacados(documento);

-- =====================================================
-- TABELA: titulos
-- =====================================================
create table public.titulos (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  tipo tipo_titulo not null default 'Duplicata',
  cedente_id uuid not null references public.clientes(id) on delete restrict,
  sacado_id uuid not null references public.sacados(id) on delete restrict,
  data_emissao date not null,
  data_vencimento date not null,
  valor_face numeric(15,2) not null check (valor_face >= 0),
  numero_nota_fiscal text not null default '',
  chave_nota_fiscal text not null default '',
  descricao text not null default '',
  status titulo_status not null default 'Disponível',
  observacoes text not null default '',
  anexos jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_titulos_cedente on public.titulos(cedente_id);
create index idx_titulos_sacado on public.titulos(sacado_id);
create index idx_titulos_status on public.titulos(status);
create index idx_titulos_vencimento on public.titulos(data_vencimento);

-- =====================================================
-- TABELA: operacoes
-- =====================================================
create table public.operacoes (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  cedente_id uuid not null references public.clientes(id) on delete restrict,
  data_operacao date not null default current_date,
  status operacao_status not null default 'Rascunho',
  quantidade_titulos integer not null default 0,
  valor_bruto numeric(15,2) not null default 0,
  valor_desagio numeric(15,2) not null default 0,
  valor_tarifas numeric(15,2) not null default 0,
  valor_retencao numeric(15,2) not null default 0,
  valor_liquido numeric(15,2) not null default 0,
  prazo_medio integer not null default 0,
  taxa_aplicada numeric(6,3) not null default 0,
  responsavel_interno text not null default '',
  observacoes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_operacoes_cedente on public.operacoes(cedente_id);
create index idx_operacoes_status on public.operacoes(status);
create index idx_operacoes_data on public.operacoes(data_operacao);

-- =====================================================
-- TABELA: operacao_titulos (N:N)
-- =====================================================
create table public.operacao_titulos (
  id uuid primary key default gen_random_uuid(),
  operacao_id uuid not null references public.operacoes(id) on delete cascade,
  titulo_id uuid not null references public.titulos(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (operacao_id, titulo_id)
);

create index idx_op_titulos_operacao on public.operacao_titulos(operacao_id);
create index idx_op_titulos_titulo on public.operacao_titulos(titulo_id);

-- =====================================================
-- TABELA: operacao_historico
-- =====================================================
create table public.operacao_historico (
  id uuid primary key default gen_random_uuid(),
  operacao_id uuid not null references public.operacoes(id) on delete cascade,
  status operacao_status not null,
  observacao text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_op_hist_operacao on public.operacao_historico(operacao_id);

-- =====================================================
-- TABELA: modelos_documentos
-- =====================================================
create table public.modelos_documentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null default 'Contrato',
  descricao text not null default '',
  conteudo text not null default '',
  variaveis jsonb not null default '[]'::jsonb,
  status modelo_documento_status not null default 'Rascunho',
  versao integer not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- TABELA: documentos_gerados
-- =====================================================
create table public.documentos_gerados (
  id uuid primary key default gen_random_uuid(),
  modelo_id uuid references public.modelos_documentos(id) on delete set null,
  modelo_nome text not null default '',
  operacao_id uuid references public.operacoes(id) on delete set null,
  cliente_id uuid references public.clientes(id) on delete set null,
  conteudo text not null default '',
  variaveis_preenchidas jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_docgen_operacao on public.documentos_gerados(operacao_id);
create index idx_docgen_cliente on public.documentos_gerados(cliente_id);

-- =====================================================
-- TABELA: cobrancas_historico
-- =====================================================
create table public.cobrancas_historico (
  id uuid primary key default gen_random_uuid(),
  titulo_id uuid not null references public.titulos(id) on delete cascade,
  operacao_id uuid references public.operacoes(id) on delete set null,
  data_contato timestamptz not null default now(),
  tipo cobranca_tipo not null,
  resultado cobranca_resultado not null,
  responsavel text not null default '',
  observacoes text not null default '',
  proximo_contato date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_cobrancas_titulo on public.cobrancas_historico(titulo_id);
create index idx_cobrancas_data on public.cobrancas_historico(data_contato);

-- =====================================================
-- TABELA: configuracoes_financeiras
-- =====================================================
create table public.configuracoes_financeiras (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  valor jsonb not null default '{}'::jsonb,
  descricao text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- TABELA: compliance_analises
-- =====================================================
create table public.compliance_analises (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete cascade,
  operacao_id uuid references public.operacoes(id) on delete cascade,
  nivel_risco compliance_risco not null default 'Baixo',
  status compliance_status not null default 'Em análise',
  checklist jsonb not null default '{}'::jsonb,
  observacoes text not null default '',
  responsavel text not null default '',
  data_analise date not null default current_date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cliente_id is not null or operacao_id is not null)
);

create index idx_compliance_cliente on public.compliance_analises(cliente_id);
create index idx_compliance_operacao on public.compliance_analises(operacao_id);
create index idx_compliance_risco on public.compliance_analises(nivel_risco);

-- =====================================================
-- TABELA: usuarios_perfis (metadados extras de perfil interno)
-- =====================================================
create table public.usuarios_perfis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  area text not null default '',
  cargo text not null default '',
  telefone text not null default '',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- TRIGGERS updated_at
-- =====================================================
create trigger trg_clientes_updated before update on public.clientes for each row execute function public.set_updated_at();
create trigger trg_sacados_updated before update on public.sacados for each row execute function public.set_updated_at();
create trigger trg_titulos_updated before update on public.titulos for each row execute function public.set_updated_at();
create trigger trg_operacoes_updated before update on public.operacoes for each row execute function public.set_updated_at();
create trigger trg_modelos_updated before update on public.modelos_documentos for each row execute function public.set_updated_at();
create trigger trg_config_fin_updated before update on public.configuracoes_financeiras for each row execute function public.set_updated_at();
create trigger trg_compliance_updated before update on public.compliance_analises for each row execute function public.set_updated_at();
create trigger trg_usrperfis_updated before update on public.usuarios_perfis for each row execute function public.set_updated_at();

-- =====================================================
-- RLS — ENABLE
-- =====================================================
alter table public.clientes enable row level security;
alter table public.sacados enable row level security;
alter table public.titulos enable row level security;
alter table public.operacoes enable row level security;
alter table public.operacao_titulos enable row level security;
alter table public.operacao_historico enable row level security;
alter table public.modelos_documentos enable row level security;
alter table public.documentos_gerados enable row level security;
alter table public.cobrancas_historico enable row level security;
alter table public.configuracoes_financeiras enable row level security;
alter table public.compliance_analises enable row level security;
alter table public.usuarios_perfis enable row level security;

-- =====================================================
-- POLICIES
-- Visualização: qualquer usuário autenticado interno
-- Mutações: filtradas por perfil
-- =====================================================

-- CLIENTES
create policy "auth ve clientes" on public.clientes for select to authenticated using (true);
create policy "operacional/admin/compliance criam clientes" on public.clientes for insert to authenticated
  with check (public.has_any_role(auth.uid(), array['administrador','operacional','compliance']::app_role[]));
create policy "operacional/admin/compliance editam clientes" on public.clientes for update to authenticated
  using (public.has_any_role(auth.uid(), array['administrador','operacional','compliance']::app_role[]));
create policy "admin remove clientes" on public.clientes for delete to authenticated
  using (public.has_role(auth.uid(), 'administrador'::app_role));

-- SACADOS
create policy "auth ve sacados" on public.sacados for select to authenticated using (true);
create policy "operacional/admin/compliance criam sacados" on public.sacados for insert to authenticated
  with check (public.has_any_role(auth.uid(), array['administrador','operacional','compliance']::app_role[]));
create policy "operacional/admin/compliance editam sacados" on public.sacados for update to authenticated
  using (public.has_any_role(auth.uid(), array['administrador','operacional','compliance']::app_role[]));
create policy "admin remove sacados" on public.sacados for delete to authenticated
  using (public.has_role(auth.uid(), 'administrador'::app_role));

-- TÍTULOS
create policy "auth ve titulos" on public.titulos for select to authenticated using (true);
create policy "operacional/admin criam titulos" on public.titulos for insert to authenticated
  with check (public.has_any_role(auth.uid(), array['administrador','operacional']::app_role[]));
create policy "operacional/admin/cobranca editam titulos" on public.titulos for update to authenticated
  using (public.has_any_role(auth.uid(), array['administrador','operacional','cobranca']::app_role[]));
create policy "admin remove titulos" on public.titulos for delete to authenticated
  using (public.has_role(auth.uid(), 'administrador'::app_role));

-- OPERAÇÕES
create policy "auth ve operacoes" on public.operacoes for select to authenticated using (true);
create policy "operacional/admin criam operacoes" on public.operacoes for insert to authenticated
  with check (public.has_any_role(auth.uid(), array['administrador','operacional']::app_role[]));
create policy "operacional/admin/diretoria/financeiro editam operacoes" on public.operacoes for update to authenticated
  using (public.has_any_role(auth.uid(), array['administrador','operacional','diretoria','financeiro']::app_role[]));
create policy "admin remove operacoes" on public.operacoes for delete to authenticated
  using (public.has_role(auth.uid(), 'administrador'::app_role));

-- OPERAÇÃO_TÍTULOS
create policy "auth ve operacao_titulos" on public.operacao_titulos for select to authenticated using (true);
create policy "operacional/admin gerenciam operacao_titulos ins" on public.operacao_titulos for insert to authenticated
  with check (public.has_any_role(auth.uid(), array['administrador','operacional']::app_role[]));
create policy "operacional/admin gerenciam operacao_titulos del" on public.operacao_titulos for delete to authenticated
  using (public.has_any_role(auth.uid(), array['administrador','operacional']::app_role[]));

-- OPERAÇÃO_HISTÓRICO
create policy "auth ve operacao_historico" on public.operacao_historico for select to authenticated using (true);
create policy "auth registra operacao_historico" on public.operacao_historico for insert to authenticated
  with check (public.has_any_role(auth.uid(), array['administrador','operacional','diretoria','financeiro','cobranca','compliance']::app_role[]));

-- MODELOS_DOCUMENTOS
create policy "auth ve modelos" on public.modelos_documentos for select to authenticated using (true);
create policy "admin/operacional criam modelos" on public.modelos_documentos for insert to authenticated
  with check (public.has_any_role(auth.uid(), array['administrador','operacional']::app_role[]));
create policy "admin/operacional editam modelos" on public.modelos_documentos for update to authenticated
  using (public.has_any_role(auth.uid(), array['administrador','operacional']::app_role[]));
create policy "admin remove modelos" on public.modelos_documentos for delete to authenticated
  using (public.has_role(auth.uid(), 'administrador'::app_role));

-- DOCUMENTOS_GERADOS
create policy "auth ve documentos_gerados" on public.documentos_gerados for select to authenticated using (true);
create policy "operacional/admin geram documentos" on public.documentos_gerados for insert to authenticated
  with check (public.has_any_role(auth.uid(), array['administrador','operacional','financeiro']::app_role[]));
create policy "admin remove documentos_gerados" on public.documentos_gerados for delete to authenticated
  using (public.has_role(auth.uid(), 'administrador'::app_role));

-- COBRANÇAS_HISTÓRICO
create policy "auth ve cobrancas" on public.cobrancas_historico for select to authenticated using (true);
create policy "cobranca/admin registram cobrancas" on public.cobrancas_historico for insert to authenticated
  with check (public.has_any_role(auth.uid(), array['administrador','cobranca']::app_role[]));
create policy "cobranca/admin editam cobrancas" on public.cobrancas_historico for update to authenticated
  using (public.has_any_role(auth.uid(), array['administrador','cobranca']::app_role[]));
create policy "admin remove cobrancas" on public.cobrancas_historico for delete to authenticated
  using (public.has_role(auth.uid(), 'administrador'::app_role));

-- CONFIGURAÇÕES_FINANCEIRAS
create policy "auth ve config_fin" on public.configuracoes_financeiras for select to authenticated using (true);
create policy "admin/financeiro criam config_fin" on public.configuracoes_financeiras for insert to authenticated
  with check (public.has_any_role(auth.uid(), array['administrador','financeiro']::app_role[]));
create policy "admin/financeiro editam config_fin" on public.configuracoes_financeiras for update to authenticated
  using (public.has_any_role(auth.uid(), array['administrador','financeiro']::app_role[]));
create policy "admin remove config_fin" on public.configuracoes_financeiras for delete to authenticated
  using (public.has_role(auth.uid(), 'administrador'::app_role));

-- COMPLIANCE_ANÁLISES
create policy "auth ve compliance" on public.compliance_analises for select to authenticated using (true);
create policy "compliance/admin criam compliance" on public.compliance_analises for insert to authenticated
  with check (public.has_any_role(auth.uid(), array['administrador','compliance']::app_role[]));
create policy "compliance/admin editam compliance" on public.compliance_analises for update to authenticated
  using (public.has_any_role(auth.uid(), array['administrador','compliance']::app_role[]));
create policy "admin remove compliance" on public.compliance_analises for delete to authenticated
  using (public.has_role(auth.uid(), 'administrador'::app_role));

-- USUÁRIOS_PERFIS (metadados extras)
create policy "usuarios veem proprio perfil extra" on public.usuarios_perfis for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'administrador'::app_role));
create policy "usuarios editam proprio perfil extra" on public.usuarios_perfis for update to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'administrador'::app_role));
create policy "admin cria perfis extras" on public.usuarios_perfis for insert to authenticated
  with check (public.has_role(auth.uid(), 'administrador'::app_role) or auth.uid() = user_id);
create policy "admin remove perfis extras" on public.usuarios_perfis for delete to authenticated
  using (public.has_role(auth.uid(), 'administrador'::app_role));
