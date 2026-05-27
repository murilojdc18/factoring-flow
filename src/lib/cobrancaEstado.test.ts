import { describe, it, expect } from "vitest";
import { deriveEstado } from "@/lib/cobrancaEstado";
import type { Titulo } from "@/data/mockTitulos";
import type { EstadoCobranca } from "@/data/mockCobrancas";

/**
 * Testes da regra de precedência de status de cobrança (2.8.4, plano §5).
 *
 * `HOJE` fixa a data de referência para tornar o nível 4 (vencimento)
 * determinístico. O título de teste só precisa de status + dataVencimento (o
 * que `deriveEstado` lê), então é montado com um factory enxuto.
 */
const HOJE = new Date("2026-05-27T12:00:00.000Z");

const titulo = (status: Titulo["status"], dataVencimento: string): Titulo =>
  ({ status, dataVencimento }) as Titulo;

const eventoPromessa: EstadoCobranca = {
  status: "Promessa de pagamento",
  ultimaAcao: "Ligação — Promessa de pagamento",
  proximaAcao: "Confirmar comprovante",
  proximaAcaoData: "2026-06-02",
};

describe("deriveEstado", () => {
  it("nível 1: título Liquidado vence o evento (mas última ação vem do evento)", () => {
    const e = deriveEstado(
      titulo("Liquidado", "2026-06-10"),
      eventoPromessa,
      HOJE,
    );
    expect(e.status).toBe("Liquidado");
    expect(e.ultimaAcao).toBe("Ligação — Promessa de pagamento");
  });

  it("nível 2: título Recomprado vira 'Para recompra' mesmo com evento", () => {
    const e = deriveEstado(
      titulo("Recomprado", "2026-06-10"),
      eventoPromessa,
      HOJE,
    );
    expect(e.status).toBe("Para recompra");
  });

  it("nível 3: usa o status do último evento quando o título não é terminal", () => {
    const e = deriveEstado(titulo("Operado", "2026-06-10"), eventoPromessa, HOJE);
    expect(e.status).toBe("Promessa de pagamento");
    expect(e.proximaAcao).toBe("Confirmar comprovante");
    expect(e.proximaAcaoData).toBe("2026-06-02");
  });

  it("nível 3: preserva acento ('Em negociação') e cai pro vencimento sem data no evento", () => {
    const negociacao: EstadoCobranca = {
      status: "Em negociação",
      ultimaAcao: "Visita — Negociado",
      proximaAcao: "—",
      proximaAcaoData: "",
    };
    const e = deriveEstado(titulo("Vencido", "2026-05-20"), negociacao, HOJE);
    expect(e.status).toBe("Em negociação");
    expect(e.proximaAcaoData).toBe("2026-05-20");
  });

  it("nível 4 (sem evento): vencido → 'Em cobrança'", () => {
    const e = deriveEstado(titulo("Vencido", "2026-05-20"), undefined, HOJE);
    expect(e.status).toBe("Em cobrança");
    expect(e.ultimaAcao).toBe("—");
    expect(e.proximaAcao).toBe("Iniciar contato");
    expect(e.proximaAcaoData).toBe("2026-05-20");
  });

  it("nível 4 (sem evento): a vencer → 'A vencer'", () => {
    const e = deriveEstado(titulo("Operado", "2026-06-15"), undefined, HOJE);
    expect(e.status).toBe("A vencer");
    expect(e.proximaAcao).toBe("Aguardar vencimento");
  });

  it("vencimento de hoje (dias === 0) conta como 'A vencer'", () => {
    const e = deriveEstado(titulo("Operado", "2026-05-27"), undefined, HOJE);
    expect(e.status).toBe("A vencer");
  });
});
