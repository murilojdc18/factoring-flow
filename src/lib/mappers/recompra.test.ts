/**
 * Testes do mapper de recompras (sub-tarefa 2.6.2).
 *
 * Garante que o shape consumido pela UI (`SolicitacaoRecompra`, camelCase)
 * permaneça idêntico ao ler de `recompras`. Cobre a ida (rowToRecompra, incl.
 * `resolvido_em` null/preenchido e o status `Cancelado` do soft delete — D8),
 * a volta (recompraToRow, com `cedente_id`/`operacao_id`/`valor` vindos do
 * contexto, defaults de snapshot e omissão dos campos do banco) e o ciclo de
 * ida e volta preservando acentos. Testes puros — nenhuma chamada ao banco.
 */
import { describe, it, expect } from "vitest";
import {
  rowToRecompra,
  recompraToRow,
  type RecompraContext,
  type RecompraRow,
} from "@/lib/mappers/recompra";
import type { SolicitacaoRecompra } from "@/data/mockRecompras";

const CEDENTE_ID = "11111111-1111-1111-1111-111111111111";
const OPERACAO_ID = "55555555-5555-5555-5555-555555555555";
const USER_ID = "09e693de-63ef-4664-a3da-82af69ca2d58";

// Amostra 1: uma recompra ainda em aberto (sem resolvido_em).
const recompraSol: SolicitacaoRecompra = {
  id: "aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa",
  tituloId: "11111111-aaaa-1111-aaaa-111111111111",
  tituloNumero: "DUP-2026-0001",
  cedenteNome: "Comercial Vitória LTDA",
  sacadoNome: "Distribuidora São José S.A.",
  operacaoId: OPERACAO_ID,
  operacaoNumero: "BOR-2026-0001",
  tipoAcao: "Recompra",
  motivo: "Título contestado pelo sacado por divergência na nota fiscal.",
  observacoes: "Cedente notificado; análise jurídica em andamento.",
  responsavel: "Murilo",
  status: "Recompra solicitada",
  criadoEm: "2026-05-26T13:30:00.000Z",
  resolvidoEm: undefined,
};

// Amostra 2: uma substituição já resolvida (com resolvido_em e acentos).
const substituicaoSol: SolicitacaoRecompra = {
  id: "bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb",
  tituloId: "22222222-bbbb-2222-bbbb-222222222222",
  tituloNumero: "DUP-2026-0002",
  cedenteNome: "Comercial Vitória LTDA",
  sacadoNome: "Construções Açaí Ltda",
  operacaoId: OPERACAO_ID,
  operacaoNumero: "BOR-2026-0001",
  tipoAcao: "Substituição",
  motivo: "Substituição por título de igual valor após análise interna.",
  observacoes: "Novo título já indicado pelo cedente.",
  responsavel: "Murilo",
  status: "Resolvido",
  criadoEm: "2026-05-20T09:00:00.000Z",
  resolvidoEm: "2026-05-22",
};

const recompraCtx: RecompraContext = {
  cedenteId: CEDENTE_ID,
  operacaoId: OPERACAO_ID,
};
const substituicaoCtx: RecompraContext = {
  cedenteId: CEDENTE_ID,
  operacaoId: OPERACAO_ID,
  valor: 12500.5,
};

// Monta a linha do banco a partir do payload gravável (recompraToRow) mais os
// campos preenchidos pelo banco: id, created_by e timestamps. created_at =
// criadoEm para que o ciclo de ida e volta reproduza o ISO completo.
function makeRow(r: SolicitacaoRecompra, ctx: RecompraContext): RecompraRow {
  return {
    ...recompraToRow(r, ctx),
    id: r.id,
    created_by: USER_ID,
    created_at: r.criadoEm,
    updated_at: r.criadoEm,
  } as unknown as RecompraRow;
}

