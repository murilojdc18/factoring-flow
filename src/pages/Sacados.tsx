import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Building2,
  CheckCircle2,
  Clock,
  Ban,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  mockSacados,
  STATUS_SACADO,
  type Sacado,
  type SacadoStatus,
  type TipoPessoa,
} from "@/data/mockSacados";
import {
  SacadoStatusBadge,
  ScoreBadge,
} from "@/components/sacados/StatusBadge";
import {
  SacadoForm,
  type SacadoFormData,
} from "@/components/sacados/SacadoForm";
import { SacadoDetalhes } from "@/components/sacados/SacadoDetalhes";
import { formatBRL } from "@/lib/format";

type FiltroStatus = "Todos" | SacadoStatus;
type FiltroTipo = "Todos" | TipoPessoa;

export default function Sacados() {
  const { toast } = useToast();
  const [sacados, setSacados] = useState<Sacado[]>(mockSacados);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("Todos");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("Todos");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Sacado | null>(null);

  const [detalheOpen, setDetalheOpen] = useState(false);
  const [visualizando, setVisualizando] = useState<Sacado | null>(null);

  const filtrados = useMemo(() => {
    const term = busca.trim().toLowerCase();
    return sacados.filter((s) => {
      const matchStatus =
        filtroStatus === "Todos" ? true : s.status === filtroStatus;
      const matchTipo = filtroTipo === "Todos" ? true : s.tipo === filtroTipo;
      const matchTermo =
        !term ||
        s.nome.toLowerCase().includes(term) ||
        s.nomeFantasia.toLowerCase().includes(term) ||
        s.documento.toLowerCase().includes(term);
      return matchStatus && matchTipo && matchTermo;
    });
  }, [sacados, busca, filtroStatus, filtroTipo]);

  const totals = useMemo(() => {
    return {
      total: sacados.length,
      ativos: sacados.filter((s) => s.status === "Ativo").length,
      analise: sacados.filter((s) => s.status === "Em análise").length,
      bloqueados: sacados.filter((s) => s.status === "Bloqueado").length,
    };
  }, [sacados]);

  function abrirNovo() {
    setEditing(null);
    setFormOpen(true);
  }
  function abrirEdicao(s: Sacado) {
    setEditing(s);
    setFormOpen(true);
  }
  function abrirDetalhes(s: Sacado) {
    setVisualizando(s);
    setDetalheOpen(true);
  }

  function salvar(data: SacadoFormData) {
    if (editing) {
      setSacados((prev) =>
        prev.map((s) => (s.id === editing.id ? { ...s, ...data } : s)),
      );
      toast({
        title: "Sacado atualizado",
        description: `${data.nome} foi atualizado com sucesso.`,
      });
    } else {
      const novo: Sacado = {
        ...data,
        id: `SAC-${String(sacados.length + 1).padStart(4, "0")}`,
        totalEmAberto: 0,
        totalVencido: 0,
        titulosPagos: 0,
        titulosEmAtraso: 0,
        criadoEm: new Date().toISOString().slice(0, 10),
      };
      setSacados((prev) => [novo, ...prev]);
      toast({
        title: "Sacado cadastrado",
        description: `${data.nome} foi adicionado.`,
      });
    }
    setFormOpen(false);
    setEditing(null);
  }

  return (
    <div>
      <PageHeader
        title="Sacados"
        description="Gestão dos devedores responsáveis pelo pagamento dos títulos."
        actions={
          <PermissionGate area="sacados" action="create">
            <Button
              onClick={abrirNovo}
              className="bg-gradient-primary text-primary-foreground shadow-elevated hover:opacity-90"
            >
              <Plus className="mr-1 h-4 w-4" />
              Novo sacado
            </Button>
          </PermissionGate>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Total
              </p>
              <p className="text-2xl font-bold tabular-nums">{totals.total}</p>
            </div>
            <Building2 className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Ativos
              </p>
              <p className="text-2xl font-bold tabular-nums text-success">
                {totals.ativos}
              </p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-success" />
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Em análise
              </p>
              <p className="text-2xl font-bold tabular-nums text-warning">
                {totals.analise}
              </p>
            </div>
            <Clock className="h-5 w-5 text-warning" />
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Bloqueados
              </p>
              <p className="text-2xl font-bold tabular-nums text-destructive">
                {totals.bloqueados}
              </p>
            </div>
            <Ban className="h-5 w-5 text-destructive" />
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card className="mt-6 shadow-card">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, razão social, CPF ou CNPJ..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Tipo:</span>
                <Select
                  value={filtroTipo}
                  onValueChange={(v) => setFiltroTipo(v as FiltroTipo)}
                >
                  <SelectTrigger className="h-9 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                    <SelectItem value="PF">Pessoa Física</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Status:</span>
                <Select
                  value={filtroStatus}
                  onValueChange={(v) => setFiltroStatus(v as FiltroStatus)}
                >
                  <SelectTrigger className="h-9 w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    {STATUS_SACADO.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sacado</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Cidade / UF</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-right">Em aberto</TableHead>
                  <TableHead className="text-right">Vencido</TableHead>
                  <TableHead className="text-center">Pagos</TableHead>
                  <TableHead className="text-center">Atraso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="p-0"
                    >
                      <EmptyState
                        variant="inline"
                        icon={Building2}
                        title="Nenhum sacado encontrado"
                        description="Ajuste a busca ou os filtros para ver resultados."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filtrados.map((s) => (
                    <TableRow key={s.id} className="hover:bg-muted/40">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono"
                          >
                            {s.tipo}
                          </Badge>
                          <div>
                            <div className="font-medium text-foreground">
                              {s.nome}
                            </div>
                            {s.nomeFantasia && (
                              <div className="text-xs text-muted-foreground">
                                {s.nomeFantasia}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {s.documento}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.cidade} / {s.estado}
                      </TableCell>
                      <TableCell className="text-center">
                        <ScoreBadge score={s.scoreInterno} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBRL(s.totalEmAberto)}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums ${
                          s.totalVencido > 0
                            ? "font-semibold text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formatBRL(s.totalVencido)}
                      </TableCell>
                      <TableCell className="text-center text-success">
                        {s.titulosPagos}
                      </TableCell>
                      <TableCell
                        className={`text-center ${
                          s.titulosEmAtraso > 0
                            ? "font-semibold text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {s.titulosEmAtraso}
                      </TableCell>
                      <TableCell>
                        <SacadoStatusBadge status={s.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => abrirDetalhes(s)}
                            aria-label="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => abrirEdicao(s)}
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            Mostrando {filtrados.length} de {sacados.length} sacados
          </div>
        </CardContent>
      </Card>

      {/* Modal: criar / editar */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar sacado" : "Novo sacado"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? `Atualize os dados de ${editing.nome}.`
                : "Preencha os dados do sacado. Pessoa física ou jurídica."}
            </DialogDescription>
          </DialogHeader>
          <SacadoForm
            initial={editing}
            onSubmit={salvar}
            onCancel={() => {
              setFormOpen(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Modal: detalhes */}
      <Dialog open={detalheOpen} onOpenChange={setDetalheOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do sacado</DialogTitle>
            <DialogDescription>
              Resumo cadastral, comercial e financeiro.
            </DialogDescription>
          </DialogHeader>
          {visualizando && (
            <>
              <SacadoDetalhes sacado={visualizando} />
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button
                  variant="outline"
                  onClick={() => setDetalheOpen(false)}
                >
                  Fechar
                </Button>
                <Button
                  className="bg-gradient-primary text-primary-foreground hover:opacity-90"
                  onClick={() => {
                    setDetalheOpen(false);
                    abrirEdicao(visualizando);
                  }}
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  Editar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}