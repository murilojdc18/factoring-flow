import { describe, it, expect } from "vitest";
import { agruparCorrentes } from "@/lib/complianceAgregado";
import type { AnaliseCompliance, EscopoAnalise } from "@/data/mockCompliance";

/**
 * Testes da agregação append-only (2.9.2, D1): várias linhas por alvo → análise
 * atual (mais recente) + revisões anteriores em `historico`.
 */
const mk = (
  escopo: EscopoAnalise,
  alvoId: string,
  id: string,
  dataAnalise: string,
): AnaliseCompliance => ({
  id,
  escopo,
  alvoId,
  alvoNome: "",
  nivelRisco: "Baixo",
  justificativa: `just-${id}`,
  observacoes: "",
  responsavel: `resp-${id}`,
  dataAnalise,
  respostas: [],
  historico: [],
});

describe("agruparCorrentes", () => {
  it("lista vazia → vazia", () => {
    expect(agruparCorrentes([])).toEqual([]);
  });

  it("um alvo com uma análise → atual sem histórico", () => {
    const out = agruparCorrentes([
      mk("Cliente", "c1", "A", "2026-05-01T10:00:00.000Z"),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("A");
    expect(out[0].historico).toEqual([]);
  });

  it("um alvo com várias revisões → atual é a mais recente, anteriores no histórico", () => {
    const out = agruparCorrentes([
      mk("Cliente", "c1", "A", "2026-05-01T10:00:00.000Z"),
      mk("Cliente", "c1", "B", "2026-05-10T10:00:00.000Z"),
      mk("Cliente", "c1", "C", "2026-05-05T10:00:00.000Z"),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("B"); // 05-10 é a mais recente
    expect(out[0].historico).toHaveLength(2);
    // histórico em ordem desc: C (05-05) antes de A (05-01)
    expect(out[0].historico[0].data).toBe("2026-05-05T10:00:00.000Z");
    expect(out[0].historico[1].data).toBe("2026-05-01T10:00:00.000Z");
    expect(out[0].historico[0].responsavel).toBe("resp-C");
  });

  it("separa por escopo + alvoId (mesmo alvoId, escopos diferentes não se misturam)", () => {
    const out = agruparCorrentes([
      mk("Cliente", "x", "A", "2026-05-01T10:00:00.000Z"),
      mk("Operação", "x", "B", "2026-05-02T10:00:00.000Z"),
    ]);
    expect(out).toHaveLength(2);
    expect(out.every((a) => a.historico.length === 0)).toBe(true);
  });

  it("vários alvos → uma atual por alvo", () => {
    const out = agruparCorrentes([
      mk("Cliente", "c1", "A", "2026-05-01T10:00:00.000Z"),
      mk("Cliente", "c2", "B", "2026-05-02T10:00:00.000Z"),
      mk("Operação", "o1", "C", "2026-05-03T10:00:00.000Z"),
    ]);
    expect(out).toHaveLength(3);
  });

  it("ordena as atuais da mais recente para a mais antiga", () => {
    const out = agruparCorrentes([
      mk("Cliente", "c1", "A", "2026-05-01T10:00:00.000Z"),
      mk("Cliente", "c2", "B", "2026-05-20T10:00:00.000Z"),
      mk("Operação", "o1", "C", "2026-05-10T10:00:00.000Z"),
    ]);
    expect(out.map((a) => a.id)).toEqual(["B", "C", "A"]);
  });
});
