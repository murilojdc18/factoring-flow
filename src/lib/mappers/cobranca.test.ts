import { describe, it, expect } from "vitest";
import {
  rowToEvento,
  eventoToRow,
  type CobrancaRow,
  type CobrancaContext,
} from "@/lib/mappers/cobranca";

/**
 * Testes do mapper de cobranças (2.8.2).
 *
 * Cobrem rowToEvento, eventoToRow e ida-e-volta. `proxima_acao` é coluna nativa
 * (types.ts regenerado na 2.8.5) e `TipoContato`/`ResultadoCobranca` batem com os
 * enums do banco (2.8.4), então sem casts nem tipo-ponte.
 */

const ligacaoRow: CobrancaRow = {
  id: "11111111-1111-1111-1111-111111111111",
  titulo_id: "22222222-2222-2222-2222-222222222222",
  operacao_id: "33333333-3333-3333-3333-333333333333",
  data_contato: "2026-05-27T12:30:00.000Z",
  tipo: "Ligação",
  resultado: "Promessa de pagamento",
  responsavel: "Carla Mendes",
  observacoes: "Sacado prometeu pagamento; negociação amigável em curso.",
  proximo_contato: "2026-06-02",
  proxima_acao: "Confirmar comprovante de pagamento",
  created_by: "44444444-4444-4444-4444-444444444444",
  created_at: "2026-05-27T12:30:00.000Z",
};

const visitaRow: CobrancaRow = {
  id: "55555555-5555-5555-5555-555555555555",
  titulo_id: "66666666-6666-6666-6666-666666666666",
  operacao_id: null,
  data_contato: "2026-05-26T09:00:00.000Z",
  tipo: "Visita",
  resultado: "Negociado",
  responsavel: "Rafael Souza",
  observacoes: "Visita presencial; em negociação de novo prazo.",
  proximo_contato: null,
  proxima_acao: "",
  created_by: null,
  created_at: "2026-05-26T09:00:00.000Z",
};

describe("rowToEvento", () => {
  it("mapeia uma ligação completa", () => {
    const e = rowToEvento(ligacaoRow);
    expect(e.id).toBe(ligacaoRow.id);
    expect(e.tituloId).toBe(ligacaoRow.titulo_id);
    expect(e.dataHora).toBe(ligacaoRow.data_contato);
    expect(e.usuario).toBe("Carla Mendes");
    expect(e.tipoContato).toBe("Ligação");
    expect(e.resultado).toBe("Promessa de pagamento");
    expect(e.proximaAcao).toBe("Confirmar comprovante de pagamento");
    expect(e.proximaAcaoData).toBe("2026-06-02");
    expect(e.observacoes).toContain("negociação");
  });

  it("deixa os snapshots de nome vazios (derivados do título no read)", () => {
    const e = rowToEvento(ligacaoRow);
    expect(e.tituloNumero).toBe("");
    expect(e.cedenteNome).toBe("");
    expect(e.sacadoNome).toBe("");
  });

  it("trata proxima_acao vazia e proximo_contato null como strings vazias", () => {
    // proxima_acao "" (sem próxima ação registrada) e proximo_contato null.
    const semProxima: CobrancaRow = {
      id: "77777777-7777-7777-7777-777777777777",
      titulo_id: "88888888-8888-8888-8888-888888888888",
      operacao_id: null,
      data_contato: "2026-05-25T08:00:00.000Z",
      tipo: "Outro",
      resultado: "Sem retorno",
      responsavel: "",
      observacoes: "",
      proxima_acao: "",
      proximo_contato: null,
      created_by: null,
      created_at: "2026-05-25T08:00:00.000Z",
    };
    const e = rowToEvento(semProxima);
    expect(e.proximaAcao).toBe("");
    expect(e.proximaAcaoData).toBe("");
  });

  it("preserva acentos em uma visita (Visita, Negociado, negociação)", () => {
    const e = rowToEvento(visitaRow);
    expect(e.tipoContato).toBe("Visita");
    expect(e.resultado).toBe("Negociado");
    expect(e.observacoes).toContain("negociação");
  });
});

describe("eventoToRow", () => {
  it("mapeia um evento completo com operacaoId do contexto", () => {
    const ctx: CobrancaContext = {
      operacaoId: "33333333-3333-3333-3333-333333333333",
    };
    const row = eventoToRow(
      {
        tituloId: "22222222-2222-2222-2222-222222222222",
        dataHora: "2026-05-27T12:30:00.000Z",
        usuario: "Carla Mendes",
        tipoContato: "Ligação",
        resultado: "Promessa de pagamento",
        proximaAcao: "Confirmar comprovante",
        proximaAcaoData: "2026-06-02",
        observacoes: "negociação amigável",
      },
      ctx,
    );
    expect(row.titulo_id).toBe("22222222-2222-2222-2222-222222222222");
    expect(row.operacao_id).toBe("33333333-3333-3333-3333-333333333333");
    expect(row.tipo).toBe("Ligação");
    expect(row.resultado).toBe("Promessa de pagamento");
    expect(row.responsavel).toBe("Carla Mendes");
    expect(row.proxima_acao).toBe("Confirmar comprovante");
    expect(row.proximo_contato).toBe("2026-06-02");
    expect(row.observacoes).toBe("negociação amigável");
  });

  it("sem operacaoId no contexto grava operacao_id null", () => {
    const row = eventoToRow(
      { tituloId: "22222222-2222-2222-2222-222222222222" },
      {},
    );
    expect(row.operacao_id).toBeNull();
  });

  it("aplica defaults seguros num evento parcial vazio", () => {
    const row = eventoToRow({}, {});
    expect(row.titulo_id).toBe("");
    expect(row.tipo).toBe("Outro"); // enum válido neutro
    expect(row.resultado).toBe("Outro"); // enum válido neutro
    expect(row.responsavel).toBe("");
    expect(row.observacoes).toBe("");
    expect(row.proxima_acao).toBe("");
    expect(row.proximo_contato).toBeNull();
    expect(row.data_contato).toBeUndefined(); // omitido → DB aplica now()
  });
});

describe("ida e volta", () => {
  it("preserva os dados de uma ligação (row → evento → row)", () => {
    const evento = rowToEvento(ligacaoRow);
    const ctx: CobrancaContext = { operacaoId: ligacaoRow.operacao_id! };
    const row = eventoToRow(evento, ctx);
    expect(row.titulo_id).toBe(ligacaoRow.titulo_id);
    expect(row.operacao_id).toBe(ligacaoRow.operacao_id);
    expect(row.data_contato).toBe(ligacaoRow.data_contato);
    expect(row.tipo).toBe(ligacaoRow.tipo);
    expect(row.resultado).toBe(ligacaoRow.resultado);
    expect(row.responsavel).toBe(ligacaoRow.responsavel);
    expect(row.observacoes).toBe(ligacaoRow.observacoes);
    expect(row.proxima_acao).toBe(ligacaoRow.proxima_acao);
    expect(row.proximo_contato).toBe(ligacaoRow.proximo_contato);
  });

  it("preserva acentos de uma visita (Visita / negociação)", () => {
    const evento = rowToEvento(visitaRow);
    const row = eventoToRow(evento, {});
    expect(row.tipo).toBe("Visita");
    expect(row.observacoes).toContain("negociação");
    // proximo_contato null no banco vira "" no evento e volta para null.
    expect(row.proximo_contato).toBeNull();
  });
});
