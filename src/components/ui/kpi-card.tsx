import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "default" | "primary" | "success" | "warning" | "destructive" | "accent";

const TONES: Record<Tone, { value: string; icon: string; iconBg: string }> = {
  default: {
    value: "text-foreground",
    icon: "text-muted-foreground",
    iconBg: "bg-muted",
  },
  primary: {
    value: "text-foreground",
    icon: "text-primary",
    iconBg: "bg-primary/10",
  },
  success: {
    value: "text-success",
    icon: "text-success",
    iconBg: "bg-success/10",
  },
  warning: {
    value: "text-warning",
    icon: "text-warning",
    iconBg: "bg-warning/15",
  },
  destructive: {
    value: "text-destructive",
    icon: "text-destructive",
    iconBg: "bg-destructive/10",
  },
  accent: {
    value: "text-accent-foreground",
    icon: "text-accent",
    iconBg: "bg-accent/15",
  },
};

interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
  className?: string;
}

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: KpiCardProps) {
  const t = TONES[tone];
  return (
    <Card
      className={cn(
        "shadow-card transition-shadow hover:shadow-elevated",
        className,
      )}
    >
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p
            className={cn(
              "mt-1.5 truncate text-2xl font-bold tabular-nums",
              t.value,
            )}
          >
            {value}
          </p>
          {hint && (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {hint}
            </p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
              t.iconBg,
            )}
          >
            <Icon className={cn("h-4 w-4", t.icon)} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
