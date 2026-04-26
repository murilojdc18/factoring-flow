import {
  ArrowUpRight,
  TrendingUp,
  FileText,
  AlertCircle,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const kpis = [
  {
    label: "Volume operado (mês)",
    value: "R$ 4.820.300",
    delta: "+12,4%",
    icon: TrendingUp,
    tone: "text-success",
  },
  {
    label: "Títulos em aberto",
    value: "1.284",
    delta: "+3,1%",
    icon: FileText,
    tone: "text-primary",
  },
  {
    label: "Vencimentos hoje",
    value: "R$ 312.450",
    delta: "27 títulos",
    icon: Wallet,
    tone: "text-accent",
  },
  {
    label: "Inadimplência",
    value: "2,8%",
    delta: "-0,3 p.p.",
    icon: AlertCircle,
    tone: "text-warning",
  },
];

const recentOps = [
  { id: "BOR-2041", cedente: "Comercial Vitória LTDA", valor: "R$ 184.200", titulos: 12, status: "Efetivada" },
  { id: "BOR-2040", cedente: "Indústria Norte SA", valor: "R$ 96.800", titulos: 5, status: "Aprovada" },
  { id: "BOR-2039", cedente: "Tech Logística ME", valor: "R$ 42.150", titulos: 3, status: "Simulada" },
  { id: "BOR-2038", cedente: "Distribuidora Sul LTDA", valor: "R$ 251.700", titulos: 18, status: "Efetivada" },
  { id: "BOR-2037", cedente: "Agro Pampa LTDA", valor: "R$ 78.900", titulos: 6, status: "Cancelada" },
];

const statusVariant: Record<string, string> = {
  Efetivada: "bg-success/10 text-success border-success/20",
  Aprovada: "bg-primary/10 text-primary border-primary/20",
  Simulada: "bg-muted text-muted-foreground border-border",
  Cancelada: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function Dashboard() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Indicadores e atividade recente da operação."
        actions={
          <Button className="bg-gradient-primary text-primary-foreground shadow-elevated hover:opacity-90">
            Nova operação
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="shadow-card transition-shadow hover:shadow-elevated">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {kpi.label}
              </CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.tone}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
              <p className={`mt-1 text-xs ${kpi.tone}`}>{kpi.delta}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Operações recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Borderô</TableHead>
                  <TableHead>Cedente</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Títulos</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOps.map((op) => (
                  <TableRow key={op.id}>
                    <TableCell className="font-mono text-xs">{op.id}</TableCell>
                    <TableCell className="font-medium">{op.cedente}</TableCell>
                    <TableCell className="text-right tabular-nums">{op.valor}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{op.titulos}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusVariant[op.status]}>
                        {op.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Próximos vencimentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { d: "Hoje", v: "R$ 312.450", c: 27 },
              { d: "Amanhã", v: "R$ 184.900", c: 14 },
              { d: "Em 3 dias", v: "R$ 96.300", c: 9 },
              { d: "Esta semana", v: "R$ 821.200", c: 62 },
            ].map((row) => (
              <div
                key={row.d}
                className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{row.d}</p>
                  <p className="text-xs text-muted-foreground">{row.c} títulos</p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-foreground">
                  {row.v}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}