import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TituloStatus } from "@/data/mockTitulos";

const STATUS_STYLES: Record<TituloStatus, string> = {
  "Disponível": "bg-primary/10 text-primary border-primary/30",
  "Em análise": "bg-warning/15 text-warning-foreground border-warning/30",
  "Operado": "bg-accent/15 text-accent-foreground border-accent/30",
  "Liquidado": "bg-success/10 text-success border-success/30",
  "Vencido": "bg-destructive/10 text-destructive border-destructive/30",
  "Recomprado": "bg-warning/15 text-warning-foreground border-warning/30",
  "Cancelado": "bg-muted text-muted-foreground border-border line-through",
};

export function TituloStatusBadge({ status }: { status: TituloStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STATUS_STYLES[status])}>
      {status}
    </Badge>
  );
}