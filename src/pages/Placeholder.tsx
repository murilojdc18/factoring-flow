import { Construction } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PlaceholderProps {
  title: string;
  description: string;
  primaryAction?: string;
}

export default function Placeholder({
  title,
  description,
  primaryAction,
}: PlaceholderProps) {
  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          primaryAction ? (
            <Button className="bg-gradient-primary text-primary-foreground shadow-elevated hover:opacity-90">
              {primaryAction}
            </Button>
          ) : null
        }
      />

      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Construction className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Módulo em construção
          </h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Este módulo será implementado nas próximas etapas, com cadastros,
            listagens e fluxos operacionais completos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}