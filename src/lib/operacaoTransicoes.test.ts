import { describe, it, expect } from "vitest";
import {
  podeTransicionar,
  transicoesValidas,
} from "@/lib/operacaoTransicoes";
import type { OperacaoStatus } from "@/data/mockOperacoes";

describe("transicoesValidas", () => {
  it("status não-terminais retornam os alvos da máquina v1", () => {
    expect(transicoesValidas("Em análise")).toEqual(["Aprovada", "Cancelada"]);
    expect(transicoesValidas("Aprovada")).toEqual(["Formalizada", "Cancelada"]);
    expect(transicoesValidas("Formalizada")).toEqual(["Liquidada", "Cancelada"]);
  });

  it("terminais não têm saída", () => {
    expect(transicoesValidas("Liquidada")).toEqual([]);
    expect(transicoesValidas("Cancelada")).toEqual([]);
  });

  it("status fora do v1 não expõem transição", () => {
    expect(transicoesValidas("Rascunho")).toEqual([]);
    expect(transicoesValidas("Em atraso")).toEqual([]);
    expect(transicoesValidas("Recomprada")).toEqual([]);
  });
});

describe("podeTransicionar", () => {
  it("aceita as transições válidas da v1", () => {
    expect(podeTransicionar("Em análise", "Aprovada")).toBe(true);
    expect(podeTransicionar("Em análise", "Cancelada")).toBe(true);
    expect(podeTransicionar("Aprovada", "Formalizada")).toBe(true);
    expect(podeTransicionar("Aprovada", "Cancelada")).toBe(true);
    expect(podeTransicionar("Formalizada", "Liquidada")).toBe(true);
    expect(podeTransicionar("Formalizada", "Cancelada")).toBe(true);
  });

  it("rejeita pular etapas", () => {
    expect(podeTransicionar("Em análise", "Formalizada")).toBe(false);
    expect(podeTransicionar("Em análise", "Liquidada")).toBe(false);
    expect(podeTransicionar("Aprovada", "Liquidada")).toBe(false);
  });

  it("rejeita voltar para Em análise e qualquer retrocesso", () => {
    expect(podeTransicionar("Aprovada", "Em análise")).toBe(false);
    expect(podeTransicionar("Formalizada", "Aprovada")).toBe(false);
    expect(podeTransicionar("Formalizada", "Em análise")).toBe(false);
  });

  it("não há saída de status terminais", () => {
    const alvos: OperacaoStatus[] = [
      "Em análise",
      "Aprovada",
      "Formalizada",
      "Liquidada",
      "Cancelada",
    ];
    for (const alvo of alvos) {
      expect(podeTransicionar("Liquidada", alvo)).toBe(false);
      expect(podeTransicionar("Cancelada", alvo)).toBe(false);
    }
  });
});
