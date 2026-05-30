import { describe, it, expect } from "vitest";
import {
  aVencer,
  emAberto,
  montarDashboard,
  vencido,
  type DashboardInput,
} from "@/lib/dashboardAgregado";
import { daysUntil } from "@/lib/dateUtils";
import type { Cliente, ClienteStatus } from "@/data/mockClientes";
import type { Sacado, SacadoStatus } from "@/data/mockSacados";
import type { Titulo, TituloStatus } from "@/data/mockTitulos";
import type { Operacao, OperacaoStatus } from "@/data/mockOperacoes";

/**
 * `hoje` fixo para tornar tudo que depende de data (vencimento, mês corrente)
 * determinístico. 2026-05-15 (mês = 4 no construtor, 0-based). Mês corrente =
 * "2026-05"; mês anterior = "2026-04".
 */
const HOJE = new Date(2026, 4, 15);

/* ----- Factories minimalistas (preenchem o que `montarDashboard` lê) ----- */

let seq = 0;
const tit = (over: Partial<Titulo>): Titulo => ({
  id: `T-${seq++}`,
  numero: "DUP-1",
  tipo: "Duplicata",
  cedenteId: "c1",
  cedenteNome: "Cedente",
  sacadoId: "s1",
  sacadoNome: "Sacado",
  dataEmissao: "2026-01-01",
  dataVencimento: "2026-06-01",
  valorFace: 1000,
  numeroNotaFiscal: "",
  chaveNotaFiscal: "",
  descricao: "",
  status: "Disponível",
  observacoes: "",
  anexos: [],
  criadoEm: "2026-05-10",
  ...over,
});

const op = (over: Partial<Operacao>): Operacao => ({
  id: `O-${seq++}`,
  numero: "BOR-1",
  cedenteId: "c1",
  cedenteNome: "Cedente",
  dataOperacao: "2026-05-10",
  status: "Formalizada",
  titulosIds: [],
  quantidadeTitulos: 0,
  valorBruto: 0,
  valorDesagio: 0,
  valorTarifas: 0,
  valorRetencao: 0,
  valorLiquido: 0,
  prazoMedio: 0,
  taxaAplicada: 0,
  responsavelInterno: "",
  observacoes: "",
  historico: [],
  ...over,
});

const cli = (status: ClienteStatus, criadoEm: string): Cliente =>
  ({ id: `C-${seq++}`, razaoSocial: "X", status, criadoEm } as unknown as Cliente);

const sac = (status: SacadoStatus, criadoEm: string): Sacado =>
  ({ id: `S-${seq++}`, nome: "X", status, criadoEm } as unknown as Sacado);

const vazio: DashboardInput = {
  clientes: [],
  sacados: [],
  titulos: [],
  operacoes: [],
};
const comTitulos = (titulos: Titulo[]): DashboardInput => ({
  ...vazio,
  titulos,
});

/* =============================== Testes =============================== */

describe("predicados de título", () => {
  it("emAberto exclui Liquidado, Cancelado e Recomprado", () => {
    expect(emAberto(tit({ status: "Disponível" }))).toBe(true);
    expect(emAberto(tit({ status: "Em análise" }))).toBe(true);
    expect(emAberto(tit({ status: "Operado" }))).toBe(true);
    expect(emAberto(tit({ status: "Vencido" }))).toBe(true);
    expect(emAberto(tit({ status: "Liquidado" }))).toBe(false);
    expect(emAberto(tit({ status: "Cancelado" }))).toBe(false);
    expect(emAberto(tit({ status: "Recomprado" }))).toBe(false);
  });
});

