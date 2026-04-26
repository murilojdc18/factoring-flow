import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  FileSignature,
  FilePlus2,
  Pencil,
  XCircle,
  Info,
  History,
  ShieldAlert,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { mockOperacoes } from "@/data/mockOperacoes";
import { mockClientes } from "@/data/mockClientes";
import { mockTitulos } from "@/data/mockTitulos";
import { mockModelosContrato } from "@/data/mockContratos";
import { OperacaoStatusBadge } from "@/components/operacoes/StatusBadge";
import { formatBRL } from "@/lib/format";
import { formatBR } from "@/lib/dateUtils";
import { toast } from "sonner";
import { GerarDocumentoDialog } from "@/components/contratos/GerarDocumentoDialog";
import { documentosStore } from "@/lib/documentosStore";
import { DocumentoGerado } from "@/data/mockDocumentosGerados";
import { RecompraDialog } from "@/components/recompras/RecompraDialog";
import { RecompraStatusBadge } from "@/components/recompras/RecompraStatusBadge";
import {
  STATUS_RECOMPRA,
  recomprasStore,
  useRecompras,
} from "@/data/mockRecompras";
import { Titulo } from "@/data/mockTitulos";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function OperacaoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [gerarTipo, setGerarTipo] = useState<
    | "Contrato de cessão de direitos creditórios"
    | "Aditivo de operação"
    | "Borderô de títulos"
    | null
  >(null);

  // Recompra/substituição
  const { porOperacao, estado } = useRecompras();
  const [recompraTitulo, setRecompraTitulo] = useState<Titulo | null>(null);
  const [eventosLocais, setEventosLocais] = useState<
    { data: string; texto: string }[]
  >([]);

  const operacao = useMemo(() => mockOperacoes.find((o) => o.id === id), [id]);
  const cedente = useMemo(
    () => mockClientes.find((c) => c.id === operacao?.cedenteId),
    [operacao],
  );
  const titulos = useMemo(
    () => mockTitulos.filter((t) => operacao?.titulosIds.includes(t.id)),
    [operacao],
  );

  if (!operacao) {
    return (
      <div>
        <PageHeader title="Operação não encontrada" />
        <Button variant="outline" onClick={() => navigate("/operacoes")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  const acaoSimulada = (msg: string, desc?: string) =>
    toast.success(msg, { description: desc });

  const handleSalvarDocumento = (doc: DocumentoGerado) => {
    documentosStore.add(doc);
    setGerarTipo(null);
    toast.success("Documento gerado salvo.", {
      description: `${doc.modeloNome} • Operação ${doc.operacaoNumero}`,
    });
  };

  const podeAprovar = operacao.status === "Em análise";
  const podeCancelar = !["Liquidada", "Cancelada", "Recomprada"].includes(
    operacao.status,
  );

  const solicitacoesOperacao = porOperacao(operacao.id);

  return (
    <div>
      <PageHeader
        title={`Operação ${operacao.numero}`}
        description={`${operacao.cedenteNome} • ${formatBR(operacao.dataOperacao)}`}
        actions={
          <Button variant="outline" asChild>
            <Link to="/operacoes">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Link>
          </Button>
        }
      />

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Documentos proforma</AlertTitle>
        <AlertDescription>
          Borderô, contrato e aditivo gerados aqui são proforma e devem passar
          por revisão jurídica antes de qualquer formalização.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Cabeçalho status + ações */}
          <Card className="shadow-card">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Status atual:</span>
                <OperacaoStatusBadge status={operacao.status} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => acaoSimulada("Edição em modo proforma.")}>
                  <Pencil className="mr-2 h-4 w-4" /> Editar
                </Button>
                {podeAprovar && (
                  <Button size="sm" onClick={() => acaoSimulada("Operação aprovada (mock).")}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovar
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setGerarTipo("Borderô de títulos")}>
                  <FileText className="mr-2 h-4 w-4" /> Borderô
                </Button>
                <Button variant="outline" size="sm" onClick={() => setGerarTipo("Contrato de cessão de direitos creditórios")}>
                  <FileSignature className="mr-2 h-4 w-4" /> Contrato
                </Button>
                <Button variant="outline" size="sm" onClick={() => setGerarTipo("Aditivo de operação")}>
                  <FilePlus2 className="mr-2 h-4 w-4" /> Aditivo
                </Button>
                {podeCancelar && (
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => acaoSimulada("Operação cancelada (mock).")}>
                    <XCircle className="mr-2 h-4 w-4" /> Cancelar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cedente */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Cedente</CardTitle>
            </CardHeader>
            <CardContent>
              {cedente ? (
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <Info2 label="Razão social" value={cedente.razaoSocial} />
                  <Info2 label="CNPJ" value={cedente.cnpj} />
                  <Info2 label="Responsável legal" value={cedente.responsavelLegal} />
                  <Info2 label="E-mail" value={cedente.emailPrincipal} />
                  <Info2 label="Limite operacional" value={formatBRL(cedente.limiteOperacional)} />
                  <Info2 label="Total em aberto" value={formatBRL(cedente.totalEmAberto)} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Cedente não encontrado.</p>
              )}
            </CardContent>
          </Card>

          {/* Títulos */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Títulos da operação</CardTitle>
              <CardDescription>{titulos.length} título(s) vinculado(s).</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Sacado</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {titulos.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">Nenhum título encontrado.</TableCell></TableRow>
                  )}
                  {titulos.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.numero}</TableCell>
                      <TableCell className="text-sm">{t.sacadoNome}</TableCell>
                      <TableCell className="text-sm">{formatBR(t.dataEmissao)}</TableCell>
                      <TableCell className="text-sm">{formatBR(t.dataVencimento)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatBRL(t.valorFace)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Histórico */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-5 w-5 text-primary" /> Histórico de status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-4 border-l pl-6">
                {operacao.historico.map((h, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[27px] top-1 flex h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                    <div className="flex flex-wrap items-center gap-2">
                      <OperacaoStatusBadge status={h.status} />
                      <span className="text-xs text-muted-foreground">{formatBR(h.data)} • {h.por}</span>
                    </div>
                    {h.observacao && (
                      <p className="mt-1 text-sm text-muted-foreground">{h.observacao}</p>
                    )}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {operacao.observacoes && (
            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-lg">Observações</CardTitle></CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{operacao.observacoes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Resumo financeiro */}
        <div className="space-y-6">
          <Card className="sticky top-4 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Resumo financeiro</CardTitle>
              <CardDescription>Valores estimados (proforma).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Linha label="Valor bruto" value={formatBRL(operacao.valorBruto)} />
              <Linha label="Prazo médio" value={`${operacao.prazoMedio} dias`} />
              <Linha label="Taxa aplicada" value={`${operacao.taxaAplicada.toFixed(2)}% a.m.`} />
              <Linha label="Quantidade de títulos" value={String(operacao.quantidadeTitulos)} />
              <Separator />
              <Linha label="(−) Deságio" value={formatBRL(operacao.valorDesagio)} tone="negative" />
              <Linha label="(−) Tarifas" value={formatBRL(operacao.valorTarifas)} tone="negative" />
              <Linha label="(−) Retenção" value={formatBRL(operacao.valorRetencao)} tone="negative" />
              <Separator />
              <div className="flex items-baseline justify-between rounded-md bg-primary/10 px-3 py-2">
                <span className="font-medium">Líquido ao cedente</span>
                <span className="text-lg font-bold tabular-nums text-primary">{formatBRL(operacao.valorLiquido)}</span>
              </div>
              <Separator />
              <Linha label="Responsável interno" value={operacao.responsavelInterno} />
            </CardContent>
          </Card>
        </div>
      </div>

      <GerarDocumentoDialog
        open={gerarTipo !== null}
        onOpenChange={(o) => !o && setGerarTipo(null)}
        modelos={mockModelosContrato}
        onSalvar={handleSalvarDocumento}
        initialTipo={gerarTipo ?? undefined}
        initialOperacaoId={operacao.id}
      />
    </div>
  );
}

function Info2({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}

function Linha({ label, value, tone }: { label: string; value: string; tone?: "negative" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums font-medium ${tone === "negative" ? "text-destructive" : "text-foreground"}`}>{value}</span>
    </div>
  );
}
