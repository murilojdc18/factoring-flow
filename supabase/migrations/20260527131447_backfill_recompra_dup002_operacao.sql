-- Migration: backfill_recompra_dup002_operacao
-- Data: 2026-05-27
-- Autor: Murilo (murilojdc18)
-- Motivo: corrige operacao_id NULL da recompra criada em /cobrancas (DUP-002)
--         antes do back-link automático da 2.7.1 estar em vigor. Idempotente
--         via AND operacao_id IS NULL.
-- Sub-tarefa: 2.7.1

UPDATE public.recompras
SET operacao_id = '4d2dc1a8-e3d4-42a5-b372-396a9438f3c2',
    operacao_numero = 'BOR-2026-1779555703598'
WHERE id = '9b44824d-17fb-4831-b1bf-c421ba45f548'
  AND operacao_id IS NULL;
