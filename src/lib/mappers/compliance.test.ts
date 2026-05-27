import { describe, it, expect } from "vitest";
import {
  rowToAnalise,
  analiseToRow,
  type ComplianceRow,
} from "@/lib/mappers/compliance";

/**
 * Testes do mapper de compliance (2.9.2).
 *
 * `justificativa` é coluna nativa (types.ts regenerado na 2.9.5) e `nivel_risco`
 * usa valores válidos nos dois lados; "Crítico" entrou na UI na 2.9.4.
 */
const clienteRow: ComplianceRow = {
  id: "11111111-1111-1111-1111-111111111111",
  cliente_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  operacao_id: null,
  nivel_risco: "Baixo",
  status: "Em análise",
  checklist: {
    respostas: [
      { itemId: "ob-1", conferido: true },
      { itemId: "ob-2", conferido: false, observacao: "documento pendente" },
    ],
  },
  observacoes: "Análise inicial de onboarding.",
  justificativa: "Cliente recorrente, documentação completa.",
  responsavel: "Ana Martins",
  data_analise: "2026-05-01",
  created_by: "44444444-4444-4444-4444-444444444444",
  created_at: "2026-05-01T10:00:00.000Z",
  updated_at: "2026-05-01T10:00:00.000Z",
};

const operacaoRow: ComplianceRow = {
  id: "22222222-2222-2222-2222-222222222222",
  cliente_id: null,
  operacao_id: "oooooooo-oooo-oooo-oooo-oooooooooooo",
  nivel_risco: "Alto",
  status: "Em análise",
  checklist: { respostas: [{ itemId: "op-1", conferido: true }] },
  observacoes: "Concentração elevada por sacado.",
  justificativa: "Operação acima do perfil histórico do cedente.",
  responsavel: "Bruno Lima",
  data_analise: "2026-05-10",
  created_by: null,
  created_at: "2026-05-10T09:30:00.000Z",
  updated_at: "2026-05-10T09:30:00.000Z",
};

describe("rowToAnalise", () => {
  it("mapeia uma análise de cliente", () => {
    const a = rowToAnalise(clienteRow);
    expect(a.id).toBe(clienteRow.id);
    expect(a.escopo).toBe("Cliente");
    expect(a.alvoId).toBe(clienteRow.cliente_id);
    expect(a.alvoNome).toBe(""); // derivado no read (D5)
    expect(a.nivelRisco).toBe("Baixo");
    expect(a.justificativa).toBe("Cliente recorrente, documentação completa.");
    expect(a.responsavel).toBe("Ana Martins");
    expect(a.dataAnalise).toBe(clienteRow.created_at);
    expect(a.respostas).toHaveLength(2);
    expect(a.respostas[1].observacao).toBe("documento pendente");
    expect(a.historico).toEqual([]);
  });

  it("mapeia uma análise de operação (escopo derivado da FK)", () => {
    const a = rowToAnalise(operacaoRow);
    expect(a.escopo).toBe("Operação");
    expect(a.alvoId).toBe(operacaoRow.operacao_id);
    expect(a.nivelRisco).toBe("Alto");
  });

  it("trata checklist vazio e justificativa vazia como neutros", () => {
    const semDados: ComplianceRow = {
      id: "33333333-3333-3333-3333-333333333333",
      cliente_id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
      operacao_id: null,
      nivel_risco: "Médio",
      status: "Em análise",
      checklist: {},
      observacoes: "",
      justificativa: "",
      responsavel: "",
      data_analise: "2026-05-12",
      created_by: null,
      created_at: "2026-05-12T08:00:00.000Z",
      updated_at: "2026-05-12T08:00:00.000Z",
    };
    const a = rowToAnalise(semDados);
    expect(a.respostas).toEqual([]);
    expect(a.justificativa).toBe("");
  });
});

describe("analiseToRow", () => {
  it("mapeia uma análise de cliente (cliente_id setado, operacao_id null)", () => {
    const row = analiseToRow({
      escopo: "Cliente",
      alvoId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      nivelRisco: "Médio",
      justificativa: "Risco médio por documentação parcial.",
      observacoes: "Revisar em 30 dias.",
      responsavel: "Ana Martins",
      respostas: [{ itemId: "ob-1", conferido: true }],
    });
    expect(row.cliente_id).toBe("cccccccc-cccc-cccc-cccc-cccccccccccc");
    expect(row.operacao_id).toBeNull();
    expect(row.nivel_risco).toBe("Médio");
    expect(row.status).toBe("Em análise"); // D6
    expect(row.justificativa).toBe("Risco médio por documentação parcial.");
    expect(row.responsavel).toBe("Ana Martins");
    expect(row.checklist).toEqual({ respostas: [{ itemId: "ob-1", conferido: true }] });
  });

  it("mapeia uma análise de operação (operacao_id setado, cliente_id null)", () => {
    const row = analiseToRow({
      escopo: "Operação",
      alvoId: "oooooooo-oooo-oooo-oooo-oooooooooooo",
      nivelRisco: "Alto",
    });
    expect(row.operacao_id).toBe("oooooooo-oooo-oooo-oooo-oooooooooooo");
    expect(row.cliente_id).toBeNull();
  });

  it("aplica defaults seguros num parcial vazio", () => {
    const row = analiseToRow({});
    expect(row.cliente_id).toBeNull(); // escopo default Cliente, alvoId vazio → null
    expect(row.operacao_id).toBeNull();
    expect(row.nivel_risco).toBe("Baixo");
    expect(row.status).toBe("Em análise");
    expect(row.justificativa).toBe("");
    expect(row.observacoes).toBe("");
    expect(row.responsavel).toBe("");
    expect(row.checklist).toEqual({ respostas: [] });
  });
});

describe("ida e volta", () => {
  it("preserva os dados de uma análise de cliente (row → análise → row)", () => {
    const row = analiseToRow(rowToAnalise(clienteRow));
    expect(row.cliente_id).toBe(clienteRow.cliente_id);
    expect(row.operacao_id).toBeNull();
    expect(row.nivel_risco).toBe(clienteRow.nivel_risco);
    expect(row.justificativa).toBe(clienteRow.justificativa);
    expect(row.observacoes).toBe(clienteRow.observacoes);
    expect(row.responsavel).toBe(clienteRow.responsavel);
    expect(row.checklist).toEqual(clienteRow.checklist);
  });

  it("preserva os dados de uma análise de operação", () => {
    const row = analiseToRow(rowToAnalise(operacaoRow));
    expect(row.operacao_id).toBe(operacaoRow.operacao_id);
    expect(row.cliente_id).toBeNull();
    expect(row.nivel_risco).toBe("Alto");
    expect(row.checklist).toEqual(operacaoRow.checklist);
  });
});
