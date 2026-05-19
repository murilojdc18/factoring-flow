import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  CalendarIcon,
  FileCheck2,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { cn } from "@/lib/utils";
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
  const [dataBase, setDataBase] = useState<Date>(new Date());

  const cedentesElegiveis = useMemo(
    () => mockClientes.filter((c) => c.status === "Ativo"),
    [],
  );

  const titulosDoCliente = useMemo(() => {
    if (!cedenteId) return [];
    return mockTitulos.filter(
      (t) =>
        t.cedenteId === cedenteId &&
        t.status === "Disponível" &&
        daysUntil(t.dataVencimento, dataBase) >= 0,
    );
  }, [cedenteId, dataBase]);

  const titulosSelecionados = useMemo(
    () => titulosDoCliente.filter((t) => selecionados.has(t.id)),
    [titulosDoCliente, selecionados],
  );

  const resultado = useMemo(
    () => calcularSimulacao(titulosSelecionados, params, dataBase),
    [titulosSelecionados, params, dataBase],
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
    // Regra E: defesa contra negativo mesmo se o min="0" do input for ignorado.
    setParams((p) => ({ ...p, [k]: isNaN(num) ? 0 : Math.max(0, num) }));
  };

  const gerarOperacao = () => {
    if (titulosSelecionados.length === 0) {
      toast.error("Selecione ao menos um título.");
      return;
    }
    // Regra D: defesa simétrica ao botão desabilitado.
    if (resultado.liquidoInvalido) {
      toast.error("Líquido negativo — revise os parâmetros antes de gerar.");
      return;
    }
    toast.success("Operação simulada gerada (proforma).", {
      description: `${resultado.quantidadeTitulos} título(s) — Líquido estimado ${formatBRL(resultado.valorLiquido)}`,
    });
  };

  const cedenteSelecionado = cedentesElegiveis.find((c) => c.id === cedenteId);

  // Regra G: limite disponível = limite operacional − total já em aberto.
  const limiteDisponivel = cedenteSelecionado
    ? cedenteSelecionado.limiteOperacional - cedenteSelecionado.totalEmAberto
    : 0;
  const excedeLimite =
    !!cedenteSelecionado && resultado.valorBruto > limiteDisponivel;

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
                  Nenhum título disponível para este cedente nesta data-base.
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
                        const dias = daysUntil(t.dataVencimento, dataBase);
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
              <div className="space-y-2 sm:col-span-2">
                <Label>Data-base da operação</Label>
                <DataBasePicker value={dataBase} onChange={setDataBase} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxa">Taxa de fator / deságio (% a.m.)</Label>
                <Input
                  id="taxa"
                  type="number"
                  step="0.01"
                  min="0"
                  max="50"
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
                  min="0"
                  max="100"
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
                  min="0"
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
                  min="0"
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

              {excedeLimite && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Limite do cedente excedido</AlertTitle>
                  <AlertDescription>
                    O valor bruto desta operação (
                    {formatBRL(resultado.valorBruto)}) ultrapassa o limite
                    disponível do cedente ({formatBRL(limiteDisponivel)}). A
                    simulação continua, mas a operação exigirá revisão de
                    limite antes de ser concluída.
                  </AlertDescription>
                </Alert>
              )}

              {resultado.liquidoInvalido && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Líquido negativo</AlertTitle>
                  <AlertDescription>
                    O líquido ao cedente ficou negativo com os parâmetros
                    atuais. Revise taxa, tarifas, retenção ou os títulos
                    selecionados antes de gerar a operação.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={gerarOperacao}
                disabled={
                  resultado.quantidadeTitulos === 0 ||
                  resultado.liquidoInvalido
                }
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

// Regra F: seletor da data-base. Mesmo idiom (Popover + Calendar + date-fns)
// já usado no TituloForm, mas operando sobre Date (não ISO string), porque é
// o que calcularSimulacao espera como 3º argumento.
function DataBasePicker({
  value,
  onChange,
}: {
  value: Date;
  onChange: (d: Date) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start text-left font-normal sm:w-auto"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {format(value, "dd/MM/yyyy", { locale: ptBR })}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => d && onChange(d)}
          initialFocus
          locale={ptBR}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
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
