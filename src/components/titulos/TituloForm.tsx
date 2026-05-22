import { useState, useEffect } from "react";
import { CalendarIcon, Paperclip, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useClientes } from "@/hooks/useClientes";
import { useSacados } from "@/hooks/useSacados";
import {
  STATUS_TITULO,
  TIPOS_TITULO,
  type AnexoSimulado,
  type Titulo,
  type TituloStatus,
  type TipoTitulo,
} from "@/data/mockTitulos";
import { parseISO, dateToISO } from "@/lib/dateUtils";

export type TituloFormData = Omit<Titulo, "id" | "criadoEm">;

const EMPTY: TituloFormData = {
  numero: "",
  tipo: "Duplicata",
  cedenteId: "",
  cedenteNome: "",
  sacadoId: "",
  sacadoNome: "",
  dataEmissao: dateToISO(new Date()),
  dataVencimento: dateToISO(new Date()),
  valorFace: 0,
  numeroNotaFiscal: "",
  chaveNotaFiscal: "",
  descricao: "",
  status: "Disponível",
  observacoes: "",
  anexos: [],
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        <Separator className="mt-2" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs font-medium">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function DateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const date = value ? parseISO(value) : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => d && onChange(dateToISO(d))}
          initialFocus
          locale={ptBR}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

interface Props {
  initial?: Titulo | null;
  onSubmit: (data: TituloFormData) => void;
  onCancel: () => void;
}

export function TituloForm({ initial, onSubmit, onCancel }: Props) {
  const [data, setData] = useState<TituloFormData>(EMPTY);
  // Cedentes e sacados agora vêm dos hooks de domínio (mock ou Supabase,
  // conforme a feature flag em dataSource.ts). Antes este form lia
  // mockClientes/mockSacados direto, ignorando a flag.
  const { clientes, isLoading: loadingClientes } = useClientes();
  const { sacados, isLoading: loadingSacados } = useSacados();

  useEffect(() => {
    if (initial) {
      const { id, criadoEm, ...rest } = initial;
      setData(rest);
    } else {
      setData(EMPTY);
    }
  }, [initial]);

  const set = <K extends keyof TituloFormData>(key: K, value: TituloFormData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  function selecionarCedente(id: string) {
    const c = clientes.find((x) => x.id === id);
    setData((d) => ({
      ...d,
      cedenteId: id,
      cedenteNome: c?.razaoSocial ?? "",
    }));
  }

  function selecionarSacado(id: string) {
    const s = sacados.find((x) => x.id === id);
    setData((d) => ({
      ...d,
      sacadoId: id,
      sacadoNome: s?.nome ?? "",
    }));
  }

  function adicionarAnexo(tipo: AnexoSimulado["tipo"]) {
    const novo: AnexoSimulado = {
      id: `AX-${Date.now()}`,
      nome: `${tipo.toLowerCase().replace(/\s/g, "_")}_${Math.floor(
        Math.random() * 9999,
      )}.pdf`,
      tipo,
      tamanhoKb: Math.floor(Math.random() * 400) + 20,
      enviadoEm: dateToISO(new Date()),
    };
    set("anexos", [...data.anexos, novo]);
  }

  function removerAnexo(id: string) {
    set("anexos", data.anexos.filter((a) => a.id !== id));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(data);
      }}
      className="space-y-6"
    >
      <Section title="Identificação do título">
        <Field label="Número do título">
          <Input
            value={data.numero}
            onChange={(e) => set("numero", e.target.value)}
            placeholder="Ex: DUP-58921"
            required
          />
        </Field>
        <Field label="Tipo">
          <Select
            value={data.tipo}
            onValueChange={(v) => set("tipo", v as TipoTitulo)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_TITULO.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select
            value={data.status}
            onValueChange={(v) => set("status", v as TituloStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_TITULO.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </Section>

      <Section title="Partes envolvidas">
        <Field label="Cedente" className="lg:col-span-2">
          <Select
            value={data.cedenteId}
            onValueChange={selecionarCedente}
            disabled={loadingClientes || clientes.length === 0}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  loadingClientes
                    ? "Carregando..."
                    : clientes.length === 0
                      ? "Nenhum cedente cadastrado"
                      : "Selecione o cedente"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {clientes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.razaoSocial}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Sacado">
          <Select
            value={data.sacadoId}
            onValueChange={selecionarSacado}
            disabled={loadingSacados || sacados.length === 0}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  loadingSacados
                    ? "Carregando..."
                    : sacados.length === 0
                      ? "Nenhum sacado cadastrado"
                      : "Selecione o sacado"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {sacados.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </Section>

      <Section title="Datas e valor">
        <Field label="Data de emissão">
          <DateField
            value={data.dataEmissao}
            onChange={(v) => set("dataEmissao", v)}
          />
        </Field>
        <Field label="Data de vencimento">
          <DateField
            value={data.dataVencimento}
            onChange={(v) => set("dataVencimento", v)}
          />
        </Field>
        <Field label="Valor de face (R$)">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={data.valorFace}
            onChange={(e) => set("valorFace", Number(e.target.value) || 0)}
            required
          />
        </Field>
      </Section>

      <Section title="Documento fiscal">
        <Field label="Número da NF">
          <Input
            value={data.numeroNotaFiscal}
            onChange={(e) => set("numeroNotaFiscal", e.target.value)}
            placeholder="000.000.000"
          />
        </Field>
        <Field label="Chave da NF" className="lg:col-span-2">
          <Input
            value={data.chaveNotaFiscal}
            onChange={(e) => set("chaveNotaFiscal", e.target.value)}
            placeholder="44 dígitos"
          />
        </Field>
        <Field label="Descrição da mercadoria/serviço" className="sm:col-span-2 lg:col-span-3">
          <Textarea
            rows={2}
            value={data.descricao}
            onChange={(e) => set("descricao", e.target.value)}
          />
        </Field>
      </Section>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Anexos (simulados)
          </h3>
        </div>
        <Separator className="mb-3" />

        <div className="mb-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => adicionarAnexo("Nota fiscal")}
          >
            <Paperclip className="mr-1 h-3.5 w-3.5" />
            + Nota fiscal
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => adicionarAnexo("Comprovante")}
          >
            <Paperclip className="mr-1 h-3.5 w-3.5" />
            + Comprovante
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => adicionarAnexo("Contrato de origem")}
          >
            <Paperclip className="mr-1 h-3.5 w-3.5" />
            + Contrato de origem
          </Button>
        </div>

        {data.anexos.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
            Nenhum anexo adicionado. Use os botões acima para simular envios.
          </p>
        ) : (
          <ul className="space-y-2">
            {data.anexos.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {a.nome}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        {a.tipo}
                      </Badge>
                      <span>{a.tamanhoKb} KB</span>
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => removerAnexo(a.id)}
                  aria-label="Remover"
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <Label className="text-xs font-medium">Observações</Label>
        <Textarea
          className="mt-1.5"
          rows={3}
          value={data.observacoes}
          onChange={(e) => set("observacoes", e.target.value)}
          placeholder="Notas internas sobre o título"
        />
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          className="bg-gradient-primary text-primary-foreground hover:opacity-90"
        >
          {initial ? "Salvar alterações" : "Lançar título"}
        </Button>
      </div>
    </form>
  );
}