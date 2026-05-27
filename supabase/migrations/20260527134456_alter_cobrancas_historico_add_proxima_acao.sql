-- Migration: alter_cobrancas_historico_add_proxima_acao
-- Data: 2026-05-27
-- Autor: Murilo (murilojdc18)
-- Motivo: sub-tarefa 2.8.1 - adiciona coluna proxima_acao (texto livre) que o
--         mock EventoCobranca tem mas o banco original (Lovable) não previu.
--         Permite registrar contexto da próxima ação ("Confirmar comprovante",
--         "Enviar boleto novamente"). NOT NULL DEFAULT '' espelha os demais
--         campos texto da tabela.
-- Idempotente: ADD COLUMN IF NOT EXISTS.

ALTER TABLE public.cobrancas_historico
  ADD COLUMN IF NOT EXISTS proxima_acao text NOT NULL DEFAULT '';
