import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Calculator, FileCheck2, Info } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { mockClientes } from "@/data/mockClientes";
import { mockTitulos } from "@/data/mockTitulos";
import { formatBRL } from "@/lib/format";
import { formatBR, daysUntil } from "@/lib/dateUtils";
import {
  PARAMETROS_DEFAULT,
  SimuladorParametros,
  calcularSimulacao,
} from "@/lib/simuladorCalc";
import { toast } from "sonner";

export default function OperacaoSimulador() {
  const [cedenteId, setCedenteId] = useState<string>("");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [params, setParams] = useState<SimuladorParametros>(PARAMETROS_DEFAULT);
  const [observacoes, setObservacoes] = useState("");

  const cedentesElegiveis = useMemo(
    () => mockClientes.filter((c) => c.status === "Ativo"),
    [],
  );

  const titulosDoCliente = useMemo(() => {
    if (!cedenteId) return [];
    return mockTitulos.filter(
      (t) => t.cedenteId === cedenteId && t.status === "Disponível",
    );
  }, [cedenteId]);

  const titulosSelecionados = useMemo(
    () => titulosDoCliente.filter((t) => selecionados.has(t.id)),
    [titulosDoCliente, selecionados],
  );

  const resultado = useMemo(
    () => calcularSimulacao(titulosSelecionados, params),
    [titulosSelecionados, params],
  );

  const handleCedenteChange = (id: string) => {
    setCedenteId(id);
    setSelecionados(new Set());
  };

  const toggleTitulo = (id: string) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    if (selecionados.size === titulosDoCliente.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(titulosDoCliente.map((t) => t.id)));
    }
  };

  const updateParam = (k: keyof SimuladorParametros, v: string) => {
    const num = parseFloat(v.replace(",", "."));
    setParams((p) => ({ ...p, [k]: isNaN(num) ? 0 : num }));
  };

  const gerarOperacao = () => {
    if (titulosSelecionados.length === 0) {
      toast.error("Selecione ao menos um título.");
      return;
    }
    toast.success("Operação simulada gerada (proforma).", {
      description: `${resultado.quantidadeTitulos} título(s) — Líquido estimado ${formatBRL(resultado.valorLiquido)}`,
    });
  };

  const cedenteSelecionado = cedentesElegiveis.find((c) => c.id === cedenteId);

  return (
    <div>
      <PageHeader
        title="Simulador de operação"
        description="Selecione títulos disponíveis e visualize a estimativa de compra/cessão."
        actions={
          <Button variant="outline" asChild>
            <Link to="/operacoes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
        }
      />

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Simulação estimativa</AlertTitle>
        <AlertDescription>
          Os valores apresentados são meramente indicativos e não substituem
          análise jurídica, fiscal ou contábil. Parâmetros são configuráveis.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna esquerda — seleção */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Cedente</CardTitle>
              <CardDescription>
                Apenas clientes ativos podem ser simulados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={cedenteId} onValueChange={handleCedenteChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cedente..." />
                </SelectTrigger>
                <SelectContent>
                  {cedentesElegiveis.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.razaoSocial} — {c.cnpj}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {cedenteSelecionado && (
                <div className="mt-3 grid grid-cols-2 gap-3 rounded-md border bg-muted/40 p-3 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Limite</p>
                    <p className="font-medium">
                      {formatBRL(cedenteSelecionado.limiteOperacional)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Em aberto</p>
                    <p className="font-medium">
                      {formatBRL(cedenteSelecionado.totalEmAberto)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vencido</p>
                    <p className="font-medium text-destructive">
                      {formatBRL(cedenteSelecionado.totalVencido)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant="secondary">{cedenteSelecionado.status}</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. Títulos disponíveis</CardTitle>
              <CardDescription>
                {cedenteId
                  ? `${titulosDoCliente.length} título(s) disponível(is) para este cedente.`
                  : "Selecione um cedente para listar títulos."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cedenteId && titulosDoCliente.length === 0 && (
                <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Nenhum título com status "Disponível" para este cedente.
                </p>
              )}
              {titulosDoCliente.length > 0 && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={
                              selecionados.size === titulosDoCliente.length &&
                              titulosDoCliente.length > 0
                            }
                            onCheckedChange={toggleTodos}
                            aria-label="Selecionar todos"
                          />
                        </TableHead>
                        <TableHead>Número</TableHead>
                        <TableHead>Sacado</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-center">Prazo</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {titulosDoCliente.map((t) => {
                        const dias = daysUntil(t.dataVencimento);
                        const checked = selecionados.has(t.id);
                        return (
                          <TableRow
                            key={t.id}
                            data-state={checked ? "selected" : undefined}
                            className="cursor-pointer"
                            onClick={() => toggleTitulo(t.id)}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleTitulo(t.id)}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {t.numero}
                            </TableCell>
                            <TableCell className="text-sm">
                              {t.sacadoNome}
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatBR(t.dataVencimento)}
                            </TableCell>
                            <TableCell className="text-center text-sm tabular-nums">
                              {dias}d
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {formatBRL(t.valorFace)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3. Parâmetros da operação</CardTitle>
              <CardDescription>
                Ajuste taxas e tarifas para refletir a política da factoring.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="taxa">Taxa de fator / deságio (% a.m.)</Label>
                <Input
                  id="taxa"
                  type="number"
                  step="0.01"
                  value={params.taxaFatorMensal}
                  onChange={(e) =>
                    updateParam("taxaFatorMensal", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="retencao">Retenção / reserva (%)</Label>
                <Input
                  id="retencao"
                  type="number"
                  step="0.1"
                  value={params.percentualRetencao}
                  onChange={(e) =>
                    updateParam("percentualRetencao", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tarifaFixa">Tarifa operacional fixa (R$)</Label>
                <Input
                  id="tarifaFixa"
                  type="number"
                  step="0.01"
                  value={params.tarifaFixa}
                  onChange={(e) => updateParam("tarifaFixa", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tarifaPorTitulo">Tarifa por título (R$)</Label>
                <Input
                  id="tarifaPorTitulo"
                  type="number"
                  step="0.01"
                  value={params.tarifaPorTitulo}
                  onChange={(e) =>
                    updateParam("tarifaPorTitulo", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="obs">Observações internas</Label>
                <Textarea
                  id="obs"
                  rows={3}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Notas sobre a simulação, condições negociadas, etc."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna direita — resumo */}
        <div className="space-y-6">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="h-5 w-5 text-primary" />
                Resumo da simulação
              </CardTitle>
              <CardDescription>
                {resultado.quantidadeTitulos} título(s) selecionado(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <Linha label="Valor bruto" value={formatBRL(resultado.valorBruto)} />
                <Linha
                  label="Prazo médio ponderado"
                  value={`${resultado.prazoMedioPonderado.toFixed(1)} dias`}
                />
                <Separator />
                <Linha
                  label="(−) Deságio estimado"
                  value={formatBRL(resultado.valorDesagio)}
                  tone="negative"
                />
                <Linha
                  label="(−) Tarifas"
                  value={formatBRL(resultado.valorTarifas)}
                  tone="negative"
                />
                <Linha
                  label="(−) Retenção"
                  value={formatBRL(resultado.valorRetencao)}
                  tone="negative"
                />
                <Separator />
                <div className="flex items-baseline justify-between rounded-md bg-primary/10 px-3 py-2">
                  <span className="text-sm font-medium">Líquido ao cedente</span>
                  <span className="text-lg font-bold tabular-nums text-primary">
                    {formatBRL(resultado.valorLiquido)}
                  </span>
                </div>
              </div>

              <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">Memória de cálculo</p>
                <p>
                  Deságio = {formatBRL(resultado.valorBruto)} ×{" "}
                  {resultado.taxaDiariaEquivalente.toFixed(4)}% ×{" "}
                  {resultado.prazoMedioPonderado.toFixed(1)}d
                </p>
                <p>
                  Tarifas = {formatBRL(params.tarifaFixa)} +{" "}
                  {formatBRL(params.tarifaPorTitulo)} ×{" "}
                  {resultado.quantidadeTitulos}
                </p>
                <p>
                  Retenção = {formatBRL(resultado.valorBruto)} ×{" "}
                  {params.percentualRetencao}%
                </p>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={gerarOperacao}
                disabled={resultado.quantidadeTitulos === 0}
              >
                <FileCheck2 className="mr-2 h-4 w-4" />
                Gerar operação a partir da simulação
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Linha({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "negative";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`tabular-nums font-medium ${
          tone === "negative" ? "text-destructive" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
