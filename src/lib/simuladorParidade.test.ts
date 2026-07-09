/**
 * Teste de PARIDADE do cálculo do simulador (lado TS).
 *
 * Os casos vivem em src/test/fixtures/simulador-paridade.json e são a fonte
 * única de verdade para DOIS consumidores:
 *   1. este teste — roda contra calcularSimulacao (a estimativa de tela);
 *   2. supabase/tests/paridade_calcular_operacao.sql — roda contra a função
 *      canônica calcular_operacao no banco (espelhado manualmente do MESMO
 *      json, na migração do cálculo server-side).
 *
 * Critérios de comparação (documentados no _leia_me da fixture):
 * - valores monetários (pós-round2): igualdade exata — os casos foram
 *   escolhidos longe de fronteiras de meio centavo, onde float64 e numeric
 *   arredondam igual. O `+ 0` normaliza o -0 do caso "quase-zero"
 *   (Math.round(-0.4) produz -0, e Object.is(-0, 0) é false no toBe).
 * - taxa_diaria_equivalente e prazo_medio_ponderado (não arredondados pela
 *   função): tolerância de 1e-9 via toBeCloseTo(…, 9).
 *
 * Sem fake timers: todo caso passa data_referencia explícita, então o
 * default `new Date()` de calcularSimulacao nunca é exercido aqui.
 */
import { describe, it, expect } from "vitest";
import { calcularSimulacao, type SimuladorParametros } from "@/lib/simuladorCalc";
import { parseISO } from "@/lib/dateUtils";
import type { Titulo } from "@/data/mockTitulos";
import fixtures from "@/test/fixtures/simulador-paridade.json";

// Fábrica de Titulo mínimo a partir do shape enxuto da fixture. Só numero,
// valorFace e dataVencimento importam para o cálculo; o resto é neutro.
const makeTitulo = (f: {
  numero: string;
  valor_face: number;
  data_vencimento: string;
}): Titulo => ({
  id: f.numero,
  numero: f.numero,
  tipo: "Duplicata",
  cedenteId: "CLI-0001",
  cedenteNome: "Cedente Paridade",
  sacadoId: "SAC-0001",
  sacadoNome: "Sacado Paridade",
  dataEmissao: "2026-01-01",
  dataVencimento: f.data_vencimento,
  valorFace: f.valor_face,
  numeroNotaFiscal: "",
  chaveNotaFiscal: "",
  descricao: "",
  status: "Disponível",
  observacoes: "",
  anexos: [],
  criadoEm: "2026-01-01",
});

describe("paridade simulador — fixtures compartilhadas TS ↔ plpgsql", () => {
  for (const caso of fixtures.casos) {
    it(caso.nome, () => {
      const params: SimuladorParametros = {
        taxaFatorMensal: caso.parametros.taxa_fator_mensal,
        tarifaFixa: caso.parametros.tarifa_fixa,
        tarifaPorTitulo: caso.parametros.tarifa_por_titulo,
        percentualRetencao: caso.parametros.percentual_retencao,
      };

      const r = calcularSimulacao(
        caso.titulos.map(makeTitulo),
        params,
        parseISO(caso.data_referencia),
      );

      const e = caso.esperado;
      expect(r.quantidadeTitulos).toBe(e.quantidade_titulos);
      expect(r.valorBruto + 0).toBe(e.valor_bruto);
      expect(r.prazoMedioPonderado).toBeCloseTo(e.prazo_medio_ponderado, 9);
      expect(r.valorDesagio + 0).toBe(e.valor_desagio);
      expect(r.valorTarifas + 0).toBe(e.valor_tarifas);
      expect(r.valorRetencao + 0).toBe(e.valor_retencao);
      expect(r.valorLiquido + 0).toBe(e.valor_liquido);
      expect(r.taxaDiariaEquivalente).toBeCloseTo(e.taxa_diaria_equivalente, 9);
      expect(r.liquidoInvalido).toBe(e.liquido_invalido);
      expect(r.titulosVencidosIgnorados).toEqual(e.titulos_vencidos_ignorados);
    });
  }
});
