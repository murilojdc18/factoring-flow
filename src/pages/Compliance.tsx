import { useMemo, useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  ClipboardCheck,
  History,
  Plus,
  ShieldCheck,
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AnaliseDialog } from "@/components/compliance/AnaliseDialog";
import { RiscoBadge } from "@/components/compliance/RiscoBadge";
import {
  AnaliseCompliance,
  CHECKLIST_ONBOARDING,
  CHECKLIST_OPERACAO,
  EscopoAnalise,
  progressoChecklist,
} from "@/data/mockCompliance";
import { useCompliance } from "@/hooks/useCompliance";
import { useClientes } from "@/hooks/useClientes";
import { useOperacoes } from "@/hooks/useOperacoes";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { formatBR } from "@/lib/dateUtils";

function formatarDataHora(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${formatBR(d.toISOString().slice(0, 10))} ${d
    .toTimeString()
    .slice(0, 5)}`;
}

export default function Compliance() {
  const {
    analises,
    politicas,
    obterAnalisePorAlvo,
    registrarAnalise,
    isLoading: complianceLoading,
    error,
  } = useCompliance();
  const { clientes, isLoading: clientesLoading } = useClientes();
  const { operacoes, isLoading: operacoesLoading } = useOperacoes();
  const carregando = complianceLoading || clientesLoading || operacoesLoading;
  const [escopo, setEscopo] = useState<EscopoAnalise>("Cliente");
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<AnaliseCompliance | undefined>();
  const [alvoInicial, setAlvoInicial] = useState<string | undefined>();

  // Alvos das fontes reais (correção 2.7): clientes/operações do Supabase.
  const alvosCliente = useMemo(
    () => clientes.map((c) => ({ id: c.id, nome: c.razaoSocial })),
    [clientes],
  );
  const alvosOperacao = useMemo(
    () =>
      operacoes.map((o) => ({
        id: o.id,
        nome: `${o.numero} — ${o.cedenteNome}`,
      })),
    [operacoes],
  );
  const alvosDoEscopo = (esc: EscopoAnalise) =>
    esc === "Cliente" ? alvosCliente : alvosOperacao;

  const semAnaliseClientes = alvosCliente.filter(
    (t) => !obterAnalisePorAlvo("Cliente", t.id),
  );
  const semAnaliseOperacoes = alvosOperacao.filter(
    (t) => !obterAnalisePorAlvo("Operação", t.id),
  );

  const totalClientes = alvosCliente.length;
  const totalOperacoes = alvosOperacao.length;

  // Enriquecimento (padrão 2.8): alvoNome derivado dos dados reais; fallback
  // defensivo no nome do mock/"" se o alvo não estiver na lista carregada.
  const analisesEnriquecidas = useMemo(() => {
    const nomeCliente = new Map(clientes.map((c) => [c.id, c.razaoSocial]));
    const nomeOperacao = new Map(
      operacoes.map((o) => [o.id, `${o.numero} — ${o.cedenteNome}`]),
    );
    return analises.map((a) => ({
      ...a,
      alvoNome:
        (a.escopo === "Cliente"
          ? nomeCliente.get(a.alvoId)
          : nomeOperacao.get(a.alvoId)) ??
        a.alvoNome ??
        "",
    }));
  }, [analises, clientes, operacoes]);

  const counts = useMemo(() => {
    return {
      Baixo: analises.filter((a) => a.nivelRisco === "Baixo").length,
      Médio: analises.filter((a) => a.nivelRisco === "Médio").length,
      Alto: analises.filter((a) => a.nivelRisco === "Alto").length,
      Crítico: analises.filter((a) => a.nivelRisco === "Crítico").length,
    };
  }, [analises]);

  const abrirNova = (esc: EscopoAnalise) => {
    setEscopo(esc);
    setEditando(undefined);
    setAlvoInicial(undefined);
    setOpen(true);
  };

  const abrirRevisao = (a: AnaliseCompliance) => {
    setEscopo(a.escopo);
    setEditando(a);
    setAlvoInicial(undefined);
    setOpen(true);
  };

  const abrirComAlvo = (esc: EscopoAnalise, alvoId: string) => {
    setEscopo(esc);
    setEditando(undefined);
    setAlvoInicial(alvoId);
    setOpen(true);
  };

  const analisesCliente = analisesEnriquecidas.filter(
    (a) => a.escopo === "Cliente",
  );
  const analisesOperacao = analisesEnriquecidas.filter(
    (a) => a.escopo === "Operação",
  );

  return (
    <div>
      <PageHeader
        title="Compliance"
        description="Controles internos de PLD/FT, checklists e registro de análise de risco."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => abrirNova("Cliente")}>
              <Plus className="mr-2 h-4 w-4" /> Análise de cliente
            </Button>
            <Button onClick={() => abrirNova("Operação")}>
              <Plus className="mr-2 h-4 w-4" /> Análise de operação
            </Button>
          </div>
        }
      />

      <Alert className="mb-6 border-warning/40 bg-warning/10">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertTitle>Uso interno apenas</AlertTitle>
        <AlertDescription>
          Este módulo serve para registro operacional interno. Não envia
          comunicação ao COAF, não classifica operações automaticamente como
          suspeitas e não substitui assessoria jurídica, contábil ou de
          compliance.
        </AlertDescription>
      </Alert>

      {carregando ? (
        <LoadingState label="Carregando compliance..." />
      ) : error ? (
        <ErrorState
          title="Não foi possível carregar"
          description={
            error instanceof Error ? error.message : "Erro inesperado."
          }
        />
      ) : (
        <>
      {/* KPIs */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={<ShieldCheck className="h-4 w-4 text-success" />}
          titulo="Risco baixo"
          valor={counts.Baixo}
        />
        <KpiCard
          icon={<ShieldAlert className="h-4 w-4 text-warning" />}
          titulo="Risco médio"
          valor={counts.Médio}
        />
        <KpiCard
          icon={<ShieldAlert className="h-4 w-4 text-destructive" />}
          titulo="Risco alto"
          valor={counts.Alto}
        />
        <KpiCard
          icon={<AlertOctagon className="h-4 w-4 text-destructive" />}
          titulo="Risco crítico"
          valor={counts.Crítico}
        />
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4 text-warning" />}
          titulo="Sem análise"
          valor={semAnaliseClientes.length + semAnaliseOperacoes.length}
          descricao={`${semAnaliseClientes.length} cliente(s) · ${semAnaliseOperacoes.length} operação(ões)`}
        />
      </div>

      {/* Alertas de pendências */}
      {(semAnaliseClientes.length > 0 || semAnaliseOperacoes.length > 0) && (
        <Alert className="mb-6 border-destructive/40 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertTitle>Pendências de análise</AlertTitle>
          <AlertDescription>
            <span className="block">
              {semAnaliseClientes.length} de {totalClientes} cliente(s) sem
              análise de onboarding.
            </span>
            <span className="block">
              {semAnaliseOperacoes.length} de {totalOperacoes} operação(ões)
              sem análise registrada.
            </span>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="clientes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clientes">Análises de cliente</TabsTrigger>
          <TabsTrigger value="operacoes">Análises de operação</TabsTrigger>
          <TabsTrigger value="politicas">Políticas internas</TabsTrigger>
          <TabsTrigger value="checklists">Checklists</TabsTrigger>
        </TabsList>

        <TabsContent value="clientes">
          <AnalisesTable
            analises={analisesCliente}
            pendentes={semAnaliseClientes}
            escopo="Cliente"
            onRevisar={abrirRevisao}
            onCriar={(id) => abrirComAlvo("Cliente", id)}
          />
        </TabsContent>

        <TabsContent value="operacoes">
          <AnalisesTable
            analises={analisesOperacao}
            pendentes={semAnaliseOperacoes}
            escopo="Operação"
            onRevisar={abrirRevisao}
            onCriar={(id) => abrirComAlvo("Operação", id)}
          />
        </TabsContent>

        <TabsContent value="politicas">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Políticas internas</CardTitle>
              <CardDescription>
                Diretrizes operacionais aplicadas pela área de risco e
                compliance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {politicas.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-md border bg-muted/30 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-foreground">
                        {p.titulo}
                      </span>
                      <Badge
                        variant={p.ativa ? "default" : "secondary"}
                        className="shrink-0"
                      >
                        {p.ativa ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {p.descricao}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklists">
          <div className="grid gap-4 md:grid-cols-2">
            <ChecklistCard
              titulo="Onboarding de cliente/cedente"
              itens={CHECKLIST_ONBOARDING}
            />
            <ChecklistCard
              titulo="Análise de operação"
              itens={CHECKLIST_OPERACAO}
            />
          </div>
        </TabsContent>
      </Tabs>
        </>
      )}

      <AnaliseDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setAlvoInicial(undefined);
        }}
        escopo={escopo}
        alvoIdInicial={alvoInicial}
        analiseExistente={editando}
        registrarAnalise={registrarAnalise}
        alvos={alvosDoEscopo(escopo)}
      />
    </div>
  );
}

function KpiCard({
  icon,
  titulo,
  valor,
  descricao,
}: {
  icon: React.ReactNode;
  titulo: string;
  valor: number;
  descricao?: string;
}) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          {icon}
          {titulo}
        </div>
        <div className="mt-2 text-2xl font-bold text-foreground">{valor}</div>
        {descricao && (
          <p className="mt-1 text-xs text-muted-foreground">{descricao}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ChecklistCard({
  titulo,
  itens,
}: {
  titulo: string;
  itens: { id: string; titulo: string; obrigatorio: boolean }[];
}) {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          {titulo}
        </CardTitle>
        <CardDescription>
          Itens sugeridos. Revise com a área de risco antes de adotar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {itens.map((i) => (
            <li
              key={i.id}
              className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-0"
            >
              <span className="text-sm text-foreground">{i.titulo}</span>
              {i.obrigatorio && (
                <Badge variant="outline" className="shrink-0 text-xs">
                  Obrigatório
                </Badge>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function AnalisesTable({
  analises,
  pendentes,
  escopo,
  onRevisar,
  onCriar,
}: {
  analises: AnaliseCompliance[];
  pendentes: { id: string; nome: string }[];
  escopo: EscopoAnalise;
  onRevisar: (a: AnaliseCompliance) => void;
  onCriar: (alvoId: string) => void;
}) {
  const itensChecklist =
    escopo === "Cliente" ? CHECKLIST_ONBOARDING : CHECKLIST_OPERACAO;

  return (
    <div className="space-y-4">
      {pendentes.length > 0 && (
        <Card className="border-warning/40 bg-warning/5 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-warning" />
              {pendentes.length} {escopo.toLowerCase()}(s) sem análise
            </CardTitle>
            <CardDescription>
              Registre uma análise para liberar o controle interno de risco.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {pendentes.slice(0, 8).map((p) => (
                <Button
                  key={p.id}
                  size="sm"
                  variant="outline"
                  onClick={() => onCriar(p.id)}
                >
                  <Plus className="mr-1.5 h-3 w-3" />
                  {p.nome}
                </Button>
              ))}
              {pendentes.length > 8 && (
                <span className="self-center text-xs text-muted-foreground">
                  +{pendentes.length - 8} mais
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">
            Análises registradas ({analises.length})
          </CardTitle>
          <CardDescription>
            Cada nova análise mantém o histórico das versões anteriores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analises.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma análise registrada ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{escopo}</TableHead>
                  <TableHead>Risco</TableHead>
                  <TableHead>Checklist</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Última análise</TableHead>
                  <TableHead>Revisões</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analises.map((a) => {
                  const prog = progressoChecklist(a.respostas, itensChecklist);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {a.alvoNome}
                      </TableCell>
                      <TableCell>
                        <RiscoBadge nivel={a.nivelRisco} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {prog.ok}/{prog.total} ({prog.pct}%)
                      </TableCell>
                      <TableCell className="text-sm">{a.responsavel}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatarDataHora(a.dataAnalise)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <History className="h-3.5 w-3.5" />
                          {a.historico.length}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRevisar(a)}
                        >
                          Revisar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}