-- Migration: alter_recompras_add_responsavel
-- Data: 2026-05-26
-- Autor: Murilo (murilojdc18)
-- Motivo: sub-tarefa 2.6.1b — adiciona a coluna `responsavel` que ficou de fora
--         da 2.6.1. O plano-2.6.md (seção 3) previa a coluna e o front
--         (SolicitacaoRecompra / RecompraDialog) a usa; sem ela o mapper de
--         recompra perderia o nome do responsável pela solicitação. NOT NULL
--         DEFAULT '' espelha os demais campos texto da tabela.
-- Idempotente: ADD COLUMN IF NOT EXISTS.

alter table public.recompras
  add column if not exists responsavel text not null default '';
