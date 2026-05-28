import { describe, it, expect } from "vitest";
import type { Cliente } from "@/data/mockClientes";
import type { Sacado } from "@/data/mockSacados";
import { montarResumoFiltros, type Filtros } from "./relatoriosFiltros";

const stubCliente = (id: string, razaoSocial: string): Cliente =>
  ({ id, razaoSocial } as Cliente);
const stubSacado = (id: string, nome: string): Sacado =>
  ({ id, nome } as Sacado);

const filtrosVazios: Filtros = {
  cedenteId: "",
  sacadoId: "",
  statusOperacao: "",
  tipoTitulo: "",
  responsavel: "",
};

describe("montarResumoFiltros", () => {
  it("retorna 'Sem filtros aplicados' quando nada está preenchido", () => {
    expect(montarResumoFiltros(filtrosVazios, [], [])).toBe(
      "Sem filtros aplicados",
    );
  });

  it("resolve cedenteId via lista de clientes", () => {
    const out = montarResumoFiltros(
      { ...filtrosVazios, cedenteId: "CLI-1" },
      [stubCliente("CLI-1", "Comercial Vitória")],
      [],
    );
    expect(out).toContain("cedente Comercial Vitória");
  });

  it("faz fallback para o id quando o cedente não está na lista", () => {
    const out = montarResumoFiltros(
      { ...filtrosVazios, cedenteId: "CLI-INEXISTENTE" },
      [],
      [],
    );
    expect(out).toContain("cedente CLI-INEXISTENTE");
  });

  it("resolve sacadoId via lista de sacados", () => {
    const out = montarResumoFiltros(
      { ...filtrosVazios, sacadoId: "SAC-1" },
      [],
      [stubSacado("SAC-1", "Supermercado Atlas")],
    );
    expect(out).toContain("sacado Supermercado Atlas");
  });

  it("concatena múltiplos filtros com ' • '", () => {
    const out = montarResumoFiltros(
      { ...filtrosVazios, statusOperacao: "Aprovada", responsavel: "Ana" },
      [],
      [],
    );
    expect(out).toBe("status Aprovada • resp. Ana");
  });

  it("formata datas via formatBR/dateToISO (regressão de boundary)", () => {
    const out = montarResumoFiltros(
      { ...filtrosVazios, inicio: new Date(2026, 4, 1) },
      [],
      [],
    );
    expect(out).toMatch(/início \d{2}\/\d{2}\/\d{4}/);
  });
});
