-- Migration: fix_errcode_p0004_para_p0010
-- Data: 2026-06-01
-- Autor: Murilo (via Claude Code)
-- Motivo: o SQLSTATE 'P0004' é o código EMBUTIDO do Postgres `assert_failure`
--   (classe P00 é reservada: P0001=raise_exception, P0002=no_data_found,
--   P0003=too_many_rows, P0004=assert_failure). Usá-lo como código de aplicação
--   tem um efeito colateral: handlers genéricos `WHEN OTHERS` NÃO capturam
--   assert_failure. Trocamos por 'P0010' (fora da faixa reservada) nas DUAS
--   funções que usavam 'P0004', para consistência.
--
--   alterar_status_operacao: "Informe o motivo do cancelamento"  P0004 -> P0010
--   criar_operacao:          "...títulos não pertencem ao cedente" P0004 -> P0010
--
-- Idempotente: create or replace das duas funções (NÃO edita migrations antigas;
--   esta sobrepõe). create or replace preserva privilégios; reincluímos revoke/grant.

-- ───────────────────────────── alterar_status_operacao ─────────────────────────────
create or replace function public.alterar_status_operacao(
  p_operacao_id uuid,
  p_novo_status operacao_status,
  p_observacao  text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid          uuid := auth.uid();
  v_status_atual operacao_status;
  v_papel_ok     boolean;
  v_valida       boolean := false;
  v_liberados    integer := 0;
begin
  -- a) Usuário autenticado.
  if v_uid is null then
    raise exception 'Sem permissão para alterar o status' using errcode = '42501';
  end if;

  -- b) Carrega e TRAVA a linha (evita corrida de duas transições simultâneas).
  select status into v_status_atual
    from public.operacoes
   where id = p_operacao_id
   for update;
  if not found then
    raise exception 'Operação não encontrada' using errcode = 'P0001';
  end if;

  -- checagem de papel: base administrador/operacional; liquidar = +financeiro (aditivo).
  if p_novo_status = 'Liquidada' then
    v_papel_ok := public.has_any_role(
      v_uid, array['administrador','operacional','financeiro']::app_role[]);
  else
    v_papel_ok := public.has_any_role(
      v_uid, array['administrador','operacional']::app_role[]);
  end if;
  if not v_papel_ok then
    raise exception 'Sem permissão para alterar o status' using errcode = '42501';
  end if;

  -- c) Validação da transição pela máquina v1 (CASE). Estado terminal/fora do v1 -> falso.
  case v_status_atual
    when 'Em análise'  then v_valida := p_novo_status in ('Aprovada','Cancelada');
    when 'Aprovada'    then v_valida := p_novo_status in ('Formalizada','Cancelada');
    when 'Formalizada' then v_valida := p_novo_status in ('Liquidada','Cancelada');
    else v_valida := false; -- Liquidada, Cancelada, Rascunho, Em atraso, Recomprada
  end case;
  if not v_valida then
    raise exception 'Transição inválida: % -> %', v_status_atual, p_novo_status
      using errcode = 'P0002';
  end if;

  -- P0010: cancelar exige motivo. Logo após validar a transição, antes da cascata.
  if p_novo_status = 'Cancelada' and coalesce(trim(p_observacao), '') = '' then
    raise exception 'Informe o motivo do cancelamento' using errcode = 'P0010';
  end if;

  -- d) Cascata no cancelamento: devolve ao mercado os títulos reservados (Operado ->
  --    Disponível). GET DIAGNOSTICS apura quantos foram liberados (informativo; um
  --    título já em outro estado simplesmente não é tocado).
  if p_novo_status = 'Cancelada' then
    update public.titulos t
       set status = 'Disponível', updated_at = now()
      from public.operacao_titulos ot
     where ot.operacao_id = p_operacao_id
       and t.id = ot.titulo_id
       and t.status = 'Operado';
    get diagnostics v_liberados = row_count;
  end if;

  -- e) Grava o novo status.
  update public.operacoes
     set status = p_novo_status, updated_at = now()
   where id = p_operacao_id;

  -- f) Evento no histórico. observacao é NOT NULL: usa o motivo informado ou um texto
  --    padrão da transição (cancelamento já exigiu motivo não-vazio acima).
  insert into public.operacao_historico (operacao_id, status, observacao, created_by)
  values (
    p_operacao_id,
    p_novo_status,
    coalesce(nullif(trim(p_observacao), ''),
             'Status alterado para ' || p_novo_status),
    v_uid
  );
end;
$$;

comment on function public.alterar_status_operacao(uuid, operacao_status, text) is
  'Fase 3: transição de status da operação validada pela máquina v1 (espelha operacaoTransicoes.ts). Papel administrador/operacional (+financeiro p/ Liquidada). Cancelar exige motivo (P0010) e libera títulos Operado->Disponível. SECURITY DEFINER.';

revoke execute on function public.alterar_status_operacao(uuid, operacao_status, text) from public;
grant execute on function public.alterar_status_operacao(uuid, operacao_status, text) to authenticated;

