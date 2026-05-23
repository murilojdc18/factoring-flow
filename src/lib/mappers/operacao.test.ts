/**
 * Testes do mapper de operações (sub-tarefa 2.4a).
 *
 * O mapper é a peça crítica da migração Mock -> Supabase: garante que o shape
 * consumido pela UI (camelCase, igual ao mock) permaneça idêntico ao montar a
 * Operacao a partir de TRÊS fontes do banco — a linha de `operacoes` (cabeçalho)
 * mais os vínculos de `operacao_titulos` (titulosIds) e as linhas de
 * `operacao_historico` (historico). Cobre montagem por join, resolução de nomes
 * via lookup (cedente e responsável), defaults e o caminho de volta (cabeçalho).
 */
import { describe, it, expect } from "vitest";
import {
  rowToOperacao,
  operacaoToRow,
  type OperacaoLookup,
} from "@/lib/mappers/operacao";
import type { Operacao } from "@/data/mockOperacoes";
import type { Database } from "@/integrations/supabase/types";

type OperacaoRow = Database["public"]["Tables"]["operacoes"]["Row"];
type OperacaoHistoricoRow =
  Database["public"]["Tables"]["operacao_historico"]["Row"];

const CEDENTE_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";

// Operação completa de referência. cedenteNome, titulosIds e historico NÃO são
// colunas de `operacoes` — são montados a partir de clientes/operacao_titulos/
// operacao_historico. Cada entrada de historico já carrega observacao como
// string (o banco usa default '' e a coluna é NOT NULL).
const operacaoCompleta: Operacao = {
  id: "55555555-5555-5555-5555-555555555555",
  numero: "BOR-2026-0001",
  cedenteId: CEDENTE_ID,
  cedenteNome: "Comercial Vitória LTDA",
  dataOperacao: "2026-05-20",
  status: "Em análise",
  titulosIds: [
    "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  ],
  quantidadeTitulos: 2,
  valorBruto: 28100,
  valorDesagio: 1200.5,
  valorTarifas: 200,
  valorRetencao: 1405,
  valorLiquido: 25294.5,
  prazoMedio: 22,
  taxaAplicada: 3.5,
  responsavelInterno: "Murilo",
  observacoes: "Operação com dois títulos.",
  historico: [
    {
      status: "Rascunho",
      data: "2026-05-19",
      por: "Murilo",
      observacao: "Criada a partir da simulação.",
    },
    { status: "Em análise", data: "2026-05-20", por: "Murilo", observacao: "" },
  ],
};

// Lookup que resolve o cedente e o responsável (created_by -> nome) esperados.
const lookup: OperacaoLookup = {
  cedentes: new Map([[CEDENTE_ID, "Comercial Vitória LTDA"]]),
  responsaveis: new Map([[USER_ID, "Murilo"]]),
};

// Cabeçalho da linha do banco, a partir do payload de inserção mais os campos
// que o banco preenche (id, created_by, timestamps).
function makeRow(op: Operacao): OperacaoRow {
  return {
    ...operacaoToRow(op),
    id: op.id,
    created_by: USER_ID,
    created_at: "2026-05-20T10:00:00.000Z",
    updated_at: "2026-05-20T10:00:00.000Z",
  } as unknown as OperacaoRow;
}

// Linhas de operacao_historico correspondentes ao historico de referência.
// created_at = data + horário fixo, para que slice(0,10) reproduza `data`.
function makeHistorico(op: Operacao): OperacaoHistoricoRow[] {
  return op.historico.map((h, i) => ({
    id: `hist-${i}`,
    operacao_id: op.id,
    status: h.status,
    observacao: h.observacao ?? "",
    created_by: USER_ID,
    created_at: `${h.data}T08:00:00.000Z`,
  })) as unknown as OperacaoHistoricoRow[];
}

describe("mapper operacao — rowToOperacao", () => {
  it("monta a operação completa a partir das três fontes (com lookup)", () => {
    const op = rowToOperacao(
      makeRow(operacaoCompleta),
      {
        titulosIds: operacaoCompleta.titulosIds,
        historico: makeHistorico(operacaoCompleta),
      },
      lookup,
    );
    expect(op).toEqual(operacaoCompleta);
  });

  it("resolve cedenteNome via lookup", () => {
    const op = rowToOperacao(makeRow(operacaoCompleta), {}, lookup);
    expect(op.cedenteNome).toBe("Comercial Vitória LTDA");
  });

  it("deixa cedenteNome vazio quando não há lookup (id preservado)", () => {
    const op = rowToOperacao(makeRow(operacaoCompleta));
    expect(op.cedenteNome).toBe("");
    expect(op.cedenteId).toBe(CEDENTE_ID);
  });

  it("monta titulosIds a partir dos vínculos de operacao_titulos", () => {
    const op = rowToOperacao(
      makeRow(operacaoCompleta),
      { titulosIds: operacaoCompleta.titulosIds },
      lookup,
    );
    expect(op.titulosIds).toEqual(operacaoCompleta.titulosIds);
  });

  it("monta historico e resolve `por` a partir de created_by", () => {
    const op = rowToOperacao(
      makeRow(operacaoCompleta),
      { historico: makeHistorico(operacaoCompleta) },
      lookup,
    );
    expect(op.historico).toEqual(operacaoCompleta.historico);
  });

  it("deixa historico[].por vazio quando o responsável não está no lookup", () => {
    const op = rowToOperacao(makeRow(operacaoCompleta), {
      historico: makeHistorico(operacaoCompleta),
    });
    expect(op.historico.every((h) => h.por === "")).toBe(true);
  });

  it("aplica defaults quando relacionados e campos opcionais vêm vazios", () => {
    const row = {
      id: "66666666-6666-6666-6666-666666666666",
      numero: "BOR-MINIMO",
      cedente_id: CEDENTE_ID,
      data_operacao: "2026-05-01",
      status: null,
      quantidade_titulos: null,
      valor_bruto: null,
      valor_desagio: null,
      valor_tarifas: null,
      valor_retencao: null,
      valor_liquido: null,
      prazo_medio: null,
      taxa_aplicada: null,
      responsavel_interno: null,
      observacoes: null,
      created_by: null,
      created_at: "2026-05-01T00:00:00.000Z",
      updated_at: "2026-05-01T00:00:00.000Z",
    } as unknown as OperacaoRow;
    const op = rowToOperacao(row);
    expect(op.status).toBe("Rascunho");
    expect(op.titulosIds).toEqual([]);
    expect(op.quantidadeTitulos).toBe(0);
    expect(op.valorBruto).toBe(0);
    expect(op.valorLiquido).toBe(0);
    expect(op.responsavelInterno).toBe("");
    expect(op.observacoes).toBe("");
    expect(op.historico).toEqual([]);
  });
});

describe("mapper operacao — operacaoToRow", () => {
  it("converte o cabeçalho de uma Operacao completa para snake_case", () => {
    expect(operacaoToRow(operacaoCompleta)).toEqual({
      numero: "BOR-2026-0001",
      cedente_id: CEDENTE_ID,
      data_operacao: "2026-05-20",
      status: "Em análise",
      quantidade_titulos: 2,
      valor_bruto: 28100,
      valor_desagio: 1200.5,
      valor_tarifas: 200,
      valor_retencao: 1405,
      valor_liquido: 25294.5,
      prazo_medio: 22,
      taxa_aplicada: 3.5,
      responsavel_interno: "Murilo",
      observacoes: "Operação com dois títulos.",
    });
  });

  it("não inclui id, timestamps, created_by nem campos de outras tabelas", () => {
    const row = operacaoToRow(operacaoCompleta) as Record<string, unknown>;
    expect(row).not.toHaveProperty("id");
    expect(row).not.toHaveProperty("created_at");
    expect(row).not.toHaveProperty("updated_at");
    expect(row).not.toHaveProperty("created_by");
    expect(row).not.toHaveProperty("cedenteNome");
    expect(row).not.toHaveProperty("titulosIds");
    expect(row).not.toHaveProperty("historico");
  });

  it("aplica defaults para um Partial vazio", () => {
    const row = operacaoToRow({});
    expect(row.numero).toBe("");
    expect(row.cedente_id).toBe("");
    expect(row.status).toBe("Rascunho");
    expect(row.quantidade_titulos).toBe(0);
    expect(row.valor_bruto).toBe(0);
    expect(row.data_operacao).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("mapper operacao — ida e volta (cabeçalho)", () => {
  it("preserva o cabeçalho no ciclo operacaoToRow -> rowToOperacao", () => {
    const op = rowToOperacao(
      makeRow(operacaoCompleta),
      {
        titulosIds: operacaoCompleta.titulosIds,
        historico: makeHistorico(operacaoCompleta),
      },
      lookup,
    );
    expect(op).toEqual(operacaoCompleta);
  });
});
