export type TituloStatus =
  | "Disponível"
  | "Em análise"
  | "Operado"
  | "Liquidado"
  | "Vencido"
  | "Recomprado"
  | "Cancelado";

export type TipoTitulo =
  | "Duplicata"
  | "Nota promissória"
  | "Cheque"
  | "Boleto"
  | "Contrato"
  | "Outro";

export interface AnexoSimulado {
  id: string;
  nome: string;
  tipo: "Nota fiscal" | "Comprovante" | "Contrato de origem";
  tamanhoKb: number;
  enviadoEm: string;
}

export interface Titulo {
  id: string;
  numero: string;
  tipo: TipoTitulo;
  cedenteId: string;
  cedenteNome: string;
  sacadoId: string;
  sacadoNome: string;
  dataEmissao: string; // ISO yyyy-mm-dd
  dataVencimento: string;
  valorFace: number;
  numeroNotaFiscal: string;
  chaveNotaFiscal: string;
  descricao: string;
  status: TituloStatus;
  observacoes: string;
  anexos: AnexoSimulado[];
  criadoEm: string;
}

export const STATUS_TITULO: TituloStatus[] = [
  "Disponível",
  "Em análise",
  "Operado",
  "Liquidado",
  "Vencido",
  "Recomprado",
  "Cancelado",
];

export const TIPOS_TITULO: TipoTitulo[] = [
  "Duplicata",
  "Nota promissória",
  "Cheque",
  "Boleto",
  "Contrato",
  "Outro",
];

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (days: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return iso(d);
};