describe("montarDashboard — carteira", () => {
  // 1. Carteira só com abertos
  it("carteira soma apenas os títulos em aberto", () => {
    const { kpis } = montarDashboard(
      comTitulos([
        tit({ status: "Disponível", valorFace: 1000 }),
        tit({ status: "Operado", valorFace: 2000 }),
        tit({ status: "Liquidado", valorFace: 9999 }),
        tit({ status: "Cancelado", valorFace: 8888 }),
        tit({ status: "Recomprado", valorFace: 7777 }),
      ]),
      HOJE,
    );
    expect(kpis.carteiraEmAberto).toBe(3000);
    expect(kpis.qtdTitulosEmAberto).toBe(2);
  });

  // 2. Partição: carteira === aVencer + vencido
  it("carteira é particionada exatamente por aVencer + vencido", () => {
    const { kpis } = montarDashboard(
      comTitulos([
        tit({ status: "Disponível", valorFace: 1000, dataVencimento: "2026-06-01" }), // a vencer
        tit({ status: "Operado", valorFace: 2000, dataVencimento: "2026-05-01" }), // vencido por data
        tit({ status: "Vencido", valorFace: 500, dataVencimento: "2026-05-10" }), // vencido por status
        tit({ status: "Em análise", valorFace: 300, dataVencimento: "2026-05-20" }), // a vencer
        tit({ status: "Liquidado", valorFace: 9999 }), // fora
      ]),
      HOJE,
    );
    expect(kpis.carteiraEmAberto).toBe(kpis.totalAVencer + kpis.totalVencido);
    expect(kpis.qtdTitulosEmAberto).toBe(kpis.qtdAVencer + kpis.qtdVencido);
    expect(kpis.totalAVencer).toBe(1300);
    expect(kpis.totalVencido).toBe(2500);
  });

  // 3. Vencido por data vs por status
  it("vencido pega tanto data passada quanto status Vencido; diasAtraso correto", () => {
    const data = montarDashboard(
      comTitulos([
        tit({ status: "Operado", dataVencimento: "2026-05-05" }), // -10 dias
        tit({ status: "Vencido", dataVencimento: "2026-05-12" }), // -3 dias
      ]),
      HOJE,
    );
    expect(data.kpis.qtdVencido).toBe(2);
    // mais atrasado primeiro
    expect(data.titulosVencidos[0].diasAtraso).toBe(10);
    expect(data.titulosVencidos[1].diasAtraso).toBe(3);
  });

  // 4. A vencer não inclui vencidos nem status fora de {Disp, Oper, Em análise}
  it("aVencer exclui vencidos por data e o status Vencido (mesmo com data futura)", () => {
    const t1 = tit({ status: "Disponível", dataVencimento: "2026-06-01" }); // a vencer
    const t2 = tit({ status: "Operado", dataVencimento: "2026-05-01" }); // vencido por data
    const t3 = tit({ status: "Vencido", dataVencimento: "2026-12-01" }); // status Vencido c/ data futura
    expect(aVencer(t1, HOJE)).toBe(true);
    expect(aVencer(t2, HOJE)).toBe(false);
    expect(aVencer(t3, HOJE)).toBe(false);
    expect(vencido(t3, HOJE)).toBe(true); // cai em vencido pelo status
  });
});

describe("montarDashboard — operações (ticket / taxa)", () => {
  // 5. Taxa média ponderada por valorBruto, ignorando não-efetivadas
  it("taxa média é ponderada por valorBruto e ignora Rascunho/Cancelada", () => {
    const { kpis } = montarDashboard(
      {
        ...vazio,
        operacoes: [
          op({ status: "Formalizada", valorBruto: 100000, taxaAplicada: 2 }),
          op({ status: "Liquidada", valorBruto: 300000, taxaAplicada: 4 }),
          op({ status: "Rascunho", valorBruto: 999999, taxaAplicada: 99 }), // ignorada
          op({ status: "Cancelada", valorBruto: 999999, taxaAplicada: 99 }), // ignorada
        ],
      },
      HOJE,
    );
    // ponderada: (2*100k + 4*300k) / 400k = 1.4M/400k = 3.5; aritmética seria 3.0
    expect(kpis.taxaMediaPonderada).toBeCloseTo(3.5, 10);
  });

  it("taxa e ticket retornam 0 (sem NaN) quando não há bruto efetivado", () => {
    const { kpis } = montarDashboard(
      {
        ...vazio,
        operacoes: [
          op({ status: "Rascunho", valorBruto: 5000, taxaAplicada: 3 }),
          op({ status: "Cancelada", valorBruto: 5000, taxaAplicada: 3 }),
        ],
      },
      HOJE,
    );
    expect(kpis.taxaMediaPonderada).toBe(0);
    expect(kpis.ticketMedio).toBe(0);
    expect(Number.isNaN(kpis.ticketMedio)).toBe(false);
  });

  // 6. Ticket médio = média de valorBruto das efetivadas
  it("ticket médio é a média de valorBruto das operações efetivadas", () => {
    const { kpis } = montarDashboard(
      {
        ...vazio,
        operacoes: [
          op({ status: "Formalizada", valorBruto: 10000 }),
          op({ status: "Liquidada", valorBruto: 30000 }),
          op({ status: "Cancelada", valorBruto: 999999 }), // ignorada
        ],
      },
      HOJE,
    );
    expect(kpis.ticketMedio).toBe(20000);
  });
});

