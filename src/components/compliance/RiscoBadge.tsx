import { cn } from "@/lib/utils";
import { corDoRisco, NivelRisco } from "@/data/mockCompliance";

export function RiscoBadge({
  nivel,
  className,
}: {
  nivel: NivelRisco;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        corDoRisco(nivel),
        className,
      )}
    >
      Risco {nivel}
    </span>
  );
}