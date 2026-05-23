-- Migration: alter_documentos_gerados_snapshot_fields
-- Data: 2026-05-23
-- Autor: Murilo (murilojdc18)
-- Motivo: Decisão D2 da tarefa 2.5 — desnormalizar campos de snapshot em
--         documentos_gerados. As FKs (modelo_id, operacao_id, cliente_id) são
--         ON DELETE SET NULL; congelar tipo/versão/número/observações no
--         momento da geração preserva o documento como registro histórico
--         imutável, mesmo que a operação ou o modelo de origem mudem/saiam.
-- Idempotente: cada coluna com IF NOT EXISTS.

alter table public.documentos_gerados
  add column if not exists tipo_documento text not null default '';

alter table public.documentos_gerados
  add column if not exists modelo_versao integer not null default 1;

alter table public.documentos_gerados
  add column if not exists operacao_numero text not null default '';

alter table public.documentos_gerados
  add column if not exists observacoes text not null default '';
