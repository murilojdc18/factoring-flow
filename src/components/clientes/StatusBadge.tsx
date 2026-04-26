import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ClienteStatus } from "@/data/mockClientes";

const STATUS_STYLES: Record<ClienteStatus, string> = {
  "Ativo": "bg-success/10 text-success border-success/30",
  "Inativo": "bg-muted text-muted-foreground border-border",
  "Em análise": "bg-warning/15 text-warning-foreground border-warning/30",
  "Bloqueado": "bg-destructive/10 text-destructive border-destructive/30",
};

export function StatusBadge({ status }: { status: ClienteStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STATUS_STYLES[status])}>
      {status}
    </Badge>
  );
}