import { useState } from "react";
import { Info, Save, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface ParametrosFinanceiros {
  taxaFatorMensal: number;
  tarifaFixa: number;
  tarifaPorTitulo: number;
  percentualRetencao: number;
  prazoMaximoDias: number;
  limiteClientePadrao: number;
  limiteSacadoPadrao: number;
  diasToleranciaAtraso: number;
  observacaoPadrao: string;
  moeda: string;
}

const DEFAULTS: ParametrosFinanceiros = {
  taxaFatorMensal: 3.5,
  tarifaFixa: 150,
  tarifaPorTitulo: 25,
  percentualRetencao: 5,
  prazoMaximoDias: 90,
  limiteClientePadrao: 250000,
  limiteSacadoPadrao: 100000,
  diasToleranciaAtraso: 3,
  observacaoPadrao:
    "Operação sujeita à análise de crédito e revisão jurídica. Valores estimados.",
  moeda: "BRL",
};

export default function Configuracoes() {
  const [params, setParams] = useState<ParametrosFinanceiros>(DEFAULTS);
  const [salvo, setSalvo] = useState<ParametrosFinanceiros>(DEFAULTS);

  const update = <K extends keyof ParametrosFinanceiros>(
    key: K,
    value: ParametrosFinanceiros[K],
  ) => setParams((p) => ({ ...p, [key]: value }));

  const updateNum = (key: keyof ParametrosFinanceiros, raw: string) => {
    const n = parseFloat(raw.replace(",", "."));
    update(key, (isNaN(n) ? 0 : n) as never);
  };

  const handleSalvar = () => {
    setSalvo(params);
    toast.success("Parâmetros salvos.", {
      description: "Alterações armazenadas em memória (mock).",
    });
  };

  const handleResetar = () => {
    setParams(DEFAULTS);
    toast.info("Valores restaurados para o padrão.");
  };

  const dirty = JSON.stringify(params) !== JSON.stringify(salvo);

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Parâmetros financeiros, taxas e regras operacionais."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleResetar}>
              <RotateCcw className="mr-2 h-4 w-4" /> Restaurar padrões
            </Button>
            <Button
              onClick={handleSalvar}
              disabled={!dirty}
              className="bg-gradient-primary text-primary-foreground shadow-elevated hover:opacity-90"
            >
              <Save className="mr-2 h-4 w-4" /> Salvar alterações
            </Button>
          </div>
        }
      />

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Aviso</AlertTitle>
        <AlertDescription>
          Parâmetros usados apenas para simulação inicial. Valide regras
          financeiras, contábeis e jurídicas antes de produção.
        </AlertDescription>
      </Alert>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">Parâmetros financeiros</CardTitle>
          <CardDescription>
            Valores aplicados como padrão no simulador e em novas operações.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Taxas e tarifas */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Taxas e tarifas
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Taxa de fator/deságio (% a.m.)" suffix="%">
                <Input
                  type="number"
                  step="0.01"
                  value={params.taxaFatorMensal}
                  onChange={(e) => updateNum("taxaFatorMensal", e.target.value)}
                />
              </Field>
              <Field label="Retenção/reserva (%)" suffix="%">
                <Input
                  type="number"
                  step="0.1"
                  value={params.percentualRetencao}
                  onChange={(e) =>
                    updateNum("percentualRetencao", e.target.value)
                  }
                />
              </Field>
              <Field label="Tarifa operacional fixa (R$)" suffix="R$">
                <Input
                  type="number"
                  step="0.01"
                  value={params.tarifaFixa}
                  onChange={(e) => updateNum("tarifaFixa", e.target.value)}
                />
              </Field>
              <Field label="Tarifa por título (R$)" suffix="R$">
                <Input
                  type="number"
                  step="0.01"
                  value={params.tarifaPorTitulo}
                  onChange={(e) => updateNum("tarifaPorTitulo", e.target.value)}
                />
              </Field>
            </div>
          </section>

          <Separator />

          {/* Limites e prazos */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Limites e prazos
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Prazo máximo padrão (dias)">
                <Input
                  type="number"
                  value={params.prazoMaximoDias}
                  onChange={(e) => updateNum("prazoMaximoDias", e.target.value)}
                />
              </Field>
              <Field label="Dias de tolerância p/ atraso">
                <Input
                  type="number"
                  value={params.diasToleranciaAtraso}
                  onChange={(e) =>
                    updateNum("diasToleranciaAtraso", e.target.value)
                  }
                />
              </Field>
              <Field label="Limite padrão por cliente (R$)" suffix="R$">
                <Input
                  type="number"
                  value={params.limiteClientePadrao}
                  onChange={(e) =>
                    updateNum("limiteClientePadrao", e.target.value)
                  }
                />
              </Field>
              <Field label="Limite padrão por sacado (R$)" suffix="R$">
                <Input
                  type="number"
                  value={params.limiteSacadoPadrao}
                  onChange={(e) =>
                    updateNum("limiteSacadoPadrao", e.target.value)
                  }
                />
              </Field>
            </div>
          </section>

          <Separator />

          {/* Outros */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Outros parâmetros
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Moeda padrão</Label>
                <Select
                  value={params.moeda}
                  onValueChange={(v) => update("moeda", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL — Real brasileiro</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Outras moedas serão habilitadas em fases futuras.
                </p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="obs">Texto padrão de observação em operações</Label>
                <Textarea
                  id="obs"
                  rows={4}
                  value={params.observacaoPadrao}
                  onChange={(e) => update("observacaoPadrao", e.target.value)}
                  placeholder="Texto pré-preenchido nas observações de novas operações."
                />
              </div>
            </div>
          </section>
        </CardContent>
      </Card>

      {dirty && (
        <p className="mt-4 text-sm text-warning-foreground">
          Existem alterações não salvas.
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  suffix,
  children,
}: {
  label: string;
  suffix?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        {children}
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
