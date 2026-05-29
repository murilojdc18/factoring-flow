import { PageHeader } from "@/components/layout/PageHeader";

// STUB provisório (3.1b bloco 1) — só para a rota /auditoria resolver e validar
// o gating por papel. A página real (filtros, tabela, diff) vem no bloco 4.
export default function AuditoriaLog() {
  return (
    <div>
      <PageHeader
        title="Auditoria"
        description="Trilha de alterações nas tabelas críticas do sistema. Somente leitura."
      />
      <p className="text-sm text-muted-foreground">Em construção.</p>
    </div>
  );
}
