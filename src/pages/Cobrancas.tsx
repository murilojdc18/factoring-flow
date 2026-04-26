import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  History,
  MessageSquarePlus,
  Search,
  ShieldAlert,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockTitulos, Titulo } from "@/data/mockTitulos";
import {
  cobrancasStore,
  EstadoCobranca,
  EventoCobranca,
  STATUS_COBRANCA,
  StatusCobranca,
  TipoContato,
  TIPOS_CONTATO,
  useCobrancas,
} from "@/data/mockCobrancas";
import {
  EstadoRecompraTitulo,
  useRecompras,
} from "@/data/mockRecompras";
import { RecompraDialog } from "@/components/recompras/RecompraDialog";
import { RecompraStatusBadge } from "@/components/recompras/RecompraStatusBadge";
import { formatBRL } from "@/lib/format";
import { daysUntil, formatBR } from "@/lib/dateUtils";
import { toast } from "sonner";

/* ====================== Helpers ====================== */

/** Status visual de cobrança usando tokens semânticos do design system. */
function StatusBadge({ status }: { status: StatusCobranca }) {
  const map: Record<StatusCobranca, string> = {
    "A vencer": "bg-muted text-foreground",
    "Em cobrança": "bg-warning/15 text-warning-foreground border-warning/40",
    "Em negociação": "bg-primary/15 text-primary border-primary/30",
    "Promessa de pagamento":
      "bg-accent/20 text-accent-foreground border-accent/40",
    Liquidado: "bg-success/15 text-success border-success/40",
    "Para recompra": "bg-destructive/15 text-destructive border-destructive/40",
  };
  return (
    <Badge variant="outline" className={`${map[status]} font-medium`}>
      {status}
    </Badge>
  );
}

/** Estado de cobrança efetivo: usa override do store ou deriva do título. */
function estadoEfetivo(
  titulo: Titulo,
  override: EstadoCobranca | undefined,
): EstadoCobranca {
  if (override) return override;
  const dias = daysUntil(titulo.dataVencimento);
  let status: StatusCobranca = "A vencer";
  if (titulo.status === "Liquidado") status = "Liquidado";
  else if (titulo.status === "Recomprado") status = "Para recompra";
  else if (dias < 0) status = "Em cobrança";
  return {
    status,
    ultimaAcao: "—",
    proximaAcao: dias < 0 ? "Iniciar contato" : "Aguardar vencimento",
    proximaAcaoData: titulo.dataVencimento,
  };
}

function formatDataHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ====================== Página ====================== */

type TabKey = "a-vencer" | "vencidos" | "liquidados" | "historico";

