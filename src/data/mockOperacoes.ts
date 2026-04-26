export type OperacaoStatus =
  | "Rascunho"
  | "Em análise"
  | "Aprovada"
  | "Formalizada"
  | "Liquidada"
  | "Em atraso"
  | "Recomprada"
  | "Cancelada";

export interface HistoricoStatus {
  status: OperacaoStatus;
  data: string; // ISO yyyy-mm-dd
  por: string;
  observacao?: string;
}

export interface Operacao {
  id: string;
  numero: string;
  cedenteId: string;
  cedenteNome: string;
  dataOperacao: string; // ISO
  status: OperacaoStatus;
  titulosIds: string[];
  quantidadeTitulos: number;
  valorBruto: number;
  valorDesagio: number;
  valorTarifas: number;
  valorRetencao: number;
  valorLiquido: number;
  prazoMedio: number; // dias
  taxaAplicada: number; // % a.m.
  responsavelInterno: string;
  observacoes: string;
  historico: HistoricoStatus[];
}

export const STATUS_OPERACAO: OperacaoStatus[] = [
  "Rascunho",
  "Em análise",
  "Aprovada",
  "Formalizada",
  "Liquidada",
  "Em atraso",
  "Recomprada",
  "Cancelada",
];

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (days: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return iso(d);
};

export const mockOperacoes: Operacao[] = [
  {
    id: "OPR-2040",
    numero: "BOR-2040",
    cedenteId: "CLI-0002",
    cedenteNome: "Indústria Norte SA",
    dataOperacao: addDays(-20),
    status: "Formalizada",
    titulosIds: ["TIT-10246"],
    quantidadeTitulos: 1,
    valorBruto: 9680,
    valorDesagio: 645.33,
    valorTarifas: 175,
    valorRetencao: 484,
    valorLiquido: 8375.67,
    prazoMedio: 20,
    taxaAplicada: 3.5,
    responsavelInterno: "Ana Martins",
    observacoes: "Operação padrão para cliente recorrente.",
    historico: [
      { status: "Rascunho", data: addDays(-22), por: "Ana Martins" },
      { status: "Em análise", data: addDays(-21), por: "Ana Martins" },
      { status: "Aprovada", data: addDays(-21), por: "Carlos Diretor" },
      { status: "Formalizada", data: addDays(-20), por: "Ana Martins", observacao: "Borderô assinado." },
    ],
  },
  {
    id: "OPR-2041",
    numero: "BOR-2041",
    cedenteId: "CLI-0001",
    cedenteNome: "Comercial Vitória LTDA",
    dataOperacao: addDays(-10),
    status: "Aprovada",
    titulosIds: ["TIT-10245"],
    quantidadeTitulos: 1,
    valorBruto: 18420,
    valorDesagio: 921.0,
    valorTarifas: 175,
    valorRetencao: 921.0,
    valorLiquido: 16403,
    prazoMedio: 15,
    taxaAplicada: 3.5,
    responsavelInterno: "Bruno Souza",
    observacoes: "",
    historico: [
      { status: "Rascunho", data: addDays(-12), por: "Bruno Souza" },
      { status: "Em análise", data: addDays(-11), por: "Bruno Souza" },
      { status: "Aprovada", data: addDays(-10), por: "Carlos Diretor" },
    ],
  },
  {
    id: "OPR-2042",
    numero: "BOR-2042",
    cedenteId: "CLI-0004",
    cedenteNome: "Distribuidora Sul LTDA",
    dataOperacao: addDays(-3),
    status: "Em análise",
    titulosIds: ["TIT-10248"],
    quantidadeTitulos: 1,
    valorBruto: 25170,
    valorDesagio: 2097.5,
    valorTarifas: 175,
    valorRetencao: 1258.5,
    valorLiquido: 21639,
    prazoMedio: 25,
    taxaAplicada: 3.5,
    responsavelInterno: "Ana Martins",
    observacoes: "Aguardando análise de risco do sacado.",
    historico: [
      { status: "Rascunho", data: addDays(-4), por: "Ana Martins" },
      { status: "Em análise", data: addDays(-3), por: "Ana Martins" },
    ],
  },
  {
    id: "OPR-2030",
    numero: "BOR-2030",
    cedenteId: "CLI-0007",
    cedenteNome: "Têxtil Aurora LTDA",
    dataOperacao: addDays(-46),
    status: "Em atraso",
    titulosIds: ["TIT-09812"],
    quantidadeTitulos: 1,
    valorBruto: 12300,
    valorDesagio: 1435.0,
    valorTarifas: 175,
    valorRetencao: 615,
    valorLiquido: 10075,
    prazoMedio: 30,
    taxaAplicada: 3.5,
    responsavelInterno: "Bruno Souza",
    observacoes: "Sacado em renegociação. Cobrança ativa.",
    historico: [
      { status: "Rascunho", data: addDays(-48), por: "Bruno Souza" },
      { status: "Aprovada", data: addDays(-47), por: "Carlos Diretor" },
      { status: "Formalizada", data: addDays(-46), por: "Bruno Souza" },
      { status: "Em atraso", data: addDays(-15), por: "Sistema", observacao: "Vencimento ultrapassado." },
    ],
  },
  {
    id: "OPR-2025",
    numero: "BOR-2025",
    cedenteId: "CLI-0001",
    cedenteNome: "Comercial Vitória LTDA",
    dataOperacao: addDays(-60),
    status: "Liquidada",
    titulosIds: ["TIT-09877"],
    quantidadeTitulos: 1,
    valorBruto: 33500,
    valorDesagio: 1172.5,
    valorTarifas: 175,
    valorRetencao: 1675,
    valorLiquido: 30477.5,
    prazoMedio: 10,
    taxaAplicada: 3.5,
    responsavelInterno: "Ana Martins",
    observacoes: "Liquidada pelo sacado em 22/04.",
    historico: [
      { status: "Rascunho", data: addDays(-62), por: "Ana Martins" },
      { status: "Aprovada", data: addDays(-61), por: "Carlos Diretor" },
      { status: "Formalizada", data: addDays(-60), por: "Ana Martins" },
      { status: "Liquidada", data: addDays(-50), por: "Sistema", observacao: "Pagamento confirmado." },
    ],
  },
  {
    id: "OPR-2018",
    numero: "BOR-2018",
    cedenteId: "CLI-0006",
    cedenteNome: "Metalúrgica Ipê SA",
    dataOperacao: addDays(-90),
    status: "Recomprada",
    titulosIds: ["TIT-09701"],
    quantidadeTitulos: 1,
    valorBruto: 78400,
    valorDesagio: 5488,
    valorTarifas: 175,
    valorRetencao: 3920,
    valorLiquido: 68817,
    prazoMedio: 60,
    taxaAplicada: 3.5,
    responsavelInterno: "Carlos Diretor",
    observacoes: "Recompra solicitada pelo cedente.",
    historico: [
      { status: "Rascunho", data: addDays(-92), por: "Carlos Diretor" },
      { status: "Formalizada", data: addDays(-90), por: "Carlos Diretor" },
      { status: "Recomprada", data: addDays(-30), por: "Carlos Diretor", observacao: "Cedente recomprou o título." },
    ],
  },
];
