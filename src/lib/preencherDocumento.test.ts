import { describe, expect, it } from "vitest";
import { montarPlaceholders, preencherTexto } from "@/lib/preencherDocumento";
import type { Operacao } from "@/data/mockOperacoes";
import type { Cliente } from "@/data/mockClientes";
import type { DadosEmpresa } from "@/hooks/useDadosEmpresa";

const operacao: Operacao = {
  id: "7f1c0d9e-0000-4000-8000-000000000001",
  numero: "49-26",
  cedenteId: "c1",
  cedenteNome: "Cedente Teste LTDA",
  dataOperacao: "2026-08-05",
  status: "Em análise",
  titulosIds: [],
  quantidadeTitulos: 0,
  valorBruto: 89439.55,
  valorDesagio: 4322.35,
  valorTarifas: 250,
  valorRetencao: 0,
  valorLiquido: 84867.2,
  prazoMedio: 36,
  taxaAplicada: 4,
  responsavelInterno: "Responsável",
  observacoes: "",
  historico: [],
};

const cedente = {
  id: "c1",
  razaoSocial: "Cedente Teste LTDA",
  cnpj: "00.000.000/0001-00",
  endereco: "Rua A",
  numero: "5",
  complemento: "",
  bairro: "Centro",
  cidade: "Santana de Parnaíba",
  estado: "SP",
  cep: "06500-000",
  responsavelLegal: "Fulano de Tal",
  cpfResponsavel: "000.000.000-00",
} as Cliente;

const empresa: DadosEmpresa = {
  razaoSocial: "Empresa Factoring LTDA",
  cnpj: "11.111.111/0001-11",
  endereco: "Av. B, 100",
  cidade: "São Paulo",
};

describe("montarPlaceholders", () => {
  it("operacao_numero é o número da operação, não o id interno (UUID)", () => {
    const v = montarPlaceholders(operacao, cedente, [], [], empresa);
    expect(v.operacao_numero).toBe("49-26");
    expect(v.bordero_numero).toBe("49-26");
  });

  it("data de assinatura é a data da operação, não a data de geração", () => {
    const v = montarPlaceholders(operacao, cedente, [], [], empresa);
    expect(v.data_assinatura).toBe("05/08/2026");
  });

  it("cidade de assinatura é a da empresa, mesmo com cedente em outra cidade", () => {
    const v = montarPlaceholders(operacao, cedente, [], [], empresa);
    expect(v.cidade_assinatura).toBe("São Paulo");
  });

  it("contrato master sem cadastro fica pendente (sem número fictício)", () => {
    const v = montarPlaceholders(operacao, cedente, [], [], empresa);
    expect(v.contrato_master_numero).toBeUndefined();
    expect(preencherTexto("Contrato {{contrato_master_numero}}", v)).toBe(
      "Contrato [pendente:contrato_master_numero]",
    );
  });
});
