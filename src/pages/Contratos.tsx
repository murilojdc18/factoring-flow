import { useMemo, useState } from "react";
import {
  Eye,
  FileText,
  Search,
  Sparkles,
  Code2,
  FileSignature,
  Download,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
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
} from "@/data/mockContratos";
import { ContratoStatusBadge } from "@/components/contratos/StatusBadge";
import { PreviewTexto } from "@/components/contratos/PreviewTexto";
import { useModelosDocumento } from "@/hooks/useModelosDocumento";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { aplicarMockNoTexto } from "@/lib/contratoPreview";
import { formatBR } from "@/lib/dateUtils";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  DocumentoGerado,
  STATUS_DOCUMENTO,
} from "@/data/mockDocumentosGerados";
import { GerarDocumentoDialog } from "@/components/contratos/GerarDocumentoDialog";
import { AnexosSection } from "@/components/anexos/AnexosSection";
import { exportarDocumentoPdf } from "@/lib/exportarPdf";
import { useDocumentosGerados } from "@/hooks/useDocumentosGerados";

type ModalState =
  | { tipo: "fechado" }
  | { tipo: "preview"; modelo: ModeloContrato };

export default function Contratos() {
  const { modelos, isLoading, error } = useModelosDocumento();
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [modal, setModal] = useState<ModalState>({ tipo: "fechado" });
  const [previewComMock, setPreviewComMock] = useState(false);
  const {
    documentos,
    isLoading: isLoadingDocs,
    error: errorDocs,
    updateStatus,
  } = useDocumentosGerados();
  const [gerarOpen, setGerarOpen] = useState(false);
  const [docPreview, setDocPreview] = useState<DocumentoGerado | null>(null);

  const handleSalvarDocumento = (doc: DocumentoGerado) => {
    setGerarOpen(false);
    toast.success("Documento gerado salvo.", {
      description: `${doc.modeloNome} • Operação ${doc.operacaoNumero}`,
    });
  };

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return modelos.filter((m) => {
      const okBusca = !q || m.nome.toLowerCase().includes(q);
      const okTipo = tipoFiltro === "todos" || m.tipo === tipoFiltro;
      const okStatus = statusFiltro === "todos" || m.status === statusFiltro;
      return okBusca && okTipo && okStatus;
    });
  }, [modelos, busca, tipoFiltro, statusFiltro]);

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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setGerarOpen(true)}>
              <FileSignature className="mr-2 h-4 w-4" /> Gerar documento
            </Button>
          </div>
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

      <Tabs defaultValue="modelos" className="space-y-6">
        <TabsList>
          <TabsTrigger value="modelos">Modelos</TabsTrigger>
          <TabsTrigger value="documentos">
            Documentos gerados
            {documentos.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {documentos.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="modelos" className="space-y-6">

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <LoadingState label="Carregando modelos..." />
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
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
                  <TableCell colSpan={6} className="p-0">
                    <EmptyState
                      variant="inline"
                      icon={FileSignature}
                      title="Nenhum modelo encontrado"
                      description="Ajuste a busca ou os filtros para ver mais modelos."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map((m) => (
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="documentos" className="space-y-4">
          <Card className="shadow-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Operação</TableHead>
                    <TableHead>Cedente</TableHead>
                    <TableHead>Gerado em</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingDocs ? (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0">
                        <LoadingState label="Carregando documentos..." />
                      </TableCell>
                    </TableRow>
                  ) : errorDocs ? (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0">
                        <ErrorState
                          title="Não foi possível carregar"
                          description={
                            errorDocs instanceof Error
                              ? errorDocs.message
                              : "Erro inesperado."
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ) : documentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0">
                        <EmptyState
                          variant="inline"
                          icon={FileText}
                          title="Nenhum documento gerado"
                          description="Preencha um modelo a partir de uma operação para gerar contratos, aditivos ou borderôs."
                          actionLabel="Gerar documento"
                          onAction={() => setGerarOpen(true)}
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    documentos.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">{d.id}</TableCell>
                      <TableCell className="text-sm">
                        {d.modeloNome}{" "}
                        <span className="text-xs text-muted-foreground">v{d.modeloVersao}</span>
                      </TableCell>
                      <TableCell className="text-sm">{d.operacaoNumero}</TableCell>
                      <TableCell className="text-sm">{d.cedenteNome}</TableCell>
                      <TableCell className="text-sm">{formatBR(d.geradoEm)}</TableCell>
                      <TableCell>
                        <Select
                          value={d.status}
                          onValueChange={(v) => {
                            const novoStatus = v as DocumentoGerado["status"];
                            updateStatus(d.id, novoStatus);
                            // TODO(n8n): Integração externa será implementada futuramente
                            // via Edge Function segura (evento `documento_aprovado_internamente`).
                            // Nesta fase, a aprovação interna é apenas local — não dispara webhook,
                            // não exige N8N_WEBHOOK_DOCUMENTOS_URL nem N8N_WEBHOOK_SECRET, e não
                            // bloqueia o fluxo caso esses secrets não existam.
                          }}
                        >
                          <SelectTrigger className="h-8 w-[180px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_DOCUMENTO.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setDocPreview(d)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            exportarDocumentoPdf(d);
                            toast.success("PDF gerado para download.");
                          }}
                          title="Exportar PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

      {/* Wizard: Gerar documento proforma a partir de operação */}
      <GerarDocumentoDialog
        open={gerarOpen}
        onOpenChange={setGerarOpen}
        onSalvar={handleSalvarDocumento}
      />

      {/* Preview de documento gerado */}
      <Dialog
        open={!!docPreview}
        onOpenChange={(o) => !o && setDocPreview(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {docPreview && (
            <>
              <DialogHeader>
                <DialogTitle>{docPreview.id}</DialogTitle>
                <DialogDescription>
                  {docPreview.tipoDocumento} • Modelo {docPreview.modeloNome} v
                  {docPreview.modeloVersao} • Operação {docPreview.operacaoNumero}
                </DialogDescription>
              </DialogHeader>
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertTitle>Documento proforma</AlertTitle>
                <AlertDescription>
                  Texto gerado para revisão jurídica. Não constitui documento
                  definitivo nem dispensa validação.
                </AlertDescription>
              </Alert>
              <div className="rounded-md border bg-muted/30 p-4">
                <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground">
                  {docPreview.textoFinal}
                </pre>
              </div>
              {docPreview.observacoes && (
                <div className="rounded-md border-l-4 border-primary bg-primary/5 p-3">
                  <p className="text-xs font-semibold text-primary">Observações internas</p>
                  <p className="mt-1 text-sm text-muted-foreground">{docPreview.observacoes}</p>
                </div>
              )}
              <AnexosSection
                entidadeTipo="documento"
                entidadeId={docPreview.id}
                titulo="Anexos do documento"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setDocPreview(null)}
                >
                  Fechar
                </Button>
                <Button
                  onClick={() => {
                    exportarDocumentoPdf(docPreview);
                    toast.success("PDF gerado para download.");
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar PDF
                </Button>
              </div>
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