describe("montarDashboard — mês corrente", () => {
  // 7. "novos no mês" por criadoEm; operações no mês por dataOperacao
  it("conta clientes/sacados novos por criadoEm e operações por dataOperacao", () => {
    const { kpis } = montarDashboard(
      {
        clientes: [
          cli("Ativo", "2026-05-02"), // novo no mês
          cli("Ativo", "2026-04-30"), // mês anterior
          cli("Inativo", "2026-05-20"), // novo no mês (status não importa p/ delta)
          cli("Bloqueado", "2026-05-01"), // novo no mês
        ],
        sacados: [
          sac("Ativo", "2026-05-09"), // novo no mês
          sac("Ativo", "2025-12-01"), // antigo
          sac("Em análise", "2026-05-01"), // novo no mês
        ],
        titulos: [],
        operacoes: [
          op({ dataOperacao: "2026-05-03" }),
          op({ dataOperacao: "2026-05-29" }),
          op({ dataOperacao: "2026-04-15" }), // mês anterior
          op({ dataOperacao: "2026-03-01" }), // mais antigo
        ],
      },
      HOJE,
    );
    expect(kpis.clientesAtivos).toBe(2);
    expect(kpis.clientesNovosNoMes).toBe(3);
    expect(kpis.sacadosAtivos).toBe(2);
    expect(kpis.sacadosNovosNoMes).toBe(2);
    expect(kpis.operacoesNoMes).toBe(2);
    expect(kpis.operacoesMesAnterior).toBe(1);
  });

  // 8. criadoEm vazio (created_at nulo) não conta como novo
  it("criadoEm vazio não é contado como novo no mês", () => {
    const { kpis } = montarDashboard(
      {
        ...vazio,
        clientes: [cli("Ativo", ""), cli("Ativo", "2026-05-05")],
        sacados: [sac("Ativo", "")],
      },
      HOJE,
    );
    expect(kpis.clientesNovosNoMes).toBe(1);
    expect(kpis.sacadosNovosNoMes).toBe(0);
  });
});

