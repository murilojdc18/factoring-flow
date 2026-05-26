-- Migration: alter_recompras_operacao_id_nullable
-- Data: 2026-05-26
-- Autor: Murilo (murilojdc18)
-- Motivo: sub-tarefa 2.6.1c — relaxa `operacao_id` para NULLABLE. O RecompraDialog
--         aberto a partir de /cobranças não tem operação (Cobrancas.tsx não passa
--         operacaoId), então uma recompra pode legitimamente nascer sem operação.
--         O NOT NULL da 2.6.1 quebraria esse INSERT (23502). O plano-2.6.md já
--         previa operacao_id NULL. Mantém o FK ON DELETE RESTRICT (lado defensivo).
-- Idempotente: DROP NOT NULL é no-op se a coluna já for nullable.

alter table public.recompras
  alter column operacao_id drop not null;
