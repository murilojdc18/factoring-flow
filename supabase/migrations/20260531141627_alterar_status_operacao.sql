-- Migration: alterar_status_operacao (RPC de transição de status da operação)
-- Data: 2026-05-31
-- Autor: Murilo (via Claude Code) -- Fase 3, ciclo de vida da operação
-- Motivo: mudar o status de uma operação de forma ATÔMICA e validada pela máquina
--   de estados v1 (a AUTORIDADE final; o front em operacaoTransicoes.ts só habilita
--   botões). Numa única transação: valida papel, valida a transição (CASE da máquina
--   v1), exige motivo no cancelamento, libera os títulos reservados quando cancela,
--   grava o novo status e registra o evento em operacao_historico. Qualquer falha
--   faz rollback total via RAISE.
--
-- Máquina v1 (ESPELHA src/lib/operacaoTransicoes.ts):
--   Em análise  -> {Aprovada, Cancelada}
--   Aprovada    -> {Formalizada, Cancelada}
--   Formalizada -> {Liquidada, Cancelada}
--   Liquidada / Cancelada                 -> terminais (sem saída)
--   Rascunho / Em atraso / Recomprada     -> fora do v1 (sem transição manual)
--
-- Papel (checagem manual: SECURITY DEFINER ignora RLS):
--   - Transições em geral: administrador OU operacional.
--   - Transição para 'Liquidada': administrador OU operacional OU financeiro
--     (interpretação ADITIVA de "liquidar=+financeiro"; financeiro SOMADO à base).
--     >> REVISAR: se a regra for financeiro substituir operacional na liquidação,
--        trocar o array de v_papel_ok abaixo para array['administrador','financeiro'].
--
-- Erros (SQLSTATE -> mensagem):
--   42501  Sem permissão para alterar o status (papel insuficiente)
--   P0001  Operação não encontrada
--   P0002  Transição inválida (rejeitada pela máquina v1)
--   P0004  Cancelamento sem motivo (observação vazia)
--
-- Idempotente: drop if exists + create or replace.

drop function if exists public.alterar_status_operacao(uuid, operacao_status, text);

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

  -- P0004 (ajuste): cancelar exige motivo. Logo após validar a transição, antes da cascata.
  if p_novo_status = 'Cancelada' and coalesce(trim(p_observacao), '') = '' then
    raise exception 'Informe o motivo do cancelamento' using errcode = 'P0004';
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
  'Fase 3: transição de status da operação validada pela máquina v1 (espelha operacaoTransicoes.ts). Papel administrador/operacional (+financeiro p/ Liquidada). Cancelar exige motivo (P0004) e libera títulos Operado->Disponível. SECURITY DEFINER.';

-- Permissões: bloqueia acesso geral, libera autenticados. A restrição fina de papel
-- (app_role) é feita DENTRO da função, pois GRANT atua sobre roles do Postgres.
revoke execute on function public.alterar_status_operacao(uuid, operacao_status, text) from public;
grant execute on function public.alterar_status_operacao(uuid, operacao_status, text) to authenticated;
