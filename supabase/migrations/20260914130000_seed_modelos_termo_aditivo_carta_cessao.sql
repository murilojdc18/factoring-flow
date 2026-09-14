-- Migration: seed_modelos_termo_aditivo_carta_cessao
-- Data: 2026-09-14
-- Autor: Murilo (via Claude Code)
--
-- 1) Cadastra os 2 documentos OFICIAIS da operação, no formato que a empresa já
--    emite (referência: operações 49-26 e 57-26):
--      - "Termo aditivo de fomento mercantil"
--      - "Carta de cessão de crédito"
--    O layout e as cláusulas vivem em src/lib/documentosOficiais/ (PDF idêntico
--    ao atual); `conteudo` aqui é a referência textual do instrumento para a
--    tela de Contratos. A carta usa o 2º parágrafo CORRIGIDO ("credor do(s)
--    sacado(s)") — pendente revisão do advogado (ver descricao).
-- 2) Desativa (status 'Inativo', reversível) os rascunhos genéricos de
--    cessão/aditivo semeados em 20260523144341, substituídos pelos oficiais.
--    Contrato master, borderô, termo de recompra, notificação e recibo ficam
--    como estão.
-- Idempotente: on conflict (id) do nothing + update por id.

insert into public.modelos_documentos
  (id, nome, tipo, descricao, conteudo, variaveis, status, versao, created_by)
values
  (
    '3b1f6c2a-7d4e-4f0a-9c61-2a8e5d7b9f01',
    'Termo Aditivo do Contrato de Fomento Mercantil',
    'Termo aditivo de fomento mercantil',
    $desc$Documento oficial da operação (PDF no layout atual da empresa). Tabela por título: valor, vencimento, nº doc., dias, %, juros, líquido e sacado; demonstrativo com os valores gravados da operação. Premissas: Nota Promissória nº = número da operação; linhas não modeladas (diferença de operação anterior, custas de prorrogação, recompra dos boletos, regresso, adiantamento) = 0,00; responsável solidário = responsável legal do cedente.$desc$,
    $doc$Termo Aditivo do Contrato de Fomento Mercantil - Nº {{operacao_numero}}

CONTRATANTE - Devedora
Empresa: {{cedente_razao_social}}
CNPJ: {{cedente_cnpj}}

CONTRATADA - Compradora
Empresa: {{empresa_factoring_razao_social}}
CNPJ: {{empresa_factoring_cnpj}}

FOMENTO MERCANTIL - Compra de Créditos à Vista
VALOR | VENCTO | Nº DOC. | DIAS | % | JUROS | LÍQUIDO | SACADO
(uma linha por título da operação)

O presente Termo Aditivo ao Contrato de Fomento Mercantil é formalizado de acordo com as condições gerais estipuladas no Contrato-Geral de FOMENTO MERCANTIL firmado, as quais a CONTRATANTE e a CONTRATADA ratificam em sua plenitude.

A CONTRATADA recebe, neste ato, a Nota Promissória {{operacao_numero}} ofertada em garantia ao fomento mercantil prestado a CONTRATANTE, tendo por objeto a compra de matéria prima, conforme as cláusulas constantes do Contrato Geral de Fomento Mercantil acima referido.

Por este instrumento, acertam a remuneração dos serviços prestados pela CONTRATADA à CONTRATANTE e o preço (diferencial), conforme se demonstra a seguir:

DEMONSTRATIVO DA OPERAÇÃO
Valor de face dos títulos / Total de títulos negociados
Deduções: Diferença Operação Anterior; Custas de Prorrogação; Diferencial de Compra (taxa a.m.); Outras tarifas detalhadas no borderô; Recompra dos boletos
Ajustes: (–) Regresso; (–) Retenção; (+) Adiantamento
Total Pago

{{cidade_assinatura}}, {{data_assinatura}}

CONTRATANTE / CONTRATADA / RESPONSÁVEIS SOLIDÁRIOS$doc$,
    '{}'::jsonb,
    'Ativo',
    1,
    null
  ),
  (
    '8c4d2e9b-1a5f-4b7c-8e30-6f9a1c2d3e02',
    'Carta de Cessão de Crédito',
    'Carta de cessão de crédito',
    $desc$Documento oficial da operação (PDF no layout atual da empresa). 2º parágrafo corrigido: o cedente é credor do(s) sacado(s) listados (o modelo antigo repetia o próprio cedente). PENDENTE: revisão do advogado antes do uso com cliente.$desc$,
    $doc$CESSÃO DE CRÉDITO

Pelo presente instrumento particular de um lado {{cedente_razao_social}}, inscrita no CNPJ: {{cedente_cnpj}}, estabelecida na {{cedente_endereco}}, doravante designado CEDENTE e de outro lado {{empresa_factoring_razao_social}}, inscrita no CNPJ: {{empresa_factoring_cnpj}}, estabelecida na {{empresa_factoring_endereco}}, doravante designado CESSIONÁRIO, tem entre si como justo e contratado o que se segue:

O CEDENTE é credor do(s) sacado(s) relacionado(s) abaixo, referente ao crédito do pagamento da(s) Notas Fiscais de Venda Mercantil (duplicatas) relacionada(s) abaixo:

VALOR | VENCIMENTO | Nº DOC. | SACADO
(uma linha por título da operação)

Por força do ora pactuado o CEDENTE cede e transfere ao CESSIONÁRIO o referido crédito, bem como todo direito e ação conferidos por lei. Os valores do crédito(s) do cedente devidos pela empresa será pago(s) por boleto ou TED a empresa ora CESSIONÁRIA, os dados serão passados via e-mail.

{{cidade_assinatura}}, {{data_assinatura}}.

{{cedente_razao_social}} - CNPJ: {{cedente_cnpj}}$doc$,
    '{}'::jsonb,
    'Ativo',
    1,
    null
  )
on conflict (id) do nothing;

-- Rascunhos genéricos substituídos pelos oficiais (reversível: voltar para 'Ativo').
update public.modelos_documentos
   set status = 'Inativo', updated_at = now()
 where id in (
   '2e042264-945a-40b9-b674-ee236920a081', -- Contrato de Cessão de Direitos Creditórios (proforma)
   '87f7317e-0542-452e-8a55-ed790c3f3c0d', -- Cessão de Recebíveis — Padrão
   'b54b659d-3796-4c12-9764-80445bfedab4', -- Aditivo de Operação ao Contrato de Fomento (proforma)
   '5800de25-3c15-4710-ace2-2c34a6d479dc'  -- Aditivo Padrão (rascunho)
 )
   and status <> 'Inativo';
