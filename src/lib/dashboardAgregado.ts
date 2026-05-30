import type { Cliente } from "@/data/mockClientes";
import type { Sacado } from "@/data/mockSacados";
import type { Titulo, TituloStatus } from "@/data/mockTitulos";
import {
  STATUS_OPERACAO,
  type Operacao,
  type OperacaoStatus,
} from "@/data/mockOperacoes";
import { daysUntil } from "@/lib/dateUtils";

/* =============================== Tipos =============================== */

export interface DashboardInput {
  clientes: Cliente[];
  sacados: Sacado[];
  titulos: Titulo[];
  operacoes: Operacao[];
}

export interface KpiDashboard {
  carteiraEmAberto: number; // R$ — Σ valorFace dos títulos em aberto
  qtdTitulosEmAberto: number;
  totalAVencer: number; // R$
  qtdAVencer: number;
  totalVencido: number; // R$
  qtdVencido: number;
  operacoesNoMes: number; // contagem (mês de `hoje`, por dataOperacao)
  operacoesMesAnterior: number; // contagem (mês anterior — base do delta)
  ticketMedio: number; // R$ — média de valorBruto das operações efetivadas
  taxaMediaPonderada: number; // % a.m. — ponderada por valorBruto (efetivadas)
  clientesAtivos: number;
  clientesNovosNoMes: number;
  sacadosAtivos: number;
  sacadosNovosNoMes: number;
}

export interface PontoVolumeMes {
  mes: string; // "AAAA-MM"
  valor: number; // R$ bruto operado no mês
}

export interface PontoStatusOperacao {
  status: OperacaoStatus;
  total: number;
}

export interface LinhaVencimento {
  id: string;
  numero: string;
  sacadoNome: string;
  dataVencimento: string; // ISO yyyy-mm-dd
  valorFace: number;
  diasAteVencer: number; // >= 0
}

export interface LinhaVencido {
  id: string;
  numero: string;
  sacadoNome: string;
  dataVencimento: string; // ISO yyyy-mm-dd
  valorFace: number;
  diasAtraso: number; // dias positivos de atraso
}

export interface DashboardData {
  kpis: KpiDashboard;
  volumePorMes: PontoVolumeMes[];
  operacoesPorStatus: PontoStatusOperacao[];
  proximosVencimentos: LinhaVencimento[];
  titulosVencidos: LinhaVencido[];
}

/* =============================== Predicados de título =============================== */

/**
 * Status que tiram o título da carteira (decisão de negócio D3 do plano do
 * Dashboard): Liquidado e Cancelado saíram; Recomprado também sai (o título
 * foi recomprado pelo cedente, deixou a carteira). "Em aberto" = todo o resto:
 * {Disponível, Em análise, Operado, Vencido}.
 *
 * NOTA DE CONSISTÊNCIA: Relatorios.tsx hoje inlina predicados ligeiramente
 * diferentes (sua aba "Faixa de vencimento" mantém Recomprado; seu KPI topo
 * "Carteira (face)" soma tudo). A unificação — Relatorios importar daqui —
 * ficou para tarefa própria (D3 do plano). Não altere Relatorios.tsx por isto.
 */
const FORA_DA_CARTEIRA: TituloStatus[] = ["Liquidado", "Cancelado", "Recomprado"];

export function emAberto(t: Titulo): boolean {
  return !FORA_DA_CARTEIRA.includes(t.status);
}

/**
 * Vencido = em aberto e (status "Vencido" OU data de vencimento já passou).
 * Em aberto + vencido + a-vencer formam uma PARTIÇÃO: todo título em aberto cai
 * em exatamente um dos dois (ver `aVencer`). Logo carteira = aVencer + vencido.
 */
export function vencido(t: Titulo, hoje: Date): boolean {
  return (
    emAberto(t) &&
    (t.status === "Vencido" || daysUntil(t.dataVencimento, hoje) < 0)
  );
}

/**
 * A vencer = em aberto, status diferente de "Vencido" e ainda não venceu.
 * Espelha exatamente o predicado da aba "a-vencer" do Relatorios
 * (status ∈ {Disponível, Operado, Em análise} && daysUntil >= 0), porque
 * em aberto menos o status "Vencido" = exatamente esses três status.
 */
export function aVencer(t: Titulo, hoje: Date): boolean {
  return (
    emAberto(t) &&
    t.status !== "Vencido" &&
    daysUntil(t.dataVencimento, hoje) >= 0
  );
}

/* =============================== Helpers internos =============================== */

/** Operações que de fato aconteceram (excluem Rascunho e Cancelada — D1). */
const NAO_EFETIVADAS: OperacaoStatus[] = ["Rascunho", "Cancelada"];
function efetivada(o: Operacao): boolean {
  return !NAO_EFETIVADAS.includes(o.status);
}