describe("montarDashboard — gráficos e tabelas", () => {
  // 9. Volume por mês: agrupa, soma, ordena, limita a 12
  it("agrupa volume por mês (AAAA-MM), soma valorBruto e ordena ascendente", () => {
    const { volumePorMes } = montarDashboard(
      {
        ...vazio,
        operacoes: [
          op({ dataOperacao: "2026-05-10", valorBruto: 1000 }),
          op({ dataOperacao: "2026-05-20", valorBruto: 500 }),
          op({ dataOperacao: "2026-04-01", valorBruto: 2000 }),
        ],
      },
      HOJE,
    );
    expect(volumePorMes).toEqual([
      { mes: "2026-04", valor: 2000 },
      { mes: "2026-05", valor: 1500 },
    ]);
  });

  it("volume por mês mantém apenas os últimos 12 meses", () => {
    // 14 meses distintos: 2025-01 .. 2026-02
    const operacoes: Operacao[] = [];
    for (let m = 1; m <= 12; m++) {
      operacoes.push(
        op({ dataOperacao: `2025-${String(m).padStart(2, "0")}-15`, valorBruto: 1 }),
      );
    }
    operacoes.push(op({ dataOperacao: "2026-01-15", valorBruto: 1 }));
    operacoes.push(op({ dataOperacao: "2026-02-15", valorBruto: 1 }));

    const { volumePorMes } = montarDashboard({ ...vazio, operacoes }, HOJE);
    expect(volumePorMes).toHaveLength(12);
    expect(volumePorMes[0].mes).toBe("2025-03"); // os 2 mais antigos caíram
    expect(volumePorMes[volumePorMes.length - 1].mes).toBe("2026-02");
  });

  it("operacoesPorStatus cobre todos os status e conta corretamente", () => {
    const { operacoesPorStatus } = montarDashboard(
      {
        ...vazio,
        operacoes: [
          op({ status: "Formalizada" }),
          op({ status: "Formalizada" }),
          op({ status: "Liquidada" }),
        ],
      },
      HOJE,
    );
    const mapa = new Map(operacoesPorStatus.map((d) => [d.status, d.total]));
    expect(mapa.get("Formalizada")).toBe(2);
    expect(mapa.get("Liquidada")).toBe(1);
    expect(mapa.get("Rascunho")).toBe(0);
    expect(operacoesPorStatus).toHaveLength(8); // STATUS_OPERACAO inteiro
  });

  it("proximos vencimentos: só a vencer, venc. ascendente, top 6", () => {
    const titulos: Titulo[] = [];
    // 8 títulos a vencer com datas crescentes
    for (let i = 1; i <= 8; i++) {
      titulos.push(
        tit({
          status: "Disponível",
          dataVencimento: `2026-06-${String(i).padStart(2, "0")}`,
          numero: `DUP-${i}`,
        }),
      );
    }
    // um vencido não pode aparecer aqui
    titulos.push(tit({ status: "Operado", dataVencimento: "2026-05-01" }));

    const { proximosVencimentos } = montarDashboard(comTitulos(titulos), HOJE);
    expect(proximosVencimentos).toHaveLength(6);
    expect(proximosVencimentos[0].dataVencimento).toBe("2026-06-01");
    expect(proximosVencimentos[5].dataVencimento).toBe("2026-06-06");
    expect(proximosVencimentos.every((l) => l.diasAteVencer >= 0)).toBe(true);
  });

  // 10. Tabelas vazias / input vazio
  it("input vazio → arrays vazios, KPIs zerados, sem throw", () => {
    const data = montarDashboard(vazio, HOJE);
    expect(data.proximosVencimentos).toEqual([]);
    expect(data.titulosVencidos).toEqual([]);
    expect(data.volumePorMes).toEqual([]);
    expect(data.kpis.carteiraEmAberto).toBe(0);
    expect(data.kpis.qtdTitulosEmAberto).toBe(0);
    expect(data.kpis.ticketMedio).toBe(0);
    expect(data.kpis.taxaMediaPonderada).toBe(0);
    expect(data.kpis.clientesAtivos).toBe(0);
  });
});

describe("consistência com Relatorios (guard)", () => {
  // 11. aVencer/vencido batem com os predicados inline do Relatorios
  // (dataset sem Recomprado vencido — a única divergência conhecida/aceita).
  it("aVencer e vencido coincidem com os predicados literais do Relatorios", () => {
    // Réplica EXATA do que Relatorios.tsx inlina hoje:
    const relAVencer = (t: Titulo) =>
      ["Disponível", "Operado", "Em análise"].includes(t.status) &&
      daysUntil(t.dataVencimento, HOJE) >= 0;
    const relVencido = (t: Titulo) =>
      t.status === "Vencido" ||
      (t.status !== "Liquidado" &&
        t.status !== "Cancelado" &&
        daysUntil(t.dataVencimento, HOJE) < 0);

    const statuses: TituloStatus[] = [
      "Disponível",
      "Em análise",
      "Operado",
      "Vencido",
      "Liquidado",
      "Cancelado",
      "Recomprado",
    ];
    const datas = ["2026-05-01", "2026-05-20", "2026-06-10"]; // passado, futuro próximo, futuro
    const titulos: Titulo[] = [];
    for (const status of statuses) {
      for (const dataVencimento of datas) {
        // Pula o caso divergente aceito (Recomprado vencido por data).
        if (status === "Recomprado" && daysUntil(dataVencimento, HOJE) < 0) {
          continue;
        }
        titulos.push(tit({ status, dataVencimento }));
      }
    }

    const idsAVencerMeu = titulos
      .filter((t) => aVencer(t, HOJE))
      .map((t) => t.id)
      .sort();
    const idsAVencerRel = titulos.filter(relAVencer).map((t) => t.id).sort();
    expect(idsAVencerMeu).toEqual(idsAVencerRel);

    const idsVencidoMeu = titulos
      .filter((t) => vencido(t, HOJE))
      .map((t) => t.id)
      .sort();
    const idsVencidoRel = titulos.filter(relVencido).map((t) => t.id).sort();
    expect(idsVencidoMeu).toEqual(idsVencidoRel);
  });
});
