-- Migration: seed_modelo_recibo_pagamento
-- Data: 2026-05-29
-- Autor: Murilo (murilojdc18)
-- Motivo: Bloco 2b da tarefa 3.4 — semear o modelo "Recibo de pagamento"
--         (MOD-007 de src/data/mockContratos.ts) em modelos_documentos.
-- Mapeamento: texto->conteudo, observacoes->descricao, variaveis '{}' (mock
--         não usa), versao string -> integer 1, tipo com o valor exato do mock.
-- Idempotente: INSERT ... SELECT ... WHERE NOT EXISTS por tipo (em vez de
--         ON CONFLICT (id)), para não duplicar o tipo caso já exista.

insert into public.modelos_documentos
  (id, nome, tipo, descricao, conteudo, variaveis, status, versao, created_by)
select
  '55338427-bc5e-4ba0-8b74-5807916f9450',
  'Recibo de pagamento',
  'Recibo de pagamento',
  $desc$Recibo proforma do valor líquido pago ao cedente. Sujeito a revisão jurídica.$desc$,
  $doc$>>> RECIBO PROFORMA — sujeito a revisão jurídica. Não constitui quitação definitiva nem comprovante fiscal. <<<

RECIBO DE PAGAMENTO

Referente à operação nº {{operacao_numero}}, de {{operacao_data}}.

{{empresa_factoring_razao_social}}, inscrita no CNPJ sob o nº {{empresa_factoring_cnpj}}, com sede em {{empresa_factoring_endereco}}, DECLARA que efetuou o pagamento do valor líquido de {{valor_liquido}} à CEDENTE {{cedente_razao_social}}, inscrita no CNPJ sob o nº {{cedente_cnpj}}, referente à aquisição dos direitos creditórios da operação acima identificada.

A CEDENTE dá quitação do valor líquido ora recebido, ressalvadas as obrigações de recompra/substituição e as demais condições pactuadas no contrato e no respectivo borderô.

{{cidade_assinatura}}, {{data_assinatura}}.

_________________________________________
{{empresa_factoring_razao_social}}
CNPJ {{empresa_factoring_cnpj}}

_________________________________________
{{cedente_razao_social}}
CNPJ {{cedente_cnpj}}$doc$,
  '{}'::jsonb,
  'Ativo',
  1,
  '09e693de-63ef-4664-a3da-82af69ca2d58'
where not exists (
  select 1 from public.modelos_documentos where tipo = 'Recibo de pagamento'
);
