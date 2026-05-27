import { useEffect, useState } from "react";

/**
 * Status de cobrança aplicável a um título.
 * Independente do status financeiro do próprio título.
 */
export type StatusCobranca =
  | "A vencer"
  | "Em cobrança"
  | "Em negociação"
  | "Promessa de pagamento"
  | "Liquidado"
  | "Para recompra";

export const STATUS_COBRANCA: StatusCobranca[] = [
  "A vencer",
  "Em cobrança",
  "Em negociação",
  "Promessa de pagamento",
  "Liquidado",
  "Para recompra",
];

export type TipoContato =
  | "Ligação"
  | "E-mail"
  | "WhatsApp"
  | "Visita"
  | "Carta"
  | "Outro";

export const TIPOS_CONTATO: TipoContato[] = [
  "Ligação",
  "E-mail",
  "WhatsApp",
  "Visita",
  "Carta",
  "Outro",
];

/** Resultado categórico de um contato (enum `cobranca_resultado` do banco). */
export type ResultadoCobranca =
  | "Promessa de pagamento"
  | "Sem retorno"
  | "Negociado"
  | "Recusado"
  | "Pagamento confirmado"
  | "Outro";

export const RESULTADOS_COBRANCA: ResultadoCobranca[] = [
  "Promessa de pagamento",
  "Sem retorno",
  "Negociado",
  "Recusado",
  "Pagamento confirmado",
  "Outro",
];

export interface EventoCobranca {
  id: string;
  tituloId: string;
  tituloNumero: string;
  cedenteNome: string;
  sacadoNome: string;
  dataHora: string; // ISO completo
  usuario: string;
  tipoContato: TipoContato;
  resultado: ResultadoCobranca;
  proximaAcao: string;
  proximaAcaoData: string; // ISO yyyy-mm-dd ("" se não houver)
  observacoes: string;
}

/**
 * Estado de cobrança por título — sobrepõe-se ao status do título
 * apenas para fins de gestão de cobrança (mock).
 */
export interface EstadoCobranca {
  status: StatusCobranca;
  ultimaAcao: string;
  proximaAcao: string;
  proximaAcaoData: string;
}

const today = new Date();
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const addDaysIso = (days: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return isoDate(d);
};
const addHoursIsoFull = (hoursAgo: number) => {
  const d = new Date(today);
  d.setHours(d.getHours() - hoursAgo);
  return d.toISOString();
};

/** Histórico inicial mockado. */
const eventosIniciais: EventoCobranca[] = [
  {
    id: "EVC-001",
    tituloId: "TIT-09812",
    tituloNumero: "DUP-58112",
    cedenteNome: "Têxtil Aurora LTDA",
    sacadoNome: "Modas Bella SA",
    dataHora: addHoursIsoFull(28),
    usuario: "Carla Mendes",
    tipoContato: "Ligação",
    resultado: "Promessa de pagamento",
    proximaAcao: "Confirmar pagamento por comprovante",
    proximaAcaoData: addDaysIso(2),
    observacoes:
      "Sacado confirmou recebimento da NF e prometeu pagamento. Falamos com o financeiro (Sra. Lúcia).",
  },
  {
    id: "EVC-002",
    tituloId: "TIT-09934",
    tituloNumero: "CHQ-22041",
    cedenteNome: "Tech Logística ME",
    sacadoNome: "João Carlos Pereira",
    dataHora: addHoursIsoFull(50),
    usuario: "Rafael Souza",
    tipoContato: "WhatsApp",
    resultado: "Sem retorno",
    proximaAcao: "Tentar contato telefônico",
    proximaAcaoData: addDaysIso(1),
    observacoes: "Sem resposta. Mensagem entregue.",
  },
];

/** Estado por título (mock inicial). */
const estadosIniciais: Record<string, EstadoCobranca> = {
  "TIT-09812": {
    status: "Promessa de pagamento",
    ultimaAcao: "Telefone — promessa de pagamento",
    proximaAcao: "Confirmar pagamento por comprovante",
    proximaAcaoData: addDaysIso(2),
  },
  "TIT-09934": {
    status: "Em cobrança",
    ultimaAcao: "WhatsApp — sem resposta",
    proximaAcao: "Tentar contato telefônico",
    proximaAcaoData: addDaysIso(1),
  },
  "TIT-09877": {
    status: "Liquidado",
    ultimaAcao: "Baixa pelo sacado",
    proximaAcao: "—",
    proximaAcaoData: "",
  },
};

/* ========= Store em memória com pub/sub ========= */

let eventos: EventoCobranca[] = [...eventosIniciais];
let estados: Record<string, EstadoCobranca> = { ...estadosIniciais };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const cobrancasStore = {
  getEventos: (): EventoCobranca[] => eventos,
  getEstados: (): Record<string, EstadoCobranca> => estados,
  getEstado: (tituloId: string): EstadoCobranca | undefined => estados[tituloId],

  registrarEvento: (e: Omit<EventoCobranca, "id">) => {
    const id = `EVC-${Date.now()}`;
    eventos = [{ id, ...e }, ...eventos];
    // Atualiza estado do título com a última ação
    const atual = estados[e.tituloId];
    estados = {
      ...estados,
      [e.tituloId]: {
        status: atual?.status ?? "Em cobrança",
        ultimaAcao: `${e.tipoContato} — ${e.resultado.slice(0, 60)}`,
        proximaAcao: e.proximaAcao || atual?.proximaAcao || "—",
        proximaAcaoData: e.proximaAcaoData || atual?.proximaAcaoData || "",
      },
    };
    emit();
  },

  setStatus: (tituloId: string, status: StatusCobranca) => {
    const atual = estados[tituloId];
    estados = {
      ...estados,
      [tituloId]: {
        status,
        ultimaAcao: atual?.ultimaAcao ?? `Marcado como ${status}`,
        proximaAcao: atual?.proximaAcao ?? "—",
        proximaAcaoData: atual?.proximaAcaoData ?? "",
      },
    };
    emit();
  },

  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};

/** Hook reativo retornando eventos + mapa de estados. */
export function useCobrancas() {
  const [, force] = useState(0);
  useEffect(() => cobrancasStore.subscribe(() => force((n) => n + 1)), []);
  return {
    eventos: cobrancasStore.getEventos(),
    estados: cobrancasStore.getEstados(),
  };
}