export const mockTitulos: Titulo[] = [
  {
    id: "TIT-10245",
    numero: "DUP-58921",
    tipo: "Duplicata",
    cedenteId: "CLI-0001",
    cedenteNome: "Comercial Vitória LTDA",
    sacadoId: "SAC-0001",
    sacadoNome: "Supermercado Atlas SA",
    dataEmissao: addDays(-15),
    dataVencimento: addDays(15),
    valorFace: 18420,
    numeroNotaFiscal: "000.123.456",
    chaveNotaFiscal: "3526 0312 3456 7800 0190 5500 1000 1234 5612 3456 7890",
    descricao: "Venda de mercadorias — pedido 4521",
    status: "Disponível",
    observacoes: "",
    anexos: [
      { id: "AX-1", nome: "NF-000123456.xml", tipo: "Nota fiscal", tamanhoKb: 24, enviadoEm: addDays(-15) },
      { id: "AX-2", nome: "boleto.pdf", tipo: "Comprovante", tamanhoKb: 88, enviadoEm: addDays(-15) },
    ],
    criadoEm: addDays(-15),
  },
  {
    id: "TIT-10246",
    numero: "DUP-58922",
    tipo: "Duplicata",
    cedenteId: "CLI-0002",
    cedenteNome: "Indústria Norte SA",
    sacadoId: "SAC-0002",
    sacadoNome: "Mercantil Bahia LTDA",
    dataEmissao: addDays(-20),
    dataVencimento: addDays(20),
    valorFace: 9680,
    numeroNotaFiscal: "000.456.789",
    chaveNotaFiscal: "2326 0445 6789 0010 0190 5500 1000 4567 8945 6789 0123",
    descricao: "Insumos industriais",
    status: "Operado",
    observacoes: "Operado no borderô BOR-2040.",
    anexos: [
      { id: "AX-3", nome: "NF-000456789.xml", tipo: "Nota fiscal", tamanhoKb: 31, enviadoEm: addDays(-20) },
    ],
    criadoEm: addDays(-20),
  },
  {
    id: "TIT-10247",
    numero: "BOL-77321",
    tipo: "Boleto",
    cedenteId: "CLI-0003",
    cedenteNome: "Tech Logística ME",
    sacadoId: "SAC-0003",
    sacadoNome: "Transportes Litoral SA",
    dataEmissao: addDays(-10),
    dataVencimento: addDays(5),
    valorFace: 4215,
    numeroNotaFiscal: "000.789.012",
    chaveNotaFiscal: "",
    descricao: "Serviços de logística — abril/2026",
    status: "Em análise",
    observacoes: "Aguardando verificação cadastral do sacado.",
    anexos: [],
    criadoEm: addDays(-10),
  },
  {
    id: "TIT-10248",
    numero: "DUP-58930",
    tipo: "Duplicata",
    cedenteId: "CLI-0004",
    cedenteNome: "Distribuidora Sul LTDA",
    sacadoId: "SAC-0004",
    sacadoNome: "Rede Farma Plus LTDA",
    dataEmissao: addDays(-5),
    dataVencimento: addDays(25),
    valorFace: 25170,
    numeroNotaFiscal: "000.555.444",
    chaveNotaFiscal: "4326 0455 5444 0010 0190 5500 1000 5554 4455 5444 0011",
    descricao: "Medicamentos e perfumaria",
    status: "Disponível",
    observacoes: "",
    anexos: [
      { id: "AX-4", nome: "NF-000555444.xml", tipo: "Nota fiscal", tamanhoKb: 28, enviadoEm: addDays(-5) },
      { id: "AX-5", nome: "contrato_fornecimento.pdf", tipo: "Contrato de origem", tamanhoKb: 412, enviadoEm: addDays(-5) },
    ],
    criadoEm: addDays(-5),
  },
  {
    id: "TIT-09812",
    numero: "DUP-58112",
    tipo: "Duplicata",
    cedenteId: "CLI-0007",
    cedenteNome: "Têxtil Aurora LTDA",
    sacadoId: "SAC-0005",
    sacadoNome: "Modas Bella SA",
    dataEmissao: addDays(-46),
    dataVencimento: addDays(-16),
    valorFace: 12300,
    numeroNotaFiscal: "000.111.222",
    chaveNotaFiscal: "4226 0311 1222 0010 0190 5500 1000 1112 2211 1222 0033",
    descricao: "Tecidos e aviamentos",
    status: "Vencido",
    observacoes: "Sacado em renegociação.",
    anexos: [
      { id: "AX-6", nome: "NF-000111222.xml", tipo: "Nota fiscal", tamanhoKb: 22, enviadoEm: addDays(-46) },
    ],
    criadoEm: addDays(-46),
  },
  {
    id: "TIT-09934",
    numero: "CHQ-22041",
    tipo: "Cheque",
    cedenteId: "CLI-0003",
    cedenteNome: "Tech Logística ME",
    sacadoId: "SAC-0006",
    sacadoNome: "João Carlos Pereira",
    dataEmissao: addDays(-30),
    dataVencimento: addDays(-4),
    valorFace: 5940,
    numeroNotaFiscal: "",
    chaveNotaFiscal: "",
    descricao: "Cheque pré-datado — venda particular",
    status: "Vencido",
    observacoes: "",
    anexos: [
      { id: "AX-7", nome: "cheque_frente.jpg", tipo: "Comprovante", tamanhoKb: 145, enviadoEm: addDays(-30) },
    ],
    criadoEm: addDays(-30),
  },
  {
    id: "TIT-09877",
    numero: "DUP-58120",
    tipo: "Duplicata",
    cedenteId: "CLI-0001",
    cedenteNome: "Comercial Vitória LTDA",
    sacadoId: "SAC-0007",
    sacadoNome: "Construtora Horizonte LTDA",
    dataEmissao: addDays(-60),
    dataVencimento: addDays(-50),
    valorFace: 33500,
    numeroNotaFiscal: "000.999.888",
    chaveNotaFiscal: "5126 0399 9888 0010 0190 5500 1000 9998 8899 9888 0044",
    descricao: "Materiais de construção",
    status: "Liquidado",
    observacoes: "Liquidado pelo sacado em 22/04.",
    anexos: [],
    criadoEm: addDays(-60),
  },
  {
    id: "TIT-09701",
    numero: "NPR-00041",
    tipo: "Nota promissória",
    cedenteId: "CLI-0006",
    cedenteNome: "Metalúrgica Ipê SA",
    sacadoId: "SAC-0007",
    sacadoNome: "Construtora Horizonte LTDA",
    dataEmissao: addDays(-90),
    dataVencimento: addDays(-30),
    valorFace: 78400,
    numeroNotaFiscal: "",
    chaveNotaFiscal: "",
    descricao: "Promissória vinculada a contrato 2024-118",
    status: "Recomprado",
    observacoes: "Recompra solicitada pelo cedente.",
    anexos: [
      { id: "AX-8", nome: "promissoria_2024_118.pdf", tipo: "Contrato de origem", tamanhoKb: 320, enviadoEm: addDays(-90) },
    ],
    criadoEm: addDays(-90),
  },
];
