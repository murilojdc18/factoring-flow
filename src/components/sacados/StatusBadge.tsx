import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SacadoStatus } from "@/data/mockSacados";

const STATUS_STYLES: Record<SacadoStatus, string> = {
  "Ativo": "bg-success/10 text-success border-success/30",
  "Em análise": "bg-warning/15 text-warning-foreground border-warning/30",
  "Bloqueado": "bg-destructive/10 text-destructive border-destructive/30",
  "Inativo": "bg-muted text-muted-foreground border-border",
};

export function SacadoStatusBadge({ status }: { status: SacadoStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STATUS_STYLES[status])}>
      {status}
    </Badge>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 750
      ? "bg-success/10 text-success border-success/30"
      : score >= 500
        ? "bg-warning/15 text-warning-foreground border-warning/30"
        : "bg-destructive/10 text-destructive border-destructive/30";
  return (
    <Badge variant="outline" className={cn("font-mono font-semibold", tone)}>
      {score}
    </Badge>
  );
}