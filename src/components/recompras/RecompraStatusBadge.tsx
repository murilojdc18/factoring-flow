import { Badge } from "@/components/ui/badge";
import { StatusRecompra } from "@/data/mockRecompras";

const map: Record<StatusRecompra, string> = {
  "Em análise de recompra":
    "bg-primary/15 text-primary border-primary/30",
  "Recompra solicitada":
    "bg-destructive/15 text-destructive border-destructive/40",
  "Substituição solicitada":
    "bg-warning/15 text-warning-foreground border-warning/40",
  Resolvido: "bg-success/15 text-success border-success/40",
};

export function RecompraStatusBadge({ status }: { status: StatusRecompra }) {
  return (
    <Badge variant="outline" className={`${map[status]} font-medium`}>
      {status}
    </Badge>
  );
}