export default function Cobrancas() {
  const { eventos, estados } = useCobrancas();
  const [tab, setTab] = useState<TabKey>("a-vencer");
  const [busca, setBusca] = useState("");

  const [contatoTitulo, setContatoTitulo] = useState<Titulo | null>(null);
  const [obsTitulo, setObsTitulo] = useState<Titulo | null>(null);
  const [recompraTitulo, setRecompraTitulo] = useState<Titulo | null>(null);
  const { estado: getEstadoRecompra } = useRecompras();

  // Constrói linhas combinando título + estado efetivo
  const linhas = useMemo(() => {
    return mockTitulos
      .filter((t) => t.status !== "Cancelado")
      .map((t) => ({
        titulo: t,
        estado: estadoEfetivo(t, estados[t.id]),
        dias: daysUntil(t.dataVencimento),
      }));
  }, [estados]);

  const filtroBusca = (txt: string) => {
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    return txt.toLowerCase().includes(q);
  };

  const aVencer = linhas.filter(
    (l) =>
      l.estado.status !== "Liquidado" &&
      l.estado.status !== "Para recompra" &&
      l.dias >= 0 &&
      filtroBusca(
        `${l.titulo.numero} ${l.titulo.cedenteNome} ${l.titulo.sacadoNome}`,
      ),
  );
  const vencidos = linhas.filter(
    (l) =>
      l.estado.status !== "Liquidado" &&
      l.estado.status !== "Para recompra" &&
      l.dias < 0 &&
      filtroBusca(
        `${l.titulo.numero} ${l.titulo.cedenteNome} ${l.titulo.sacadoNome}`,
      ),
  );
  const liquidados = linhas.filter(
    (l) =>
      (l.estado.status === "Liquidado" || l.estado.status === "Para recompra") &&
      filtroBusca(
        `${l.titulo.numero} ${l.titulo.cedenteNome} ${l.titulo.sacadoNome}`,
      ),
  );

  // KPIs
  const totalAVencer = aVencer.reduce((s, l) => s + l.titulo.valorFace, 0);
  const totalVencidos = vencidos.reduce((s, l) => s + l.titulo.valorFace, 0);
  const totalLiquidados = liquidados
    .filter((l) => l.estado.status === "Liquidado")
    .reduce((s, l) => s + l.titulo.valorFace, 0);

  const eventosFiltrados = eventos.filter((e) =>
    filtroBusca(
      `${e.tituloNumero} ${e.cedenteNome} ${e.sacadoNome} ${e.usuario} ${e.tipoContato} ${e.resultado}`,
    ),
  );

  // Ações rápidas (status)
  const aplicarStatus = (titulo: Titulo, status: StatusCobranca) => {
    cobrancasStore.setStatus(titulo.id, status);
    toast.success(`${titulo.numero} marcado como ${status}.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cobranças"
        description="Acompanhamento operacional de títulos a vencer, vencidos e liquidados."
      />

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Operação manual</AlertTitle>
        <AlertDescription>
          Esta tela registra ações de cobrança em base mockada. Não envia
          e-mails, SMS ou WhatsApp. Régua automática não está habilitada.
        </AlertDescription>
      </Alert>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Kpi
          label="A vencer"
          value={formatBRL(totalAVencer)}
          sub={`${aVencer.length} títulos`}
          icon={CalendarClock}
          tone="default"
        />
        <Kpi
          label="Vencidos"
          value={formatBRL(totalVencidos)}
          sub={`${vencidos.length} títulos`}
          icon={AlertTriangle}
          tone="warning"
        />
        <Kpi
          label="Liquidados"
          value={formatBRL(totalLiquidados)}
          sub={`${liquidados.length} títulos`}
          icon={CheckCircle2}
          tone="success"
        />
      </div>

      {/* Busca + Tabs */}
      <Card className="shadow-card">
        <CardContent className="p-4 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, cedente, sacado..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
            <TabsList>
              <TabsTrigger value="a-vencer">
                A vencer <Badge variant="secondary" className="ml-2">{aVencer.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="vencidos">
                Vencidos <Badge variant="secondary" className="ml-2">{vencidos.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="liquidados">
                Liquidados <Badge variant="secondary" className="ml-2">{liquidados.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="historico">
                <History className="mr-1 h-3.5 w-3.5" />
                Histórico de contatos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="a-vencer" className="mt-4">
              <TabelaTitulos
                linhas={aVencer}
                onContato={setContatoTitulo}
                onObs={setObsTitulo}
                onStatus={aplicarStatus}
                onRecompra={setRecompraTitulo}
                getRecompra={getEstadoRecompra}
              />
            </TabsContent>
            <TabsContent value="vencidos" className="mt-4">
              <TabelaTitulos
                linhas={vencidos}
                onContato={setContatoTitulo}
                onObs={setObsTitulo}
                onStatus={aplicarStatus}
                onRecompra={setRecompraTitulo}
                getRecompra={getEstadoRecompra}
                showAtraso
              />
            </TabsContent>
            <TabsContent value="liquidados" className="mt-4">
              <TabelaTitulos
                linhas={liquidados}
                onContato={setContatoTitulo}
                onObs={setObsTitulo}
                onStatus={aplicarStatus}
                onRecompra={setRecompraTitulo}
                getRecompra={getEstadoRecompra}
              />
            </TabsContent>
            <TabsContent value="historico" className="mt-4">
              <TabelaHistorico eventos={eventosFiltrados} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal: Registrar contato */}
      <RegistrarContatoDialog
        titulo={contatoTitulo}
        onClose={() => setContatoTitulo(null)}
      />

      {/* Modal: Adicionar observação (registra um evento "Outro" curto) */}
      <ObservacaoDialog
        titulo={obsTitulo}
        onClose={() => setObsTitulo(null)}
      />

      {/* Modal: Recompra / Substituição */}
      <RecompraDialog
        titulo={recompraTitulo}
        onClose={() => setRecompraTitulo(null)}
      />
    </div>
  );
}

/* ====================== Subcomponentes ====================== */

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "default" | "warning" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? "text-warning"
      : tone === "success"
        ? "text-success"
        : "text-primary";
  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <Icon className={`h-4 w-4 ${toneClass}`} />
        </div>
        <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

interface LinhaCobranca {
  titulo: Titulo;
  estado: EstadoCobranca;
  dias: number;
}

function TabelaTitulos({
  linhas,
  onContato,
  onObs,
  onStatus,
  onRecompra,
  getRecompra,
  showAtraso,
}: {
  linhas: LinhaCobranca[];
  onContato: (t: Titulo) => void;
  onObs: (t: Titulo) => void;
  onStatus: (t: Titulo, s: StatusCobranca) => void;
  onRecompra: (t: Titulo) => void;
  getRecompra: (tituloId: string) => EstadoRecompraTitulo | undefined;
  showAtraso?: boolean;
}) {
  if (linhas.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        Nenhum título nesta categoria.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Cedente</TableHead>
            <TableHead>Sacado</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">
              {showAtraso ? "Atraso" : "Dias"}
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Última ação</TableHead>
            <TableHead>Próxima ação</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map(({ titulo, estado, dias }) => {
            const recompra = getRecompra(titulo.id);
            return (
            <TableRow key={titulo.id}>
              <TableCell className="font-mono text-xs">{titulo.numero}</TableCell>
              <TableCell className="text-sm">{titulo.cedenteNome}</TableCell>
              <TableCell className="text-sm">{titulo.sacadoNome}</TableCell>
              <TableCell className="text-sm">{formatBR(titulo.dataVencimento)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatBRL(titulo.valorFace)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {dias < 0 ? (
                  <span className="text-destructive font-semibold">
                    {Math.abs(dias)}d
                  </span>
                ) : (
                  <span className="text-muted-foreground">{dias}d</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <StatusBadge status={estado.status} />
                  {recompra && <RecompraStatusBadge status={recompra.status} />}
                </div>
              </TableCell>
              <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground" title={estado.ultimaAcao}>
                {estado.ultimaAcao}
              </TableCell>
              <TableCell className="max-w-[180px] truncate text-xs" title={estado.proximaAcao}>
                <div>{estado.proximaAcao}</div>
                {estado.proximaAcaoData && (
                  <div className="text-[10px] text-muted-foreground">
                    {formatBR(estado.proximaAcaoData)}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="inline-flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onContato(titulo)}
                  >
                    <MessageSquarePlus className="mr-1 h-3.5 w-3.5" />
                    Contato
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost">Mais</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Marcar como</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onStatus(titulo, "Promessa de pagamento")}>
                        Promessa de pagamento
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onStatus(titulo, "Em negociação")}>
                        Em negociação
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onStatus(titulo, "Liquidado")}>
                        Liquidado
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onStatus(titulo, "Para recompra")}>
                        Para recompra
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onRecompra(titulo)}>
                        <ShieldAlert className="mr-2 h-4 w-4 text-warning" />
                        Marcar para recompra/substituição
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onObs(titulo)}>
                        Adicionar observação
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function TabelaHistorico({ eventos }: { eventos: EventoCobranca[] }) {
  if (eventos.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        Nenhum contato registrado.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data/hora</TableHead>
            <TableHead>Usuário</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Cedente</TableHead>
            <TableHead>Sacado</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Resultado</TableHead>
            <TableHead>Próxima ação</TableHead>
            <TableHead>Observações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {eventos.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="text-xs whitespace-nowrap">
                {formatDataHora(e.dataHora)}
              </TableCell>
              <TableCell className="text-sm">{e.usuario}</TableCell>
              <TableCell className="font-mono text-xs">{e.tituloNumero}</TableCell>
              <TableCell className="text-sm">{e.cedenteNome}</TableCell>
              <TableCell className="text-sm">{e.sacadoNome}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {e.tipoContato}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[260px] text-xs" title={e.resultado}>
                {e.resultado}
              </TableCell>
              <TableCell className="max-w-[200px] text-xs">
                <div>{e.proximaAcao || "—"}</div>
                {e.proximaAcaoData && (
                  <div className="text-[10px] text-muted-foreground">
                    {formatBR(e.proximaAcaoData)}
                  </div>
                )}
              </TableCell>
              <TableCell className="max-w-[220px] text-xs text-muted-foreground" title={e.observacoes}>
                {e.observacoes || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ====================== Modais ====================== */

function RegistrarContatoDialog({
  titulo,
  onClose,
}: {
  titulo: Titulo | null;
  onClose: () => void;
}) {
  const [tipoContato, setTipoContato] = useState<TipoContato>("Telefone");
  const [resultado, setResultado] = useState("");
  const [proximaAcao, setProximaAcao] = useState("");
  const [proximaAcaoData, setProximaAcaoData] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [marcarStatus, setMarcarStatus] = useState<StatusCobranca | "manter">(
    "manter",
  );

  // Reset quando abre/fecha
  const open = !!titulo;
  useMemo(() => {
    if (titulo) {
      setTipoContato("Telefone");
      setResultado("");
      setProximaAcao("");
      setProximaAcaoData("");
      setObservacoes("");
      setMarcarStatus("manter");
    }
  }, [titulo]);

  const handleSalvar = () => {
    if (!titulo) return;
    if (!resultado.trim()) {
      toast.error("Descreva o resultado do contato.");
      return;
    }
    cobrancasStore.registrarEvento({
      tituloId: titulo.id,
      tituloNumero: titulo.numero,
      cedenteNome: titulo.cedenteNome,
      sacadoNome: titulo.sacadoNome,
      dataHora: new Date().toISOString(),
      usuario: "Usuário atual",
      tipoContato,
      resultado: resultado.trim(),
      proximaAcao: proximaAcao.trim(),
      proximaAcaoData,
      observacoes: observacoes.trim(),
    });
    if (marcarStatus !== "manter") {
      cobrancasStore.setStatus(titulo.id, marcarStatus);
    }
    toast.success("Contato registrado.");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        {titulo && (
          <>
            <DialogHeader>
              <DialogTitle>Registrar contato — {titulo.numero}</DialogTitle>
              <DialogDescription>
                {titulo.cedenteNome} → {titulo.sacadoNome} •{" "}
                {formatBRL(titulo.valorFace)} • venc. {formatBR(titulo.dataVencimento)}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo de contato</Label>
                <Select
                  value={tipoContato}
                  onValueChange={(v) => setTipoContato(v as TipoContato)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_CONTATO.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Marcar título como</Label>
                <Select
                  value={marcarStatus}
                  onValueChange={(v) => setMarcarStatus(v as StatusCobranca | "manter")}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manter">Manter status atual</SelectItem>
                    {STATUS_COBRANCA.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resultado">Resultado do contato *</Label>
              <Textarea
                id="resultado"
                rows={3}
                value={resultado}
                onChange={(e) => setResultado(e.target.value)}
                placeholder="Ex.: Sacado confirmou pagamento para 30/04."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="prox">Próxima ação</Label>
                <Input
                  id="prox"
                  value={proximaAcao}
                  onChange={(e) => setProximaAcao(e.target.value)}
                  placeholder="Ex.: Confirmar comprovante"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proxData">Data prevista</Label>
                <Input
                  id="proxData"
                  type="date"
                  value={proximaAcaoData}
                  onChange={(e) => setProximaAcaoData(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="obs">Observações internas</Label>
              <Textarea
                id="obs"
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleSalvar}>Registrar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ObservacaoDialog({
  titulo,
  onClose,
}: {
  titulo: Titulo | null;
  onClose: () => void;
}) {
  const [obs, setObs] = useState("");
  const open = !!titulo;
  useMemo(() => {
    if (titulo) setObs("");
  }, [titulo]);

  const handleSalvar = () => {
    if (!titulo) return;
    if (!obs.trim()) {
      toast.error("Escreva a observação.");
      return;
    }
    cobrancasStore.registrarEvento({
      tituloId: titulo.id,
      tituloNumero: titulo.numero,
      cedenteNome: titulo.cedenteNome,
      sacadoNome: titulo.sacadoNome,
      dataHora: new Date().toISOString(),
      usuario: "Usuário atual",
      tipoContato: "Outro",
      resultado: "Observação interna registrada",
      proximaAcao: "",
      proximaAcaoData: "",
      observacoes: obs.trim(),
    });
    toast.success("Observação registrada.");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {titulo && (
          <>
            <DialogHeader>
              <DialogTitle>Observação — {titulo.numero}</DialogTitle>
              <DialogDescription>
                Anotação interna; não é enviada ao cedente nem ao sacado.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              rows={4}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Ex.: Sacado solicitou ligar apenas após as 14h."
            />
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleSalvar}>Salvar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}