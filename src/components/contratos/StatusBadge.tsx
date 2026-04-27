import { Badge } from "@/components/ui/badge";
import { ContratoStatus } from "@/data/mockContratos";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<ContratoStatus, string> = {
  Rascunho: "bg-muted text-muted-foreground border-border",
  Ativo: "bg-success/10 text-success border-success/30",
  Inativo: "bg-destructive/10 text-destructive border-destructive/30",
};

export function ContratoStatusBadge({ status }: { status: ContratoStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STATUS_STYLES[status])}>
      {status}
    </Badge>
  );
}
