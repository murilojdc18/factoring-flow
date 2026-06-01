-- Migration: editar_operacao (RPC de edição v1 de metadados seguros da operação)
-- Data: 2026-06-01
-- Autor: Murilo (via Claude Code) -- Fase 3, edição v1
-- Motivo: editar APENAS os metadados seguros de uma operação: observacoes +
--   responsavel_interno. Valores, taxa, prazo, títulos vinculados, cedente,
--   numero, status e datas ficam FORA (mexeriam em cascata/integridade
--   financeira). Guard de status no servidor; whitelist estrita de colunas.
--   A trilha de auditoria 3.1 (trigger audit -> audit_log) registra a UPDATE
--   automaticamente (ator + antes/depois); por isso NÃO grava operacao_historico
--   (aquela tabela é a timeline de STATUS e seu status é NOT NULL).
--
-- Erros (SQLSTATE -> mensagem):
--   42501  Sem permissão (papel != administrador/operacional)
--   P0001  Operação não encontrada
--   P0011  Status terminal (Liquidada/Cancelada/Recomprada) não editável
--   P0012  responsavel_interno vazio
--   (P0011/P0012 fora da classe reservada P00x do Postgres -- ver lição P0004=assert_failure)
--
-- Idempotente: drop if exists + create or replace. SECURITY DEFINER.

drop function if exists public.editar_operacao(uuid, text, text);

create or replace function public.editar_operacao(
  p_operacao_id         uuid,
  p_observacoes         text,
  p_responsavel_interno text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_status operacao_status;
  v_resp   text;
begin
  -- a) autenticado
  if v_uid is null then
    raise exception 'Sem permissão para editar a operação' using errcode = '42501';
  end if;

  -- b) papel: administrador/operacional (espelha criar_operacao)
  if not public.has_any_role(
       v_uid, array['administrador','operacional']::app_role[]) then
    raise exception 'Sem permissão para editar a operação' using errcode = '42501';
  end if;

  -- c) trava a linha e lê o status atual
  select status into v_status
    from public.operacoes
   where id = p_operacao_id
   for update;
  if not found then
    raise exception 'Operação não encontrada' using errcode = 'P0001';
  end if;

  -- d) GUARD: status terminal/fechado não pode ser editado (P0011, fora de P00x)
  if v_status in ('Liquidada','Cancelada','Recomprada') then
    raise exception 'Operação em status % não pode ser editada', v_status
      using errcode = 'P0011';
  end if;

  -- e) responsavel_interno obrigatório (não-vazio); observacoes é opcional
  v_resp := nullif(trim(p_responsavel_interno), '');
  if v_resp is null then
    raise exception 'Informe o responsável interno' using errcode = 'P0012';
  end if;

  -- f) UPDATE SÓ da whitelist (observacoes, responsavel_interno). NUNCA outras
  --    colunas: valores, taxa, prazo, títulos, cedente, numero, status, datas.
  update public.operacoes
     set observacoes         = coalesce(p_observacoes, ''),
         responsavel_interno = v_resp,
         updated_at          = now()
   where id = p_operacao_id;

  -- g) sem evento em operacao_historico (ver cabeçalho): edição de metadados não
  --    é mudança de status; a trilha audit_log (3.1) já registra esta UPDATE.
end;
$$;

comment on function public.editar_operacao(uuid, text, text) is
  'Fase 3: edição v1 de metadados seguros da operação (observacoes, responsavel_interno). Guard de status (Liquidada/Cancelada/Recomprada -> P0011); responsavel obrigatorio (P0012). Papel administrador/operacional. Whitelist estrita de colunas. SECURITY DEFINER.';

revoke execute on function public.editar_operacao(uuid, text, text) from public;
grant  execute on function public.editar_operacao(uuid, text, text) to authenticated;
