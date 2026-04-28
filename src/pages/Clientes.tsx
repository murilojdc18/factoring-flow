import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Users,
  CheckCircle2,
  Clock,
  Ban,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PermissionGate } from "@/components/auth/PermissionGate";
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
  STATUS_CLIENTE,
  type Cliente,
  type ClienteStatus,
} from "@/data/mockClientes";
import { StatusBadge } from "@/components/clientes/StatusBadge";
import {
  ClienteForm,
  type ClienteFormData,
} from "@/components/clientes/ClienteForm";
import { ClienteDetalhes } from "@/components/clientes/ClienteDetalhes";
import { formatBRL } from "@/lib/format";
import { useClientes } from "@/hooks/useClientes";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";

type Filtro = "Todos" | ClienteStatus;

export default function Clientes() {
  const { toast } = useToast();
  const { clientes, isLoading, error, create, update } = useClientes();
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<Filtro>("Todos");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);

  const [detalheOpen, setDetalheOpen] = useState(false);
  const [visualizando, setVisualizando] = useState<Cliente | null>(null);

  const filtrados = useMemo(() => {
    const term = busca.trim().toLowerCase();
    return clientes.filter((c) => {
      const matchStatus =
        filtroStatus === "Todos" ? true : c.status === filtroStatus;
      const matchTermo =
        !term ||
        c.razaoSocial.toLowerCase().includes(term) ||
        c.nomeFantasia.toLowerCase().includes(term) ||
        c.cnpj.toLowerCase().includes(term);
      return matchStatus && matchTermo;
    });
  }, [clientes, busca, filtroStatus]);

  const totals = useMemo(() => {
    const ativos = clientes.filter((c) => c.status === "Ativo").length;
    const analise = clientes.filter((c) => c.status === "Em análise").length;
    const bloqueados = clientes.filter((c) => c.status === "Bloqueado").length;
    return { ativos, analise, bloqueados, total: clientes.length };
  }, [clientes]);

  function abrirNovo() {
    setEditing(null);
    setFormOpen(true);
  }

  function abrirEdicao(c: Cliente) {
    setEditing(c);
    setFormOpen(true);
  }

  function abrirDetalhes(c: Cliente) {
    setVisualizando(c);
    setDetalheOpen(true);
  }

  async function salvar(data: ClienteFormData) {
    try {
      if (editing) {
        await update(editing.id, data);
        toast({
          title: "Cliente atualizado",
          description: `${data.razaoSocial} foi atualizado com sucesso.`,
        });
      } else {
        await create(data);
        toast({
          title: "Cliente cadastrado",
          description: `${data.razaoSocial} foi adicionado à carteira.`,
        });
      }
      setFormOpen(false);
      setEditing(null);
    } catch (e) {
      toast({
        title: "Erro ao salvar",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  }

  return (
    <div>
      <PageHeader
        title="Clientes / Cedentes"
        description="Gestão dos cedentes que cedem títulos para a factoring."
        actions={
          <PermissionGate area="clientes" action="create">
            <Button
              onClick={abrirNovo}
              className="bg-gradient-primary text-primary-foreground shadow-elevated hover:opacity-90"
            >
              <Plus className="mr-1 h-4 w-4" />
              Novo cliente
            </Button>
          </PermissionGate>
        }
      />

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total" value={totals.total} icon={Users} tone="primary" />
        <KpiCard
          label="Ativos"
          value={totals.ativos}
          icon={CheckCircle2}
          tone="success"
        />
        <KpiCard
          label="Em análise"
          value={totals.analise}
          icon={Clock}
          tone="warning"
        />
        <KpiCard
          label="Bloqueados"
          value={totals.bloqueados}
          icon={Ban}
          tone="destructive"
        />
      </div>

      {/* Tabela */}
      <Card className="mt-6 shadow-card">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por razão social, fantasia ou CNPJ..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Status:</span>
              <Select
                value={filtroStatus}
                onValueChange={(v) => setFiltroStatus(v as Filtro)}
              >
                <SelectTrigger className="h-9 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {STATUS_CLIENTE.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Cidade / UF</TableHead>
                  <TableHead className="text-right">Limite</TableHead>
                  <TableHead className="text-right">Em aberto</TableHead>
                  <TableHead className="text-right">Vencido</TableHead>
                  <TableHead className="text-center">Títulos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="p-0">
                      <LoadingState label="Carregando clientes..." />
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={9} className="p-0">
                      <ErrorState
                        title="Não foi possível carregar"
                        description={
                          error instanceof Error ? error.message : "Erro inesperado."
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : filtrados.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="p-0"
                    >
                      <EmptyState
                        variant="inline"
                        icon={Users}
                        title={
                          busca || filtroStatus !== "Todos"
                            ? "Nenhum cliente corresponde aos filtros"
                            : "Nenhum cliente cadastrado"
                        }
                        description={
                          busca || filtroStatus !== "Todos"
                            ? "Ajuste a busca ou o filtro de status para ver mais resultados."
                            : "Cadastre o primeiro cedente para começar a operar."
                        }
                        actionLabel={
                          busca || filtroStatus !== "Todos"
                            ? "Limpar filtros"
                            : undefined
                        }
                        onAction={
                          busca || filtroStatus !== "Todos"
                            ? () => {
                                setBusca("");
                                setFiltroStatus("Todos");
                              }
                            : undefined
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filtrados.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/40">
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {c.razaoSocial}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {c.nomeFantasia}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {c.cnpj}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.cidade} / {c.estado}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBRL(c.limiteOperacional)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBRL(c.totalEmAberto)}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums ${
                          c.totalVencido > 0
                            ? "text-destructive font-semibold"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formatBRL(c.totalVencido)}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {c.qtdTitulos}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => abrirDetalhes(c)}
                            aria-label="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => abrirEdicao(c)}
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
            Mostrando {filtrados.length} de {clientes.length} clientes
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
              {editing ? "Editar cliente" : "Novo cliente"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? `Atualize os dados de ${editing.razaoSocial}.`
                : "Preencha os dados do cedente. Campos podem ser ajustados depois."}
            </DialogDescription>
          </DialogHeader>
          <ClienteForm
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
            <DialogTitle>Detalhes do cliente</DialogTitle>
            <DialogDescription>
              Resumo cadastral, comercial e financeiro.
            </DialogDescription>
          </DialogHeader>
          {visualizando && (
            <>
              <ClienteDetalhes cliente={visualizando} />
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