import { useEffect, useState } from "react";
import { Info, Save, RotateCcw, ShieldCheck, ArrowRight, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
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
import { Badge } from "@/components/ui/badge";
import { useCompliance } from "@/data/mockCompliance";
import { useClientes } from "@/hooks/useClientes";
import { useOperacoes } from "@/hooks/useOperacoes";
import { RiscoBadge } from "@/components/compliance/RiscoBadge";
import {
  PARAMETROS_DEFAULT as DEFAULTS,
  type ParametrosFinanceiros,
  useConfiguracoes,
} from "@/hooks/useConfiguracoes";

export default function Configuracoes() {
  const { params: salvo, isLoading, isSaving, save, source } = useConfiguracoes();
  const [params, setParams] = useState<ParametrosFinanceiros>(salvo);
  useEffect(() => {
    setParams(salvo);
  }, [salvo]);
  const { politicas, analises, obterAnalisePorAlvo } = useCompliance();
  const { clientes } = useClientes();
  const { operacoes } = useOperacoes();
  const totalClientes = clientes.length;
  const totalOps = operacoes.length;
  const semClientes = clientes.filter(
    (c) => !obterAnalisePorAlvo("Cliente", c.id),
  ).length;
  const semOps = operacoes.filter(
    (o) => !obterAnalisePorAlvo("Operação", o.id),
  ).length;
  const altos = analises.filter((a) => a.nivelRisco === "Alto").length;
  const medios = analises.filter((a) => a.nivelRisco === "Médio").length;
  const baixos = analises.filter((a) => a.nivelRisco === "Baixo").length;

  const update = <K extends keyof ParametrosFinanceiros>(
    key: K,
    value: ParametrosFinanceiros[K],
  ) => setParams((p) => ({ ...p, [key]: value }));

  const updateNum = (key: keyof ParametrosFinanceiros, raw: string) => {
    const n = parseFloat(raw.replace(",", "."));
    update(key, (isNaN(n) ? 0 : n) as never);
  };

  const handleSalvar = async () => {
    try {
      await save(params);
      toast.success("Parâmetros salvos.", {
        description:
          source === "supabase"
            ? "Alterações persistidas no banco."
            : "Alterações armazenadas em memória (mock).",
      });
    } catch (e) {
      toast.error("Não foi possível salvar.", {
        description: e instanceof Error ? e.message : "Erro desconhecido.",
      });
    }
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
              disabled={!dirty || isSaving || isLoading}
              className="bg-gradient-primary text-primary-foreground shadow-elevated hover:opacity-90"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Salvando..." : "Salvar alterações"}
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

      {/* ============= Compliance ============= */}
      <Card className="mt-6 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Compliance
          </CardTitle>
          <CardDescription>
            Resumo dos controles internos de PLD/FT. Para checklists e
            registros completos, acesse o módulo dedicado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(semClientes > 0 || semOps > 0) && (
            <Alert className="border-warning/40 bg-warning/10">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertTitle>Pendências de análise</AlertTitle>
              <AlertDescription>
                {semClientes} de {totalClientes} cliente(s) e {semOps} de{" "}
                {totalOps} operação(ões) sem análise registrada.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Análises registradas
              </div>
              <div className="mt-1 text-2xl font-bold text-foreground">
                {analises.length}
              </div>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Distribuição de risco
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <RiscoBadge nivel="Baixo" />
                <span className="text-sm text-muted-foreground">{baixos}</span>
                <RiscoBadge nivel="Médio" />
                <span className="text-sm text-muted-foreground">{medios}</span>
                <RiscoBadge nivel="Alto" />
                <span className="text-sm text-muted-foreground">{altos}</span>
              </div>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Políticas ativas
              </div>
              <div className="mt-1 text-2xl font-bold text-foreground">
                {politicas.filter((p) => p.ativa).length}
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Políticas internas
            </h3>
            <ul className="space-y-2">
              {politicas.map((p) => (
                <li
                  key={p.id}
                  className="flex items-start justify-between gap-3 rounded-md border bg-muted/20 p-3"
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {p.titulo}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.descricao}
                    </p>
                  </div>
                  <Badge
                    variant={p.ativa ? "default" : "secondary"}
                    className="shrink-0"
                  >
                    {p.ativa ? "Ativa" : "Inativa"}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Registros internos. Não substituem assessoria jurídica, contábil
              ou de compliance, e não geram comunicação ao COAF.
            </p>
            <Button asChild variant="outline">
              <Link to="/compliance">
                Abrir módulo Compliance
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
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
