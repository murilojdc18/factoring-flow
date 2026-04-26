import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FileText,
  Paperclip,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  mockTitulos,
  STATUS_TITULO,
  type Titulo,
  type TituloStatus,
} from "@/data/mockTitulos";
import { mockClientes } from "@/data/mockClientes";
import { mockSacados } from "@/data/mockSacados";
import { TituloStatusBadge } from "@/components/titulos/StatusBadge";
import {
  TituloForm,
  type TituloFormData,
} from "@/components/titulos/TituloForm";
import { TituloDetalhes } from "@/components/titulos/TituloDetalhes";
import { formatBRL } from "@/lib/format";
import { formatBR, daysUntil } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

type FiltroStatus = "Todos" | TituloStatus;
type FiltroVenc =
  | "Todos"
  | "Vencidos"
  | "Hoje"
  | "Próx. 7 dias"
  | "Próx. 30 dias";

export default function Titulos() {
  const { toast } = useToast();
  const [titulos, setTitulos] = useState<Titulo[]>(mockTitulos);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("Todos");
  const [filtroCedente, setFiltroCedente] = useState<string>("Todos");
  const [filtroSacado, setFiltroSacado] = useState<string>("Todos");
  const [filtroVenc, setFiltroVenc] = useState<FiltroVenc>("Todos");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Titulo | null>(null);
  const [detalheOpen, setDetalheOpen] = useState(false);
  const [visualizando, setVisualizando] = useState<Titulo | null>(null);

  const filtrados = useMemo(() => {
    const term = busca.trim().toLowerCase();
    return titulos.filter((t) => {
      const matchTermo =
        !term ||
        t.numero.toLowerCase().includes(term) ||
        t.cedenteNome.toLowerCase().includes(term) ||
        t.sacadoNome.toLowerCase().includes(term);
      const matchStatus =
        filtroStatus === "Todos" ? true : t.status === filtroStatus;
      const matchCedente =
        filtroCedente === "Todos" ? true : t.cedenteId === filtroCedente;
      const matchSacado =
        filtroSacado === "Todos" ? true : t.sacadoId === filtroSacado;

      let matchVenc = true;
      const dias = daysUntil(t.dataVencimento);
      if (filtroVenc === "Vencidos") matchVenc = dias < 0;
      else if (filtroVenc === "Hoje") matchVenc = dias === 0;
      else if (filtroVenc === "Próx. 7 dias")
        matchVenc = dias >= 0 && dias <= 7;
      else if (filtroVenc === "Próx. 30 dias")
        matchVenc = dias >= 0 && dias <= 30;

      return (
        matchTermo && matchStatus && matchCedente && matchSacado && matchVenc
      );
    });
  }, [titulos, busca, filtroStatus, filtroCedente, filtroSacado, filtroVenc]);

  const totals = useMemo(() => {
    const valorTotal = titulos.reduce((s, t) => s + t.valorFace, 0);
    const vencidos = titulos.filter((t) => {
      const d = daysUntil(t.dataVencimento);
      return (
        d < 0 &&
        t.status !== "Liquidado" &&
        t.status !== "Cancelado" &&
        t.status !== "Recomprado"
      );
    });
    const aVencer = titulos.filter((t) => {
      const d = daysUntil(t.dataVencimento);
      return d >= 0 && d <= 7 && t.status !== "Liquidado";
    });
    const liquidados = titulos.filter((t) => t.status === "Liquidado").length;
    return {
      total: titulos.length,
      valorTotal,
      vencidos: vencidos.length,
      aVencer: aVencer.length,
      liquidados,
    };
  }, [titulos]);

  function abrirNovo() {
    setEditing(null);
    setFormOpen(true);
  }
  function abrirEdicao(t: Titulo) {
    setEditing(t);
    setFormOpen(true);
  }
  function abrirDetalhes(t: Titulo) {
    setVisualizando(t);
    setDetalheOpen(true);
  }

  function salvar(data: TituloFormData) {
    if (editing) {
      setTitulos((prev) =>
        prev.map((t) => (t.id === editing.id ? { ...t, ...data } : t)),
      );
      toast({
        title: "Título atualizado",
        description: `${data.numero} foi atualizado com sucesso.`,
      });
    } else {
      const novo: Titulo = {
        ...data,
        id: `TIT-${10300 + titulos.length}`,
        criadoEm: new Date().toISOString().slice(0, 10),
      };
      setTitulos((prev) => [novo, ...prev]);
      toast({
        title: "Título lançado",
        description: `${data.numero} foi adicionado à carteira.`,
      });
    }
    setFormOpen(false);
    setEditing(null);
  }

  return (
    <div>
      <PageHeader
        title="Títulos / Recebíveis"
        description="Lançamento e acompanhamento dos títulos cedidos."
        actions={
          <PermissionGate area="titulos" action="create">
            <Button
              onClick={abrirNovo}
              className="bg-gradient-primary text-primary-foreground shadow-elevated hover:opacity-90"
            >
              <Plus className="mr-1 h-4 w-4" />
              Lançar título
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
                Total de títulos
              </p>
              <p className="text-2xl font-bold tabular-nums">{totals.total}</p>
              <p className="text-[11px] text-muted-foreground">
                {formatBRL(totals.valorTotal)}
              </p>
            </div>
            <FileText className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Vencem em 7 dias
              </p>
              <p className="text-2xl font-bold tabular-nums text-warning">
                {totals.aVencer}
              </p>
            </div>
            <CalendarClock className="h-5 w-5 text-warning" />
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Vencidos
              </p>
              <p className="text-2xl font-bold tabular-nums text-destructive">
                {totals.vencidos}
              </p>
            </div>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Liquidados
              </p>
              <p className="text-2xl font-bold tabular-nums text-success">
                {totals.liquidados}
              </p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-success" />
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card className="mt-6 shadow-card">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-border p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, cedente ou sacado..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
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
                    {STATUS_TITULO.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Cedente:</span>
                <Select value={filtroCedente} onValueChange={setFiltroCedente}>
                  <SelectTrigger className="h-9 w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    {mockClientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.razaoSocial}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Sacado:</span>
                <Select value={filtroSacado} onValueChange={setFiltroSacado}>
                  <SelectTrigger className="h-9 w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    {mockSacados.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Vencimento:
                </span>
                <Select
                  value={filtroVenc}
                  onValueChange={(v) => setFiltroVenc(v as FiltroVenc)}
                >
                  <SelectTrigger className="h-9 w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    <SelectItem value="Vencidos">Vencidos</SelectItem>
                    <SelectItem value="Hoje">Hoje</SelectItem>
                    <SelectItem value="Próx. 7 dias">Próx. 7 dias</SelectItem>
                    <SelectItem value="Próx. 30 dias">Próx. 30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Cedente / Sacado</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-center">Dias</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Anexos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      Nenhum título encontrado com os filtros atuais.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtrados.map((t) => {
                    const dias = daysUntil(t.dataVencimento);
                    const liquidadoOuFinal =
                      t.status === "Liquidado" ||
                      t.status === "Cancelado" ||
                      t.status === "Recomprado";
                    const vencido = dias < 0 && !liquidadoOuFinal;
                    return (
                      <TableRow
                        key={t.id}
                        className={cn(
                          "hover:bg-muted/40",
                          vencido && "bg-destructive/5",
                        )}
                      >
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {t.numero}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t.tipo}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-foreground">
                            {t.cedenteNome}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            → {t.sacadoNome}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatBR(t.dataEmissao)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-sm",
                            vencido
                              ? "font-semibold text-destructive"
                              : "text-foreground",
                          )}
                        >
                          {formatBR(t.dataVencimento)}
                        </TableCell>
                        <TableCell className="text-center">
                          {liquidadoOuFinal ? (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          ) : vencido ? (
                            <span className="text-xs font-semibold text-destructive">
                              -{Math.abs(dias)}d
                            </span>
                          ) : dias === 0 ? (
                            <span className="text-xs font-semibold text-warning">
                              hoje
                            </span>
                          ) : (
                            <span className="text-xs text-foreground">
                              {dias}d
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {formatBRL(t.valorFace)}
                        </TableCell>
                        <TableCell className="text-center">
                          {t.anexos.length > 0 ? (
                            <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Paperclip className="h-3 w-3" />
                              {t.anexos.length}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <TituloStatusBadge status={t.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => abrirDetalhes(t)}
                              aria-label="Ver"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => abrirEdicao(t)}
                              aria-label="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            Mostrando {filtrados.length} de {titulos.length} títulos
          </div>
        </CardContent>
      </Card>

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
              {editing ? "Editar título" : "Lançar novo título"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? `Atualize os dados de ${editing.numero}.`
                : "Cadastre um novo recebível na carteira."}
            </DialogDescription>
          </DialogHeader>
          <TituloForm
            initial={editing}
            onSubmit={salvar}
            onCancel={() => {
              setFormOpen(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={detalheOpen} onOpenChange={setDetalheOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do título</DialogTitle>
            <DialogDescription>
              Informações completas do recebível.
            </DialogDescription>
          </DialogHeader>
          {visualizando && (
            <>
              <TituloDetalhes titulo={visualizando} />
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button variant="outline" onClick={() => setDetalheOpen(false)}>
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