/**
 * Testes do mapper de sacados (sub-tarefa 2.2).
 *
 * O mapper é a peça crítica da migração Mock -> Supabase: garante que o shape
 * consumido pela UI (camelCase, igual ao mock) permaneça idêntico ao ler/gravar
 * no banco (snake_case). Cobre ida e volta, defaults e os agregados zerados.
 */
import { describe, it, expect } from "vitest";
import { rowToSacado, sacadoToRow } from "@/lib/mappers/sacado";
import type { Sacado } from "@/data/mockSacados";
import type { Database } from "@/integrations/supabase/types";

type SacadoRow = Database["public"]["Tables"]["sacados"]["Row"];

// Sacado completo de referência. Agregados já zerados: o mapper sempre zera
// totalEmAberto/totalVencido/titulosPagos/titulosEmAtraso no modo Supabase
// (serão derivados de `titulos` em etapa posterior).
const sacadoCompleto: Sacado = {
  id: "33333333-3333-3333-3333-333333333333",
  tipo: "PJ",
  nome: "Comercial São Jorge LTDA",
  nomeFantasia: "São Jorge Atacado",
  documento: "98.765.432/0001-10",
  email: "financeiro@saojorge.com.br",
  telefone: "(11) 3344-5566",
  whatsapp: "(11) 99123-4567",
  cep: "03310-000",
  endereco: "Av. Celso Garcia",
  numero: "2500",
  complemento: "Galpão 3",
  bairro: "Tatuapé",
  cidade: "São Paulo",
  estado: "SP",
  pessoaContato: "Antônio Ferreira",
  cargoContato: "Gerente de Contas",
  limiteConcentracao: 750000,
  scoreInterno: 780,
  status: "Ativo",
  observacoes: "Sacado recorrente, paga em dia.",
  totalEmAberto: 0,
  totalVencido: 0,
  titulosPagos: 0,
  titulosEmAtraso: 0,
  criadoEm: "2025-01-15",
};

// Constrói uma SacadoRow completa a partir do payload de inserção mais os
// campos que o banco preenche (id, created_by, timestamps).
function makeRow(sacado: Sacado, createdAtISO: string): SacadoRow {
  return {
    ...sacadoToRow(sacado),
    id: sacado.id,
    created_by: null,
    created_at: createdAtISO,
    updated_at: createdAtISO,
  } as SacadoRow;
}

describe("mapper sacado — rowToSacado", () => {
  it("mapeia todos os campos de uma linha completa do banco", () => {
    const row = makeRow(sacadoCompleto, "2025-01-15T10:00:00.000Z");
    expect(rowToSacado(row)).toEqual(sacadoCompleto);
  });

  it("zera os agregados (derivados de titulos em etapa posterior)", () => {
    const row = makeRow(sacadoCompleto, "2025-01-15T10:00:00.000Z");
    const sacado = rowToSacado(row);
    expect(sacado.totalEmAberto).toBe(0);
    expect(sacado.totalVencido).toBe(0);
    expect(sacado.titulosPagos).toBe(0);
    expect(sacado.titulosEmAtraso).toBe(0);
  });

  it("extrai criadoEm (YYYY-MM-DD) do created_at ISO", () => {
    const row = makeRow(sacadoCompleto, "2026-05-22T18:45:30.000Z");
    expect(rowToSacado(row).criadoEm).toBe("2026-05-22");
  });

  it("aplica defaults quando campos vêm nulos do banco", () => {
    const row = {
      id: "44444444-4444-4444-4444-444444444444",
      tipo: null,
      nome: "Sacado Mínimo LTDA",
      nome_fantasia: null,
      documento: "00.000.000/0001-00",
      email: null,
      telefone: null,
      whatsapp: null,
      cep: null,
      endereco: null,
      numero: null,
      complemento: null,
      bairro: null,
      cidade: null,
      estado: null,
      pessoa_contato: null,
      cargo_contato: null,
      limite_concentracao: null,
      score_interno: null,
      status: null,
      observacoes: null,
      created_by: null,
      created_at: null,
      updated_at: null,
    } as unknown as SacadoRow;
    const sacado = rowToSacado(row);
    expect(sacado.tipo).toBe("PJ");
    expect(sacado.nomeFantasia).toBe("");
    expect(sacado.observacoes).toBe("");
    expect(sacado.limiteConcentracao).toBe(0);
    expect(sacado.scoreInterno).toBe(0);
    expect(sacado.status).toBe("Em análise");
    expect(sacado.criadoEm).toBe("");
  });
});

describe("mapper sacado — sacadoToRow", () => {
  it("converte um Sacado completo para snake_case", () => {
    const row = sacadoToRow(sacadoCompleto);
    expect(row).toEqual({
      tipo: "PJ",
      nome: "Comercial São Jorge LTDA",
      nome_fantasia: "São Jorge Atacado",
      documento: "98.765.432/0001-10",
      email: "financeiro@saojorge.com.br",
      telefone: "(11) 3344-5566",
      whatsapp: "(11) 99123-4567",
      cep: "03310-000",
      endereco: "Av. Celso Garcia",
      numero: "2500",
      complemento: "Galpão 3",
      bairro: "Tatuapé",
      cidade: "São Paulo",
      estado: "SP",
      pessoa_contato: "Antônio Ferreira",
      cargo_contato: "Gerente de Contas",
      limite_concentracao: 750000,
      score_interno: 780,
      status: "Ativo",
      observacoes: "Sacado recorrente, paga em dia.",
    });
  });

  it("não inclui id, agregados nem campos derivados", () => {
    const row = sacadoToRow(sacadoCompleto) as Record<string, unknown>;
    expect(row).not.toHaveProperty("id");
    expect(row).not.toHaveProperty("created_at");
    expect(row).not.toHaveProperty("created_by");
    expect(row).not.toHaveProperty("totalEmAberto");
    expect(row).not.toHaveProperty("criadoEm");
  });

  it("aplica defaults para um Partial vazio", () => {
    const row = sacadoToRow({});
    expect(row.tipo).toBe("PJ");
    expect(row.nome).toBe("");
    expect(row.documento).toBe("");
    expect(row.limite_concentracao).toBe(0);
    expect(row.score_interno).toBe(0);
    expect(row.status).toBe("Em análise");
  });
});

describe("mapper sacado — ida e volta", () => {
  it("preserva os 20 campos cadastrais no ciclo sacadoToRow -> rowToSacado", () => {
    const row = makeRow(sacadoCompleto, "2025-01-15T00:00:00.000Z");
    expect(rowToSacado(row)).toEqual(sacadoCompleto);
  });
});
