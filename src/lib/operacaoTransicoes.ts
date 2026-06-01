import type { OperacaoStatus } from "@/data/mockOperacoes";

/**
 * Máquina de estados v1 do ciclo de vida da operação. ÚNICA fonte no front.
 *
 * ESPELHADA na RPC `alterar_status_operacao` (plpgsql) — a RPC é a AUTORIDADE
 * FINAL: rejeita transição inválida mesmo que a UI deixasse passar. Este módulo
 * só habilita/desabilita botões (UX). Ao mudar a máquina, altere os DOIS lugares.
 *
 * Máquina v1:
 *   Em análise  → {Aprovada, Cancelada}
 *   Aprovada    → {Formalizada, Cancelada}
 *   Formalizada → {Liquidada, Cancelada}
 *   Liquidada / Cancelada → terminais (sem saída)
 *   Rascunho / Em atraso / Recomprada → fora do v1 (sem transição manual exposta)
 */
const TRANSICOES: Record<OperacaoStatus, OperacaoStatus[]> = {
  "Em análise": ["Aprovada", "Cancelada"],
  Aprovada: ["Formalizada", "Cancelada"],
  Formalizada: ["Liquidada", "Cancelada"],
  Liquidada: [],
  Cancelada: [],
  // Fora do v1 — sem transição manual exposta:
  Rascunho: [],
  "Em atraso": [],
  Recomprada: [],
};

/** Status alcançáveis a partir de `status` (vazio = terminal/sem saída). */
export function transicoesValidas(status: OperacaoStatus): OperacaoStatus[] {
  return TRANSICOES[status] ?? [];
}

/** `true` se a transição `de → para` é permitida pela máquina v1. */
export function podeTransicionar(
  de: OperacaoStatus,
  para: OperacaoStatus,
): boolean {
  return transicoesValidas(de).includes(para);
}
