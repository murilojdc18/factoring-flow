import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarIcon,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

import { mockOperacoes, STATUS_OPERACAO } from "@/data/mockOperacoes";
import {
  mockTitulos,
  STATUS_TITULO,
  TIPOS_TITULO,
  Titulo,
} from "@/data/mockTitulos";
import { mockClientes } from "@/data/mockClientes";
import { mockSacados } from "@/data/mockSacados";
import { useDocumentosGerados } from "@/hooks/useDocumentosGerados";

import { formatBRL, formatNumber } from "@/lib/format";
import { dateToISO, daysUntil, formatBR, parseISO } from "@/lib/dateUtils";
import { exportarCsv } from "@/lib/exportarCsv";
import { exportarRelatorioPdf } from "@/lib/exportarRelatorioPdf";
import { toast } from "sonner";

/* =============================== Types =============================== */

interface Filtros {
  inicio?: Date;
  fim?: Date;
  cedenteId: string; // "" = todos
  sacadoId: string;
  statusOperacao: string; // "" = todos
  tipoTitulo: string;
  responsavel: string;
}

const RELATORIOS = [
  { id: "carteira", label: "Carteira por status" },
  { id: "a-vencer", label: "Títulos a vencer" },
  { id: "vencidos", label: "Títulos vencidos" },
  { id: "operacoes", label: "Operações por período" },
  { id: "rentabilidade", label: "Rentabilidade estimada" },
  { id: "exp-cedente", label: "Exposição por cedente" },
  { id: "exp-sacado", label: "Exposição por sacado" },
  { id: "liquidacoes", label: "Histórico de liquidações" },
  { id: "faixa-venc", label: "Faixa de vencimento" },
  { id: "documentos", label: "Documentos gerados" },
] as const;

type RelatorioId = (typeof RELATORIOS)[number]["id"];

/* Cores para gráficos — usam tokens HSL do design system. */
const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--success))",
  "hsl(var(--muted-foreground))",
];

/* =============================== Page =============================== */

