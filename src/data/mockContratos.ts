export type ContratoTipo =
  | "Contrato master de fomento mercantil"
  | "Contrato de cessão de direitos creditórios"
  | "Aditivo de operação"
  | "Borderô de títulos"
  | "Termo de recompra"
  | "Notificação ao sacado";

export type ContratoStatus = "Rascunho" | "Ativo" | "Inativo";

export interface ModeloContrato {
  id: string;
  nome: string;
  tipo: ContratoTipo;
  versao: string;
  status: ContratoStatus;
  atualizadoEm: string; // ISO
  texto: string;
  observacoes: string;
}

export const TIPOS_CONTRATO: ContratoTipo[] = [
  "Contrato master de fomento mercantil",
  "Contrato de cessão de direitos creditórios",
  "Aditivo de operação",
  "Borderô de títulos",
  "Termo de recompra",
  "Notificação ao sacado",
];

export const STATUS_CONTRATO: ContratoStatus[] = ["Rascunho", "Ativo", "Inativo"];

export const PLACEHOLDERS = [
  "empresa_factoring_razao_social",
  "empresa_factoring_cnpj",
  "empresa_factoring_endereco",
  "contrato_master_numero",
  "contrato_master_data",
  "cedente_razao_social",
  "cedente_cnpj",
  "cedente_endereco",
  "cedente_representante",
  "cedente_representante_cpf",
  "operacao_numero",
  "operacao_data",
  "bordero_numero",
  "valor_bruto_total",
  "valor_liquido",
  "valor_desagio",
  "valor_tarifas",
  "valor_retencao",
  "taxa_aplicada",
  "prazo_medio",
  "quantidade_titulos",
  "lista_titulos",
  "lista_titulos_bordero",
  "cidade_assinatura",
  "data_assinatura",
] as const;

const today = new Date().toISOString().slice(0, 10);

