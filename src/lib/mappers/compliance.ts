import type {
  AnaliseCompliance,
  EscopoAnalise,
  RespostaChecklist,
} from "@/data/mockCompliance";
import type { Database, Json } from "@/integrations/supabase/types";

/**
 * Mapper de compliance — análises de risco PLD/FT (sub-tarefa 2.9.2).
 *
 * Converte entre a linha de `compliance_analises` (snake_case, banco) e o shape
 * `AnaliseCompliance` (camelCase) que a UI consome. Espelha o padrão de
 * `lib/mappers/cobranca.ts` (2.8).
 *
 * D1 (append-only): cada "salvar" é um INSERT — nunca UPDATE. A análise ATUAL de
 * um alvo é a linha mais recente; as anteriores viram `historico`. O mapper
 * traduz UMA linha; o agrupamento por alvo + `historico` vive em
 * `complianceAgregado.ts` (função pura). Aqui `historico` sai sempre `[]`.
 *
 * D2 (+Crítico): `nivel_risco` é `compliance_risco` (Baixo/Médio/Alto/Crítico) e o
 * `NivelRisco` do mock lista exatamente os mesmos valores (alinhados na 2.9.4) —
 * sem cast entre eles.
 *
 * D3 (justificativa): coluna própria (migration 2.9.1) e nativa no `types.ts`
 * (regenerado na 2.9.5) — lida e gravada direto, separada de `observacoes`.
 *
 * D4 (checklist jsonb): as `respostas` do checklist moram no `checklist` jsonb,
 * no formato `{ respostas: [...] }`.
 *
 * D5 (alvoNome/escopo derivados): `escopo` = qual FK está preenchida; `alvoId` = a
 * FK preenchida; `alvoNome` NÃO é coluna — `rowToAnalise` devolve "" e a página
 * deriva cruzando com clientes/operações (como em cobranças).
 *
 * D6 (status): `analiseToRow` grava sempre o default neutro 'Em análise' — não
 * auto-aprova (aprovação é decisão humana; workflow é Fase 3).
 *
 * SEM CONTEXTO: diferente de cobranças, o mapper não precisa de um `ctx` — o alvo
 * vem do `escopo`/`alvoId` e `created_by` é resolvido no hook.
 */

export type ComplianceRow =
  Database["public"]["Tables"]["compliance_analises"]["Row"];
export type ComplianceInsert =
  Database["public"]["Tables"]["compliance_analises"]["Insert"];

/** Forma das respostas dentro do `checklist` jsonb (D4). */
type ChecklistJson = { respostas?: RespostaChecklist[] };

/** Converte uma linha de `compliance_analises` na AnaliseCompliance da UI. */
export function rowToAnalise(row: ComplianceRow): AnaliseCompliance {
  const escopo: EscopoAnalise = row.cliente_id ? "Cliente" : "Operação";
  const checklist = (row.checklist ?? {}) as ChecklistJson;
  return {
    id: row.id,
    escopo,
    alvoId: row.cliente_id ?? row.operacao_id ?? "",
    alvoNome: "", // snapshot derivado no read (D5)
    nivelRisco: row.nivel_risco, // D2: NivelRisco == compliance_risco
    justificativa: row.justificativa, // D3: coluna nativa (NOT NULL default '')
    observacoes: row.observacoes,
    responsavel: row.responsavel,
    dataAnalise: row.created_at, // D1: timestamp real da linha
    respostas: checklist.respostas ?? [], // D4
    historico: [], // preenchido por agruparCorrentes (D1)
  };
}

/**
 * Converte uma AnaliseCompliance (ou parcial) na linha gravável de
 * `compliance_analises`. NÃO inclui id/created_at/created_by (gerados pelo banco).
 * `cliente_id`/`operacao_id` derivam do `escopo` (D5). `status` é o default neutro
 * (D6). `alvoId` vazio vira `null` (defensivo: o CHECK do banco rejeita os dois
 * nulos, sinalizando alvo ausente em vez de gravar "" como uuid).
 */
export function analiseToRow(
  a: Partial<AnaliseCompliance>,
): Omit<ComplianceInsert, "id" | "created_at" | "created_by"> {
  const escopo = a.escopo ?? "Cliente";
  const alvoId = a.alvoId || null;
  return {
    cliente_id: escopo === "Cliente" ? alvoId : null,
    operacao_id: escopo === "Operação" ? alvoId : null,
    nivel_risco: a.nivelRisco ?? "Baixo",
    status: "Em análise", // D6: default neutro, não auto-aprova
    justificativa: a.justificativa ?? "", // D3
    observacoes: a.observacoes ?? "",
    responsavel: a.responsavel ?? "",
    // D4: jsonb. RespostaChecklist não tem index signature → cast no boundary.
    checklist: { respostas: a.respostas ?? [] } as unknown as Json,
  };
}
