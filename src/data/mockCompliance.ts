import { useEffect, useState } from "react";
import { mockClientes } from "./mockClientes";
import { mockOperacoes } from "./mockOperacoes";

export type NivelRisco = "Baixo" | "Médio" | "Alto";
export type EscopoAnalise = "Cliente" | "Operação";

export const NIVEIS_RISCO: NivelRisco[] = ["Baixo", "Médio", "Alto"];

export interface ItemChecklist {
  id: string;
  titulo: string;
  descricao?: string;
  obrigatorio: boolean;
}

export interface PoliticaInterna {
  id: string;
  titulo: string;
  descricao: string;
  ativa: boolean;
}

export interface RespostaChecklist {
  itemId: string;
  conferido: boolean;
  observacao?: string;
}

export interface RevisaoAnalise {
  data: string; // ISO datetime
  responsavel: string;
  nivelRisco: NivelRisco;
  justificativa: string;
  observacoes?: string;
  respostas: RespostaChecklist[];
}

export interface AnaliseCompliance {
  id: string;
  escopo: EscopoAnalise;
  alvoId: string; // clienteId ou operacaoId
  alvoNome: string;
  nivelRisco: NivelRisco;
  justificativa: string;
  responsavel: string;
  dataAnalise: string; // ISO datetime
  respostas: RespostaChecklist[];
  observacoes?: string;
  historico: RevisaoAnalise[];
}

// ============= Checklists sugeridos =============

export const CHECKLIST_ONBOARDING: ItemChecklist[] = [
  { id: "ob-1", titulo: "Dados cadastrais completos", obrigatorio: true },
  { id: "ob-2", titulo: "Documentos societários conferidos", obrigatorio: true },
  { id: "ob-3", titulo: "Representante legal identificado", obrigatorio: true },
  { id: "ob-4", titulo: "Atividade econômica entendida", obrigatorio: true },
  {
    id: "ob-5",
    titulo: "Beneficiário final identificado quando aplicável",
    obrigatorio: false,
  },
  { id: "ob-6", titulo: "Comprovante de endereço conferido", obrigatorio: false },
  { id: "ob-7", titulo: "Observações internas registradas", obrigatorio: false },
];

export const CHECKLIST_OPERACAO: ItemChecklist[] = [
  {
    id: "op-1",
    titulo: "Operação compatível com perfil do cliente",
    obrigatorio: true,
  },
  { id: "op-2", titulo: "Sacados avaliados", obrigatorio: true },
  { id: "op-3", titulo: "Concentração por sacado analisada", obrigatorio: true },
  { id: "op-4", titulo: "Lastro documental conferido", obrigatorio: true },
  { id: "op-5", titulo: "Prazos e taxas dentro da política", obrigatorio: true },
  { id: "op-6", titulo: "Observações internas registradas", obrigatorio: false },
];

// ============= Políticas internas (mock) =============

export const mockPoliticas: PoliticaInterna[] = [
  {
    id: "POL-001",
    titulo: "Política de KYC (Conheça seu Cliente)",
    descricao:
      "Coleta e validação de documentos cadastrais e societários antes da liberação de operações.",
    ativa: true,
  },
  {
    id: "POL-002",
    titulo: "Política de identificação de beneficiário final",
    descricao:
      "Identificação do beneficiário final em estruturas societárias com mais de um nível.",
    ativa: true,
  },
  {
    id: "POL-003",
    titulo: "Política de concentração de risco",
    descricao:
      "Limites internos de exposição por cedente e por sacado para evitar concentração excessiva.",
    ativa: true,
  },
  {
    id: "POL-004",
    titulo: "Política de monitoramento contínuo",
    descricao:
      "Revisão periódica de cadastros e operações conforme nível de risco classificado.",
    ativa: true,
  },
  {
    id: "POL-005",
    titulo: "Política de registro interno de PLD/FT",
    descricao:
      "Registro de análises e justificativas para fins internos. Não substitui comunicação a órgãos reguladores.",
    ativa: true,
  },
];

// ============= Estado interno =============

