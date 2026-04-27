import { type LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconTone?: "primary" | "warning" | "destructive" | "success" | "accent";
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  noPadding?: boolean;
}

const TONE_CLASS = {
  primary: "text-primary",
  warning: "text-warning",
  destructive: "text-destructive",
  success: "text-success",
  accent: "text-accent",
};

export function SectionCard({
  title,
  description,
  icon: Icon,
  iconTone = "primary",
  actions,
  children,
  className,
  contentClassName,
  noPadding,
}: SectionCardProps) {
  return (
    <Card className={cn("shadow-card", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base">
            {Icon && <Icon className={cn("h-4 w-4", TONE_CLASS[iconTone])} />}
            <span className="truncate">{title}</span>
          </CardTitle>
          {description && (
            <CardDescription className="mt-0.5 text-xs">
              {description}
            </CardDescription>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </CardHeader>
      <CardContent
        className={cn(noPadding ? "p-0" : "pt-0", contentClassName)}
      >
        {children}
      </CardContent>
    </Card>
  );
}
