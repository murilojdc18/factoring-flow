-- Migration: fix_delete_operacao_titulos_admin_only
-- Data: 2026-07-09
-- Autor: Murilo (via Claude Code)
--
-- DELETE de operacao_titulos vira admin-only. Motivo: era a ÚNICA tabela do
-- sistema com DELETE liberado a papel não-admin (operacional, desde o schema
-- v1 20260426215910). Nada no sistema usa esse DELETE (nem UI, nem RPC — o
-- cancelamento de operação não desvincula títulos, só devolve o status), e o
-- requisito do usuário AGENTE (OpenClaw) é "total sem DELETE": o agente opera
-- com o combo diretoria+operacional+financeiro+cobranca+compliance e não pode
-- herdar DELETE por nenhum deles.
--
-- Impacto em humanos: zero — os 2 usuários atuais são administradores.
--
-- Idempotente: drop policy if exists antes do create.

drop policy if exists "operacional/admin gerenciam operacao_titulos del"
  on public.operacao_titulos;

drop policy if exists "admin remove operacao_titulos"
  on public.operacao_titulos;

create policy "admin remove operacao_titulos"
  on public.operacao_titulos
  for delete to authenticated
  using (public.has_role(auth.uid(), 'administrador'));
