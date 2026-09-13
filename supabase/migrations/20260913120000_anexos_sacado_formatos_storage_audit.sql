-- Migration: anexos_sacado_formatos_storage_audit
-- Data: 2026-09-13
-- Motivo: anexos no cadastro do sacado + planilhas/Word (faturamento, contratos)
--   e fechamento de dois gaps de segurança encontrados na auditoria:
--   (a) SELECT do storage.objects no bucket `anexos` estava aberto a QUALQUER
--       autenticado (inclusive somente_leitura) desde 20260426220738 — a tabela
--       foi restringida aos 6 roles em 20260529194026, o Storage não;
--   (b) `anexos` não estava na trilha de auditoria (20260529201500).
-- Idempotente: add value if not exists / drop ... if exists / update.

-- 1) Entidade `sacado` no enum polimórfico de anexos.
--    (ADD VALUE roda em transação no PG >= 12, desde que o valor não seja usado
--    na mesma transação — não é.)
alter type public.anexo_entidade add value if not exists 'sacado';

-- 2) SELECT do Storage: mesmos 6 roles da policy da tabela public.anexos.
drop policy if exists "auth lista anexos storage" on storage.objects;
create policy "auth lista anexos storage"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'anexos'
    and public.has_any_role(
      auth.uid(),
      array['administrador','operacional','financeiro','compliance','cobranca','diretoria']::app_role[]
    )
  );

-- 3) Bucket: além de PDF/PNG/JPEG, aceita XLSX, XLS, CSV e DOCX. Limite 25 MB mantido.
--    Precisa bater com MIME_POR_EXTENSAO em src/lib/anexos.ts.
update storage.buckets
set file_size_limit = 26214400,
    allowed_mime_types = array[
      'application/pdf',
      'image/png',
      'image/jpeg',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
where id = 'anexos';

-- 4) Trilha de auditoria em anexos (PK id uuid, compatível com public.audit()).
drop trigger if exists trg_audit_anexos on public.anexos;
create trigger trg_audit_anexos
  after insert or update or delete on public.anexos
  for each row execute function public.audit();
