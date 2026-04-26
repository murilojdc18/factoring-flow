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
  "cedente_razao_social",
  "cedente_cnpj",
  "cedente_representante",
  "operacao_numero",
  "operacao_data",
  "valor_bruto_total",
  "valor_liquido",
  "taxa_aplicada",
  "prazo_medio",
  "lista_titulos",
  "cidade_assinatura",
  "data_assinatura",
] as const;

const today = new Date().toISOString().slice(0, 10);

export const mockModelosContrato: ModeloContrato[] = [
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
    nome: "Borderô Operacional",
    tipo: "Borderô de títulos",
    versao: "1.0",
    status: "Ativo",
    atualizadoEm: today,
    texto: `BORDERÔ Nº {{operacao_numero}}
Data: {{operacao_data}}
Cedente: {{cedente_razao_social}} ({{cedente_cnpj}})

Títulos:
{{lista_titulos}}

Valor bruto: {{valor_bruto_total}}
Taxa aplicada: {{taxa_aplicada}}
Prazo médio: {{prazo_medio}} dias
Valor líquido ao cedente: {{valor_liquido}}

{{cidade_assinatura}}, {{data_assinatura}}.`,
    observacoes: "",
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