describe("mapper recompra — rowToRecompra", () => {
  it("monta a recompra completa (em aberto)", () => {
    expect(rowToRecompra(makeRow(recompraSol, recompraCtx))).toEqual(recompraSol);
  });

  it("monta a substituição completa (resolvida, com acentos)", () => {
    const sol = rowToRecompra(makeRow(substituicaoSol, substituicaoCtx));
    expect(sol).toEqual(substituicaoSol);
    expect(sol.tipoAcao).toBe("Substituição");
    expect(sol.motivo).toContain("análise");
  });

  it("converte resolvido_em null em resolvidoEm undefined", () => {
    const row = { ...makeRow(recompraSol, recompraCtx), resolvido_em: null } as RecompraRow;
    expect(rowToRecompra(row).resolvidoEm).toBeUndefined();
  });

  it("preserva resolvido_em quando preenchido", () => {
    const row = { ...makeRow(recompraSol, recompraCtx), resolvido_em: "2026-05-30" } as RecompraRow;
    expect(rowToRecompra(row).resolvidoEm).toBe("2026-05-30");
  });

  it("carrega o status 'Cancelado' do banco (soft delete — D8)", () => {
    const row = { ...makeRow(recompraSol, recompraCtx), status: "Cancelado" } as RecompraRow;
    expect(rowToRecompra(row).status).toBe("Cancelado");
  });
});

describe("mapper recompra — recompraToRow", () => {
  it("converte a recompra completa para snake_case", () => {
    expect(recompraToRow(recompraSol, recompraCtx)).toEqual({
      acao: "Recompra",
      cedente_id: CEDENTE_ID,
      cedente_nome: "Comercial Vitória LTDA",
      motivo: "Título contestado pelo sacado por divergência na nota fiscal.",
      observacoes: "Cedente notificado; análise jurídica em andamento.",
      operacao_id: OPERACAO_ID,
      operacao_numero: "BOR-2026-0001",
      resolvido_em: null,
      responsavel: "Murilo",
      sacado_nome: "Distribuidora São José S.A.",
      status: "Recompra solicitada",
      titulo_id: "11111111-aaaa-1111-aaaa-111111111111",
      titulo_numero: "DUP-2026-0001",
      valor: 0,
    });
  });

  it("tira cedente_id, operacao_id e valor do contexto (não do r)", () => {
    const row = recompraToRow(recompraSol, {
      cedenteId: "ced-from-ctx",
      operacaoId: "op-from-ctx",
      valor: 999,
    });
    expect(row.cedente_id).toBe("ced-from-ctx");
    expect(row.operacao_id).toBe("op-from-ctx");
    expect(row.valor).toBe(999);
  });

  it("emite operacao_id null quando o contexto não tem operação (/cobranças — 2.6.1c)", () => {
    const row = recompraToRow(recompraSol, { cedenteId: CEDENTE_ID });
    expect(row.operacao_id).toBeNull();
  });

  it("não inclui id/timestamps/created_by no payload", () => {
    const row = recompraToRow(substituicaoSol, substituicaoCtx) as Record<string, unknown>;
    expect(row).not.toHaveProperty("id");
    expect(row).not.toHaveProperty("created_at");
    expect(row).not.toHaveProperty("updated_at");
    expect(row).not.toHaveProperty("created_by");
    expect(row.valor).toBe(12500.5);
  });

  it("aplica defaults para um Partial vazio (snapshots '', acao e status iniciais, valor 0)", () => {
    const row = recompraToRow({}, { cedenteId: CEDENTE_ID, operacaoId: OPERACAO_ID });
    expect(row).toEqual({
      acao: "Análise interna",
      cedente_id: CEDENTE_ID,
      cedente_nome: "",
      motivo: "",
      observacoes: "",
      operacao_id: OPERACAO_ID,
      operacao_numero: "",
      resolvido_em: null,
      responsavel: "",
      sacado_nome: "",
      status: "Em análise de recompra",
      titulo_id: "",
      titulo_numero: "",
      valor: 0,
    });
  });
});

describe("mapper recompra — ida e volta", () => {
  it("preserva a recompra no ciclo recompraToRow -> rowToRecompra", () => {
    expect(rowToRecompra(makeRow(recompraSol, recompraCtx))).toEqual(recompraSol);
  });

  it("preserva a substituição (acentos) no ciclo recompraToRow -> rowToRecompra", () => {
    expect(rowToRecompra(makeRow(substituicaoSol, substituicaoCtx))).toEqual(substituicaoSol);
  });
});
