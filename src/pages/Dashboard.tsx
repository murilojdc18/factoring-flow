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

/* ---------- Mock data ---------- */

const kpis = [
  {
    label: "Valor total em carteira",
    value: "R$ 12.480.300",
    delta: "+4,2% vs. mês anterior",
    icon: Wallet,
    tone: "primary" as const,
  },
  {
    label: "Total a vencer",
    value: "R$ 9.815.420",
    delta: "1.142 títulos",
    icon: CalendarClock,
    tone: "success" as const,
  },
  {
    label: "Total vencido",
    value: "R$ 348.760",
    delta: "62 títulos em atraso",
    icon: AlertTriangle,
    tone: "destructive" as const,
  },
  {
    label: "Operações no mês",
    value: "184",
    delta: "+12 vs. mês anterior",
    icon: Activity,
    tone: "primary" as const,
  },
  {
    label: "Ticket médio",
    value: "R$ 67.840",
    delta: "+2,1% no trimestre",
    icon: Receipt,
    tone: "accent" as const,
  },
  {
    label: "Taxa média praticada",
    value: "2,84% a.m.",
    delta: "-0,12 p.p. no mês",
    icon: Percent,
    tone: "warning" as const,
  },
  {
    label: "Clientes ativos",
    value: "127",
    delta: "+5 este mês",
    icon: Users,
    tone: "primary" as const,
  },
  {
    label: "Sacados ativos",
    value: "892",
    delta: "+34 este mês",
    icon: Building2,
    tone: "primary" as const,
  },
];

const proximosVencimentos = [
  { id: "TIT-10245", cedente: "Comercial Vitória LTDA", sacado: "Supermercado Atlas SA", vencimento: "26/04/2026", valor: "R$ 18.420,00" },
  { id: "TIT-10246", cedente: "Indústria Norte SA", sacado: "Mercantil Bahia LTDA", vencimento: "27/04/2026", valor: "R$ 9.680,00" },
  { id: "TIT-10247", cedente: "Tech Logística ME", sacado: "Transportes Litoral SA", vencimento: "28/04/2026", valor: "R$ 4.215,00" },
  { id: "TIT-10248", cedente: "Distribuidora Sul LTDA", sacado: "Rede Farma Plus", vencimento: "29/04/2026", valor: "R$ 25.170,00" },
  { id: "TIT-10249", cedente: "Agro Pampa LTDA", sacado: "Cooperativa Central", vencimento: "30/04/2026", valor: "R$ 7.890,00" },
  { id: "TIT-10250", cedente: "Metalúrgica Ipê SA", sacado: "Construtora Horizonte", vencimento: "02/05/2026", valor: "R$ 33.500,00" },
];

const titulosVencidos = [
  { id: "TIT-09812", cedente: "Têxtil Aurora LTDA", sacado: "Modas Bella SA", vencimento: "10/04/2026", diasAtraso: 16, valor: "R$ 12.300,00" },
  { id: "TIT-09845", cedente: "Comercial Vitória LTDA", sacado: "Mercado Vila Nova", vencimento: "14/04/2026", diasAtraso: 12, valor: "R$ 6.450,00" },
  { id: "TIT-09877", cedente: "Indústria Norte SA", sacado: "Atacadão Pampulha", vencimento: "18/04/2026", diasAtraso: 8, valor: "R$ 21.800,00" },
  { id: "TIT-09901", cedente: "Distribuidora Sul LTDA", sacado: "Padaria Estrela", vencimento: "20/04/2026", diasAtraso: 6, valor: "R$ 3.120,00" },
  { id: "TIT-09934", cedente: "Tech Logística ME", sacado: "EcoTrans LTDA", vencimento: "22/04/2026", diasAtraso: 4, valor: "R$ 5.940,00" },
];

const evolucaoCarteira = [
  { mes: "Mai", valor: 8.2 },
  { mes: "Jun", valor: 8.9 },
  { mes: "Jul", valor: 9.6 },
  { mes: "Ago", valor: 10.1 },
  { mes: "Set", valor: 10.8 },
  { mes: "Out", valor: 11.2 },
  { mes: "Nov", valor: 11.7 },
  { mes: "Dez", valor: 11.5 },
  { mes: "Jan", valor: 11.9 },
  { mes: "Fev", valor: 12.1 },
  { mes: "Mar", valor: 12.3 },
  { mes: "Abr", valor: 12.48 },
];

const operacoesPorStatus = [
  { status: "Em análise", total: 24 },
  { status: "Aprovada", total: 38 },
  { status: "Formalizada", total: 52 },
  { status: "Liquidada", total: 412 },
  { status: "Em atraso", total: 62 },
  { status: "Recomprada", total: 14 },
  { status: "Cancelada", total: 9 },
];

const statusVariant: Record<string, string> = {
  "Em análise": "bg-muted text-muted-foreground border-border",
  "Aprovada": "bg-primary/10 text-primary border-primary/20",
  "Formalizada": "bg-accent/15 text-accent-foreground border-accent/30",
  "Liquidada": "bg-success/10 text-success border-success/20",
  "Em atraso": "bg-destructive/10 text-destructive border-destructive/20",
  "Recomprada": "bg-warning/15 text-warning-foreground border-warning/30",
  "Cancelada": "bg-muted text-muted-foreground border-border line-through",
};

/* ---------- Component ---------- */

export default function Dashboard() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral da carteira, operações e cobrança."
        actions={
          <Button className="bg-gradient-primary text-primary-foreground shadow-elevated hover:opacity-90">
            Nova operação
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            hint={kpi.delta}
            icon={kpi.icon}
            tone={kpi.tone}
          />
        ))}
      </div>

      {/* Gráficos */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">
              Evolução mensal da carteira
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Valores em milhões (R$) — últimos 12 meses
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                data={evolucaoCarteira}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="carteiraGradient" x1="0" y1="0" x2="0" y2="1">
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
                  tickFormatter={(v) => `R$ ${v}M`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`R$ ${v.toFixed(2)} M`, "Carteira"]}
                />
                <Area
                  type="monotone"
                  dataKey="valor"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#carteiraGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
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
                data={operacoesPorStatus}
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
                Títulos a vencer nos próximos dias
              </p>
            </div>
            <Badge
              variant="outline"
              className="border-success/30 bg-success/10 text-success"
            >
              {proximosVencimentos.length} títulos
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
                {proximosVencimentos.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.id}</TableCell>
                    <TableCell className="font-medium">{t.sacado}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {t.vencimento}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {t.valor}
                    </TableCell>
                  </TableRow>
                ))}
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
              {titulosVencidos.length} em atraso
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
                {titulosVencidos.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.id}</TableCell>
                    <TableCell className="font-medium">{t.sacado}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={statusVariant["Em atraso"]}
                      >
                        {t.diasAtraso} dias
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {t.valor}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}