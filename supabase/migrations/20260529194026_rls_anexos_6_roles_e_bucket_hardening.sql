-- Migration: rls_anexos_6_roles_e_bucket_hardening
-- Data: 2026-05-29
-- Autor: Murilo (murilojdc18)
-- Motivo: Tarefa 3.5 — anexos/KYC. Alinhar INSERT e SELECT de public.anexos
--   aos 6 roles (admin, operacional, financeiro, compliance, cobranca, diretoria).
--   Exceção CONSCIENTE à 2.5.1 (que restringiu SELECT a admin/diretoria): vale
--   SÓ para anexos; as outras 11 tabelas seguem admin/diretoria.
--   Também: diretoria passa a poder SUBIR -> precisa entrar na policy de INSERT
--   do storage.objects (o upload toca o Storage antes da tabela).
--   E hardening do bucket: limite de 25MB e mimes PDF/PNG/JPEG no nível do bucket.

-- 1) SELECT da tabela: 6 roles (antes: admin/diretoria via is_admin_or_diretoria)
drop policy if exists "admin_diretoria ve anexos" on public.anexos;
create policy "roles operacionais veem anexos"
  on public.anexos for select
  to authenticated
  using (
    public.has_any_role(
      auth.uid(),
      array['administrador','operacional','financeiro','compliance','cobranca','diretoria']::app_role[]
    )
  );

-- 2) INSERT da tabela: 6 roles (antes: 5, sem diretoria). Mantém auth.uid()=enviado_por.
drop policy if exists "auth envia anexos" on public.anexos;
create policy "auth envia anexos"
  on public.anexos for insert
  to authenticated
  with check (
    auth.uid() = enviado_por
    and public.has_any_role(
      auth.uid(),
      array['administrador','operacional','financeiro','compliance','cobranca','diretoria']::app_role[]
    )
  );

-- 3) INSERT do storage.objects: adiciona diretoria. Mantém bucket_id e owner check.
drop policy if exists "auth envia anexos storage" on storage.objects;
create policy "auth envia anexos storage"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'anexos'
    and auth.uid() = owner
    and public.has_any_role(
      auth.uid(),
      array['administrador','operacional','financeiro','compliance','cobranca','diretoria']::app_role[]
    )
  );

-- 4) Hardening do bucket: 25 MB e mimes permitidos
update storage.buckets
set file_size_limit = 26214400,
    allowed_mime_types = array['application/pdf','image/png','image/jpeg']
where id = 'anexos';
