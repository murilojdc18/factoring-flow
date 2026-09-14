// @vitest-environment node
import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import fixtures from "@/test/fixtures/simulador-paridade.json";
import type { Operacao } from "@/data/mockOperacoes";
import type { Cliente } from "@/data/mockClientes";
import type { Sacado } from "@/data/mockSacados";
import type { Titulo } from "@/data/mockTitulos";
import type { DadosEmpresa } from "@/hooks/useDadosEmpresa";
import {
  dataPorExtenso,
  montarDadosDocumentoOficial,
  textoDocumentoOficial,
  TIPO_CARTA_CESSAO,
  TIPO_TERMO_ADITIVO,
} from "@/lib/documentosOficiais/dados";
import { jsPDF } from "jspdf";
import {
  gerarPdfCartaCessao,
  gerarPdfTermoAditivo,
  larguraTexto,
} from "@/lib/documentosOficiais/pdf";

/**
 * Operação 49-26 real (valores e vencimentos do termo aditivo), com cedente,
 * sacados e empresa FICTÍCIOS. Com PDF_OUT=<pasta> o teste grava os PDFs para
 * conferência visual contra os documentos reais.
 */
const caso = fixtures.casos.find((c) => c.nome.startsWith("documento-real-49-26"))!;

const sacados: Sacado[] = ["ALFA SISTEMAS LTDA", "BETA INDUSTRIA E COMERCIO LTDA", "GAMA SERVICOS LTDA"].map(
  (nome, i) => ({ id: `s${i}`, nome, documento: `0${i}.000.000/0001-0${i}` }) as Sacado,
);

const titulos: Titulo[] = caso.titulos.map(
  (t, i) =>
    ({
      id: `t${i}`,
      numero: t.numero,
      sacadoId: `s${i % 3}`,
      sacadoNome: "",
      dataVencimento: t.data_vencimento,
      valorFace: t.valor_face,
    }) as Titulo,
);

const operacao: Operacao = {
  id: "op-1",
  numero: "49-26",
  cedenteId: "c1",
  cedenteNome: "CEDENTE TESTE IND E COM LTDA",
  dataOperacao: caso.data_referencia,
  status: "Em análise",
  titulosIds: titulos.map((t) => t.id),
  quantidadeTitulos: 23,
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
  razaoSocial: "CEDENTE TESTE IND E COM LTDA",
  cnpj: "00.000.000/0001-00",
  endereco: "Rua das Flores",
  numero: "05",
  complemento: "",
  bairro: "Centro",
  cidade: "Santana de Parnaíba",
  estado: "SP",
  cep: "06500-000",
  responsavelLegal: "Fulano de Tal",
  cpfResponsavel: "000.000.000-00",
} as Cliente;

const empresa: DadosEmpresa = {
  razaoSocial: "EMPRESA FOMENTO TESTE LTDA",
  cnpj: "11.111.111/0001-11",
  endereco: "Calçada das Margaridas, 100, Sala 02 – Centro – Barueri – SP – CEP: 06.000-000",
  cidade: "São Paulo",
};

const dados = montarDadosDocumentoOficial(operacao, cedente, titulos, sacados, empresa);

