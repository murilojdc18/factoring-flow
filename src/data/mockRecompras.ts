import { useEffect, useState } from "react";

/**
 * Tipo de ação aplicada a um título problemático.
 */
export type TipoAcaoRecompra = "Recompra" | "Substituição" | "Análise interna";

export const TIPOS_ACAO_RECOMPRA: TipoAcaoRecompra[] = [
  "Recompra",
  "Substituição",
  "Análise interna",
];

/**
 * Status de recompra/substituição aplicado ao título.
 * Independente do status financeiro do próprio título.
 * "Cancelado" (D8) é soft delete: cancelar uma solicitação muda o status para
 * Cancelado, nunca remove o registro. Não é status inicial nem transição comum
 * do dropdown — vem da ação dedicada "Cancelar solicitação" (ver 2.6.5).
 */
export type StatusRecompra =
  | "Em análise de recompra"
  | "Recompra solicitada"
  | "Substituição solicitada"
  | "Resolvido"
  | "Cancelado";

// Transições "normais" oferecidas no dropdown de status. NÃO inclui "Cancelado"
// (D8): o cancelamento é ação dedicada, não uma troca de status comum.
export const STATUS_RECOMPRA: StatusRecompra[] = [
  "Em análise de recompra",
  "Recompra solicitada",
  "Substituição solicitada",
  "Resolvido",
];

/** Mapeia tipo de ação → status inicial. */
export function statusInicialPorAcao(tipo: TipoAcaoRecompra): StatusRecompra {
  switch (tipo) {
    case "Recompra":
      return "Recompra solicitada";
    case "Substituição":
      return "Substituição solicitada";
    case "Análise interna":
      return "Em análise de recompra";
  }
}

export interface SolicitacaoRecompra {
  id: string;
  tituloId: string;
  tituloNumero: string;
  cedenteNome: string;
  sacadoNome: string;
  operacaoId?: string;
  operacaoNumero?: string;
  tipoAcao: TipoAcaoRecompra;
  motivo: string;
  observacoes: string;
  responsavel: string;
  status: StatusRecompra;
  criadoEm: string; // ISO completo
  resolvidoEm?: string;
}

/** Estado atual por título (somente o status visível na lista). */
export interface EstadoRecompraTitulo {
  status: StatusRecompra;
  ultimaSolicitacaoId: string;
  atualizadoEm: string;
}

/* =================== Store em memória =================== */

let solicitacoes: SolicitacaoRecompra[] = [];
let estados: Record<string, EstadoRecompraTitulo> = {};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const recomprasStore = {
  getSolicitacoes: (): SolicitacaoRecompra[] => solicitacoes,
  getEstado: (tituloId: string): EstadoRecompraTitulo | undefined =>
    estados[tituloId],
  /** Filtra solicitações por operação. */
  getPorOperacao: (operacaoId: string): SolicitacaoRecompra[] =>
    solicitacoes.filter((s) => s.operacaoId === operacaoId),

  criar: (
    s: Omit<SolicitacaoRecompra, "id" | "status" | "criadoEm">,
  ): SolicitacaoRecompra => {
    const novo: SolicitacaoRecompra = {
      id: `REC-${Date.now()}`,
      status: statusInicialPorAcao(s.tipoAcao),
      criadoEm: new Date().toISOString(),
      ...s,
    };
    solicitacoes = [novo, ...solicitacoes];
    estados = {
      ...estados,
      [s.tituloId]: {
        status: novo.status,
        ultimaSolicitacaoId: novo.id,
        atualizadoEm: novo.criadoEm,
      },
    };
    emit();
    return novo;
  },

  atualizarStatus: (id: string, status: StatusRecompra) => {
    const agora = new Date().toISOString();
    solicitacoes = solicitacoes.map((s) =>
      s.id === id
        ? {
            ...s,
            status,
            resolvidoEm: status === "Resolvido" ? agora : s.resolvidoEm,
          }
        : s,
    );
    const alvo = solicitacoes.find((s) => s.id === id);
    if (alvo) {
      estados = {
        ...estados,
        [alvo.tituloId]: {
          status,
          ultimaSolicitacaoId: id,
          atualizadoEm: agora,
        },
      };
    }
    emit();
  },

  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};

/** Hook reativo que retorna solicitações + mapa de estados. */
export function useRecompras() {
  const [, force] = useState(0);
  useEffect(() => recomprasStore.subscribe(() => force((n) => n + 1)), []);
  return {
    solicitacoes: recomprasStore.getSolicitacoes(),
    estado: (tituloId: string) => recomprasStore.getEstado(tituloId),
    porOperacao: (operacaoId: string) =>
      recomprasStore.getPorOperacao(operacaoId),
  };
}