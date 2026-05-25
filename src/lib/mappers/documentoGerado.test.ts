/**
 * Testes do mapper de documentos gerados (sub-tarefa 2.5b).
 *
 * Garante que o shape consumido pela UI (`DocumentoGerado`, camelCase) permaneça
 * idêntico ao ler de `documentos_gerados`. Cobre a ida (rowToDocumentoGerado,
 * com e sem lookup de cedente), a volta (documentoGeradoToRow, com FKs vazias
 * virando null), a conversão de `modelo_versao` integer <-> string, os defaults
 * e o ciclo de ida e volta. Testes puros — nenhuma chamada ao banco.
 */
import { describe, it, expect } from "vitest";
import {
  rowToDocumentoGerado,
  documentoGeradoToRow,
  type DocumentoGeradoLookup,
  type DocumentoGeradoRow,
} from "@/lib/mappers/documentoGerado";
import type { DocumentoGerado } from "@/data/mockDocumentosGerados";

const CEDENTE_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "09e693de-63ef-4664-a3da-82af69ca2d58";

// Amostra 1: um contrato de cessão (versão "1", status Rascunho).
const contratoDoc: DocumentoGerado = {
  id: "aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa",
  tipoDocumento: "Contrato de cessão de direitos creditórios",
  modeloId: "2e042264-945a-40b9-b674-ee236920a081",
  modeloNome: "Contrato de Cessão de Direitos Creditórios",
  modeloVersao: "1",
  operacaoId: "55555555-5555-5555-5555-555555555555",
  operacaoNumero: "BOR-2026-0001",
  cedenteId: CEDENTE_ID,
  cedenteNome: "Comercial Vitória LTDA",
  geradoEm: "2026-05-25",
  status: "Rascunho",
  textoFinal: "Minuta proforma preenchida para a operação BOR-2026-0001.",
  observacoes: "Revisar cláusula de retenção antes da assinatura.",
};

// Amostra 2: um borderô (versão "2", status Aprovado internamente).
const borderoDoc: DocumentoGerado = {
  id: "bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb",
  tipoDocumento: "Borderô de títulos",
  modeloId: "78872149-e0dc-49b1-ad2b-1958641440d8",
  modeloNome: "Borderô de Títulos",
  modeloVersao: "2",
  operacaoId: "66666666-6666-6666-6666-666666666666",
  operacaoNumero: "BOR-2026-0002",
  cedenteId: CEDENTE_ID,
  cedenteNome: "Comercial Vitória LTDA",
  geradoEm: "2026-05-24",
  status: "Aprovado internamente",
  textoFinal: "Borderô nº BOR-2026-0002 com a relação de títulos.",
  observacoes: "Conferência interna concluída.",
};

const lookup: DocumentoGeradoLookup = {
  cedentes: new Map([[CEDENTE_ID, "Comercial Vitória LTDA"]]),
};

// Monta a linha do banco a partir do payload gravável (documentoGeradoToRow)
// mais os campos preenchidos pelo banco: id, variaveis_preenchidas (default
// '{}'), created_by e timestamps. created_at = geradoEm + horário fixo, para que
// slice(0,10) reproduza `geradoEm` no ciclo de ida e volta.
function makeRow(doc: DocumentoGerado): DocumentoGeradoRow {
  return {
    ...documentoGeradoToRow(doc),
    id: doc.id,
    variaveis_preenchidas: {},
    created_by: USER_ID,
    created_at: `${doc.geradoEm}T10:00:00.000Z`,
    updated_at: `${doc.geradoEm}T10:00:00.000Z`,
  } as unknown as DocumentoGeradoRow;
}

