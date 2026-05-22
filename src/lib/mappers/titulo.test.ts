/**
 * Testes do mapper de títulos (sub-tarefa 2.3).
 *
 * O mapper é a peça crítica da migração Mock -> Supabase: garante que o shape
 * consumido pela UI (camelCase, igual ao mock) permaneça idêntico ao ler/gravar
 * no banco (snake_case). Cobre ida e volta, defaults, a resolução de nomes via
 * lookup (cedente/sacado) e o parsing tolerante dos anexos JSONB.
 */
import { describe, it, expect } from "vitest";
import {
  rowToTitulo,
  tituloToRow,
  type NameLookup,
} from "@/lib/mappers/titulo";
import type { Titulo } from "@/data/mockTitulos";
import type { Database } from "@/integrations/supabase/types";

type TituloRow = Database["public"]["Tables"]["titulos"]["Row"];

// Título completo de referência. Os nomes de cedente/sacado NÃO existem como
// colunas no banco — são resolvidos por lookup a partir de cedente_id/sacado_id.
const tituloCompleto: Titulo = {
  id: "55555555-5555-5555-5555-555555555555",
  numero: "DUP-2025-0042",
  tipo: "Duplicata",
  cedenteId: "11111111-1111-1111-1111-111111111111",
  cedenteNome: "Comercial Vitória LTDA",
  sacadoId: "33333333-3333-3333-3333-333333333333",
  sacadoNome: "Supermercado Atlas SA",
  dataEmissao: "2026-05-01",
  dataVencimento: "2026-06-30",
  valorFace: 18420.55,
  numeroNotaFiscal: "000.123.456",
  chaveNotaFiscal: "35260312345678000190550010001234561234567890",
  descricao: "Venda de mercadorias — pedido 4521",
  status: "Disponível",
  observacoes: "Título recém-cadastrado, aguardando análise.",
  anexos: [
    {
      id: "AX-1",
      nome: "NF-000123456.xml",
      tipo: "Nota fiscal",
      tamanhoKb: 24,
      enviadoEm: "2026-05-01",
    },
    {
      id: "AX-2",
      nome: "boleto.pdf",
      tipo: "Comprovante",
      tamanhoKb: 88,
      enviadoEm: "2026-05-01",
    },
  ],
  criadoEm: "2026-05-01",
};

// Lookup que resolve os ids do título de referência para os nomes esperados.
const lookup: NameLookup = {
  clientes: new Map([[tituloCompleto.cedenteId, tituloCompleto.cedenteNome]]),
  sacados: new Map([[tituloCompleto.sacadoId, tituloCompleto.sacadoNome]]),
};

// Constrói uma TituloRow completa a partir do payload de inserção mais os campos
// que o banco preenche (id, created_by, timestamps) e a coluna JSONB `anexos`,
// que tituloToRow não serializa (a fonte oficial será a tabela `anexos`).
function makeRow(titulo: Titulo, createdAtISO: string): TituloRow {
  return {
    ...tituloToRow(titulo),
    id: titulo.id,
    anexos: titulo.anexos,
    created_by: null,
    created_at: createdAtISO,
    updated_at: createdAtISO,
  } as unknown as TituloRow;
}

describe("mapper titulo — rowToTitulo", () => {
  it("mapeia todos os campos de uma linha completa do banco (com lookup)", () => {
    const row = makeRow(tituloCompleto, "2026-05-01T10:00:00.000Z");
    expect(rowToTitulo(row, lookup)).toEqual(tituloCompleto);
  });

  it("resolve cedenteNome e sacadoNome via lookup", () => {
    const row = makeRow(tituloCompleto, "2026-05-01T10:00:00.000Z");
    const titulo = rowToTitulo(row, lookup);
    expect(titulo.cedenteNome).toBe("Comercial Vitória LTDA");
    expect(titulo.sacadoNome).toBe("Supermercado Atlas SA");
  });

  it("deixa os nomes vazios quando não há lookup", () => {
    const row = makeRow(tituloCompleto, "2026-05-01T10:00:00.000Z");
    const titulo = rowToTitulo(row);
    expect(titulo.cedenteNome).toBe("");
    expect(titulo.sacadoNome).toBe("");
    // Os ids continuam preservados mesmo sem resolução de nomes.
    expect(titulo.cedenteId).toBe(tituloCompleto.cedenteId);
    expect(titulo.sacadoId).toBe(tituloCompleto.sacadoId);
  });

  it("extrai criadoEm (YYYY-MM-DD) do created_at ISO", () => {
    const row = makeRow(tituloCompleto, "2026-05-22T18:45:30.000Z");
    expect(rowToTitulo(row, lookup).criadoEm).toBe("2026-05-22");
  });

  it("preserva os anexos JSONB (array de objetos)", () => {
    const row = makeRow(tituloCompleto, "2026-05-01T10:00:00.000Z");
    expect(rowToTitulo(row, lookup).anexos).toEqual(tituloCompleto.anexos);
  });

  it("aplica defaults quando campos opcionais vêm nulos do banco", () => {
    const row = {
      id: "66666666-6666-6666-6666-666666666666",
      numero: "TIT-MINIMO",
      tipo: null,
      cedente_id: "11111111-1111-1111-1111-111111111111",
      sacado_id: "33333333-3333-3333-3333-333333333333",
      data_emissao: "2026-05-01",
      data_vencimento: "2026-06-30",
      valor_face: null,
      numero_nota_fiscal: null,
      chave_nota_fiscal: null,
      descricao: null,
      status: null,
      observacoes: null,
      anexos: null,
      created_by: null,
      created_at: null,
      updated_at: null,
    } as unknown as TituloRow;
    const titulo = rowToTitulo(row);
    expect(titulo.tipo).toBe("Duplicata");
    expect(titulo.status).toBe("Disponível");
    expect(titulo.valorFace).toBe(0);
    expect(titulo.numeroNotaFiscal).toBe("");
    expect(titulo.chaveNotaFiscal).toBe("");
    expect(titulo.descricao).toBe("");
    expect(titulo.observacoes).toBe("");
    expect(titulo.anexos).toEqual([]);
    expect(titulo.criadoEm).toBe("");
  });
});