export const mockModelosContrato: ModeloContrato[] = [
  {
    id: "MOD-CCDC-001",
    nome: "Contrato de Cessão de Direitos Creditórios",
    tipo: "Contrato de cessão de direitos creditórios",
    versao: "1.0",
    status: "Ativo",
    atualizadoEm: today,
    texto: `>>> MINUTA PROFORMA — documento gerado automaticamente para revisão interna e jurídica. Este texto não constitui contrato definitivo nem confere validade jurídica automática. <<<

============================================================
CONTRATO DE CESSÃO DE DIREITOS CREDITÓRIOS
============================================================

1. IDENTIFICAÇÃO DAS PARTES

CESSIONÁRIA: {{empresa_factoring_razao_social}}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{empresa_factoring_cnpj}}, com sede em {{empresa_factoring_endereco}}, doravante denominada simplesmente "FACTORING".

CEDENTE: {{cedente_razao_social}}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{cedente_cnpj}}, com sede em {{cedente_endereco}}, neste ato representada por {{cedente_representante}}, portador(a) do CPF nº {{cedente_representante_cpf}}, doravante denominada simplesmente "CEDENTE".

As partes acima identificadas, doravante denominadas em conjunto "Partes" e individualmente "Parte", celebram o presente instrumento conforme as cláusulas a seguir.

2. CONSIDERAÇÕES INICIAIS

Considerando que a CEDENTE é titular de direitos creditórios decorrentes de operações mercantis legítimas com terceiros (sacados);
Considerando que a FACTORING tem interesse em adquirir tais direitos creditórios, mediante condições financeiras pactuadas;
Considerando que as Partes desejam formalizar a presente cessão em caráter proforma, sujeita a revisão jurídica antes de qualquer formalização definitiva;
resolvem celebrar o presente Contrato.

3. OBJETO DA CESSÃO

3.1. Constitui objeto deste Contrato a cessão, pela CEDENTE à FACTORING, dos direitos creditórios identificados no item 5, vinculados à operação nº {{operacao_numero}}, datada de {{operacao_data}}.
3.2. A cessão é realizada de forma onerosa, nos termos das condições financeiras descritas no item 6.

4. RELAÇÃO DOS TÍTULOS CEDIDOS

4.1. Compõem o objeto da presente cessão os títulos discriminados na tabela abaixo:

┌──────────────┬──────────────────────────────┬──────────────┬──────────────────┐
│ Nº do Título │ Sacado                       │ Vencimento   │ Valor (R$)       │
├──────────────┼──────────────────────────────┼──────────────┼──────────────────┤
{{lista_titulos}}
└──────────────┴──────────────────────────────┴──────────────┴──────────────────┘

4.2. A relação acima é parte integrante e indissociável deste Contrato.

5. PREÇO DA CESSÃO E CONDIÇÕES FINANCEIRAS

5.1. Valor bruto total dos títulos cedidos: {{valor_bruto_total}}.
5.2. Taxa de fator/deságio aplicada: {{taxa_aplicada}} ao mês.
5.3. Prazo médio ponderado da operação: {{prazo_medio}} dias.
5.4. Composição do preço:
     a) Valor de deságio: {{valor_desagio}};
     b) Valor de tarifas operacionais: {{valor_tarifas}};
     c) Valor de retenção/reserva: {{valor_retencao}}.
5.5. Valor líquido a ser pago à CEDENTE: {{valor_liquido}}, observadas as deduções acima.
5.6. Os valores indicados são estimativos e poderão ser ajustados conforme conferência documental e validação jurídica.

6. DECLARAÇÕES DA CEDENTE

A CEDENTE declara, sob sua exclusiva responsabilidade, que:
a) é legítima titular dos direitos creditórios ora cedidos;
b) os títulos decorrem de operações mercantis efetivamente realizadas e de boa-fé;
c) não há, até a presente data e segundo seu conhecimento, vícios, gravames ou ônus sobre os títulos cedidos;
d) as informações fornecidas à FACTORING são verídicas.

7. OBRIGAÇÕES DAS PARTES

7.1. Da CEDENTE:
a) entregar à FACTORING toda a documentação suporte dos títulos cedidos;
b) prestar informações adicionais quando razoavelmente solicitadas;
c) comunicar a cessão aos sacados, quando aplicável.

7.2. Da FACTORING:
a) efetuar o pagamento do valor líquido pactuado, observadas as condições do item 6;
b) administrar a cobrança dos títulos cedidos com diligência razoável;
c) prestar informações sobre o andamento das cobranças, quando solicitadas.

8. PROCEDIMENTOS DE COBRANÇA

8.1. A FACTORING ficará responsável pela administração e cobrança ordinária dos títulos cedidos.
8.2. Em caso de inadimplência do sacado, a FACTORING poderá adotar medidas usuais de cobrança extrajudicial, sem prejuízo de procedimentos adicionais a serem avaliados caso a caso.

9. RETENÇÃO/RESERVA

9.1. Quando aplicável, a FACTORING poderá reter o valor de {{valor_retencao}} a título de reserva, destinada a cobrir eventuais ajustes, divergências ou inadimplências.
9.2. As condições de devolução ou utilização da reserva deverão ser detalhadas em instrumento específico, sujeito a revisão jurídica.

10. EVENTOS DE SUBSTITUIÇÃO OU RECOMPRA

10.1. Quando aplicável e mediante prévio acordo entre as Partes, a CEDENTE poderá substituir títulos ou efetuar a recompra de créditos cedidos, observados os procedimentos pactuados em instrumento específico.
10.2. Os critérios, prazos e valores aplicáveis à substituição ou recompra serão objeto de análise individualizada.

11. CONFIDENCIALIDADE

11.1. As Partes se comprometem a tratar como confidenciais as informações comerciais, financeiras e operacionais a que tiverem acesso em razão deste Contrato, ressalvadas as hipóteses legais ou judiciais de divulgação obrigatória.

12. DISPOSIÇÕES GERAIS

12.1. Este Contrato é proforma e não substitui a análise e a formalização jurídica definitiva.
12.2. Eventuais alterações deverão ser formalizadas por aditivo, devidamente revisado e assinado pelas Partes.
12.3. A tolerância de qualquer das Partes quanto ao descumprimento de obrigação aqui prevista não importará em renúncia ou novação.

13. FORO

13.1. As Partes elegem, para dirimir eventuais controvérsias decorrentes deste Contrato, o foro a ser definido em revisão jurídica posterior, conforme política interna e regras aplicáveis.

14. ASSINATURAS

E, por estarem assim justas e contratadas, as Partes assinam o presente instrumento em duas vias de igual teor e forma, na presença das testemunhas abaixo.

{{cidade_assinatura}}, {{data_assinatura}}.

_________________________________________
{{empresa_factoring_razao_social}}
CNPJ {{empresa_factoring_cnpj}}

_________________________________________
{{cedente_razao_social}}
CNPJ {{cedente_cnpj}}
Representante: {{cedente_representante}} — CPF {{cedente_representante_cpf}}

Testemunhas:
1) Nome: ____________________________   CPF: ____________________
2) Nome: ____________________________   CPF: ____________________

>>> Fim da minuta proforma. Submeta este documento à revisão jurídica antes de qualquer uso externo. <<<`,
    observacoes:
      "Minuta proforma — sujeita a revisão jurídica completa antes do uso. A tabela de títulos é renderizada via {{lista_titulos}} e deverá ser substituída pela relação real durante a geração do documento.",
  },
  {
    id: "MOD-ADIT-001",
    nome: "Aditivo de Operação ao Contrato de Fomento",
    tipo: "Aditivo de operação",
    versao: "1.0",
    status: "Ativo",
    atualizadoEm: today,
    texto: `>>> ADITIVO PROFORMA — revisar juridicamente antes de uso. Documento gerado automaticamente, sem garantia de validade jurídica. <<<

============================================================
ADITIVO DE OPERAÇÃO AO CONTRATO DE FOMENTO MERCANTIL
Operação nº {{operacao_numero}} — Borderô nº {{bordero_numero}}
============================================================

1. REFERÊNCIA AO CONTRATO PRINCIPAL

1.1. O presente instrumento constitui aditivo ao Contrato Master de Fomento Mercantil nº {{contrato_master_numero}}, celebrado em {{contrato_master_data}} entre as Partes abaixo identificadas (doravante "Contrato Principal").
1.2. Aplicam-se ao presente aditivo todos os termos e condições do Contrato Principal, exceto naquilo que for expressamente alterado ou complementado por este instrumento.

2. IDENTIFICAÇÃO DAS PARTES

FACTORING: {{empresa_factoring_razao_social}}, inscrita no CNPJ sob o nº {{empresa_factoring_cnpj}}.
CEDENTE: {{cedente_razao_social}}, inscrita no CNPJ sob o nº {{cedente_cnpj}}, neste ato representada por {{cedente_representante}}.

3. NÚMERO DA OPERAÇÃO E BORDERÔ

3.1. Operação nº {{operacao_numero}}, datada de {{operacao_data}}.
3.2. Borderô vinculado: {{bordero_numero}}.
3.3. Quantidade de títulos cedidos nesta operação: {{quantidade_titulos}}.

4. RELAÇÃO DOS TÍTULOS INCLUÍDOS

4.1. Compõem o objeto desta operação os títulos discriminados na tabela abaixo:

┌──────────────┬──────────────────────────────┬──────────────┬──────────────────┐
│ Nº do Título │ Sacado                       │ Vencimento   │ Valor (R$)       │
├──────────────┼──────────────────────────────┼──────────────┼──────────────────┤
{{lista_titulos}}
└──────────────┴──────────────────────────────┴──────────────┴──────────────────┘

4.2. A relação acima é parte integrante deste aditivo.

5. CONDIÇÕES FINANCEIRAS DA OPERAÇÃO

5.1. Taxa de fator/deságio aplicada nesta operação: {{taxa_aplicada}} ao mês.
5.2. Prazo médio ponderado: {{prazo_medio}} dias.
5.3. As condições aqui estabelecidas aplicam-se exclusivamente a esta operação e não alteram as taxas previstas no Contrato Principal para futuras operações.

6. VALOR BRUTO, DESÁGIO, TARIFAS, RETENÇÃO E VALOR LÍQUIDO

6.1. Valor bruto total dos títulos cedidos: {{valor_bruto_total}}.
6.2. Valor de deságio: {{valor_desagio}}.
6.3. Valor de tarifas operacionais: {{valor_tarifas}}.
6.4. Valor de retenção/reserva: {{valor_retencao}}.
6.5. Valor líquido a ser pago à CEDENTE: {{valor_liquido}}.
6.6. Os valores acima são estimativos e poderão ser ajustados mediante conferência documental e validação jurídica.

7. DECLARAÇÕES ESPECÍFICAS DA OPERAÇÃO

A CEDENTE declara, especificamente em relação a esta operação, que:
a) os títulos relacionados no item 4 são legítimos e decorrem de operações mercantis efetivamente realizadas;
b) inexistem, até a presente data e segundo seu conhecimento, vícios, gravames ou cessões anteriores sobre tais títulos;
c) as informações financeiras e cadastrais relativas aos sacados foram prestadas de boa-fé.

8. CONFIRMAÇÃO DAS DEMAIS CLÁUSULAS DO CONTRATO PRINCIPAL

8.1. As Partes ratificam, expressamente, todas as demais cláusulas e condições do Contrato Principal nº {{contrato_master_numero}}, datado de {{contrato_master_data}}, que permanecem em pleno vigor.
8.2. Em caso de eventual divergência entre o Contrato Principal e este aditivo, prevalecerão, especificamente quanto a esta operação, as condições aqui estabelecidas, sem prejuízo da revisão jurídica posterior.

9. LOCAL, DATA E ASSINATURAS

E, por estarem assim justas e contratadas, as Partes assinam o presente aditivo em duas vias de igual teor.

{{cidade_assinatura}}, {{data_assinatura}}.

_________________________________________
{{empresa_factoring_razao_social}}
CNPJ {{empresa_factoring_cnpj}}

_________________________________________
{{cedente_razao_social}}
CNPJ {{cedente_cnpj}}
Representante: {{cedente_representante}}

Testemunhas:
1) Nome: ____________________________   CPF: ____________________
2) Nome: ____________________________   CPF: ____________________

>>> Fim do aditivo proforma. Submeta à revisão jurídica antes de qualquer formalização. <<<`,
    observacoes:
      "Aditivo proforma para operações específicas vinculadas a um contrato master. A tabela {{lista_titulos}} deve ser substituída pela relação real dos títulos da operação.",
  },
  {
    id: "MOD-001",
    nome: "Contrato Master Padrão",
    tipo: "Contrato master de fomento mercantil",
    versao: "1.2",
    status: "Ativo",
    atualizadoEm: today,
    texto: `CONTRATO MASTER DE FOMENTO MERCANTIL

Pelo presente instrumento particular, de um lado {{empresa_factoring_razao_social}}, inscrita no CNPJ sob o nº {{empresa_factoring_cnpj}}, doravante denominada FACTORING, e de outro lado {{cedente_razao_social}}, inscrita no CNPJ sob o nº {{cedente_cnpj}}, neste ato representada por {{cedente_representante}}, doravante denominada CEDENTE, têm entre si, justo e contratado, o seguinte:

CLÁUSULA PRIMEIRA — DO OBJETO
O presente contrato tem por objeto regular as condições gerais para a aquisição, pela FACTORING, de direitos creditórios de titularidade da CEDENTE, oriundos de operações mercantis realizadas com terceiros (sacados).

CLÁUSULA SEGUNDA — DAS OPERAÇÕES
Cada operação será formalizada por meio de borderô específico, com taxa praticada de {{taxa_aplicada}} e prazo médio de {{prazo_medio}} dias.

E por estarem justas e contratadas, as partes assinam o presente em duas vias.

{{cidade_assinatura}}, {{data_assinatura}}.`,
    observacoes: "Modelo base — revisão jurídica em 03/2026.",
  },
  {
    id: "MOD-002",
    nome: "Cessão de Recebíveis — Padrão",
    tipo: "Contrato de cessão de direitos creditórios",
    versao: "2.0",
    status: "Ativo",
    atualizadoEm: today,
    texto: `INSTRUMENTO PARTICULAR DE CESSÃO DE DIREITOS CREDITÓRIOS

CEDENTE: {{cedente_razao_social}} — CNPJ {{cedente_cnpj}}
CESSIONÁRIA: {{empresa_factoring_razao_social}} — CNPJ {{empresa_factoring_cnpj}}

Operação nº {{operacao_numero}}, datada de {{operacao_data}}.

Valor bruto cedido: {{valor_bruto_total}}
Valor líquido a ser pago à CEDENTE: {{valor_liquido}}

Títulos cedidos:
{{lista_titulos}}

{{cidade_assinatura}}, {{data_assinatura}}.`,
    observacoes: "",
  },
  {
    id: "MOD-003",
    nome: "Borderô de Títulos",
    tipo: "Borderô de títulos",
    versao: "2.0",
    status: "Ativo",
    atualizadoEm: today,
    texto: `>>> BORDERÔ PROFORMA — documento para conferência interna. Sujeito a revisão antes de qualquer formalização. <<<

============================================================
BORDERÔ DE TÍTULOS Nº {{bordero_numero}}
============================================================

IDENTIFICAÇÃO
- Borderô nº: {{bordero_numero}}
- Operação nº: {{operacao_numero}}
- Data da operação: {{operacao_data}}

CEDENTE
- Razão social: {{cedente_razao_social}}
- CNPJ: {{cedente_cnpj}}
- Representante: {{cedente_representante}}

RESUMO FINANCEIRO
- Valor bruto total ......... {{valor_bruto_total}}
- (−) Deságio .............. {{valor_desagio}}
- (−) Tarifas .............. {{valor_tarifas}}
- (−) Retenção/reserva ..... {{valor_retencao}}
- = Valor líquido ao cedente {{valor_liquido}}
- Prazo médio .............. {{prazo_medio}} dias
- Taxa aplicada ............ {{taxa_aplicada}} ao mês
- Quantidade de títulos .... {{quantidade_titulos}}

RELAÇÃO DE TÍTULOS
┌──────────────┬─────────────────┬────────────────────────────┬──────────────────────┬─────────────┬─────────────┬────────────────┬─────────────┐
│ Nº do Título │ Tipo            │ Sacado                     │ CPF/CNPJ do Sacado   │ Emissão     │ Vencimento  │ Valor (R$)     │ Status      │
├──────────────┼─────────────────┼────────────────────────────┼──────────────────────┼─────────────┼─────────────┼────────────────┼─────────────┤
{{lista_titulos_bordero}}
└──────────────┴─────────────────┴────────────────────────────┴──────────────────────┴─────────────┴─────────────┴────────────────┴─────────────┘

OBSERVAÇÕES
(Espaço reservado para observações internas — preencher conforme necessidade da operação.)

ASSINATURAS PROFORMA

{{cidade_assinatura}}, {{data_assinatura}}.

_________________________________________
{{empresa_factoring_razao_social}}
CNPJ {{empresa_factoring_cnpj}}

_________________________________________
{{cedente_razao_social}}
CNPJ {{cedente_cnpj}}
Representante: {{cedente_representante}}

>>> Fim do borderô proforma. Conferência interna obrigatória. <<<`,
    observacoes:
      "Borderô proforma para conferência interna. Inclui resumo financeiro e relação detalhada dos títulos da operação.",
  },
  {
    id: "MOD-004",
    nome: "Aditivo Padrão",
    tipo: "Aditivo de operação",
    versao: "1.1",
    status: "Rascunho",
    atualizadoEm: today,
    texto: `ADITIVO À OPERAÇÃO Nº {{operacao_numero}}

Pelo presente, {{empresa_factoring_razao_social}} e {{cedente_razao_social}}, neste ato representada por {{cedente_representante}}, ajustam alterações nas condições da operação originalmente firmada em {{operacao_data}}.

{{cidade_assinatura}}, {{data_assinatura}}.`,
    observacoes: "Aguardando validação jurídica.",
  },
  {
    id: "MOD-005",
    nome: "Termo de Recompra",
    tipo: "Termo de recompra",
    versao: "1.0",
    status: "Ativo",
    atualizadoEm: today,
    texto: `TERMO DE RECOMPRA

Referente à operação {{operacao_numero}} de {{operacao_data}}.
A CEDENTE {{cedente_razao_social}} ({{cedente_cnpj}}) declara recomprar os títulos vinculados, no valor de {{valor_bruto_total}}.

{{cidade_assinatura}}, {{data_assinatura}}.`,
    observacoes: "",
  },
  {
    id: "MOD-006",
    nome: "Notificação ao Sacado",
    tipo: "Notificação ao sacado",
    versao: "1.0",
    status: "Inativo",
    atualizadoEm: today,
    texto: `NOTIFICAÇÃO DE CESSÃO DE CRÉDITO

Comunicamos que os créditos de titularidade de {{cedente_razao_social}} foram cedidos a {{empresa_factoring_razao_social}} (CNPJ {{empresa_factoring_cnpj}}), conforme operação {{operacao_numero}} datada de {{operacao_data}}.

Pagamentos referentes aos títulos abaixo deverão ser efetuados diretamente à FACTORING:
{{lista_titulos}}

{{cidade_assinatura}}, {{data_assinatura}}.`,
    observacoes: "Modelo descontinuado — substituído pela versão 2.0 (em elaboração).",
  },
];