describe("mapper documentoGerado — rowToDocumentoGerado", () => {
  it("monta o DocumentoGerado completo com lookup de cedente", () => {
    expect(rowToDocumentoGerado(makeRow(contratoDoc), lookup)).toEqual(contratoDoc);
  });

  it("deixa cedenteNome vazio quando não há lookup (cedenteId preservado)", () => {
    const doc = rowToDocumentoGerado(makeRow(contratoDoc));
    expect(doc.cedenteNome).toBe("");
    expect(doc.cedenteId).toBe(CEDENTE_ID);
  });

  it("converte modelo_versao integer do banco em string", () => {
    const row = { ...makeRow(contratoDoc), modelo_versao: 7 } as DocumentoGeradoRow;
    expect(rowToDocumentoGerado(row, lookup).modeloVersao).toBe("7");
  });

  it("aplica defaults quando campos opcionais vêm null/ausentes", () => {
    const row = {
      id: "cccccccc-3333-3333-3333-cccccccccccc",
      cliente_id: null,
      conteudo: null,
      modelo_id: null,
      modelo_nome: null,
      modelo_versao: null,
      observacoes: null,
      operacao_id: null,
      operacao_numero: null,
      status: null,
      tipo_documento: "",
      variaveis_preenchidas: {},
      created_by: null,
      created_at: "2026-05-01T08:30:00.000Z",
      updated_at: null,
    } as unknown as DocumentoGeradoRow;
    const doc = rowToDocumentoGerado(row);
    expect(doc.status).toBe("Rascunho");
    expect(doc.modeloVersao).toBe("1");
    expect(doc.textoFinal).toBe("");
    expect(doc.cedenteNome).toBe("");
    expect(doc.geradoEm).toBe("2026-05-01");
  });
});

describe("mapper documentoGerado — documentoGeradoToRow", () => {
  it("converte o DocumentoGerado completo para snake_case", () => {
    expect(documentoGeradoToRow(contratoDoc)).toEqual({
      cliente_id: CEDENTE_ID,
      conteudo: "Minuta proforma preenchida para a operação BOR-2026-0001.",
      modelo_id: "2e042264-945a-40b9-b674-ee236920a081",
      modelo_nome: "Contrato de Cessão de Direitos Creditórios",
      modelo_versao: 1,
      observacoes: "Revisar cláusula de retenção antes da assinatura.",
      operacao_id: "55555555-5555-5555-5555-555555555555",
      operacao_numero: "BOR-2026-0001",
      status: "Rascunho",
      tipo_documento: "Contrato de cessão de direitos creditórios",
    });
  });

  it("converte FKs vazias em null (cliente_id, modelo_id, operacao_id)", () => {
    const row = documentoGeradoToRow({
      ...contratoDoc,
      cedenteId: "",
      modeloId: "",
      operacaoId: "",
    });
    expect(row.cliente_id).toBeNull();
    expect(row.modelo_id).toBeNull();
    expect(row.operacao_id).toBeNull();
  });

  it("não inclui id/timestamps/created_by/variaveis e converte versão string em integer", () => {
    const row = documentoGeradoToRow(borderoDoc) as Record<string, unknown>;
    expect(row).not.toHaveProperty("id");
    expect(row).not.toHaveProperty("created_at");
    expect(row).not.toHaveProperty("updated_at");
    expect(row).not.toHaveProperty("created_by");
    expect(row).not.toHaveProperty("variaveis_preenchidas");
    expect(row.modelo_versao).toBe(2);
  });

  it("aplica defaults para um Partial vazio (FKs null, versão 1, status Rascunho)", () => {
    const row = documentoGeradoToRow({});
    expect(row.cliente_id).toBeNull();
    expect(row.modelo_id).toBeNull();
    expect(row.operacao_id).toBeNull();
    expect(row.conteudo).toBe("");
    expect(row.modelo_nome).toBe("");
    expect(row.operacao_numero).toBe("");
    expect(row.observacoes).toBe("");
    expect(row.status).toBe("Rascunho");
    expect(row.modelo_versao).toBe(1);
    expect(row.tipo_documento).toBe("");
  });
});

describe("mapper documentoGerado — ida e volta", () => {
  it("preserva o contrato no ciclo documentoGeradoToRow -> rowToDocumentoGerado", () => {
    expect(rowToDocumentoGerado(makeRow(contratoDoc), lookup)).toEqual(contratoDoc);
  });

  it("preserva o borderô no ciclo documentoGeradoToRow -> rowToDocumentoGerado", () => {
    expect(rowToDocumentoGerado(makeRow(borderoDoc), lookup)).toEqual(borderoDoc);
  });
});
