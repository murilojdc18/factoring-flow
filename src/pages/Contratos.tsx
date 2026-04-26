import { useMemo, useState } from "react";
import {
  Copy,
  Eye,
  FileText,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  Sparkles,
  Code2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  ModeloContrato,
  STATUS_CONTRATO,
  TIPOS_CONTRATO,
  mockModelosContrato,
} from "@/data/mockContratos";
import { ContratoStatusBadge } from "@/components/contratos/StatusBadge";
import { PreviewTexto } from "@/components/contratos/PreviewTexto";
import { ModeloForm } from "@/components/contratos/ModeloForm";
import { aplicarMockNoTexto } from "@/lib/contratoPreview";
import { formatBR } from "@/lib/dateUtils";
import { toast } from "sonner";

type ModalState =
  | { tipo: "fechado" }
  | { tipo: "criar" }
  | { tipo: "editar"; modelo: ModeloContrato }
  | { tipo: "preview"; modelo: ModeloContrato };

export default function Contratos() {
  const [modelos, setModelos] = useState<ModeloContrato[]>(mockModelosContrato);
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [modal, setModal] = useState<ModalState>({ tipo: "fechado" });
  const [previewComMock, setPreviewComMock] = useState(false);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return modelos.filter((m) => {
      const okBusca = !q || m.nome.toLowerCase().includes(q);
      const okTipo = tipoFiltro === "todos" || m.tipo === tipoFiltro;
      const okStatus = statusFiltro === "todos" || m.status === statusFiltro;
      return okBusca && okTipo && okStatus;
    });
  }, [modelos, busca, tipoFiltro, statusFiltro]);

  const handleSalvar = (m: ModeloContrato) => {
    setModelos((prev) => {
      const existe = prev.find((p) => p.id === m.id);
      if (existe) return prev.map((p) => (p.id === m.id ? m : p));
      return [m, ...prev];
    });
    toast.success(`Modelo "${m.nome}" salvo.`);
    setModal({ tipo: "fechado" });
  };

  const handleDuplicar = (m: ModeloContrato) => {
    const copia: ModeloContrato = {
      ...m,
      id: `MOD-${Math.floor(Math.random() * 9000 + 1000)}`,
      nome: `${m.nome} (cópia)`,
      versao: "1.0",
      status: "Rascunho",
      atualizadoEm: new Date().toISOString().slice(0, 10),
    };
    setModelos((prev) => [copia, ...prev]);
    toast.success("Modelo duplicado como rascunho.");
  };

  const handleToggleStatus = (m: ModeloContrato) => {
    const novo = m.status === "Ativo" ? "Inativo" : "Ativo";
    setModelos((prev) =>
      prev.map((p) => (p.id === m.id ? { ...p, status: novo } : p)),
    );
    toast.success(`Modelo ${novo === "Ativo" ? "ativado" : "inativado"}.`);
  };

  const totais = {
    total: modelos.length,
    ativos: modelos.filter((m) => m.status === "Ativo").length,
    rascunhos: modelos.filter((m) => m.status === "Rascunho").length,
    inativos: modelos.filter((m) => m.status === "Inativo").length,
  };

  return (
    <div>
      <PageHeader
        title="Contratos & Documentos"
        description="Modelos proforma de contratos, borderôs e termos."
        actions={
          <Button
            onClick={() => setModal({ tipo: "criar" })}
            className="bg-gradient-primary text-primary-foreground shadow-elevated hover:opacity-90"
          >
            <Plus className="mr-2 h-4 w-4" /> Novo modelo
          </Button>
        }
      />

      <Alert className="mb-6">
        <FileText className="h-4 w-4" />
        <AlertTitle>Documento proforma</AlertTitle>
        <AlertDescription>
          Revisão jurídica obrigatória antes de uso. Este sistema não fornece
          garantia de validade jurídica dos modelos.
        </AlertDescription>
      </Alert>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total" value={totais.total} />
        <Kpi label="Ativos" value={totais.ativos} />
        <Kpi label="Rascunhos" value={totais.rascunhos} />
        <Kpi label="Inativos" value={totais.inativos} />
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar pelo nome do modelo..."
                className="pl-9"
              />
            </div>
            <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
              <SelectTrigger className="w-full lg:w-[280px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {TIPOS_CONTRATO.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="w-full lg:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {STATUS_CONTRATO.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-center">Versão</TableHead>
                <TableHead>Atualizado</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[180px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum modelo encontrado.
                  </TableCell>
                </TableRow>
              )}
              {filtrados.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.tipo}</TableCell>
                  <TableCell className="text-center font-mono text-xs">v{m.versao}</TableCell>
                  <TableCell className="text-sm">{formatBR(m.atualizadoEm)}</TableCell>
                  <TableCell><ContratoStatusBadge status={m.status} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Visualizar" onClick={() => setModal({ tipo: "preview", modelo: m })}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => setModal({ tipo: "editar", modelo: m })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Duplicar" onClick={() => handleDuplicar(m)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={m.status === "Ativo" ? "Inativar" : "Ativar"}
                        onClick={() => handleToggleStatus(m)}
                      >
                        {m.status === "Ativo" ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal criar/editar */}
      <Dialog
        open={modal.tipo === "criar" || modal.tipo === "editar"}
        onOpenChange={(o) => !o && setModal({ tipo: "fechado" })}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {modal.tipo === "editar" ? "Editar modelo" : "Novo modelo"}
            </DialogTitle>
            <DialogDescription>
              Use placeholders entre chaves duplas para campos dinâmicos.
            </DialogDescription>
          </DialogHeader>
          {(modal.tipo === "criar" || modal.tipo === "editar") && (
            <ModeloForm
              modelo={modal.tipo === "editar" ? modal.modelo : undefined}
              onCancel={() => setModal({ tipo: "fechado" })}
              onSubmit={handleSalvar}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal preview */}
      <Dialog
        open={modal.tipo === "preview"}
        onOpenChange={(o) => {
          if (!o) {
            setModal({ tipo: "fechado" });
            setPreviewComMock(false);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {modal.tipo === "preview" && (
            <>
              <DialogHeader>
                <DialogTitle>{modal.modelo.nome}</DialogTitle>
                <DialogDescription>
                  {modal.modelo.tipo} • v{modal.modelo.versao} • Atualizado em {formatBR(modal.modelo.atualizadoEm)}
                </DialogDescription>
              </DialogHeader>
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertTitle>Documento proforma</AlertTitle>
                <AlertDescription>
                  Revisão jurídica obrigatória antes de uso.
                </AlertDescription>
              </Alert>
              <div className="flex items-center justify-end">
                <Button
                  variant={previewComMock ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreviewComMock((v) => !v)}
                >
                  {previewComMock ? (
                    <>
                      <Code2 className="mr-2 h-4 w-4" />
                      Ver placeholders
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Preview com dados mockados
                    </>
                  )}
                </Button>
              </div>
              <div className="rounded-md border bg-muted/30 p-4">
                {previewComMock ? (
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground">
                    {aplicarMockNoTexto(modal.modelo.texto)}
                  </pre>
                ) : (
                  <PreviewTexto texto={modal.modelo.texto} />
                )}
              </div>
              {modal.modelo.observacoes && (
                <div className="rounded-md border-l-4 border-primary bg-primary/5 p-3">
                  <p className="text-xs font-semibold text-primary">Observações internas</p>
                  <p className="mt-1 text-sm text-muted-foreground">{modal.modelo.observacoes}</p>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
