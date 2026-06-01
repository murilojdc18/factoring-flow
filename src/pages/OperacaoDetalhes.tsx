import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  FileSignature,
  FilePlus2,
  FileCheck2,
  CircleDollarSign,
  Pencil,
  XCircle,
  Info,
  History,
  ShieldAlert,
  type LucideIcon,
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
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useOperacoes } from "@/hooks/useOperacoes";
import { useClientes } from "@/hooks/useClientes";
import { useTitulos } from "@/hooks/useTitulos";
import { OperacaoStatusBadge } from "@/components/operacoes/StatusBadge";
import { formatBRL } from "@/lib/format";
import { formatBR } from "@/lib/dateUtils";
import { AnexosSection } from "@/components/anexos/AnexosSection";
import { toast } from "sonner";
import { GerarDocumentoDialog } from "@/components/contratos/GerarDocumentoDialog";
import { DocumentoGerado } from "@/data/mockDocumentosGerados";
import { RecompraDialog } from "@/components/recompras/RecompraDialog";
import { RecompraStatusBadge } from "@/components/recompras/RecompraStatusBadge";
import { STATUS_RECOMPRA, type StatusRecompra } from "@/data/mockRecompras";
import { useRecompras } from "@/hooks/useRecompras";
import { Titulo } from "@/data/mockTitulos";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { podeTransicionar } from "@/lib/operacaoTransicoes";
import type { OperacaoStatus } from "@/data/mockOperacoes";
import type { AppRole } from "@/lib/permissions";

/**
 * Transições manuais expostas na tela (máquina v1). A visibilidade de cada botão
 * é decidida por `podeFazer` (transição válida a partir do status atual + papel).
 */
const TRANSICOES_UI: {
  alvo: OperacaoStatus;
  label: string;
  icon: LucideIcon;
  destrutivo?: boolean;
}[] = [
  { alvo: "Aprovada", label: "Aprovar", icon: CheckCircle2 },
  { alvo: "Formalizada", label: "Formalizar", icon: FileCheck2 },
  { alvo: "Liquidada", label: "Liquidar", icon: CircleDollarSign },
  { alvo: "Cancelada", label: "Cancelar", icon: XCircle, destrutivo: true },
];

