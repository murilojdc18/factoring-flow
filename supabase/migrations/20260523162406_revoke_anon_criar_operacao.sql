-- Migration: revoke anon de criar_operacao (hardening de menor privilégio)
-- Data: 2026-05-23
-- Autor: Murilo (via Claude Code) -- sub-tarefa 2.4b, Etapa 1 (follow-up)
-- Motivo: a migration create_operacao_rpc fez `revoke ... from public`, mas os
--   default privileges do Supabase concedem EXECUTE diretamente a anon. Este
--   revoke fecha o gap: apenas `authenticated` (e service_role) executam a RPC.
--   Sem impacto funcional (anon já caía no 42501 via auth.uid() NULL); apenas
--   alinha o privilégio à intenção de menor privilégio.
-- Idempotente: revoke é seguro mesmo se o privilégio já não existir.

revoke execute on function public.criar_operacao(jsonb) from anon;