/** "AAAA-MM" do mês de `d`. */
function mesIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** "AAAA-MM" do mês imediatamente anterior ao de `d`. */
function mesAnteriorIso(d: Date): string {
  const ano = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear();
  const mes = d.getMonth() === 0 ? 12 : d.getMonth(); // getMonth() 0-based: mês atual = +1; anterior = getMonth()
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

/* =============================== Agregação =============================== */

const TOP_PROXIMOS_VENCIMENTOS = 6;
const TOP_VENCIDOS = 5;
const MESES_VOLUME = 12;

/**
 * Monta todos os dados que a página Dashboard consome, a partir das 4 listas de
 * domínio. Função PURA: nada de banco, nada de I/O. `hoje` é injetável para
 * tornar os cálculos baseados em data (vencimento, mês corrente) determinísticos
 * em teste; em produção usa a data atual.
 */
export function montarDashboard(
  input: DashboardInput,
  hoje: Date = new Date(),
): DashboardData {
  const { clientes, sacados, titulos, operacoes } = input;
  const mesAtual = mesIso(hoje);
  const mesAnterior = mesAnteriorIso(hoje);

  /* ----- Títulos por bucket ----- */
  const abertos = titulos.filter(emAberto);
  const aVencerList = titulos.filter((t) => aVencer(t, hoje));
  const vencidoList = titulos.filter((t) => vencido(t, hoje));
  const somaFace = (lista: Titulo[]) =>
    lista.reduce((s, t) => s + t.valorFace, 0);

  /* ----- Operações: ticket médio e taxa ponderada (só efetivadas) ----- */
  const efetivadas = operacoes.filter(efetivada);
  const brutoEfetivado = efetivadas.reduce((s, o) => s + o.valorBruto, 0);
  const ticketMedio =
    efetivadas.length > 0 ? brutoEfetivado / efetivadas.length : 0;
  const taxaMediaPonderada =
    brutoEfetivado > 0
      ? efetivadas.reduce((s, o) => s + o.taxaAplicada * o.valorBruto, 0) /
        brutoEfetivado
      : 0;

  /* ----- Operações no mês (por dataOperacao; todas, sem filtro de status) ----- */
  const operacoesNoMes = operacoes.filter(
    (o) => o.dataOperacao.slice(0, 7) === mesAtual,
  ).length;
  const operacoesMesAnterior = operacoes.filter(
    (o) => o.dataOperacao.slice(0, 7) === mesAnterior,
  ).length;

  /* ----- Clientes / sacados ----- */
  const clientesAtivos = clientes.filter((c) => c.status === "Ativo").length;
  const clientesNovosNoMes = clientes.filter(
    (c) => c.criadoEm.slice(0, 7) === mesAtual,
  ).length;
  const sacadosAtivos = sacados.filter((s) => s.status === "Ativo").length;
  const sacadosNovosNoMes = sacados.filter(
    (s) => s.criadoEm.slice(0, 7) === mesAtual,
  ).length;

  /* ----- Volume operado por mês (todas operações, casa com Relatorios) ----- */
  const volumeMap = new Map<string, number>();
  operacoes.forEach((o) => {
    const m = o.dataOperacao.slice(0, 7);
    volumeMap.set(m, (volumeMap.get(m) ?? 0) + o.valorBruto);
  });
  const volumePorMes: PontoVolumeMes[] = Array.from(volumeMap.entries())
    .map(([mes, valor]) => ({ mes, valor }))
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .slice(-MESES_VOLUME);

  /* ----- Operações por status (todas; categorias estáveis) ----- */
  const operacoesPorStatus: PontoStatusOperacao[] = STATUS_OPERACAO.map(
    (status) => ({
      status,
      total: operacoes.filter((o) => o.status === status).length,
    }),
  );

  /* ----- Tabelas ----- */
  const proximosVencimentos: LinhaVencimento[] = [...aVencerList]
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))
    .slice(0, TOP_PROXIMOS_VENCIMENTOS)
    .map((t) => ({
      id: t.id,
      numero: t.numero,
      sacadoNome: t.sacadoNome,
      dataVencimento: t.dataVencimento,
      valorFace: t.valorFace,
      diasAteVencer: daysUntil(t.dataVencimento, hoje),
    }));

  const titulosVencidos: LinhaVencido[] = vencidoList
    .map((t) => ({
      id: t.id,
      numero: t.numero,
      sacadoNome: t.sacadoNome,
      dataVencimento: t.dataVencimento,
      valorFace: t.valorFace,
      diasAtraso: -daysUntil(t.dataVencimento, hoje),
    }))
    .sort((a, b) => b.diasAtraso - a.diasAtraso)
    .slice(0, TOP_VENCIDOS);

  return {
    kpis: {
      carteiraEmAberto: somaFace(abertos),
      qtdTitulosEmAberto: abertos.length,
      totalAVencer: somaFace(aVencerList),
      qtdAVencer: aVencerList.length,
      totalVencido: somaFace(vencidoList),
      qtdVencido: vencidoList.length,
      operacoesNoMes,
      operacoesMesAnterior,
      ticketMedio,
      taxaMediaPonderada,
      clientesAtivos,
      clientesNovosNoMes,
      sacadosAtivos,
      sacadosNovosNoMes,
    },
    volumePorMes,
    operacoesPorStatus,
    proximosVencimentos,
    titulosVencidos,
  };
}