-- ───────────────────────────────── criar_operacao ──────────────────────────────────
create or replace function public.criar_operacao(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid          uuid := auth.uid();
  v_numero       text;
  v_cedente_id   uuid;
  v_data_op      date;
  v_responsavel  text;
  v_titulo_ids   uuid[];
  v_qtd          integer;
  v_cedente_stat cliente_status;
  v_qtd_cedente  integer;
  v_operacao_id  uuid;
  v_atualizados  integer;
begin
  -- 0) Permissão. SECURITY DEFINER ignora RLS -> checagem manual, espelhando a
  --    policy "operacional/admin criam operacoes".
  if v_uid is null
     or not public.has_any_role(v_uid, array['administrador','operacional']::app_role[]) then
    raise exception 'Sem permissão para criar operações' using errcode = '42501';
  end if;

  -- a) Validação do payload (campos obrigatórios não-vazios).
  v_numero      := nullif(trim(payload->>'numero'), '');
  v_responsavel := nullif(trim(payload->>'responsavel_interno'), '');

  if v_numero is null then
    raise exception 'Payload inválido: numero' using errcode = 'P0001';
  end if;
  if (payload->>'cedente_id') is null then
    raise exception 'Payload inválido: cedente_id' using errcode = 'P0001';
  end if;
  if (payload->>'data_operacao') is null then
    raise exception 'Payload inválido: data_operacao' using errcode = 'P0001';
  end if;
  if v_responsavel is null then
    raise exception 'Payload inválido: responsavel_interno' using errcode = 'P0001';
  end if;
  if jsonb_typeof(payload->'titulo_ids') is distinct from 'array' then
    raise exception 'Payload inválido: titulo_ids' using errcode = 'P0001';
  end if;

  v_cedente_id := (payload->>'cedente_id')::uuid;
  v_data_op    := (payload->>'data_operacao')::date;

  -- Dedup dos títulos (evita inflar a contagem e bater no UNIQUE de operacao_titulos).
  select array_agg(distinct elem::uuid)
    into v_titulo_ids
    from jsonb_array_elements_text(payload->'titulo_ids') as elem;

  v_qtd := coalesce(array_length(v_titulo_ids, 1), 0);
  if v_qtd = 0 then
    raise exception 'Payload inválido: titulo_ids (lista vazia)' using errcode = 'P0001';
  end if;

  -- b) Cedente existe E está "Ativo".
  select status into v_cedente_stat from public.clientes where id = v_cedente_id;
  if not found then
    raise exception 'Cedente não encontrado' using errcode = 'P0002';
  elsif v_cedente_stat <> 'Ativo' then
    raise exception 'Cedente não está ativo' using errcode = 'P0002';
  end if;

  -- c) Todos os títulos existem E pertencem ao cedente informado.
  select count(*) into v_qtd_cedente
    from public.titulos
   where id = any(v_titulo_ids) and cedente_id = v_cedente_id;
  if v_qtd_cedente <> v_qtd then
    raise exception 'Um ou mais títulos não pertencem ao cedente informado'
      using errcode = 'P0010';
  end if;

  -- c.2) Todos estão "Disponível" (checagem antecipada; a guarda real é o UPDATE em (f)).
  if exists (
    select 1 from public.titulos
     where id = any(v_titulo_ids) and status <> 'Disponível'
  ) then
    raise exception 'Um ou mais títulos não estão disponíveis para operação'
      using errcode = 'P0003';
  end if;

  -- d) Cabeçalho da operação. Status "Em análise" conforme plano 2.4b (a reserva
  --    do título como "Operado" acontece em (f)).
  insert into public.operacoes (
    numero, cedente_id, data_operacao, status, quantidade_titulos,
    valor_bruto, valor_desagio, valor_tarifas, valor_retencao, valor_liquido,
    prazo_medio, taxa_aplicada, responsavel_interno, observacoes, created_by
  ) values (
    v_numero, v_cedente_id, v_data_op, 'Em análise', v_qtd,
    (payload->>'valor_bruto')::numeric,
    (payload->>'valor_desagio')::numeric,
    (payload->>'valor_tarifas')::numeric,
    (payload->>'valor_retencao')::numeric,
    (payload->>'valor_liquido')::numeric,
    (payload->>'prazo_medio')::integer,
    (payload->>'taxa_aplicada')::numeric,
    v_responsavel,
    coalesce(payload->>'observacoes', ''),
    v_uid
  )
  returning id into v_operacao_id;

  -- e) Vínculos operação <-> títulos.
  insert into public.operacao_titulos (operacao_id, titulo_id)
  select v_operacao_id, t from unnest(v_titulo_ids) as t;

  -- f) Reserva: marca os títulos como "Operado" SÓ se ainda "Disponível".
  --    GET DIAGNOSTICS protege contra corrida (2 operações no mesmo título): se
  --    alguém já operou um deles, o UPDATE pega menos linhas -> aborta tudo.
  update public.titulos
     set status = 'Operado', updated_at = now()
   where id = any(v_titulo_ids) and status = 'Disponível';
  get diagnostics v_atualizados = row_count;
  if v_atualizados <> v_qtd then
    raise exception 'Um ou mais títulos não estão disponíveis para operação'
      using errcode = 'P0003';
  end if;

  -- g) Evento inicial no histórico.
  insert into public.operacao_historico (operacao_id, status, observacao, created_by)
  values (v_operacao_id, 'Em análise', 'Operação criada', v_uid);

  -- h) Retorna o id da operação criada.
  return v_operacao_id;
end;
$$;

revoke execute on function public.criar_operacao(jsonb) from public;
grant execute on function public.criar_operacao(jsonb) to authenticated;
