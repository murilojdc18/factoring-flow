import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calculator, Eye, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { EmptyState } from "@/components/ui/empty-state";
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
import { mockOperacoes, STATUS_OPERACAO } from "@/data/mockOperacoes";
import { OperacaoStatusBadge } from "@/components/operacoes/StatusBadge";
import { formatBRL } from "@/lib/format";
import { formatBR } from "@/lib/dateUtils";

export default function Operacoes() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return mockOperacoes.filter((op) => {
      const okBusca =
        !q ||
        op.numero.toLowerCase().includes(q) ||
        op.cedenteNome.toLowerCase().includes(q);
      const okStatus = statusFiltro === "todos" || op.status === statusFiltro;
      return okBusca && okStatus;
    });
  }, [busca, statusFiltro]);

  const totais = useMemo(() => {
    return {
      qtd: mockOperacoes.length,
      bruto: mockOperacoes.reduce((a, o) => a + o.valorBruto, 0),
      liquido: mockOperacoes.reduce((a, o) => a + o.valorLiquido, 0),
      ativas: mockOperacoes.filter((o) =>
        ["Aprovada", "Formalizada", "Em atraso"].includes(o.status),
      ).length,
    };
  }, []);

  return (
    <div>
      <PageHeader
        title="Operações / Borderôs"
        description="Gestão de operações de fomento e seus borderôs."
        actions={
          <PermissionGate area="operacoes" action="create">
            <Button asChild className="bg-gradient-primary text-primary-foreground shadow-elevated hover:opacity-90">
              <Link to="/operacoes/simulador">
                <Calculator className="mr-2 h-4 w-4" />
                Nova operação
              </Link>
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total de operações" value={String(totais.qtd)} />
        <KpiCard label="Operações ativas" value={String(totais.ativas)} />
        <KpiCard label="Volume bruto" value={formatBRL(totais.bruto)} />
        <KpiCard label="Líquido cedido" value={formatBRL(totais.liquido)} />
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por número ou cedente..."
                className="pl-9"
              />
            </div>
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {STATUS_OPERACAO.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cedente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-center">Títulos</TableHead>
                <TableHead className="text-right">Bruto</TableHead>
                <TableHead className="text-right">Líquido</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="p-0">
                    <EmptyState
                      variant="inline"
                      icon={Calculator}
                      title="Nenhuma operação encontrada"
                      description="Ajuste a busca ou os filtros para ver resultados."
                    />
                  </TableCell>
                </TableRow>
              )}
              {filtradas.map((op) => (
                <TableRow
                  key={op.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/operacoes/${op.id}`)}
                >
                  <TableCell className="font-mono text-xs">{op.numero}</TableCell>
                  <TableCell className="text-sm">{op.cedenteNome}</TableCell>
                  <TableCell className="text-sm">{formatBR(op.dataOperacao)}</TableCell>
                  <TableCell className="text-center text-sm">{op.quantidadeTitulos}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatBRL(op.valorBruto)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-primary">{formatBRL(op.valorLiquido)}</TableCell>
                  <TableCell><OperacaoStatusBadge status={op.status} /></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigate(`/operacoes/${op.id}`); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
