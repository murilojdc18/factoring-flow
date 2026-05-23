-- Migration: criar_operacao (RPC de criação atômica de operação)
-- Data: 2026-05-23
-- Autor: Murilo (via Claude Code) -- sub-tarefa 2.4b, Etapa 1
-- Motivo: criar operação de fomento de forma ATÔMICA. Numa única transação:
--   insere o cabeçalho em `operacoes` (status "Em análise"), vincula os títulos
--   em `operacao_titulos`, RESERVA os títulos marcando-os como "Operado" (com
--   guarda contra corrida) e registra o evento inicial em `operacao_historico`.
--   Se qualquer passo falhar, NADA é gravado (rollback total via RAISE).
--
-- Contrato do payload (jsonb) -- espelha o que o front (operacaoToRow) já produz:
--   {
--     "numero":              text   (obrigatório, não-vazio; UNIQUE em operacoes),
--     "cedente_id":          uuid   (obrigatório; cliente deve existir e estar "Ativo"),
--     "data_operacao":       date   (obrigatório, "YYYY-MM-DD"),
--     "responsavel_interno": text   (obrigatório, não-vazio),
--     "titulo_ids":          uuid[] (obrigatório, >=1; todos do cedente e "Disponível"),
--     "valor_bruto","valor_desagio","valor_tarifas","valor_retencao",
--     "valor_liquido","taxa_aplicada": numeric (pré-calculados no front),
--     "prazo_medio":         int,
--     "observacoes":         text   (opcional; default "")
--   }
-- Retorna: uuid da operação criada.
--
-- Erros (SQLSTATE -> mensagem):
--   P0001  Payload inválido: <campo>
--   P0002  Cedente não encontrado / não está ativo
--   P0003  Um ou mais títulos não estão disponíveis para operação
--   P0004  Um ou mais títulos não pertencem ao cedente informado
--   42501  Sem permissão para criar operações (role != administrador/operacional)
--   Erros padrão (23505 número duplicado, 23503 FK, 23502 not-null) sobem
--   INTACTOS para o front traduzir (traduzirErroOperacao, Etapa 2).
--
-- Idempotente: drop if exists + create or replace.
-- SECURITY DEFINER: ignora RLS, então a checagem de papel é feita manualmente
--   via has_any_role (espelha a policy de INSERT de operacoes).

drop function if exists public.criar_operacao(jsonb);

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
      using errcode = 'P0004';
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

comment on function public.criar_operacao(jsonb) is
  '2.4b: cria operação de forma atômica (operacoes + operacao_titulos + reserva de títulos como Operado + operacao_historico). Valida cedente Ativo e títulos do cedente/Disponíveis. SECURITY DEFINER; restrição a administrador/operacional via has_any_role.';

-- Permissões: bloqueia o acesso geral e libera apenas usuários autenticados.
-- A restrição fina (administrador/operacional) é feita DENTRO da função, já que
-- GRANT atua sobre roles do Postgres, não sobre o enum app_role.
revoke execute on function public.criar_operacao(jsonb) from public;
grant execute on function public.criar_operacao(jsonb) to authenticated;
