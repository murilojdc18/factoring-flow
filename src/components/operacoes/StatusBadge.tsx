import { Badge } from "@/components/ui/badge";
import { OperacaoStatus } from "@/data/mockOperacoes";
import { cn } from "@/lib/utils";

const styles: Record<OperacaoStatus, string> = {
  Rascunho: "bg-muted text-muted-foreground hover:bg-muted",
  "Em análise": "bg-warning/15 text-warning-foreground border border-warning/30 hover:bg-warning/15",
  Aprovada: "bg-primary/15 text-primary border border-primary/30 hover:bg-primary/15",
  Formalizada: "bg-success/15 text-success-foreground border border-success/30 hover:bg-success/15",
  Liquidada: "bg-success/25 text-success-foreground border border-success/40 hover:bg-success/25",
  "Em atraso": "bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/15",
  Recomprada: "bg-accent text-accent-foreground border hover:bg-accent",
  Cancelada: "bg-muted text-muted-foreground line-through hover:bg-muted",
};

export function OperacaoStatusBadge({ status }: { status: OperacaoStatus }) {
  return (
    <Badge variant="secondary" className={cn("font-medium", styles[status])}>
      {status}
    </Badge>
  );
}
