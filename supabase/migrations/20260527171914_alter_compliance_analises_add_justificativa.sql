-- Migration: alter_compliance_analises_add_justificativa
-- Data: 2026-05-27
-- Autor: Murilo (murilojdc18)
-- Motivo: sub-tarefa 2.9.1 - adiciona coluna justificativa (texto livre) que o
--         mock AnaliseCompliance tem como campo obrigatório mas o banco original
--         (Lovable) não previu. Compliance regulatório (PLD/FT) exige justificar
--         o nível de risco atribuído - separar de `observacoes` permite queries
--         futuras de auditoria.
-- Idempotente: ADD COLUMN IF NOT EXISTS. NOT NULL DEFAULT '' espelha proxima_acao
-- da 2.8.1.

ALTER TABLE public.compliance_analises
  ADD COLUMN IF NOT EXISTS justificativa text NOT NULL DEFAULT '';
