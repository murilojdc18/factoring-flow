import type {
  AnaliseCompliance,
  RevisaoAnalise,
} from "@/data/mockCompliance";

/**
 * Agregação append-only das análises de compliance (sub-tarefa 2.9.2, D1).
 *
 * No modelo append-only, cada "salvar" insere uma nova linha; várias linhas podem
 * existir para o mesmo alvo (escopo + alvoId). Esta função PURA recebe a lista
 * mapeada (uma AnaliseCompliance por linha) e devolve a análise ATUAL de cada alvo
 * (a mais recente por `dataAnalise`), com as revisões anteriores empilhadas em
 * `historico` (mapeadas a `RevisaoAnalise`, mais recente primeiro). Espelha o
 * papel de `deriveEstado`/`estadoDoUltimoEvento` da 2.8 — lógica de estado isolada
 * do mapper e coberta por teste.
 */

/** Reduz uma análise a uma entrada de histórico (snapshot de revisão). */
function paraRevisao(a: AnaliseCompliance): RevisaoAnalise {
  return {
    data: a.dataAnalise,
    responsavel: a.responsavel,
    nivelRisco: a.nivelRisco,
    justificativa: a.justificativa,
    observacoes: a.observacoes,
    respostas: a.respostas,
  };
}

/** Ordena por `dataAnalise` desc, com desempate por `id` desc (estável). */
function maisRecentePrimeiro(
  x: AnaliseCompliance,
  y: AnaliseCompliance,
): number {
  return y.dataAnalise.localeCompare(x.dataAnalise) || y.id.localeCompare(x.id);
}

/**
 * Agrupa as análises por alvo (escopo + alvoId) e devolve a atual de cada um,
 * com `historico` preenchido pelas anteriores. A lista resultante vem ordenada da
 * análise mais recente para a mais antiga.
 */
export function agruparCorrentes(
  analises: AnaliseCompliance[],
): AnaliseCompliance[] {
  const grupos = new Map<string, AnaliseCompliance[]>();
  for (const a of analises) {
    const chave = `${a.escopo}::${a.alvoId}`;
    const lista = grupos.get(chave);
    if (lista) lista.push(a);
    else grupos.set(chave, [a]);
  }

  const correntes: AnaliseCompliance[] = [];
  for (const lista of grupos.values()) {
    const [atual, ...anteriores] = [...lista].sort(maisRecentePrimeiro);
    correntes.push({ ...atual, historico: anteriores.map(paraRevisao) });
  }

  return correntes.sort(maisRecentePrimeiro);
}
