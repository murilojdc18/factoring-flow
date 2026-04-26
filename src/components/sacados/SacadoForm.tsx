import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  STATUS_SACADO,
  type Sacado,
  type SacadoStatus,
  type TipoPessoa,
} from "@/data/mockSacados";

export type SacadoFormData = Omit<
  Sacado,
  | "id"
  | "totalEmAberto"
  | "totalVencido"
  | "titulosPagos"
  | "titulosEmAtraso"
  | "criadoEm"
>;

const EMPTY: SacadoFormData = {
  tipo: "PJ",
  nome: "",
  nomeFantasia: "",
  documento: "",
  email: "",
  telefone: "",
  whatsapp: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  pessoaContato: "",
  cargoContato: "",
  limiteConcentracao: 0,
  scoreInterno: 500,
  status: "Em análise",
  observacoes: "",
};

interface Props {
  initial?: Sacado | null;
  onSubmit: (data: SacadoFormData) => void;
  onCancel: () => void;
}

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

export function SacadoForm({ initial, onSubmit, onCancel }: Props) {
  const [data, setData] = useState<SacadoFormData>(EMPTY);

  useEffect(() => {
    if (initial) {
      const {
        id,
        totalEmAberto,
        totalVencido,
        titulosPagos,
        titulosEmAtraso,
        criadoEm,
        ...rest
      } = initial;
      setData(rest);
    } else {
      setData(EMPTY);
    }
  }, [initial]);

  const set = <K extends keyof SacadoFormData>(key: K, value: SacadoFormData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const isPJ = data.tipo === "PJ";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(data);
      }}
      className="space-y-6"
    >
      <Section title="Identificação">
        <Field label="Tipo de pessoa" className="sm:col-span-2 lg:col-span-3">
          <RadioGroup
            value={data.tipo}
            onValueChange={(v) => set("tipo", v as TipoPessoa)}
            className="flex gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="PJ" id="tipo-pj" />
              <Label htmlFor="tipo-pj" className="cursor-pointer text-sm">
                Pessoa Jurídica
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="PF" id="tipo-pf" />
              <Label htmlFor="tipo-pf" className="cursor-pointer text-sm">
                Pessoa Física
              </Label>
            </div>
          </RadioGroup>
        </Field>

        <Field
          label={isPJ ? "Razão social" : "Nome completo"}
          className="sm:col-span-2 lg:col-span-2"
        >
          <Input
            value={data.nome}
            onChange={(e) => set("nome", e.target.value)}
            required
          />
        </Field>
        <Field label={isPJ ? "CNPJ" : "CPF"}>
          <Input
            value={data.documento}
            onChange={(e) => set("documento", e.target.value)}
            placeholder={isPJ ? "00.000.000/0000-00" : "000.000.000-00"}
            required
          />
        </Field>
        {isPJ && (
          <Field label="Nome fantasia" className="sm:col-span-2 lg:col-span-3">
            <Input
              value={data.nomeFantasia}
              onChange={(e) => set("nomeFantasia", e.target.value)}
            />
          </Field>
        )}
      </Section>

      <Section title="Contato">
        <Field label="E-mail">
          <Input
            type="email"
            value={data.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>
        <Field label="Telefone">
          <Input
            value={data.telefone}
            onChange={(e) => set("telefone", e.target.value)}
          />
        </Field>
        <Field label="WhatsApp">
          <Input
            value={data.whatsapp}
            onChange={(e) => set("whatsapp", e.target.value)}
          />
        </Field>
        <Field label="Pessoa de contato">
          <Input
            value={data.pessoaContato}
            onChange={(e) => set("pessoaContato", e.target.value)}
          />
        </Field>
        <Field label="Cargo do contato">
          <Input
            value={data.cargoContato}
            onChange={(e) => set("cargoContato", e.target.value)}
          />
        </Field>
      </Section>

      <Section title="Endereço">
        <Field label="CEP">
          <Input value={data.cep} onChange={(e) => set("cep", e.target.value)} />
        </Field>
        <Field label="Endereço" className="lg:col-span-2">
          <Input
            value={data.endereco}
            onChange={(e) => set("endereco", e.target.value)}
          />
        </Field>
        <Field label="Número">
          <Input
            value={data.numero}
            onChange={(e) => set("numero", e.target.value)}
          />
        </Field>
        <Field label="Complemento">
          <Input
            value={data.complemento}
            onChange={(e) => set("complemento", e.target.value)}
          />
        </Field>
        <Field label="Bairro">
          <Input
            value={data.bairro}
            onChange={(e) => set("bairro", e.target.value)}
          />
        </Field>
        <Field label="Cidade">
          <Input
            value={data.cidade}
            onChange={(e) => set("cidade", e.target.value)}
          />
        </Field>
        <Field label="Estado">
          <Input
            value={data.estado}
            onChange={(e) =>
              set("estado", e.target.value.toUpperCase().slice(0, 2))
            }
            maxLength={2}
            placeholder="UF"
          />
        </Field>
      </Section>

      <Section title="Crédito interno">
        <Field label="Limite de concentração (R$)">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={data.limiteConcentracao}
            onChange={(e) =>
              set("limiteConcentracao", Number(e.target.value) || 0)
            }
          />
        </Field>
        <Field label="Score interno (0–1000)">
          <Input
            type="number"
            min={0}
            max={1000}
            value={data.scoreInterno}
            onChange={(e) =>
              set(
                "scoreInterno",
                Math.max(0, Math.min(1000, Number(e.target.value) || 0)),
              )
            }
          />
        </Field>
        <Field label="Status">
          <Select
            value={data.status}
            onValueChange={(v) => set("status", v as SacadoStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_SACADO.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          label="Observações internas"
          className="sm:col-span-2 lg:col-span-3"
        >
          <Textarea
            rows={3}
            value={data.observacoes}
            onChange={(e) => set("observacoes", e.target.value)}
            placeholder="Notas internas para a equipe (não visíveis ao sacado)"
          />
        </Field>
      </Section>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          className="bg-gradient-primary text-primary-foreground hover:opacity-90"
        >
          {initial ? "Salvar alterações" : "Cadastrar sacado"}
        </Button>
      </div>
    </form>
  );
}