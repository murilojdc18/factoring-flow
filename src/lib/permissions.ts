import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export const ROLE_LABELS: Record<AppRole, string> = {
  administrador: "Administrador",
  diretoria: "Diretoria",
  operacional: "Operacional",
  cobranca: "Cobrança",
  financeiro: "Financeiro",
  compliance: "Compliance",
  somente_leitura: "Somente leitura",
};

/** Áreas/módulos do sistema. */
export type AppArea =
  | "dashboard"
  | "clientes"
  | "sacados"
  | "titulos"
  | "operacoes"
  | "contratos"
  | "cobrancas"
  | "relatorios"
  | "configuracoes"
  | "compliance"
  | "auditoria";

/** Ações possíveis em um módulo. */
export type AppAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "approve"
  | "export";

/**
 * Matriz de permissões.
 * IMPORTANTE: estas regras valem apenas no front. Backend deve replicar via RLS.
 */
const MATRIX: Record<AppRole, Partial<Record<AppArea, AppAction[]>>> = {
  administrador: allAreasAllActions(),

  diretoria: {
    dashboard: ["view", "export"],
    clientes: ["view", "export"],
    sacados: ["view", "export"],
    titulos: ["view", "export"],
    operacoes: ["view", "approve", "export"],
    contratos: ["view", "approve", "export"],
    relatorios: ["view", "export"],
    cobrancas: ["view"],
    compliance: ["view"],
    auditoria: ["view"],
  },

  operacional: {
    dashboard: ["view"],
    clientes: ["view", "create", "edit"],
    sacados: ["view", "create", "edit"],
    titulos: ["view", "create", "edit"],
    operacoes: ["view", "create", "edit"],
    contratos: ["view", "create", "edit"],
    relatorios: ["view"],
  },

  cobranca: {
    dashboard: ["view"],
    cobrancas: ["view", "create", "edit"],
    titulos: ["view", "edit"],
    operacoes: ["view"],
    clientes: ["view"],
    sacados: ["view"],
    relatorios: ["view"],
  },

  financeiro: {
    dashboard: ["view"],
    operacoes: ["view", "edit", "export"],
    relatorios: ["view", "export"],
    configuracoes: ["view", "edit"],
    titulos: ["view", "export"],
    cobrancas: ["view"],
  },

  compliance: {
    dashboard: ["view"],
    clientes: ["view", "edit"],
    sacados: ["view", "edit"],
    operacoes: ["view"],
    compliance: ["view", "create", "edit"],
    relatorios: ["view"],
  },

  somente_leitura: {
    dashboard: ["view"],
    clientes: ["view"],
    sacados: ["view"],
    titulos: ["view"],
    operacoes: ["view"],
    contratos: ["view"],
    cobrancas: ["view"],
    relatorios: ["view"],
    compliance: ["view"],
  },
};

function allAreasAllActions(): Record<AppArea, AppAction[]> {
  const areas: AppArea[] = [
    "dashboard",
    "clientes",
    "sacados",
    "titulos",
    "operacoes",
    "contratos",
    "cobrancas",
    "relatorios",
    "configuracoes",
    "compliance",
    "auditoria",
  ];
  const actions: AppAction[] = [
    "view",
    "create",
    "edit",
    "delete",
    "approve",
    "export",
  ];
  return Object.fromEntries(areas.map((a) => [a, actions])) as Record<
    AppArea,
    AppAction[]
  >;
}

export function rolesCan(
  roles: AppRole[],
  area: AppArea,
  action: AppAction = "view",
): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((r) => (MATRIX[r]?.[area] ?? []).includes(action));
}

export function rolesCanViewArea(roles: AppRole[], area: AppArea) {
  return rolesCan(roles, area, "view");
}