export default function Relatorios() {
  const { documentos } = useDocumentosGerados();

  const [filtros, setFiltros] = useState<Filtros>({
    cedenteId: "",
    sacadoId: "",
    statusOperacao: "",
    tipoTitulo: "",
    responsavel: "",
  });
  const [aba, setAba] = useState<RelatorioId>("carteira");

  const responsaveis = useMemo(
    () =>
      Array.from(new Set(mockOperacoes.map((o) => o.responsavelInterno))).sort(),
    [],
  );

  const dentroPeriodo = (iso: string) => {
    if (!iso) return false;
    const d = parseISO(iso);
    if (filtros.inicio && d < startOfDay(filtros.inicio)) return false;
    if (filtros.fim && d > endOfDay(filtros.fim)) return false;
    return true;
  };

  /* ------- Dados filtrados ------- */
  const titulosFiltrados = useMemo(() => {
    return mockTitulos.filter((t) => {
      if (filtros.cedenteId && t.cedenteId !== filtros.cedenteId) return false;
      if (filtros.sacadoId && t.sacadoId !== filtros.sacadoId) return false;
      if (filtros.tipoTitulo && t.tipo !== filtros.tipoTitulo) return false;
      if (filtros.inicio || filtros.fim) {
        // Considera vencimento como referência principal para títulos
        if (!dentroPeriodo(t.dataVencimento)) return false;
      }
      return true;
    });
  }, [filtros]);

  const operacoesFiltradas = useMemo(() => {
    return mockOperacoes.filter((o) => {
      if (filtros.cedenteId && o.cedenteId !== filtros.cedenteId) return false;
      if (filtros.statusOperacao && o.status !== filtros.statusOperacao) return false;
      if (filtros.responsavel && o.responsavelInterno !== filtros.responsavel) return false;
      if (filtros.inicio || filtros.fim) {
        if (!dentroPeriodo(o.dataOperacao)) return false;
      }
      return true;
    });
  }, [filtros]);

  const documentosFiltrados = useMemo(() => {
    return documentos.filter((d) => {
      if (filtros.cedenteId && d.cedenteId !== filtros.cedenteId) return false;
      if (filtros.inicio || filtros.fim) {
        if (!dentroPeriodo(d.geradoEm)) return false;
      }
      return true;
    });
  }, [documentos, filtros]);

  /* ------- KPIs gerais ------- */
  const kpiTotalCarteira = titulosFiltrados.reduce((s, t) => s + t.valorFace, 0);
  const kpiOperacoes = operacoesFiltradas.length;
  const kpiBrutoOperado = operacoesFiltradas.reduce(
    (s, o) => s + o.valorBruto,
    0,
  );
  const kpiDesagioTotal = operacoesFiltradas.reduce(
    (s, o) => s + o.valorDesagio,
    0,
  );

  const filtrosResumo = montarResumoFiltros(filtros);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Visão gerencial de carteira, operações, exposição e documentos."
      />

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Visão gerencial</AlertTitle>
        <AlertDescription>
          Os relatórios usam dados mockados e não constituem demonstração
          financeira oficial nem contabilidade formal.
        </AlertDescription>
      </Alert>

      {/* Filtros */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>
            Aplicam-se a todos os relatórios. Período usa a data de vencimento
            (títulos), data da operação (operações) ou data de geração
            (documentos).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-7">
            <DateField
              label="Início"
              value={filtros.inicio}
              onChange={(d) => setFiltros((f) => ({ ...f, inicio: d }))}
            />
            <DateField
              label="Fim"
              value={filtros.fim}
              onChange={(d) => setFiltros((f) => ({ ...f, fim: d }))}
            />
            <SelectField
              label="Cedente"
              value={filtros.cedenteId}
              onChange={(v) => setFiltros((f) => ({ ...f, cedenteId: v }))}
              options={mockClientes.map((c) => ({ value: c.id, label: c.razaoSocial }))}
            />
            <SelectField
              label="Sacado"
              value={filtros.sacadoId}
              onChange={(v) => setFiltros((f) => ({ ...f, sacadoId: v }))}
              options={mockSacados.map((s) => ({ value: s.id, label: s.nome }))}
            />
            <SelectField
              label="Status operação"
              value={filtros.statusOperacao}
              onChange={(v) => setFiltros((f) => ({ ...f, statusOperacao: v }))}
              options={STATUS_OPERACAO.map((s) => ({ value: s, label: s }))}
            />
            <SelectField
              label="Tipo de título"
              value={filtros.tipoTitulo}
              onChange={(v) => setFiltros((f) => ({ ...f, tipoTitulo: v }))}
              options={TIPOS_TITULO.map((t) => ({ value: t, label: t }))}
            />
            <SelectField
              label="Responsável"
              value={filtros.responsavel}
              onChange={(v) => setFiltros((f) => ({ ...f, responsavel: v }))}
              options={responsaveis.map((r) => ({ value: r, label: r }))}
            />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{filtrosResumo}</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setFiltros({
                  cedenteId: "",
                  sacadoId: "",
                  statusOperacao: "",
                  tipoTitulo: "",
                  responsavel: "",
                  inicio: undefined,
                  fim: undefined,
                })
              }
            >
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Carteira (face)" value={formatBRL(kpiTotalCarteira)} sub={`${titulosFiltrados.length} títulos`} />
        <Kpi label="Operações" value={formatNumber(kpiOperacoes)} sub="no recorte" />
        <Kpi label="Bruto operado" value={formatBRL(kpiBrutoOperado)} sub="período filtrado" />
        <Kpi label="Deságio (estimado)" value={formatBRL(kpiDesagioTotal)} sub="margem bruta indicativa" />
      </div>

      {/* Relatórios */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <Tabs value={aba} onValueChange={(v) => setAba(v as RelatorioId)}>
            <TabsList className="flex flex-wrap h-auto">
              {RELATORIOS.map((r) => (
                <TabsTrigger key={r.id} value={r.id} className="text-xs">
                  {r.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="carteira" className="mt-4">
              <CarteiraPorStatus
                titulos={titulosFiltrados}
                filtrosResumo={filtrosResumo}
              />
            </TabsContent>
            <TabsContent value="a-vencer" className="mt-4">
              <ListaTitulos
                titulo="Títulos a vencer"
                titulos={titulosFiltrados.filter((t) =>
                  ["Disponível", "Operado", "Em análise"].includes(t.status)
                  && daysUntil(t.dataVencimento) >= 0,
                )}
                filtrosResumo={filtrosResumo}
                arquivoBase="titulos-a-vencer"
              />
            </TabsContent>
            <TabsContent value="vencidos" className="mt-4">
              <ListaTitulos
                titulo="Títulos vencidos"
                titulos={titulosFiltrados.filter(
                  (t) =>
                    t.status === "Vencido" ||
                    (t.status !== "Liquidado" &&
                      t.status !== "Cancelado" &&
                      daysUntil(t.dataVencimento) < 0),
                )}
                filtrosResumo={filtrosResumo}
                arquivoBase="titulos-vencidos"
                showAtraso
              />
            </TabsContent>
            <TabsContent value="operacoes" className="mt-4">
              <OperacoesPeriodo
                operacoes={operacoesFiltradas}
                filtrosResumo={filtrosResumo}
              />
            </TabsContent>
            <TabsContent value="rentabilidade" className="mt-4">
              <Rentabilidade
                operacoes={operacoesFiltradas}
                filtrosResumo={filtrosResumo}
              />
            </TabsContent>
            <TabsContent value="exp-cedente" className="mt-4">
              <ExposicaoPor
                titulos={titulosFiltrados}
                chave="cedenteNome"
                titulo="Exposição por cedente"
                filtrosResumo={filtrosResumo}
                arquivoBase="exposicao-cedente"
              />
            </TabsContent>
            <TabsContent value="exp-sacado" className="mt-4">
              <ExposicaoPor
                titulos={titulosFiltrados}
                chave="sacadoNome"
                titulo="Exposição por sacado"
                filtrosResumo={filtrosResumo}
                arquivoBase="exposicao-sacado"
              />
            </TabsContent>
            <TabsContent value="liquidacoes" className="mt-4">
              <Liquidacoes
                titulos={titulosFiltrados.filter((t) => t.status === "Liquidado")}
                filtrosResumo={filtrosResumo}
              />
            </TabsContent>
            <TabsContent value="faixa-venc" className="mt-4">
              <FaixaVencimento
                titulos={titulosFiltrados.filter(
                  (t) => t.status !== "Liquidado" && t.status !== "Cancelado",
                )}
                filtrosResumo={filtrosResumo}
              />
            </TabsContent>
            <TabsContent value="documentos" className="mt-4">
              <DocumentosPeriodo
                documentos={documentosFiltrados}
                filtrosResumo={filtrosResumo}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

/* =============================== Helpers =============================== */

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function montarResumoFiltros(f: Filtros): string {
  const partes: string[] = [];
  if (f.inicio) partes.push(`início ${formatBR(dateToISO(f.inicio))}`);
  if (f.fim) partes.push(`fim ${formatBR(dateToISO(f.fim))}`);
  if (f.cedenteId)
    partes.push(`cedente ${mockClientes.find((c) => c.id === f.cedenteId)?.razaoSocial ?? f.cedenteId}`);
  if (f.sacadoId)
    partes.push(`sacado ${mockSacados.find((s) => s.id === f.sacadoId)?.nome ?? f.sacadoId}`);
  if (f.statusOperacao) partes.push(`status ${f.statusOperacao}`);
  if (f.tipoTitulo) partes.push(`tipo ${f.tipoTitulo}`);
  if (f.responsavel) partes.push(`resp. ${f.responsavel}`);
  return partes.length ? partes.join(" • ") : "Sem filtros aplicados";
}

/* =============================== Subcomponentes =============================== */

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: Date;
  onChange: (d: Date | undefined) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "dd/MM/yyyy") : <span>—</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select
        value={value || "__all__"}
        onValueChange={(v) => onChange(v === "__all__" ? "" : v)}
      >
        <SelectTrigger className="h-10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todos</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ExportBar({
  onCsv,
  onPdf,
}: {
  onCsv: () => void;
  onPdf: () => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap justify-end gap-2">
      <Button size="sm" variant="outline" onClick={onCsv}>
        <FileSpreadsheet className="mr-1 h-4 w-4" /> CSV
      </Button>
      <Button size="sm" variant="outline" onClick={onPdf}>
        <FileText className="mr-1 h-4 w-4" /> PDF
      </Button>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="rounded-md border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
      {msg}
    </div>
  );
}

/* =============================== Relatórios =============================== */

function CarteiraPorStatus({
  titulos,
  filtrosResumo,
}: {
  titulos: Titulo[];
  filtrosResumo: string;
}) {
  const dados = STATUS_TITULO.map((s) => {
    const lista = titulos.filter((t) => t.status === s);
    return {
      status: s,
      quantidade: lista.length,
      valor: lista.reduce((sum, t) => sum + t.valorFace, 0),
    };
  }).filter((d) => d.quantidade > 0);

  if (dados.length === 0) return <Empty msg="Sem títulos no recorte." />;

  const headers = ["Status", "Quantidade", "Valor (R$)"];
  const rows = dados.map((d) => [d.status, d.quantidade, d.valor.toFixed(2)]);
  const total = dados.reduce((s, d) => s + d.valor, 0);

  return (
    <div className="space-y-4">
      <ExportBar
        onCsv={() => {
          exportarCsv("carteira-por-status", headers, rows);
          toast.success("CSV exportado.");
        }}
        onPdf={() => {
          exportarRelatorioPdf({
            titulo: "Carteira por status",
            filename: "carteira-por-status.pdf",
            filtrosResumo,
            headers,
            rows: rows.map((r) => [r[0], r[1], formatBRL(Number(r[2]))]),
            totaisRodape: `Total: ${formatBRL(total)}`,
          });
          toast.success("PDF exportado.");
        }}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border p-4">
          <h4 className="mb-2 text-sm font-semibold">Distribuição por valor</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dados} dataKey="valor" nameKey="status" outerRadius={90} label>
                  {dados.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => formatBRL(v)}
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <TabelaSimples headers={headers} rows={rows.map((r) => [r[0], r[1], formatBRL(Number(r[2]))])} totalLabel="Total" totalValue={formatBRL(total)} />
      </div>
    </div>
  );
}

function ListaTitulos({
  titulo,
  titulos,
  filtrosResumo,
  arquivoBase,
  showAtraso,
}: {
  titulo: string;
  titulos: Titulo[];
  filtrosResumo: string;
  arquivoBase: string;
  showAtraso?: boolean;
}) {
  if (titulos.length === 0) return <Empty msg="Nenhum título nesta condição." />;
  const total = titulos.reduce((s, t) => s + t.valorFace, 0);
  const headers = [
    "Título",
    "Tipo",
    "Cedente",
    "Sacado",
    "Vencimento",
    showAtraso ? "Atraso (dias)" : "Dias",
    "Valor (R$)",
    "Status",
  ];
  const rows = titulos.map((t) => [
    t.numero,
    t.tipo,
    t.cedenteNome,
    t.sacadoNome,
    t.dataVencimento,
    daysUntil(t.dataVencimento),
    t.valorFace.toFixed(2),
    t.status,
  ]);

  return (
    <div>
      <ExportBar
        onCsv={() => {
          exportarCsv(arquivoBase, headers, rows);
          toast.success("CSV exportado.");
        }}
        onPdf={() => {
          exportarRelatorioPdf({
            titulo,
            filename: `${arquivoBase}.pdf`,
            filtrosResumo,
            headers,
            rows: rows.map((r) => [
              r[0], r[1], r[2], r[3], formatBR(String(r[4])),
              showAtraso && Number(r[5]) < 0 ? `${Math.abs(Number(r[5]))}` : `${r[5]}`,
              formatBRL(Number(r[6])), r[7],
            ]),
            totaisRodape: `Total: ${formatBRL(total)} (${titulos.length} títulos)`,
          });
          toast.success("PDF exportado.");
        }}
      />
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cedente</TableHead>
              <TableHead>Sacado</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">{showAtraso ? "Atraso" : "Dias"}</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {titulos.map((t) => {
              const dias = daysUntil(t.dataVencimento);
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.numero}</TableCell>
                  <TableCell className="text-sm">{t.tipo}</TableCell>
                  <TableCell className="text-sm">{t.cedenteNome}</TableCell>
                  <TableCell className="text-sm">{t.sacadoNome}</TableCell>
                  <TableCell className="text-sm">{formatBR(t.dataVencimento)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {dias < 0 ? (
                      <span className="text-destructive font-semibold">{Math.abs(dias)}d</span>
                    ) : (
                      <span className="text-muted-foreground">{dias}d</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatBRL(t.valorFace)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{t.status}</Badge></TableCell>
                </TableRow>
              );
            })}
            <TableRow>
              <TableCell colSpan={6} className="text-right font-medium">Total</TableCell>
              <TableCell className="text-right font-bold tabular-nums">{formatBRL(total)}</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function OperacoesPeriodo({
  operacoes,
  filtrosResumo,
}: {
  operacoes: typeof mockOperacoes;
  filtrosResumo: string;
}) {
  if (operacoes.length === 0) return <Empty msg="Nenhuma operação no recorte." />;

  // Agrupa por mês AAAA-MM
  const porMes = new Map<string, { mes: string; bruto: number; liquido: number; qtd: number }>();
  operacoes.forEach((o) => {
    const m = o.dataOperacao.slice(0, 7);
    const cur = porMes.get(m) ?? { mes: m, bruto: 0, liquido: 0, qtd: 0 };
    cur.bruto += o.valorBruto;
    cur.liquido += o.valorLiquido;
    cur.qtd += 1;
    porMes.set(m, cur);
  });
  const dados = Array.from(porMes.values()).sort((a, b) => a.mes.localeCompare(b.mes));

  const headers = ["Operação", "Cedente", "Data", "Status", "Bruto (R$)", "Líquido (R$)", "Títulos", "Responsável"];
  const rows = operacoes.map((o) => [
    o.numero, o.cedenteNome, o.dataOperacao, o.status,
    o.valorBruto.toFixed(2), o.valorLiquido.toFixed(2),
    o.quantidadeTitulos, o.responsavelInterno,
  ]);
  const totalBruto = operacoes.reduce((s, o) => s + o.valorBruto, 0);

  return (
    <div className="space-y-4">
      <ExportBar
        onCsv={() => { exportarCsv("operacoes-periodo", headers, rows); toast.success("CSV exportado."); }}
        onPdf={() => {
          exportarRelatorioPdf({
            titulo: "Operações por período",
            filename: "operacoes-periodo.pdf",
            filtrosResumo, headers,
            rows: rows.map((r) => [r[0], r[1], formatBR(String(r[2])), r[3], formatBRL(Number(r[4])), formatBRL(Number(r[5])), r[6], r[7]]),
            totaisRodape: `Bruto total: ${formatBRL(totalBruto)} (${operacoes.length} operações)`,
          });
          toast.success("PDF exportado.");
        }}
      />
      <div className="rounded-md border p-4">
        <h4 className="mb-2 text-sm font-semibold">Volume por mês</h4>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatBRL(v).replace("R$", "")} />
              <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <Bar dataKey="bruto" fill="hsl(var(--primary))" name="Bruto" />
              <Bar dataKey="liquido" fill="hsl(var(--accent))" name="Líquido" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Operação</TableHead><TableHead>Cedente</TableHead><TableHead>Data</TableHead>
              <TableHead>Status</TableHead><TableHead className="text-right">Bruto</TableHead>
              <TableHead className="text-right">Líquido</TableHead><TableHead className="text-right">Títulos</TableHead>
              <TableHead>Responsável</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {operacoes.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs">{o.numero}</TableCell>
                <TableCell className="text-sm">{o.cedenteNome}</TableCell>
                <TableCell className="text-sm">{formatBR(o.dataOperacao)}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{o.status}</Badge></TableCell>
                <TableCell className="text-right tabular-nums">{formatBRL(o.valorBruto)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatBRL(o.valorLiquido)}</TableCell>
                <TableCell className="text-right">{o.quantidadeTitulos}</TableCell>
                <TableCell className="text-sm">{o.responsavelInterno}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Rentabilidade({
  operacoes,
  filtrosResumo,
}: {
  operacoes: typeof mockOperacoes;
  filtrosResumo: string;
}) {
  if (operacoes.length === 0) return <Empty msg="Nenhuma operação no recorte." />;

  const dados = operacoes.map((o) => {
    const receita = o.valorDesagio + o.valorTarifas;
    const margemPct = o.valorBruto > 0 ? (receita / o.valorBruto) * 100 : 0;
    return {
      operacao: o.numero,
      cedente: o.cedenteNome,
      bruto: o.valorBruto,
      receita,
      margemPct,
      taxa: o.taxaAplicada,
      prazo: o.prazoMedio,
    };
  });

  const headers = ["Operação", "Cedente", "Bruto (R$)", "Receita estimada (R$)", "Margem (%)", "Taxa (% a.m.)", "Prazo médio (d)"];
  const rows = dados.map((d) => [d.operacao, d.cedente, d.bruto.toFixed(2), d.receita.toFixed(2), d.margemPct.toFixed(2), d.taxa.toFixed(2), d.prazo]);
  const receitaTotal = dados.reduce((s, d) => s + d.receita, 0);
  const brutoTotal = dados.reduce((s, d) => s + d.bruto, 0);

  return (
    <div className="space-y-4">
      <ExportBar
        onCsv={() => { exportarCsv("rentabilidade-operacao", headers, rows); toast.success("CSV exportado."); }}
        onPdf={() => {
          exportarRelatorioPdf({
            titulo: "Rentabilidade estimada por operação",
            filename: "rentabilidade-operacao.pdf",
            filtrosResumo, headers,
            rows: rows.map((r) => [r[0], r[1], formatBRL(Number(r[2])), formatBRL(Number(r[3])), `${r[4]}%`, `${r[5]}%`, r[6]]),
            totaisRodape: `Receita estimada total: ${formatBRL(receitaTotal)} sobre bruto ${formatBRL(brutoTotal)}`,
          });
          toast.success("PDF exportado.");
        }}
      />
      <Alert>
        <AlertDescription className="text-xs">
          Receita estimada = deságio + tarifas. Indicativo gerencial; não substitui apuração contábil.
        </AlertDescription>
      </Alert>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Operação</TableHead><TableHead>Cedente</TableHead>
              <TableHead className="text-right">Bruto</TableHead>
              <TableHead className="text-right">Receita</TableHead>
              <TableHead className="text-right">Margem</TableHead>
              <TableHead className="text-right">Taxa</TableHead>
              <TableHead className="text-right">Prazo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.map((d) => (
              <TableRow key={d.operacao}>
                <TableCell className="font-mono text-xs">{d.operacao}</TableCell>
                <TableCell className="text-sm">{d.cedente}</TableCell>
                <TableCell className="text-right tabular-nums">{formatBRL(d.bruto)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatBRL(d.receita)}</TableCell>
                <TableCell className="text-right tabular-nums">{d.margemPct.toFixed(2)}%</TableCell>
                <TableCell className="text-right tabular-nums">{d.taxa.toFixed(2)}%</TableCell>
                <TableCell className="text-right tabular-nums">{d.prazo}d</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={2} className="text-right font-medium">Total</TableCell>
              <TableCell className="text-right font-bold tabular-nums">{formatBRL(brutoTotal)}</TableCell>
              <TableCell className="text-right font-bold tabular-nums">{formatBRL(receitaTotal)}</TableCell>
              <TableCell colSpan={3} />
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ExposicaoPor({
  titulos,
  chave,
  titulo,
  filtrosResumo,
  arquivoBase,
}: {
  titulos: Titulo[];
  chave: "cedenteNome" | "sacadoNome";
  titulo: string;
  filtrosResumo: string;
  arquivoBase: string;
}) {
  if (titulos.length === 0) return <Empty msg="Sem títulos no recorte." />;

  const mapa = new Map<string, { nome: string; qtd: number; valor: number }>();
  titulos.forEach((t) => {
    const k = t[chave];
    const cur = mapa.get(k) ?? { nome: k, qtd: 0, valor: 0 };
    cur.qtd += 1;
    cur.valor += t.valorFace;
    mapa.set(k, cur);
  });
  const dados = Array.from(mapa.values()).sort((a, b) => b.valor - a.valor);
  const total = dados.reduce((s, d) => s + d.valor, 0);
  const headers = [chave === "cedenteNome" ? "Cedente" : "Sacado", "Títulos", "Valor (R$)", "% do total"];
  const rows = dados.map((d) => [d.nome, d.qtd, d.valor.toFixed(2), ((d.valor / total) * 100).toFixed(2)]);

  return (
    <div className="space-y-4">
      <ExportBar
        onCsv={() => { exportarCsv(arquivoBase, headers, rows); toast.success("CSV exportado."); }}
        onPdf={() => {
          exportarRelatorioPdf({
            titulo, filename: `${arquivoBase}.pdf`, filtrosResumo, headers,
            rows: rows.map((r) => [r[0], r[1], formatBRL(Number(r[2])), `${r[3]}%`]),
            totaisRodape: `Total: ${formatBRL(total)}`,
          });
          toast.success("PDF exportado.");
        }}
      />
      <div className="rounded-md border p-4">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados.slice(0, 10)} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatBRL(v).replace("R$", "")} />
              <YAxis dataKey="nome" type="category" width={150} stroke="hsl(var(--muted-foreground))" />
              <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="valor" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <TabelaSimples
        headers={headers}
        rows={rows.map((r) => [r[0], r[1], formatBRL(Number(r[2])), `${r[3]}%`])}
        totalLabel="Total"
        totalValue={formatBRL(total)}
      />
    </div>
  );
}

function Liquidacoes({
  titulos,
  filtrosResumo,
}: {
  titulos: Titulo[];
  filtrosResumo: string;
}) {
  if (titulos.length === 0) return <Empty msg="Sem liquidações no recorte." />;
  const total = titulos.reduce((s, t) => s + t.valorFace, 0);

  // Acumulado por mês (data de vencimento como proxy de liquidação)
  const porMes = new Map<string, number>();
  titulos.forEach((t) => {
    const m = t.dataVencimento.slice(0, 7);
    porMes.set(m, (porMes.get(m) ?? 0) + t.valorFace);
  });
  const serie = Array.from(porMes.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, valor]) => ({ mes, valor }));

  const headers = ["Título", "Tipo", "Cedente", "Sacado", "Vencimento", "Valor (R$)"];
  const rows = titulos.map((t) => [t.numero, t.tipo, t.cedenteNome, t.sacadoNome, t.dataVencimento, t.valorFace.toFixed(2)]);

  return (
    <div className="space-y-4">
      <ExportBar
        onCsv={() => { exportarCsv("liquidacoes", headers, rows); toast.success("CSV exportado."); }}
        onPdf={() => {
          exportarRelatorioPdf({
            titulo: "Histórico de liquidações", filename: "liquidacoes.pdf", filtrosResumo, headers,
            rows: rows.map((r) => [r[0], r[1], r[2], r[3], formatBR(String(r[4])), formatBRL(Number(r[5]))]),
            totaisRodape: `Total liquidado: ${formatBRL(total)}`,
          });
          toast.success("PDF exportado.");
        }}
      />
      <div className="rounded-md border p-4">
        <h4 className="mb-2 text-sm font-semibold">Liquidações por mês</h4>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={serie}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatBRL(v).replace("R$", "")} />
              <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
              <Line type="monotone" dataKey="valor" stroke="hsl(var(--success))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <TabelaSimples
        headers={headers}
        rows={rows.map((r) => [r[0], r[1], r[2], r[3], formatBR(String(r[4])), formatBRL(Number(r[5]))])}
        totalLabel="Total liquidado"
        totalValue={formatBRL(total)}
      />
    </div>
  );
}

function FaixaVencimento({
  titulos,
  filtrosResumo,
}: {
  titulos: Titulo[];
  filtrosResumo: string;
}) {
  const faixas = [
    { id: "vencido", label: "Vencido", test: (d: number) => d < 0 },
    { id: "0-7", label: "0-7 dias", test: (d: number) => d >= 0 && d <= 7 },
    { id: "8-15", label: "8-15 dias", test: (d: number) => d >= 8 && d <= 15 },
    { id: "16-30", label: "16-30 dias", test: (d: number) => d >= 16 && d <= 30 },
    { id: "31-60", label: "31-60 dias", test: (d: number) => d >= 31 && d <= 60 },
    { id: "60+", label: "60+ dias", test: (d: number) => d > 60 },
  ];
  const dados = faixas.map((f) => {
    const lista = titulos.filter((t) => f.test(daysUntil(t.dataVencimento)));
    return { faixa: f.label, qtd: lista.length, valor: lista.reduce((s, t) => s + t.valorFace, 0) };
  });
  const total = dados.reduce((s, d) => s + d.valor, 0);
  if (total === 0) return <Empty msg="Sem títulos abertos no recorte." />;

  const headers = ["Faixa", "Quantidade", "Valor (R$)", "% do total"];
  const rows = dados.map((d) => [d.faixa, d.qtd, d.valor.toFixed(2), total ? ((d.valor / total) * 100).toFixed(2) : "0"]);

  return (
    <div className="space-y-4">
      <ExportBar
        onCsv={() => { exportarCsv("faixa-vencimento", headers, rows); toast.success("CSV exportado."); }}
        onPdf={() => {
          exportarRelatorioPdf({
            titulo: "Títulos por faixa de vencimento", filename: "faixa-vencimento.pdf", filtrosResumo, headers,
            rows: rows.map((r) => [r[0], r[1], formatBRL(Number(r[2])), `${r[3]}%`]),
            totaisRodape: `Total em aberto: ${formatBRL(total)}`,
          });
          toast.success("PDF exportado.");
        }}
      />
      <div className="rounded-md border p-4">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="faixa" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatBRL(v).replace("R$", "")} />
              <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="valor" fill="hsl(var(--warning))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <TabelaSimples
        headers={headers}
        rows={rows.map((r) => [r[0], r[1], formatBRL(Number(r[2])), `${r[3]}%`])}
        totalLabel="Total"
        totalValue={formatBRL(total)}
      />
    </div>
  );
}

function DocumentosPeriodo({
  documentos,
  filtrosResumo,
}: {
  documentos: ReturnType<typeof useDocumentosGerados>["documentos"];
  filtrosResumo: string;
}) {
  if (documentos.length === 0) return <Empty msg="Nenhum documento gerado no recorte." />;

  const porTipo = new Map<string, number>();
  documentos.forEach((d) => porTipo.set(d.tipoDocumento, (porTipo.get(d.tipoDocumento) ?? 0) + 1));
  const dados = Array.from(porTipo.entries()).map(([tipo, qtd]) => ({ tipo, qtd }));

  const headers = ["ID", "Tipo", "Modelo", "Operação", "Cedente", "Gerado em", "Status"];
  const rows = documentos.map((d) => [
    d.id, d.tipoDocumento, `${d.modeloNome} v${d.modeloVersao}`,
    d.operacaoNumero, d.cedenteNome, d.geradoEm, d.status,
  ]);

  return (
    <div className="space-y-4">
      <ExportBar
        onCsv={() => { exportarCsv("documentos-gerados", headers, rows); toast.success("CSV exportado."); }}
        onPdf={() => {
          exportarRelatorioPdf({
            titulo: "Documentos gerados por período", filename: "documentos-gerados.pdf", filtrosResumo, headers,
            rows: rows.map((r) => [r[0], r[1], r[2], r[3], r[4], formatBR(String(r[5])), r[6]]),
            totaisRodape: `Total: ${documentos.length} documentos`,
          });
          toast.success("PDF exportado.");
        }}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border p-4">
          <h4 className="mb-2 text-sm font-semibold">Por tipo de documento</h4>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dados} dataKey="qtd" nameKey="tipo" outerRadius={80} label>
                  {dados.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead><TableHead>Tipo</TableHead><TableHead>Modelo</TableHead>
                <TableHead>Operação</TableHead><TableHead>Cedente</TableHead>
                <TableHead>Gerado em</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentos.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs">{d.id}</TableCell>
                  <TableCell className="text-xs">{d.tipoDocumento}</TableCell>
                  <TableCell className="text-xs">{d.modeloNome} v{d.modeloVersao}</TableCell>
                  <TableCell className="font-mono text-xs">{d.operacaoNumero}</TableCell>
                  <TableCell className="text-xs">{d.cedenteNome}</TableCell>
                  <TableCell className="text-xs">{formatBR(d.geradoEm)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{d.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

/* =============================== Tabela genérica =============================== */

function TabelaSimples({
  headers,
  rows,
  totalLabel,
  totalValue,
}: {
  headers: string[];
  rows: (string | number)[][];
  totalLabel?: string;
  totalValue?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h, i) => (
              <TableHead key={i} className={i >= 1 ? "text-right" : ""}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              {r.map((c, j) => (
                <TableCell key={j} className={j >= 1 ? "text-right tabular-nums text-sm" : "text-sm"}>{c}</TableCell>
              ))}
            </TableRow>
          ))}
          {totalLabel && (
            <TableRow>
              <TableCell className="text-right font-medium" colSpan={headers.length - 1}>{totalLabel}</TableCell>
              <TableCell className="text-right font-bold tabular-nums">{totalValue}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}