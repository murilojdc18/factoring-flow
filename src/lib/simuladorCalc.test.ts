/**
 * Testes da lógica de cálculo do simulador (sub-tarefa 1.7b).
 *
 * Cobre as Regras A, B, C, D, F e as fragilidades técnicas (saneamento
 * NaN/negativo e arredondamento) implementadas na 1.7a. Referência canônica
 * do comportamento esperado: docs/simulador-decisoes-consolidado.md.
 *
 * NOTA: não há arquivo de teste dedicado para `dateUtils.ts`. O clone do
 * objeto `Date` adicionado em `daysUntil` (para não mutar o argumento do
 * chamador no `setHours`) é testado INDIRETAMENTE aqui, pelo teste
 * "não muta o objeto Date passado como dataReferencia" do grupo Regra F.
 *
 * Todos os testes congelam a data atual com vi.useFakeTimers() +
 * vi.setSystemTime(HOJE_FIXO). Sem isso, `new Date()` (default de
 * dataReferencia) e `daysUntil` mudariam o resultado conforme o relógio.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  calcularSimulacao,
  PARAMETROS_DEFAULT,
  type SimuladorParametros,
} from "@/lib/simuladorCalc";
import { dateToISO } from "@/lib/dateUtils";
import type { Titulo } from "@/data/mockTitulos";

// "Hoje" fixo: 15/06/2026 12:00 (construtor numérico = horário local,
// evita o shift de timezone que new Date("2026-06-15") (UTC) teria;
// meio-dia evita bordas de meia-noite; Brasil não tem horário de verão).
const HOJE_FIXO = new Date(2026, 5, 15, 12, 0, 0);

// ISO (yyyy-mm-dd) de HOJE_FIXO deslocado em N dias (N negativo = passado).
// Com dataReferencia default (= HOJE_FIXO congelado), daysUntil de
// isoEmDias(n) resulta exatamente em n.
const isoEmDias = (n: number): string => dateToISO(new Date(2026, 5, 15 + n));

// Fábrica de Titulo mínimo válido. Só dataVencimento, valorFace e numero
// importam para o cálculo; o resto é preenchido com valores neutros.
// NÃO usamos mockTitulos: as datas dele são geradas no import, relativas
// ao relógio real (não congeláveis com fake timers).
const makeTitulo = (
  over: Partial<Titulo> & Pick<Titulo, "numero">,
): Titulo => ({
  id: over.numero,
  tipo: "Duplicata",
  cedenteId: "CLI-0001",
  cedenteNome: "Cedente Teste",
  sacadoId: "SAC-0001",
  sacadoNome: "Sacado Teste",
  dataEmissao: isoEmDias(-30),
  dataVencimento: isoEmDias(30),
  valorFace: 10000,
  numeroNotaFiscal: "",
  chaveNotaFiscal: "",
  descricao: "",
  status: "Disponível",
  observacoes: "",
  anexos: [],
  criadoEm: isoEmDias(-30),
  ...over,
});

// Verdadeiro se n tem no máximo 2 casas decimais (sem artefato de
// ponto flutuante além do centavo).
const temNoMax2Casas = (n: number): boolean =>
  Math.abs(n * 100 - Math.round(n * 100)) < 1e-9;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(HOJE_FIXO); // congela new Date() e o default de dataReferencia
});

afterEach(() => {
  vi.useRealTimers();
});

// ───────────────────────────────────────────────────────────────
describe("calcularSimulacao — caso normal", () => {
  it("calcula todos os campos para 2 títulos válidos com parâmetros default", () => {
    const titulos = [
      makeTitulo({ numero: "T-1", valorFace: 10000, dataVencimento: isoEmDias(10) }),
      makeTitulo({ numero: "T-2", valorFace: 20000, dataVencimento: isoEmDias(40) }),
    ];

    const r = calcularSimulacao(titulos, PARAMETROS_DEFAULT);

    // bruto 30000 | prazo (10·10000 + 40·20000)/30000 = 30
    // taxaDia 3.5/30 | deságio 30000·(taxaDia/100)·30 = 1050
    // tarifas 150 + 25·2 = 200 | retenção 30000·5% = 1500
    // líquido 30000 − 1050 − 200 − 1500 = 27250
    expect(r.quantidadeTitulos).toBe(2);
    expect(r.valorBruto).toBe(30000);
    expect(r.prazoMedioPonderado).toBe(30);
    expect(r.taxaDiariaEquivalente).toBeCloseTo(3.5 / 30, 10);
    expect(r.valorDesagio).toBe(1050);
    expect(r.valorTarifas).toBe(200);
    expect(r.valorRetencao).toBe(1500);
    expect(r.valorLiquido).toBe(27250);
    expect(r.liquidoInvalido).toBe(false);
    expect(r.titulosVencidosIgnorados).toEqual([]);
  });
});

// ───────────────────────────────────────────────────────────────
describe("calcularSimulacao — Regra A: lista vazia", () => {
  it("zera quantidade, prazo e todos os campos monetários", () => {
    const r = calcularSimulacao([], PARAMETROS_DEFAULT);

    expect(r.quantidadeTitulos).toBe(0);
    expect(r.valorBruto).toBe(0);
    expect(r.prazoMedioPonderado).toBe(0);
    expect(r.valorDesagio).toBe(0);
    expect(r.valorTarifas).toBe(0);
    expect(r.valorRetencao).toBe(0);
    expect(r.valorLiquido).toBe(0);
  });

  it("mantém taxaDiariaEquivalente refletindo o parâmetro saneado (não zera)", () => {
    const r = calcularSimulacao([], PARAMETROS_DEFAULT);

    expect(r.taxaDiariaEquivalente).toBeCloseTo(3.5 / 30, 10);
    expect(r.taxaDiariaEquivalente).not.toBe(0);
  });

  it("liquidoInvalido é false e titulosVencidosIgnorados é []", () => {
    const r = calcularSimulacao([], PARAMETROS_DEFAULT);

    expect(r.liquidoInvalido).toBe(false);
    expect(r.titulosVencidosIgnorados).toEqual([]);
  });
});

// ───────────────────────────────────────────────────────────────
describe("calcularSimulacao — Regra B: vencidos + ordem com A", () => {
  it("todos vencidos: idêntico à lista vazia, mas titulosVencidosIgnorados traz os números", () => {
    const titulos = [
      makeTitulo({ numero: "V-1", dataVencimento: isoEmDias(-1) }),
      makeTitulo({ numero: "V-2", dataVencimento: isoEmDias(-5) }),
      makeTitulo({ numero: "V-3", dataVencimento: isoEmDias(-10) }),
    ];

    const r = calcularSimulacao(titulos, PARAMETROS_DEFAULT);

    expect(r.quantidadeTitulos).toBe(0);
    expect(r.valorBruto).toBe(0);
    expect(r.prazoMedioPonderado).toBe(0);
    expect(r.valorDesagio).toBe(0);
    expect(r.valorTarifas).toBe(0);
    expect(r.valorRetencao).toBe(0);
    expect(r.valorLiquido).toBe(0);
    expect(r.liquidoInvalido).toBe(false);
    // taxaDiariaEquivalente continua refletindo o parâmetro (Regra A.1)
    expect(r.taxaDiariaEquivalente).toBeCloseTo(3.5 / 30, 10);
    expect(r.titulosVencidosIgnorados).toEqual(["V-1", "V-2", "V-3"]);
  });

  it("mistura vencidos + válidos: calcula só sobre os válidos e lista os ignorados", () => {
    const titulos = [
      makeTitulo({ numero: "V-1", valorFace: 5000, dataVencimento: isoEmDias(-3) }),
      makeTitulo({ numero: "OK-1", valorFace: 10000, dataVencimento: isoEmDias(20) }),
      makeTitulo({ numero: "V-2", valorFace: 9999, dataVencimento: isoEmDias(-1) }),
      makeTitulo({ numero: "OK-2", valorFace: 30000, dataVencimento: isoEmDias(60) }),
    ];

    const r = calcularSimulacao(titulos, PARAMETROS_DEFAULT);

    // só OK-1 (20d, 10000) e OK-2 (60d, 30000) entram
    // bruto 40000 | prazo (20·10000 + 60·30000)/40000 = 50
    // deságio 40000·((3.5/30)/100)·50 = 2333.33
    // tarifas 150 + 25·2 = 200 | retenção 40000·5% = 2000
    // líquido 40000 − 2333.33… − 200 − 2000 = 35466.67
    expect(r.quantidadeTitulos).toBe(2);
    expect(r.valorBruto).toBe(40000);
    expect(r.prazoMedioPonderado).toBe(50);
    expect(r.valorDesagio).toBe(2333.33);
    expect(r.valorRetencao).toBe(2000);
    expect(r.valorLiquido).toBe(35466.67);
    expect(r.liquidoInvalido).toBe(false);
    expect(r.titulosVencidosIgnorados).toEqual(["V-1", "V-2"]);
  });
});

// ───────────────────────────────────────────────────────────────
describe("calcularSimulacao — Regra C: piso de 1 dia", () => {
  it("título vencendo hoje (daysUntil=0): deságio usa piso de 1 dia, não zero", () => {
    const titulos = [
      makeTitulo({ numero: "H-1", valorFace: 10000, dataVencimento: isoEmDias(0) }),
    ];

    const r = calcularSimulacao(titulos, PARAMETROS_DEFAULT);

    // prazo real = 0, mas deságio usa max(1, 0) = 1 dia:
    // 10000 · ((3.5/30)/100) · 1 = 11.666… → arredonda para 11.67.
    // Se usasse o prazo real (0), o deságio seria 0.
    expect(r.valorDesagio).toBe(11.67);
    expect(r.valorDesagio).toBeGreaterThan(0);
  });

  it("prazoMedioPonderado retornado é o valor real (0), não o piso", () => {
    const titulos = [
      makeTitulo({ numero: "H-1", valorFace: 10000, dataVencimento: isoEmDias(0) }),
    ];

    const r = calcularSimulacao(titulos, PARAMETROS_DEFAULT);

    expect(r.prazoMedioPonderado).toBe(0);
  });
});

// ───────────────────────────────────────────────────────────────
describe("calcularSimulacao — Regra D: liquidoInvalido", () => {
  it("taxa absurdamente alta torna o líquido negativo → liquidoInvalido true", () => {
    const titulos = [
      makeTitulo({ numero: "D-1", valorFace: 10000, dataVencimento: isoEmDias(30) }),
    ];
    const params: SimuladorParametros = {
      taxaFatorMensal: 100000, // 100.000% a.m. — estoura o bruto
      tarifaFixa: 150,
      tarifaPorTitulo: 25,
      percentualRetencao: 5,
    };

    const r = calcularSimulacao(titulos, params);

    expect(r.valorLiquido).toBeLessThan(0);
    expect(r.liquidoInvalido).toBe(true);
  });

  it("líquido que arredonda para 0,00 (≈ -0,004) → liquidoInvalido false", () => {
    // bruto 0,996 e tarifa fixa 1, sem deságio nem retenção:
    // líquido cru = 0.996 − 1 ≈ -0.004 → round2 → -0 → não é inválido.
    const titulos = [
      makeTitulo({ numero: "B-1", valorFace: 0.996, dataVencimento: isoEmDias(30) }),
    ];
    const params: SimuladorParametros = {
      taxaFatorMensal: 0,
      tarifaFixa: 1,
      tarifaPorTitulo: 0,
      percentualRetencao: 0,
    };

    const r = calcularSimulacao(titulos, params);

    expect(r.liquidoInvalido).toBe(false);
    // round2(-0.004) produz -0. vitest `toBe` usa Object.is, e
    // Object.is(-0, 0) é false — por isso aceitamos 0 OU -0.
    expect(Object.is(r.valorLiquido, 0) || Object.is(r.valorLiquido, -0)).toBe(
      true,
    );
  });
});

// ───────────────────────────────────────────────────────────────
describe("calcularSimulacao — Regra F: dataReferencia", () => {
  it("dataReferencia diferente de hoje altera o prazo calculado", () => {
    const titulos = [
      makeTitulo({ numero: "F-1", valorFace: 10000, dataVencimento: isoEmDias(30) }),
    ];

    // default = HOJE_FIXO (15/06) → vencimento 15/07 = 30 dias
    const rDefault = calcularSimulacao(titulos, PARAMETROS_DEFAULT);
    // ref = 25/06 → vencimento 15/07 = 20 dias
    const rOutraData = calcularSimulacao(
      titulos,
      PARAMETROS_DEFAULT,
      new Date(2026, 5, 25),
    );

    expect(rDefault.prazoMedioPonderado).toBe(30);
    expect(rOutraData.prazoMedioPonderado).toBe(20);
    expect(rOutraData.prazoMedioPonderado).not.toBe(
      rDefault.prazoMedioPonderado,
    );
  });

  it("não muta o objeto Date passado como dataReferencia", () => {
    const titulos = [
      makeTitulo({ numero: "F-2", valorFace: 10000, dataVencimento: isoEmDias(30) }),
    ];
    const ref = new Date(2026, 5, 25, 8, 30, 15);
    const tempoAntes = ref.getTime();

    calcularSimulacao(titulos, PARAMETROS_DEFAULT, ref);

    // daysUntil clona o Date antes do setHours(0,0,0,0); o objeto
    // original tem que continuar com a hora intacta.
    expect(ref.getTime()).toBe(tempoAntes);
    expect(ref.getHours()).toBe(8);
    expect(ref.getMinutes()).toBe(30);
    expect(ref.getSeconds()).toBe(15);
  });
});

// ───────────────────────────────────────────────────────────────
describe("calcularSimulacao — fragilidades técnicas", () => {
  it.each([
    {
      nome: "NaN",
      params: {
        taxaFatorMensal: NaN,
        tarifaFixa: NaN,
        tarifaPorTitulo: NaN,
        percentualRetencao: NaN,
      } as SimuladorParametros,
    },
    {
      nome: "negativos",
      params: {
        taxaFatorMensal: -3.5,
        tarifaFixa: -150,
        tarifaPorTitulo: -25,
        percentualRetencao: -5,
      } as SimuladorParametros,
    },
  ])(
    "parâmetros $nome nos 4 campos são saneados para 0 sem propagar NaN",
    ({ params }) => {
      const titulos = [
        makeTitulo({ numero: "S-1", valorFace: 10000, dataVencimento: isoEmDias(30) }),
      ];

      const r = calcularSimulacao(titulos, params);

      // nenhum campo numérico vira NaN
      expect(Number.isNaN(r.valorBruto)).toBe(false);
      expect(Number.isNaN(r.prazoMedioPonderado)).toBe(false);
      expect(Number.isNaN(r.valorDesagio)).toBe(false);
      expect(Number.isNaN(r.valorTarifas)).toBe(false);
      expect(Number.isNaN(r.valorRetencao)).toBe(false);
      expect(Number.isNaN(r.valorLiquido)).toBe(false);
      expect(Number.isNaN(r.taxaDiariaEquivalente)).toBe(false);
      // parâmetros zerados ⇒ só sobra o bruto
      expect(r.taxaDiariaEquivalente).toBe(0);
      expect(r.valorDesagio).toBe(0);
      expect(r.valorTarifas).toBe(0);
      expect(r.valorRetencao).toBe(0);
      expect(r.valorBruto).toBe(10000);
      expect(r.valorLiquido).toBe(10000);
      expect(r.liquidoInvalido).toBe(false);
    },
  );

  it("todos os valores monetários retornam com no máximo 2 casas decimais", () => {
    // valores escolhidos para gerar artefatos de ponto flutuante
    const titulos = [
      makeTitulo({
        numero: "FP-1",
        valorFace: 12345.67,
        dataVencimento: isoEmDias(13),
      }),
    ];
    const params: SimuladorParametros = {
      taxaFatorMensal: 3.7,
      tarifaFixa: 99.99,
      tarifaPorTitulo: 9.99,
      percentualRetencao: 7,
    };

    const r = calcularSimulacao(titulos, params);

    expect(temNoMax2Casas(r.valorBruto)).toBe(true);
    expect(temNoMax2Casas(r.valorDesagio)).toBe(true);
    expect(temNoMax2Casas(r.valorTarifas)).toBe(true);
    expect(temNoMax2Casas(r.valorRetencao)).toBe(true);
    expect(temNoMax2Casas(r.valorLiquido)).toBe(true);
  });
});
