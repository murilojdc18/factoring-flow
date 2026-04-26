import { Titulo } from "@/data/mockTitulos";
import { daysUntil } from "@/lib/dateUtils";

export interface SimuladorParametros {
  taxaFatorMensal: number; // % ao mês (ex: 3.5)
  tarifaFixa: number; // R$
  tarifaPorTitulo: number; // R$
  percentualRetencao: number; // % sobre valor bruto (ex: 5)
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
}

export const PARAMETROS_DEFAULT: SimuladorParametros = {
  taxaFatorMensal: 3.5,
  tarifaFixa: 150,
  tarifaPorTitulo: 25,
  percentualRetencao: 5,
};

/**
 * Cálculo estimativo (NÃO definitivo). Usado apenas para simulação visual.
 * Deságio: valor_bruto * (taxa_mensal/30) * prazo_medio
 */
export function calcularSimulacao(
  titulos: Titulo[],
  params: SimuladorParametros,
): SimuladorResultado {
  const quantidadeTitulos = titulos.length;
  const valorBruto = titulos.reduce((acc, t) => acc + t.valorFace, 0);

  const prazoMedioPonderado =
    valorBruto > 0
      ? titulos.reduce(
          (acc, t) => acc + Math.max(0, daysUntil(t.dataVencimento)) * t.valorFace,
          0,
        ) / valorBruto
      : 0;

  const taxaDiariaEquivalente = params.taxaFatorMensal / 30;
  const valorDesagio =
    valorBruto * (taxaDiariaEquivalente / 100) * prazoMedioPonderado;

  const valorTarifas =
    params.tarifaFixa + params.tarifaPorTitulo * quantidadeTitulos;

  const valorRetencao = valorBruto * (params.percentualRetencao / 100);

  const valorLiquido = valorBruto - valorDesagio - valorTarifas - valorRetencao;

  return {
    quantidadeTitulos,
    valorBruto,
    prazoMedioPonderado,
    valorDesagio,
    valorTarifas,
    valorRetencao,
    valorLiquido,
    taxaDiariaEquivalente,
  };
}
