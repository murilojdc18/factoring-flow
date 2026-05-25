/**
 * Testes do mapper de modelos de documento (sub-tarefa 2.5a).
 *
 * O mapper garante que o shape consumido pela UI (`ModeloContrato`, camelCase,
 * igual ao mock) permaneça idêntico ao ler de `modelos_documentos`. Cobre a ida
 * (rowToModeloDocumento), a volta (modeloDocumentoToRow), a conversão de `versao`
 * integer <-> string (decisão D3), os defaults defensivos e o ciclo de ida e
 * volta do cabeçalho. Testes puros — nenhuma chamada ao banco.
 */
import { describe, it, expect } from "vitest";
import {
  rowToModeloDocumento,
  modeloDocumentoToRow,
  type ModeloDocumentoRow,
} from "@/lib/mappers/modeloDocumento";
import type { ModeloContrato } from "@/data/mockContratos";

const USER_ID = "09e693de-63ef-4664-a3da-82af69ca2d58";

// Amostra 1: um contrato de cessão (versão "1", status Ativo).
const contratoCessao: ModeloContrato = {
  id: "2e042264-945a-40b9-b674-ee236920a081",
  nome: "Contrato de Cessão de Direitos Creditórios",
  tipo: "Contrato de cessão de direitos creditórios",
  versao: "1",
  status: "Ativo",
  atualizadoEm: "2026-05-23T14:43:00.000Z",
  texto: "Minuta proforma com {{cedente_razao_social}} e cláusulas de cessão.",
  observacoes: "Sujeita a revisão jurídica completa antes do uso.",
};

// Amostra 2: um borderô (versão "2") — exercita tipo com acento e outra versão.
const borderoModelo: ModeloContrato = {
  id: "78872149-e0dc-49b1-ad2b-1958641440d8",
  nome: "Borderô de Títulos",
  tipo: "Borderô de títulos",
  versao: "2",
  status: "Ativo",
  atualizadoEm: "2026-05-24T09:00:00.000Z",
  texto: "Borderô nº {{bordero_numero}} com a relação de títulos e o resumo financeiro.",
  observacoes: "Conferência interna obrigatória.",
};

// Monta a linha do banco a partir do payload gravável (modeloDocumentoToRow) mais
// os campos que o banco preenche: id, variaveis (default '{}'), created_by e
// timestamps. updated_at = atualizadoEm para o ciclo de ida e volta fechar.
function makeRow(m: ModeloContrato): ModeloDocumentoRow {
  return {
    ...modeloDocumentoToRow(m),
    id: m.id,
    variaveis: {},
    created_by: USER_ID,
    created_at: "2026-05-23T14:43:00.000Z",
    updated_at: m.atualizadoEm,
  } as unknown as ModeloDocumentoRow;
}

describe("mapper modeloDocumento — rowToModeloDocumento", () => {
  it("monta o ModeloContrato completo a partir da linha (contrato de cessão)", () => {
    expect(rowToModeloDocumento(makeRow(contratoCessao))).toEqual(contratoCessao);
  });

  it("monta o borderô preservando tipo e versão", () => {
    const m = rowToModeloDocumento(makeRow(borderoModelo));
    expect(m).toEqual(borderoModelo);
    expect(m.tipo).toBe("Borderô de títulos");
    expect(m.versao).toBe("2");
  });

  it("converte a versão integer do banco em string", () => {
    const row = { ...makeRow(contratoCessao), versao: 5 } as ModeloDocumentoRow;
    expect(rowToModeloDocumento(row).versao).toBe("5");
  });

  it("aplica defaults quando campos opcionais vêm null/ausentes", () => {
    const row = {
      id: "00000000-0000-0000-0000-000000000000",
      nome: "Modelo mínimo",
      tipo: "",
      conteudo: null,
      descricao: null,
      status: null,
      versao: null,
      variaveis: {},
      created_by: null,
      created_at: "2026-05-23T00:00:00.000Z",
      updated_at: null,
    } as unknown as ModeloDocumentoRow;
    const m = rowToModeloDocumento(row);
    expect(m.status).toBe("Rascunho");
    expect(m.versao).toBe("1");
    expect(m.texto).toBe("");
    expect(m.observacoes).toBe("");
    expect(m.atualizadoEm).toBe("");
  });
});

describe("mapper modeloDocumento — modeloDocumentoToRow", () => {
  it("converte o ModeloContrato completo para snake_case", () => {
    expect(modeloDocumentoToRow(contratoCessao)).toEqual({
      nome: "Contrato de Cessão de Direitos Creditórios",
      tipo: "Contrato de cessão de direitos creditórios",
      descricao: "Sujeita a revisão jurídica completa antes do uso.",
      conteudo: "Minuta proforma com {{cedente_razao_social}} e cláusulas de cessão.",
      status: "Ativo",
      versao: 1,
    });
  });

  it("não inclui id, timestamps, created_by nem variaveis", () => {
    const row = modeloDocumentoToRow(contratoCessao) as Record<string, unknown>;
    expect(row).not.toHaveProperty("id");
    expect(row).not.toHaveProperty("created_at");
    expect(row).not.toHaveProperty("updated_at");
    expect(row).not.toHaveProperty("created_by");
    expect(row).not.toHaveProperty("variaveis");
  });

  it("converte versão string em integer e descarta o sufixo decimal legado", () => {
    expect(modeloDocumentoToRow({ versao: "1" }).versao).toBe(1);
    expect(modeloDocumentoToRow({ versao: "2" }).versao).toBe(2);
    expect(modeloDocumentoToRow({ versao: "1.2" }).versao).toBe(1);
    expect(modeloDocumentoToRow({ versao: "2.0" }).versao).toBe(2);
  });

  it("usa versão 1 como fallback e aplica defaults para um Partial vazio", () => {
    const row = modeloDocumentoToRow({});
    expect(row.nome).toBe("");
    expect(row.tipo).toBe("");
    expect(row.descricao).toBe("");
    expect(row.conteudo).toBe("");
    expect(row.status).toBe("Rascunho");
    expect(row.versao).toBe(1);
    expect(modeloDocumentoToRow({ versao: "abc" }).versao).toBe(1);
    expect(modeloDocumentoToRow({ versao: "" }).versao).toBe(1);
  });
});

describe("mapper modeloDocumento — ida e volta", () => {
  it("preserva o contrato no ciclo modeloDocumentoToRow -> rowToModeloDocumento", () => {
    expect(rowToModeloDocumento(makeRow(contratoCessao))).toEqual(contratoCessao);
  });

  it("preserva o borderô no ciclo modeloDocumentoToRow -> rowToModeloDocumento", () => {
    expect(rowToModeloDocumento(makeRow(borderoModelo))).toEqual(borderoModelo);
  });
});