let analises: AnaliseCompliance[] = seedAnalises();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function seedAnalises(): AnaliseCompliance[] {
  const cli = mockClientes[0];
  if (!cli) return [];
  const dataInicial = new Date();
  dataInicial.setDate(dataInicial.getDate() - 30);
  return [
    {
      id: "ANC-0001",
      escopo: "Cliente",
      alvoId: cli.id,
      alvoNome: cli.razaoSocial,
      nivelRisco: "Baixo",
      justificativa:
        "Cliente recorrente, documentação completa e operações dentro do perfil histórico.",
      responsavel: "Ana Martins",
      dataAnalise: dataInicial.toISOString(),
      observacoes: "Análise inicial de onboarding.",
      respostas: CHECKLIST_ONBOARDING.map((i) => ({
        itemId: i.id,
        conferido: true,
      })),
      historico: [],
    },
  ];
}

export const complianceStore = {
  listarPoliticas: () => mockPoliticas,
  listarAnalises: () => analises,

  obterAnalisePorAlvo: (escopo: EscopoAnalise, alvoId: string) =>
    analises.find((a) => a.escopo === escopo && a.alvoId === alvoId),

  salvar: (input: {
    escopo: EscopoAnalise;
    alvoId: string;
    alvoNome: string;
    nivelRisco: NivelRisco;
    justificativa: string;
    responsavel: string;
    respostas: RespostaChecklist[];
    observacoes?: string;
  }) => {
    const existente = complianceStore.obterAnalisePorAlvo(
      input.escopo,
      input.alvoId,
    );
    const agora = new Date().toISOString();
    if (existente) {
      // mover snapshot atual para histórico (não sobrescrever)
      const revisao: RevisaoAnalise = {
        data: existente.dataAnalise,
        responsavel: existente.responsavel,
        nivelRisco: existente.nivelRisco,
        justificativa: existente.justificativa,
        observacoes: existente.observacoes,
        respostas: existente.respostas,
      };
      const atualizada: AnaliseCompliance = {
        ...existente,
        nivelRisco: input.nivelRisco,
        justificativa: input.justificativa,
        responsavel: input.responsavel,
        dataAnalise: agora,
        respostas: input.respostas,
        observacoes: input.observacoes,
        historico: [revisao, ...existente.historico],
      };
      analises = analises.map((a) => (a.id === existente.id ? atualizada : a));
    } else {
      const nova: AnaliseCompliance = {
        id: `ANC-${Date.now()}`,
        escopo: input.escopo,
        alvoId: input.alvoId,
        alvoNome: input.alvoNome,
        nivelRisco: input.nivelRisco,
        justificativa: input.justificativa,
        responsavel: input.responsavel,
        dataAnalise: agora,
        respostas: input.respostas,
        observacoes: input.observacoes,
        historico: [],
      };
      analises = [nova, ...analises];
    }
    emit();
  },

  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useCompliance() {
  const [, force] = useState(0);
  useEffect(() => complianceStore.subscribe(() => force((n) => n + 1)), []);
  return {
    analises: complianceStore.listarAnalises(),
    politicas: complianceStore.listarPoliticas(),
    obterAnalisePorAlvo: complianceStore.obterAnalisePorAlvo,
    salvar: complianceStore.salvar,
  };
}

// ============= Helpers =============

export function checklistDoEscopo(escopo: EscopoAnalise): ItemChecklist[] {
  return escopo === "Cliente" ? CHECKLIST_ONBOARDING : CHECKLIST_OPERACAO;
}

export function alvosDisponiveis(escopo: EscopoAnalise) {
  if (escopo === "Cliente") {
    return mockClientes.map((c) => ({ id: c.id, nome: c.razaoSocial }));
  }
  return mockOperacoes.map((o) => ({
    id: o.id,
    nome: `${o.numero} — ${o.cedenteNome}`,
  }));
}

export function alvosSemAnalise(escopo: EscopoAnalise) {
  const todos = alvosDisponiveis(escopo);
  return todos.filter(
    (t) => !complianceStore.obterAnalisePorAlvo(escopo, t.id),
  );
}

export function corDoRisco(n: NivelRisco) {
  switch (n) {
    case "Baixo":
      return "bg-success/15 text-success border-success/30";
    case "Médio":
      return "bg-warning/15 text-warning border-warning/30";
    case "Alto":
      return "bg-destructive/15 text-destructive border-destructive/30";
  }
}

export function progressoChecklist(
  respostas: RespostaChecklist[],
  itens: ItemChecklist[],
) {
  const total = itens.length;
  const ok = itens.filter(
    (i) => respostas.find((r) => r.itemId === i.id)?.conferido,
  ).length;
  return { ok, total, pct: total ? Math.round((ok / total) * 100) : 0 };
}