import { Badge } from "@/components/ui/badge";
import { OperacaoStatus } from "@/data/mockOperacoes";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<OperacaoStatus, string> = {
  Rascunho: "bg-muted text-muted-foreground border-border",
  "Em análise": "bg-warning/15 text-warning-foreground border-warning/30",
  Aprovada: "bg-primary/10 text-primary border-primary/30",
  Formalizada: "bg-accent/15 text-accent-foreground border-accent/30",
  Liquidada: "bg-success/10 text-success border-success/30",
  "Em atraso": "bg-destructive/10 text-destructive border-destructive/30",
  Recomprada: "bg-warning/15 text-warning-foreground border-warning/30",
  Cancelada: "bg-muted text-muted-foreground border-border line-through",
};

export function OperacaoStatusBadge({ status }: { status: OperacaoStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STATUS_STYLES[status])}>
      {status}
    </Badge>
  );
}