describe("documentos oficiais — dados (operação 49-26)", () => {
  it("primeira linha idêntica ao termo aditivo real", () => {
    expect(dados.linhas[0]).toEqual({
      valor: "11.260,00",
      vencimento: "28/08/2026",
      numeroDocumento: "D-01",
      dias: "23",
      percentual: "3.067%",
      juros: "345,34",
      liquido: "10.914,66",
      sacado: "ALFA SISTEMAS LTDA - 00.000.000/0001-00",
    });
  });

  it("23 linhas, última com 92 dias a 12.267% (juros 85,01)", () => {
    expect(dados.linhas).toHaveLength(23);
    const ultima = dados.linhas[22];
    expect([ultima.dias, ultima.percentual, ultima.juros, ultima.liquido]).toEqual([
      "92",
      "12.267%",
      "85,01",
      "607,99",
    ]);
  });

  it("demonstrativo igual ao documento real e sem pendências", () => {
    expect(dados.demonstrativo.valorFace).toBe("R$. 89.439,55");
    expect(dados.demonstrativo.rotuloDiferencialCompra).toBe("Diferencial de Compra (4% a.m.)");
    expect(dados.demonstrativo.diferencialCompra).toBe("R$. 4.322,35");
    expect(dados.demonstrativo.outrasTarifas).toBe("R$. 250,00");
    expect(dados.demonstrativo.totalPago).toBe("R$ 84.867,20");
    expect(dados.localData).toBe("São Paulo, 05 de agosto de 2026");
    expect(dados.pendencias).toEqual([]);
  });

  it("endereço do cedente no formato da carta", () => {
    expect(dados.cedente.endereco).toBe(
      "Rua das Flores, 05 – Centro – Santana de Parnaíba – SP – CEP: 06500-000",
    );
  });

  it("aponta divergência entre juros por título e deságio gravado", () => {
    const d = montarDadosDocumentoOficial(
      { ...operacao, valorDesagio: 4322.36 },
      cedente,
      titulos,
      sacados,
      empresa,
    );
    expect(d.pendencias.some((p) => p.includes("difere do deságio gravado"))).toBe(true);
  });

  it("aponta responsável solidário ausente", () => {
    const d = montarDadosDocumentoOficial(
      operacao,
      { ...cedente, responsavelLegal: "", cpfResponsavel: "" } as Cliente,
      titulos,
      sacados,
      empresa,
    );
    expect(d.responsavelSolidario).toBeNull();
    expect(d.pendencias).toContain(
      "Responsável legal do cedente não cadastrado (responsável solidário).",
    );
  });

  it("data por extenso em português", () => {
    expect(dataPorExtenso("2026-08-20")).toBe("20 de agosto de 2026");
  });

  it("texto da carta usa a frase corrigida (credor dos sacados)", () => {
    const texto = textoDocumentoOficial(TIPO_CARTA_CESSAO, dados);
    expect(texto).toContain("O CEDENTE é credor do(s) sacado(s) relacionado(s) abaixo");
    expect(texto).not.toContain(`credor da empresa ${cedente.razaoSocial}`);
  });
});

describe("documentos oficiais — PDF", () => {
  it("mede palavras sem kerning (evita 'CONTRATANTEe' grudado nos parágrafos)", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    // Com kerning o jsPDF subestima "CONTRATANTE" em ~0,8 mm (quase um espaço).
    expect(larguraTexto(doc, "CONTRATANTE") - doc.getTextWidth("CONTRATANTE")).toBeGreaterThan(0.5);
    // Palavra sem pares de kerning: as duas medidas coincidem.
    expect(larguraTexto(doc, "MERCANTIL")).toBeCloseTo(doc.getTextWidth("MERCANTIL"), 6);
  });

  it("gera termo aditivo e carta de cessão com várias páginas", () => {
    const termo = gerarPdfTermoAditivo(dados);
    const carta = gerarPdfCartaCessao(dados);
    expect(termo.getNumberOfPages()).toBeGreaterThanOrEqual(2);
    expect(carta.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(textoDocumentoOficial(TIPO_TERMO_ADITIVO, dados)).toContain(
      "Termo Aditivo do Contrato de Fomento Mercantil - Nº 49-26",
    );

    const destino = process.env.PDF_OUT;
    if (destino) {
      mkdirSync(destino, { recursive: true });
      writeFileSync(join(destino, "termo_aditivo_teste.pdf"), Buffer.from(termo.output("arraybuffer")));
      writeFileSync(join(destino, "carta_cessao_teste.pdf"), Buffer.from(carta.output("arraybuffer")));
    }
  });
});
