import { Titulo } from "@/data/mockTitulos";
import { daysUntil } from "@/lib/dateUtils";

export interface SimuladorParametros {
  taxaFatorMensal: number; // % ao mês (ex: 3.5)
  tarifaFixa: number; // R$
  tarifaPorTitulo: number; // R$
  percentualRetencao: number; // % sobre valor bruto (ex: 5)
}

/** Detalhe do deságio de um título válido (mesma linha do termo aditivo). */
export interface TituloCalculado {
  numero: string;
  valorFace: number;
  dataVencimento: string;
  dias: number; // dias reais até o vencimento (pode ser 0)
  percentual: number; // % do período, 3 casas (usa piso de 1 dia)
  juros: number; // deságio do título, 2 casas
  liquido: number; // valorFace − juros
}

export interface SimuladorResultado {
  quantidadeTitulos: number;
  valorBruto: number;
  prazoMedioPonderado: number; // em dias
  valorDesagio: number;
  valorTarifas: number;
  valorRetencao: number;
  valorLiquido: number;
  taxaDiariaEquivalente: number; // % a.d.
  liquidoInvalido: boolean; // true quando valorLiquido < 0
  titulosVencidosIgnorados: string[]; // "numero" dos títulos vencidos descartados
  titulosCalculados: TituloCalculado[]; // títulos válidos, na ordem de entrada
}

export const PARAMETROS_DEFAULT: SimuladorParametros = {
  taxaFatorMensal: 3.5,
  tarifaFixa: 150,
  tarifaPorTitulo: 25,
  percentualRetencao: 5,
};

// Arredonda para 2 casas (centavos). Suficiente para a escala atual
// (sistema interno, 2 sócios); não vale Decimal.js / centavos inteiros agora.
const round2 = (v: number): number => Math.round(v * 100) / 100;

// Saneia parâmetro numérico: NaN ou negativo vira 0.
const san = (n: number): number => (Number.isNaN(n) || n < 0 ? 0 : n);

/**
 * ESTIMATIVA DE TELA — não é a fonte canônica do cálculo. A fonte canônica é
 * a função `calcular_operacao` no banco (mesmas regras, em plpgsql): a RPC
 * `criar_operacao` recalcula os valores no servidor e valida os daqui com
 * tolerância de R$ 0,01; em divergência, vale o servidor. A paridade entre as
 * duas implementações é garantida pelas fixtures compartilhadas em
 * src/test/fixtures/simulador-paridade.json.
 *
 * Deságio POR TÍTULO (v4, igual aos termos aditivos da empresa):
 *   % = round3(max(1, dias) × taxa ÷ 30); juros = round2(valor × % ÷ 100);
 *   deságio = Σ juros.
 *
 * @param dataReferencia data-base do cálculo (default = hoje). Títulos com
 *   vencimento anterior a essa data são descartados (Regra B) e devolvidos
 *   em `titulosVencidosIgnorados`. A função nunca lança erro — quem chama
 *   usa esse campo para sinalizar na tela.
 */
export function calcularSimulacao(
  titulos: Titulo[],
  params: SimuladorParametros,
  dataReferencia: Date = new Date(),
): SimuladorResultado {
  // Proteção NaN: saneia os 4 parâmetros numéricos antes de qualquer conta.
  const p: SimuladorParametros = {
    taxaFatorMensal: san(params.taxaFatorMensal),
    tarifaFixa: san(params.tarifaFixa),
    tarifaPorTitulo: san(params.tarifaPorTitulo),
    percentualRetencao: san(params.percentualRetencao),
  };

  // taxaDiariaEquivalente é propriedade do parâmetro de entrada, não da
  // operação: reflete sempre o parâmetro saneado, mesmo sem títulos válidos.
  const taxaDiariaEquivalente = p.taxaFatorMensal / 30;

  // Regra B: título vencido não entra. Filtra ANTES da checagem de lista
  // vazia (Regra A) — vencidos viram apenas registro em ignorados.
  const titulosVencidosIgnorados: string[] = [];
  const titulosValidos = titulos.filter((t) => {
    if (daysUntil(t.dataVencimento, dataReferencia) < 0) {
      titulosVencidosIgnorados.push(t.numero);
      return false;
    }
    return true;
  });

  // Regra A: sem títulos válidos → tudo zerado, EXCETO taxaDiariaEquivalente.
  if (titulosValidos.length === 0) {
    return {
      quantidadeTitulos: 0,
      valorBruto: 0,
      prazoMedioPonderado: 0,
      valorDesagio: 0,
      valorTarifas: 0,
      valorRetencao: 0,
      valorLiquido: 0,
      taxaDiariaEquivalente,
      liquidoInvalido: false,
      titulosVencidosIgnorados,
      titulosCalculados: [],
    };
  }

  const quantidadeTitulos = titulosValidos.length;
  const valorBruto = titulosValidos.reduce((acc, t) => acc + t.valorFace, 0);

  // Todos os títulos aqui têm daysUntil >= 0 (vencidos já filtrados acima).
  const prazoMedioPonderado =
    valorBruto > 0
      ? titulosValidos.reduce(
          (acc, t) =>
            acc + daysUntil(t.dataVencimento, dataReferencia) * t.valorFace,
          0,
        ) / valorBruto
      : 0;

  // Deságio por título. Conta em inteiros (centavos × milésimos de %) para
  // arredondar igual ao numeric do Postgres: valor_face é numeric(15,2) e, com
  // taxa de até 2 casas, dias × taxa × 1000 ÷ 30 nunca cai exatamente em meio
  // milésimo. Regra C por título: piso de 1 dia SÓ no %; `dias` é o real.
  let desagioCentavos = 0;
  const titulosCalculados: TituloCalculado[] = titulosValidos.map((t) => {
    const dias = daysUntil(t.dataVencimento, dataReferencia);
    const pctMilesimos = Math.round(
      (Math.max(1, dias) * p.taxaFatorMensal * 1000) / 30,
    );
    const valorCentavos = Math.round(t.valorFace * 100);
    // round2(valor × % ÷ 100), half away from zero (valores são >= 0).
    const jurosCentavos = Math.floor(
      (valorCentavos * pctMilesimos + 50_000) / 100_000,
    );
    desagioCentavos += jurosCentavos;
    return {
      numero: t.numero,
      valorFace: t.valorFace,
      dataVencimento: t.dataVencimento,
      dias,
      percentual: pctMilesimos / 1000,
      juros: jurosCentavos / 100,
      liquido: (valorCentavos - jurosCentavos) / 100,
    };
  });
  const valorDesagio = desagioCentavos / 100;

  const valorTarifas = p.tarifaFixa + p.tarifaPorTitulo * quantidadeTitulos;

  const valorRetencao = valorBruto * (p.percentualRetencao / 100);

  const valorLiquido = valorBruto - valorDesagio - valorTarifas - valorRetencao;

  // Floating point: arredonda cada valor monetário. liquidoInvalido (Regra D)
  // usa o líquido já arredondado, evitando falso positivo (ex.: -0,004).
  const valorLiquidoArredondado = round2(valorLiquido);

  return {
    quantidadeTitulos,
    valorBruto: round2(valorBruto),
    prazoMedioPonderado,
    valorDesagio: round2(valorDesagio),
    valorTarifas: round2(valorTarifas),
    valorRetencao: round2(valorRetencao),
    valorLiquido: valorLiquidoArredondado,
    taxaDiariaEquivalente,
    liquidoInvalido: valorLiquidoArredondado < 0,
    titulosVencidosIgnorados,
    titulosCalculados,
  };
}
