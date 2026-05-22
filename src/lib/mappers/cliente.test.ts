/**
 * Testes do mapper de clientes (sub-tarefa 2.1).
 *
 * O mapper é a peça crítica da migração Mock -> Supabase: garante que o shape
 * consumido pela UI (camelCase, igual ao mock) permaneça idêntico ao ler/gravar
 * no banco (snake_case). Cobre ida e volta, defaults e os agregados zerados.
 */
import { describe, it, expect } from "vitest";
import { rowToCliente, clienteToRow } from "@/lib/mappers/cliente";
import type { Cliente } from "@/data/mockClientes";
import type { Database } from "@/integrations/supabase/types";

type ClienteRow = Database["public"]["Tables"]["clientes"]["Row"];

// Cliente completo de referência. Agregados já zerados: o mapper sempre zera
// totalEmAberto/totalVencido/qtdTitulos no modo Supabase (serão derivados de
// `titulos` em etapa posterior).
const clienteCompleto: Cliente = {
  id: "11111111-1111-1111-1111-111111111111",
  razaoSocial: "Comercial Vitória LTDA",
  nomeFantasia: "Vitória Distribuidora",
  cnpj: "12.345.678/0001-90",
  inscricaoEstadual: "123.456.789.112",
  inscricaoMunicipal: "98765432",
  emailPrincipal: "financeiro@vitoria.com.br",
  telefone: "(11) 3322-1100",
  whatsapp: "(11) 99876-5432",
  cep: "01310-100",
  endereco: "Av. Paulista",
  numero: "1000",
  complemento: "Sala 1201",
  bairro: "Bela Vista",
  cidade: "São Paulo",
  estado: "SP",
  responsavelLegal: "Mariana Souza",
  cpfResponsavel: "123.456.789-00",
  emailResponsavel: "mariana@vitoria.com.br",
  telefoneResponsavel: "(11) 98888-7777",
  banco: "Itaú (341)",
  agencia: "1234",
  conta: "56789-0",
  chavePix: "12.345.678/0001-90",
  status: "Ativo",
  limiteOperacional: 500000,
  observacoes: "Cliente histórico, opera mensalmente.",
  totalEmAberto: 0,
  totalVencido: 0,
  qtdTitulos: 0,
  criadoEm: "2024-03-12",
};

// Constrói uma ClienteRow completa a partir do payload de inserção mais os
// campos que o banco preenche (id, created_by, timestamps).
function makeRow(cliente: Cliente, createdAtISO: string): ClienteRow {
  return {
    ...clienteToRow(cliente),
    id: cliente.id,
    created_by: null,
    created_at: createdAtISO,
    updated_at: createdAtISO,
  } as ClienteRow;
}

describe("mapper cliente — rowToCliente", () => {
  it("mapeia todos os campos de uma linha completa do banco", () => {
    const row = makeRow(clienteCompleto, "2024-03-12T10:00:00.000Z");
    expect(rowToCliente(row)).toEqual(clienteCompleto);
  });

  it("zera os agregados (derivados de titulos em etapa posterior)", () => {
    const row = makeRow(clienteCompleto, "2024-03-12T10:00:00.000Z");
    const cliente = rowToCliente(row);
    expect(cliente.totalEmAberto).toBe(0);
    expect(cliente.totalVencido).toBe(0);
    expect(cliente.qtdTitulos).toBe(0);
  });

  it("extrai criadoEm (YYYY-MM-DD) do created_at ISO", () => {
    const row = makeRow(clienteCompleto, "2026-05-22T18:45:30.000Z");
    expect(rowToCliente(row).criadoEm).toBe("2026-05-22");
  });

  it("aplica defaults quando campos vêm nulos do banco", () => {
    const row = {
      id: "22222222-2222-2222-2222-222222222222",
      razao_social: "Empresa Mínima LTDA",
      cnpj: "99.999.999/0001-99",
      nome_fantasia: null,
      inscricao_estadual: null,
      inscricao_municipal: null,
      email_principal: null,
      telefone: null,
      whatsapp: null,
      cep: null,
      endereco: null,
      numero: null,
      complemento: null,
      bairro: null,
      cidade: null,
      estado: null,
      responsavel_legal: null,
      cpf_responsavel: null,
      email_responsavel: null,
      telefone_responsavel: null,
      banco: null,
      agencia: null,
      conta: null,
      chave_pix: null,
      status: null,
      limite_operacional: null,
      observacoes: null,
      created_by: null,
      created_at: null,
      updated_at: null,
    } as unknown as ClienteRow;
    const cliente = rowToCliente(row);
    expect(cliente.nomeFantasia).toBe("");
    expect(cliente.observacoes).toBe("");
    expect(cliente.limiteOperacional).toBe(0);
    expect(cliente.status).toBe("Em análise");
    expect(cliente.criadoEm).toBe("");
  });
});

describe("mapper cliente — clienteToRow", () => {
  it("converte um Cliente completo para snake_case", () => {
    const row = clienteToRow(clienteCompleto);
    expect(row).toEqual({
      razao_social: "Comercial Vitória LTDA",
      nome_fantasia: "Vitória Distribuidora",
      cnpj: "12.345.678/0001-90",
      inscricao_estadual: "123.456.789.112",
      inscricao_municipal: "98765432",
      email_principal: "financeiro@vitoria.com.br",
      telefone: "(11) 3322-1100",
      whatsapp: "(11) 99876-5432",
      cep: "01310-100",
      endereco: "Av. Paulista",
      numero: "1000",
      complemento: "Sala 1201",
      bairro: "Bela Vista",
      cidade: "São Paulo",
      estado: "SP",
      responsavel_legal: "Mariana Souza",
      cpf_responsavel: "123.456.789-00",
      email_responsavel: "mariana@vitoria.com.br",
      telefone_responsavel: "(11) 98888-7777",
      banco: "Itaú (341)",
      agencia: "1234",
      conta: "56789-0",
      chave_pix: "12.345.678/0001-90",
      status: "Ativo",
      limite_operacional: 500000,
      observacoes: "Cliente histórico, opera mensalmente.",
    });
  });

  it("não inclui id, agregados nem campos derivados", () => {
    const row = clienteToRow(clienteCompleto) as Record<string, unknown>;
    expect(row).not.toHaveProperty("id");
    expect(row).not.toHaveProperty("created_at");
    expect(row).not.toHaveProperty("created_by");
    expect(row).not.toHaveProperty("totalEmAberto");
    expect(row).not.toHaveProperty("criadoEm");
  });

  it("aplica defaults para um Partial vazio", () => {
    const row = clienteToRow({});
    expect(row.razao_social).toBe("");
    expect(row.cnpj).toBe("");
    expect(row.limite_operacional).toBe(0);
    expect(row.status).toBe("Em análise");
  });
});

describe("mapper cliente — ida e volta", () => {
  it("preserva os 24 campos cadastrais no ciclo clienteToRow -> rowToCliente", () => {
    const row = makeRow(clienteCompleto, "2024-03-12T00:00:00.000Z");
    expect(rowToCliente(row)).toEqual(clienteCompleto);
  });
});
