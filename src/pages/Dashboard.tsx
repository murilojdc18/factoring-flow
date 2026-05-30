import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  Wallet,
  CalendarClock,
  AlertTriangle,
  Activity,
  Receipt,
  Percent,
  Users,
  Building2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";

import { useClientes } from "@/hooks/useClientes";
import { useSacados } from "@/hooks/useSacados";
import { useTitulos } from "@/hooks/useTitulos";
import { useOperacoes } from "@/hooks/useOperacoes";
import { montarDashboard } from "@/lib/dashboardAgregado";
import { formatBRL, formatNumber } from "@/lib/format";
import { formatBR } from "@/lib/dateUtils";

/* ---------- Component ---------- */

export default function Dashboard() {
  const navigate = useNavigate();

  const {
    clientes,
    isLoading: isLoadingClientes,
    error: errorClientes,
  } = useClientes();
  const {
    sacados,
    isLoading: isLoadingSacados,
    error: errorSacados,
  } = useSacados();
  const {
    titulos,
    isLoading: isLoadingTitulos,
    error: errorTitulos,
  } = useTitulos();
  const {
    operacoes,
    isLoading: isLoadingOperacoes,
    error: errorOperacoes,
  } = useOperacoes();

  // Qualquer fonte carregando mantém o LoadingState (mesmo padrão de
  // Relatorios L145-151): cedenteNome/sacadoNome dependem do lookup
  // clientes+sacados nos mappers de título/operação.
  const isLoading =
    isLoadingClientes ||
    isLoadingSacados ||
    isLoadingTitulos ||
    isLoadingOperacoes;
  const error =
    errorClientes ?? errorSacados ?? errorTitulos ?? errorOperacoes;

  const dash = useMemo(
    () => montarDashboard({ clientes, sacados, titulos, operacoes }),
    [clientes, sacados, titulos, operacoes],
  );

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          description="Visão geral da carteira, operações e cobrança."
        />
        <LoadingState label="Carregando dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          description="Visão geral da carteira, operações e cobrança."
        />
        <ErrorState
          title="Não foi possível carregar"
          description={
            error instanceof Error ? error.message : "Erro inesperado."
          }
        />
      </div>
    );
  }

  const { kpis } = dash;
  const deltaOperacoes = kpis.operacoesNoMes - kpis.operacoesMesAnterior;

  const cards = [
    {
      label: "Valor total em carteira",
      value: formatBRL(kpis.carteiraEmAberto),
      hint: `${formatNumber(kpis.qtdTitulosEmAberto)} títulos em aberto`,
      icon: Wallet,
      tone: "primary" as const,
    },
    {
      label: "Total a vencer",
      value: formatBRL(kpis.totalAVencer),
      hint: `${formatNumber(kpis.qtdAVencer)} títulos`,
      icon: CalendarClock,
      tone: "success" as const,
    },
    {
      label: "Total vencido",
      value: formatBRL(kpis.totalVencido),
      hint: `${formatNumber(kpis.qtdVencido)} em atraso`,
      icon: AlertTriangle,
      tone: "destructive" as const,
    },
    {
      label: "Operações no mês",
      value: formatNumber(kpis.operacoesNoMes),
      hint: `${deltaOperacoes >= 0 ? "+" : ""}${formatNumber(
        deltaOperacoes,
      )} vs. mês anterior`,
      icon: Activity,
      tone: "primary" as const,
    },
    {
      label: "Ticket médio",
      value: formatBRL(kpis.ticketMedio),
      // Sem sub-texto: não há base para variação (operações sem snapshot histórico).
      hint: undefined,
      icon: Receipt,
      tone: "accent" as const,
    },
    {
      label: "Taxa média praticada",
      value: `${kpis.taxaMediaPonderada.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}% a.m.`,
      hint: undefined,
      icon: Percent,
      tone: "warning" as const,
    },
    {
      label: "Clientes ativos",
      value: formatNumber(kpis.clientesAtivos),
      hint: `+${formatNumber(kpis.clientesNovosNoMes)} novos este mês`,
      icon: Users,
      tone: "primary" as const,
    },
    {
      label: "Sacados ativos",
      value: formatNumber(kpis.sacadosAtivos),
      hint: `+${formatNumber(kpis.sacadosNovosNoMes)} novos este mês`,
      icon: Building2,
      tone: "primary" as const,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral da carteira, operações e cobrança."
        actions={
          <Button
            onClick={() => navigate("/operacoes/simulador")}
            className="bg-gradient-primary text-primary-foreground shadow-elevated hover:opacity-90"
          >
            Nova operação
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <KpiCard
            key={card.label}
            label={card.label}
            value={card.value}
            hint={card.hint}
            icon={card.icon}
            tone={card.tone}
          />
        ))}
      </div>

      {/* Gráficos */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Volume operado por mês</CardTitle>
            <p className="text-xs text-muted-foreground">
              Soma do valor bruto operado, por mês da operação
            </p>
          </CardHeader>
          <CardContent>
            {dash.volumePorMes.length === 0 ? (
              <EmptyChart msg="Sem operações para exibir." />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart
                  data={dash.volumePorMes}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="volumeGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="mes"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatBRL(Number(v)).replace("R$", "")}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [formatBRL(v), "Volume operado"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="valor"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#volumeGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Operações por status</CardTitle>
            <p className="text-xs text-muted-foreground">
              Distribuição atual da carteira
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={dash.operacoesPorStatus}
                layout="vertical"
                margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="status"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="total"
                  fill="hsl(var(--primary))"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabelas */}
      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Próximos vencimentos</CardTitle>
              <p className="text-xs text-muted-foreground">
                Títulos a vencer mais próximos
              </p>
            </div>
            <Badge
              variant="outline"
              className="border-success/30 bg-success/10 text-success"
            >
              {dash.proximosVencimentos.length} títulos
            </Badge>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Sacado</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dash.proximosVencimentos.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      Nenhum título a vencer.
                    </TableCell>
                  </TableRow>
                ) : (
                  dash.proximosVencimentos.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">
                        {t.numero}
                      </TableCell>
                      <TableCell className="font-medium">
                        {t.sacadoNome}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatBR(t.dataVencimento)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {formatBRL(t.valorFace)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Títulos vencidos</CardTitle>
              <p className="text-xs text-muted-foreground">
                Em atraso — acompanhamento de cobrança
              </p>
            </div>
            <Badge
              variant="outline"
              className="border-destructive/30 bg-destructive/10 text-destructive"
            >
              {dash.titulosVencidos.length} em atraso
            </Badge>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Sacado</TableHead>
                  <TableHead className="text-center">Atraso</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dash.titulosVencidos.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      Nenhum título vencido.
                    </TableCell>
                  </TableRow>
                ) : (
                  dash.titulosVencidos.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">
                        {t.numero}
                      </TableCell>
                      <TableCell className="font-medium">
                        {t.sacadoNome}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className="border-destructive/20 bg-destructive/10 text-destructive"
                        >
                          {t.diasAtraso} dias
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {formatBRL(t.valorFace)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyChart({ msg }: { msg: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-md border border-dashed bg-muted/30 text-sm text-muted-foreground">
      {msg}
    </div>
  );
}
