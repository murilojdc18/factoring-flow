import { Badge } from "@/components/ui/badge";
import { ContratoStatus } from "@/data/mockContratos";
import { cn } from "@/lib/utils";

const styles: Record<ContratoStatus, string> = {
  Rascunho: "bg-muted text-muted-foreground hover:bg-muted",
  Ativo: "bg-success/15 text-success-foreground border border-success/30 hover:bg-success/15",
  Inativo: "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/10",
};

export function ContratoStatusBadge({ status }: { status: ContratoStatus }) {
  return (
    <Badge variant="secondary" className={cn("font-medium", styles[status])}>
      {status}
    </Badge>
  );
}