describe("mapper titulo — anexos JSONB", () => {
  it("ignora entradas inválidas no array de anexos (não-objetos)", () => {
    const row = {
      ...makeRow(tituloCompleto, "2026-05-01T10:00:00.000Z"),
      anexos: [
        {
          id: "AX-9",
          nome: "valido.pdf",
          tipo: "Comprovante",
          tamanhoKb: 10,
          enviadoEm: "2026-05-01",
        },
        null,
        "uma string",
        ["um", "array"],
        42,
      ],
    } as unknown as TituloRow;
    const anexos = rowToTitulo(row, lookup).anexos;
    expect(anexos).toHaveLength(1);
    expect(anexos[0].id).toBe("AX-9");
  });

  it("aplica fallbacks por campo em anexo incompleto", () => {
    const row = {
      ...makeRow(tituloCompleto, "2026-05-01T10:00:00.000Z"),
      anexos: [{}],
    } as unknown as TituloRow;
    expect(rowToTitulo(row, lookup).anexos[0]).toEqual({
      id: "ANX-0",
      nome: "",
      tipo: "Nota fiscal",
      tamanhoKb: 0,
      enviadoEm: "",
    });
  });
});

describe("mapper titulo — tituloToRow", () => {
  it("converte um Titulo completo para snake_case", () => {
    const row = tituloToRow(tituloCompleto);
    expect(row).toEqual({
      numero: "DUP-2025-0042",
      tipo: "Duplicata",
      cedente_id: "11111111-1111-1111-1111-111111111111",
      sacado_id: "33333333-3333-3333-3333-333333333333",
      data_emissao: "2026-05-01",
      data_vencimento: "2026-06-30",
      valor_face: 18420.55,
      numero_nota_fiscal: "000.123.456",
      chave_nota_fiscal: "35260312345678000190550010001234561234567890",
      descricao: "Venda de mercadorias — pedido 4521",
      status: "Disponível",
      observacoes: "Título recém-cadastrado, aguardando análise.",
    });
  });

  it("não inclui id, anexos, nomes resolvidos nem campos derivados", () => {
    const row = tituloToRow(tituloCompleto) as Record<string, unknown>;
    expect(row).not.toHaveProperty("id");
    expect(row).not.toHaveProperty("created_at");
    expect(row).not.toHaveProperty("created_by");
    expect(row).not.toHaveProperty("anexos");
    expect(row).not.toHaveProperty("cedenteNome");
    expect(row).not.toHaveProperty("sacadoNome");
    expect(row).not.toHaveProperty("criadoEm");
  });

  it("aplica defaults para um Partial vazio", () => {
    const row = tituloToRow({});
    expect(row.numero).toBe("");
    expect(row.tipo).toBe("Duplicata");
    expect(row.cedente_id).toBe("");
    expect(row.sacado_id).toBe("");
    expect(row.valor_face).toBe(0);
    expect(row.status).toBe("Disponível");
    // Datas ausentes caem para a data de hoje (formato YYYY-MM-DD).
    expect(row.data_emissao).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(row.data_vencimento).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("mapper titulo — ida e volta", () => {
  it("preserva os campos no ciclo tituloToRow -> rowToTitulo (com lookup)", () => {
    const row = makeRow(tituloCompleto, "2026-05-01T00:00:00.000Z");
    expect(rowToTitulo(row, lookup)).toEqual(tituloCompleto);
  });
});