export default function OperacaoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [gerarTipo, setGerarTipo] = useState<
    | "Contrato de cessão de direitos creditórios"
    | "Aditivo de operação"
    | "Borderô de títulos"
    | null
  >(null);

  // Transição de status (Fase 3): alvo do dialog de confirmação + observação.
  const [transicaoAlvo, setTransicaoAlvo] = useState<OperacaoStatus | null>(
    null,
  );
  const [observacaoTransicao, setObservacaoTransicao] = useState("");
  const [isTransicionando, setIsTransicionando] = useState(false);

  // Edição v1 (metadados seguros): observações + responsável interno.
  const [editando, setEditando] = useState(false);
  const [editObs, setEditObs] = useState("");
  const [editResp, setEditResp] = useState("");
  const [isSalvandoEdicao, setIsSalvandoEdicao] = useState(false);

  // Recompra/substituição
  const { porOperacao, estado, updateStatus } = useRecompras();
  const [recompraTitulo, setRecompraTitulo] = useState<Titulo | null>(null);
  const [eventosLocais, setEventosLocais] = useState<
    { data: string; texto: string }[]
  >([]);

  const handleAtualizarStatus = async (id: string, st: StatusRecompra) => {
    try {
      await updateStatus(id, st);
      toast.success(`Status atualizado para ${st}.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao atualizar o status.",
      );
    }
  };

  // D8: cancelar = soft delete (status "Cancelado"), com confirmação.
  const handleCancelarRecompra = async (id: string) => {
    if (
      !window.confirm(
        "Cancelar esta solicitação? O registro é preservado (soft delete), apenas marcado como Cancelado.",
      )
    ) {
      return;
    }
    try {
      await updateStatus(id, "Cancelado");
      toast.success("Solicitação cancelada.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao cancelar a solicitação.",
      );
    }
  };

  const {
    operacoes,
    isLoading: isLoadingOperacoes,
    error: errorOperacoes,
    alterarStatus,
    editarOperacao,
  } = useOperacoes();
  const { roles } = useAuth();
  const { clientes, isLoading: isLoadingClientes, error: errorClientes } =
    useClientes();
  const {
    titulos: todosTitulos,
    isLoading: isLoadingTitulos,
    error: errorTitulos,
  } = useTitulos();

  const operacao = useMemo(
    () => operacoes.find((o) => o.id === id),
    [operacoes, id],
  );
  const cedente = useMemo(
    () => clientes.find((c) => c.id === operacao?.cedenteId),
    [clientes, operacao],
  );
  const titulos = useMemo(
    () => todosTitulos.filter((t) => operacao?.titulosIds.includes(t.id)),
    [todosTitulos, operacao],
  );

  // Qualquer uma das três queries carregando mantém o LoadingState, para não
  // piscar "Cedente não encontrado"/"0 títulos" antes dos lookups ficarem prontos.
  const isLoading = isLoadingOperacoes || isLoadingClientes || isLoadingTitulos;
  // Falha em clientes/títulos bloqueia a tela: num sistema financeiro é melhor
  // um erro explícito que um dado enganoso (ex.: "0 títulos" numa operação que
  // de fato tem títulos).
  const error = errorOperacoes ?? errorClientes ?? errorTitulos;

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Operação" />
        <LoadingState label="Carregando operação..." />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Operação" />
        <ErrorState
          title="Não foi possível carregar"
          description={
            error instanceof Error ? error.message : "Erro inesperado."
          }
        />
      </div>
    );
  }

  if (!operacao) {
    return (
      <div>
        <PageHeader title="Operação não encontrada" />
        <EmptyState
          icon={Info}
          title="Operação não localizada"
          description="A operação que você tentou acessar não existe ou pode ter sido removida."
          actionLabel="Voltar para operações"
          onAction={() => navigate("/operacoes")}
        />
      </div>
    );
  }

  const handleSalvarDocumento = (doc: DocumentoGerado) => {
    setGerarTipo(null);
    toast.success("Documento gerado salvo.", {
      description: `${doc.modeloNome} • Operação ${doc.operacaoNumero}`,
    });
  };

  // Papel exigido pela RPC: liquidar aceita +financeiro; demais = admin/operacional.
  const temPapel = (alvo: OperacaoStatus): boolean => {
    const permitidos: AppRole[] =
      alvo === "Liquidada"
        ? ["administrador", "operacional", "financeiro"]
        : ["administrador", "operacional"];
    return roles.some((r) => permitidos.includes(r));
  };

  // Botão só aparece se a máquina v1 permite a transição E o papel autoriza. A RPC
  // revalida tudo no banco — isto é só UX (espelha operacaoTransicoes.ts).
  const podeFazer = (alvo: OperacaoStatus): boolean =>
    podeTransicionar(operacao.status, alvo) && temPapel(alvo);

  const cancelando = transicaoAlvo === "Cancelada";
  // Espelha o P0010 da RPC: cancelar exige motivo não-vazio.
  const obsObrigatoriaFaltando =
    cancelando && observacaoTransicao.trim() === "";

  const abrirTransicao = (alvo: OperacaoStatus) => {
    setObservacaoTransicao("");
    setTransicaoAlvo(alvo);
  };

  const fecharTransicao = () => {
    setTransicaoAlvo(null);
    setObservacaoTransicao("");
  };

  const confirmarTransicao = async () => {
    const alvo = transicaoAlvo;
    if (!alvo) return;
    if (alvo === "Cancelada" && observacaoTransicao.trim() === "") return;
    setIsTransicionando(true);
    try {
      await alterarStatus(
        operacao.id,
        alvo,
        observacaoTransicao.trim() || undefined,
      );
      toast.success(`Status alterado para ${alvo}.`);
      fecharTransicao();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao alterar o status.",
      );
    } finally {
      setIsTransicionando(false);
    }
  };

  // Edição v1: papel administrador/operacional E status não-terminal (espelha o
  // guard da RPC editar_operacao). Esconde o botão quando não pode.
  const podeEditar =
    roles.some((r) =>
      (["administrador", "operacional"] as AppRole[]).includes(r),
    ) &&
    !(["Liquidada", "Cancelada", "Recomprada"] as OperacaoStatus[]).includes(
      operacao.status,
    );

  const abrirEdicao = () => {
    setEditObs(operacao.observacoes ?? "");
    setEditResp(operacao.responsavelInterno ?? "");
    setEditando(true);
  };

  const salvarEdicao = async () => {
    if (editResp.trim() === "") return; // espelha o P0012 da RPC
    setIsSalvandoEdicao(true);
    try {
      await editarOperacao(operacao.id, editObs, editResp.trim());
      toast.success("Operação atualizada.");
      setEditando(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao editar a operação.",
      );
    } finally {
      setIsSalvandoEdicao(false);
    }
  };

  const solicitacoesOperacao = porOperacao(operacao.id);

  return (
    <div>
      <PageHeader
        eyebrow="Operação"
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
          <Card className="overflow-hidden border-primary/20 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Status atual
                </span>
                <OperacaoStatusBadge status={operacao.status} />
              </div>
              <div className="flex flex-wrap gap-2">
                {podeEditar && (
                  <Button variant="outline" size="sm" onClick={abrirEdicao}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </Button>
                )}
                {TRANSICOES_UI.filter(
                  (t) => !t.destrutivo && podeFazer(t.alvo),
                ).map((t) => {
                  const Icon = t.icon;
                  return (
                    <Button
                      key={t.alvo}
                      size="sm"
                      onClick={() => abrirTransicao(t.alvo)}
                    >
                      <Icon className="mr-2 h-4 w-4" /> {t.label}
                    </Button>
                  );
                })}
                <Button variant="outline" size="sm" onClick={() => setGerarTipo("Borderô de títulos")}>
                  <FileText className="mr-2 h-4 w-4" /> Borderô
                </Button>
                <Button variant="outline" size="sm" onClick={() => setGerarTipo("Contrato de cessão de direitos creditórios")}>
                  <FileSignature className="mr-2 h-4 w-4" /> Contrato
                </Button>
                <Button variant="outline" size="sm" onClick={() => setGerarTipo("Aditivo de operação")}>
                  <FilePlus2 className="mr-2 h-4 w-4" /> Aditivo
                </Button>
                {TRANSICOES_UI.filter(
                  (t) => t.destrutivo && podeFazer(t.alvo),
                ).map((t) => {
                  const Icon = t.icon;
                  return (
                    <Button
                      key={t.alvo}
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => abrirTransicao(t.alvo)}
                    >
                      <Icon className="mr-2 h-4 w-4" /> {t.label}
                    </Button>
                  );
                })}
              </div>
            </div>
            <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
              <MiniStat label="Valor bruto" value={formatBRL(operacao.valorBruto)} />
              <MiniStat label="Líquido" value={formatBRL(operacao.valorLiquido)} tone="primary" />
              <MiniStat label="Títulos" value={String(operacao.quantidadeTitulos)} />
              <MiniStat label="Prazo médio" value={`${operacao.prazoMedio}d`} />
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
                    <TableHead>Recompra</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {titulos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0">
                        <EmptyState
                          variant="inline"
                          icon={FileText}
                          title="Nenhum título vinculado"
                          description="Esta operação ainda não possui títulos associados."
                        />
                      </TableCell>
                    </TableRow>
                  )}
                  {titulos.map((t) => {
                    const est = estado(t.id);
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs">{t.numero}</TableCell>
                        <TableCell className="text-sm">{t.sacadoNome}</TableCell>
                        <TableCell className="text-sm">{formatBR(t.dataEmissao)}</TableCell>
                        <TableCell className="text-sm">{formatBR(t.dataVencimento)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{formatBRL(t.valorFace)}</TableCell>
                        <TableCell>
                          {est ? <RecompraStatusBadge status={est.status} /> : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRecompraTitulo(t)}
                          >
                            <ShieldAlert className="mr-1 h-3.5 w-3.5" />
                            Recompra
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Anexos da operação</CardTitle>
              <CardDescription>
                Comprovantes, contratos assinados e documentos relacionados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AnexosSection
                entidadeTipo="operacao"
                entidadeId={operacao.id}
                titulo="Arquivos"
              />
            </CardContent>
          </Card>

          {/* Recompras / Substituições */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldAlert className="h-5 w-5 text-warning" />
                Recompras e substituições
              </CardTitle>
              <CardDescription>
                Solicitações registradas para títulos desta operação. Fluxo
                proforma — não gera cobrança automática.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {solicitacoesOperacao.length === 0 && eventosLocais.length === 0 ? (
                <EmptyState
                  variant="inline"
                  icon={ShieldAlert}
                  title="Sem recompras ou substituições"
                  description="Quando registradas, as solicitações aparecem aqui com seu status."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {solicitacoesOperacao.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">{s.tituloNumero}</TableCell>
                        <TableCell className="text-sm">{s.tipoAcao}</TableCell>
                        <TableCell className="max-w-[260px] truncate text-xs" title={s.motivo}>
                          {s.motivo}
                        </TableCell>
                        <TableCell className="text-xs">{s.responsavel}</TableCell>
                        <TableCell><RecompraStatusBadge status={s.status} /></TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost">Atualizar</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {STATUS_RECOMPRA.map((st) => (
                                <DropdownMenuItem
                                  key={st}
                                  onClick={() => handleAtualizarStatus(s.id, st)}
                                >
                                  {st}
                                </DropdownMenuItem>
                              ))}
                              {s.status !== "Cancelado" &&
                                s.status !== "Resolvido" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() =>
                                        handleCancelarRecompra(s.id)
                                      }
                                    >
                                      Cancelar solicitação
                                    </DropdownMenuItem>
                                  </>
                                )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {eventosLocais.length > 0 && (
                <div className="border-t bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                  <p className="mb-1 font-medium text-foreground">Eventos desta sessão</p>
                  <ul className="space-y-1">
                    {eventosLocais.map((e, i) => (
                      <li key={i}>
                        <span className="font-mono">{formatBR(e.data)}</span> — {e.texto}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
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
        onSalvar={handleSalvarDocumento}
        initialTipo={gerarTipo ?? undefined}
        initialOperacaoId={operacao.id}
      />

      <RecompraDialog
        titulo={recompraTitulo}
        operacaoId={operacao.id}
        operacaoNumero={operacao.numero}
        onClose={() => setRecompraTitulo(null)}
        onSaved={(descricao) =>
          setEventosLocais((prev) => [
            { data: new Date().toISOString().slice(0, 10), texto: descricao },
            ...prev,
          ])
        }
      />

      {/* Confirmação de transição de status (Fase 3) */}
      <AlertDialog
        open={transicaoAlvo !== null}
        onOpenChange={(aberto) => {
          if (!aberto) fecharTransicao();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {cancelando
                ? "Cancelar operação"
                : `Confirmar: ${transicaoAlvo ?? ""}`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {transicaoAlvo &&
                `A operação ${operacao.numero} passará para o status "${transicaoAlvo}".`}
              {cancelando &&
                " Os títulos reservados desta operação voltam a ficar disponíveis."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="obs-transicao">
              {cancelando
                ? "Motivo do cancelamento (obrigatório)"
                : "Observação (opcional)"}
            </Label>
            <Textarea
              id="obs-transicao"
              value={observacaoTransicao}
              onChange={(e) => setObservacaoTransicao(e.target.value)}
              placeholder={
                cancelando
                  ? "Descreva o motivo do cancelamento..."
                  : "Anote algo sobre esta mudança (opcional)..."
              }
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTransicionando}>
              Voltar
            </AlertDialogCancel>
            <Button
              variant={cancelando ? "destructive" : "default"}
              disabled={isTransicionando || obsObrigatoriaFaltando}
              onClick={confirmarTransicao}
            >
              {isTransicionando
                ? "Processando..."
                : cancelando
                  ? "Confirmar cancelamento"
                  : "Confirmar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edição v1 de metadados seguros (observações + responsável) */}
      <AlertDialog
        open={editando}
        onOpenChange={(aberto) => {
          if (!aberto) setEditando(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Editar operação {operacao.numero}</AlertDialogTitle>
            <AlertDialogDescription>
              Edita apenas observações e responsável interno. Valores, títulos e
              cedente não são alterados aqui.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-resp">Responsável interno</Label>
              <Input
                id="edit-resp"
                value={editResp}
                onChange={(e) => setEditResp(e.target.value)}
                placeholder="Nome do responsável"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-obs">Observações</Label>
              <Textarea
                id="edit-obs"
                rows={4}
                value={editObs}
                onChange={(e) => setEditObs(e.target.value)}
                placeholder="Observações internas da operação..."
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSalvandoEdicao}>
              Voltar
            </AlertDialogCancel>
            <Button
              disabled={isSalvandoEdicao || editResp.trim() === ""}
              onClick={salvarEdicao}
            >
              {isSalvandoEdicao ? "Salvando..." : "Salvar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "primary";
}) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 truncate text-sm font-bold tabular-nums ${tone === "primary" ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}
