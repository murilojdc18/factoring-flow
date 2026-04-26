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
  STATUS_CLIENTE,
  type Cliente,
  type ClienteStatus,
} from "@/data/mockClientes";

export type ClienteFormData = Omit<
  Cliente,
  "id" | "totalEmAberto" | "totalVencido" | "qtdTitulos" | "criadoEm"
>;

const EMPTY: ClienteFormData = {
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  inscricaoEstadual: "",
  inscricaoMunicipal: "",
  emailPrincipal: "",
  telefone: "",
  whatsapp: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  responsavelLegal: "",
  cpfResponsavel: "",
  emailResponsavel: "",
  telefoneResponsavel: "",
  banco: "",
  agencia: "",
  conta: "",
  chavePix: "",
  status: "Em análise",
  limiteOperacional: 0,
  observacoes: "",
};

interface Props {
  initial?: Cliente | null;
  onSubmit: (data: ClienteFormData) => void;
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

export function ClienteForm({ initial, onSubmit, onCancel }: Props) {
  const [data, setData] = useState<ClienteFormData>(EMPTY);

  useEffect(() => {
    if (initial) {
      const { id, totalEmAberto, totalVencido, qtdTitulos, criadoEm, ...rest } =
        initial;
      setData(rest);
    } else {
      setData(EMPTY);
    }
  }, [initial]);

  const set = <K extends keyof ClienteFormData>(key: K, value: ClienteFormData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(data);
      }}
      className="space-y-6"
    >
      <Section title="Dados da empresa">
        <Field label="Razão social" className="sm:col-span-2 lg:col-span-2">
          <Input
            value={data.razaoSocial}
            onChange={(e) => set("razaoSocial", e.target.value)}
            required
          />
        </Field>
        <Field label="Nome fantasia">
          <Input
            value={data.nomeFantasia}
            onChange={(e) => set("nomeFantasia", e.target.value)}
          />
        </Field>
        <Field label="CNPJ">
          <Input
            value={data.cnpj}
            onChange={(e) => set("cnpj", e.target.value)}
            placeholder="00.000.000/0000-00"
            required
          />
        </Field>
        <Field label="Inscrição estadual">
          <Input
            value={data.inscricaoEstadual}
            onChange={(e) => set("inscricaoEstadual", e.target.value)}
          />
        </Field>
        <Field label="Inscrição municipal">
          <Input
            value={data.inscricaoMunicipal}
            onChange={(e) => set("inscricaoMunicipal", e.target.value)}
          />
        </Field>
      </Section>

      <Section title="Contato">
        <Field label="E-mail principal">
          <Input
            type="email"
            value={data.emailPrincipal}
            onChange={(e) => set("emailPrincipal", e.target.value)}
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
            onChange={(e) => set("estado", e.target.value.toUpperCase().slice(0, 2))}
            placeholder="UF"
            maxLength={2}
          />
        </Field>
      </Section>

      <Section title="Responsável legal">
        <Field label="Nome do responsável">
          <Input
            value={data.responsavelLegal}
            onChange={(e) => set("responsavelLegal", e.target.value)}
          />
        </Field>
        <Field label="CPF do responsável">
          <Input
            value={data.cpfResponsavel}
            onChange={(e) => set("cpfResponsavel", e.target.value)}
            placeholder="000.000.000-00"
          />
        </Field>
        <Field label="E-mail do responsável">
          <Input
            type="email"
            value={data.emailResponsavel}
            onChange={(e) => set("emailResponsavel", e.target.value)}
          />
        </Field>
        <Field label="Telefone do responsável">
          <Input
            value={data.telefoneResponsavel}
            onChange={(e) => set("telefoneResponsavel", e.target.value)}
          />
        </Field>
      </Section>

      <Section title="Dados bancários">
        <Field label="Banco">
          <Input
            value={data.banco}
            onChange={(e) => set("banco", e.target.value)}
          />
        </Field>
        <Field label="Agência">
          <Input
            value={data.agencia}
            onChange={(e) => set("agencia", e.target.value)}
          />
        </Field>
        <Field label="Conta">
          <Input
            value={data.conta}
            onChange={(e) => set("conta", e.target.value)}
          />
        </Field>
        <Field label="Chave Pix" className="lg:col-span-2">
          <Input
            value={data.chavePix}
            onChange={(e) => set("chavePix", e.target.value)}
          />
        </Field>
      </Section>

      <Section title="Configuração comercial">
        <Field label="Status">
          <Select
            value={data.status}
            onValueChange={(v) => set("status", v as ClienteStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_CLIENTE.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Limite operacional (R$)">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={data.limiteOperacional}
            onChange={(e) =>
              set("limiteOperacional", Number(e.target.value) || 0)
            }
          />
        </Field>
        <Field
          label="Observações internas"
          className="sm:col-span-2 lg:col-span-3"
        >
          <Textarea
            rows={3}
            value={data.observacoes}
            onChange={(e) => set("observacoes", e.target.value)}
            placeholder="Notas para a equipe interna (não visíveis ao cliente)"
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
          {initial ? "Salvar alterações" : "Cadastrar cliente"}
        </Button>
      </div>
    </form>
  );
}