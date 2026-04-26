import {
  Wallet,
  AlertTriangle,
  FileText,
  TrendingUp,
  Mail,
  Phone,
  MapPin,
  Building2,
  User,
  Landmark,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "./StatusBadge";
import { formatBRL, formatNumber } from "@/lib/format";
import type { Cliente } from "@/data/mockClientes";
import { AnexosSection } from "@/components/anexos/AnexosSection";

function Stat({
  icon: Icon,
  label,
  value,
  tone = "text-foreground",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <Icon className={`h-4 w-4 ${tone}`} />
        </div>
        <p className={`mt-2 text-xl font-bold tabular-nums ${tone}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-medium text-foreground break-words">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function Block({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <Separator className="mb-3" />
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export function ClienteDetalhes({ cliente }: { cliente: Cliente }) {
  const utilizado =
    cliente.limiteOperacional > 0
      ? Math.min(
          100,
          Math.round((cliente.totalEmAberto / cliente.limiteOperacional) * 100),
        )
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{cliente.id}</p>
          <h2 className="text-xl font-bold text-foreground">
            {cliente.razaoSocial}
          </h2>
          <p className="text-sm text-muted-foreground">
            {cliente.nomeFantasia} · CNPJ {cliente.cnpj}
          </p>
        </div>
        <StatusBadge status={cliente.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={Wallet}
          label="Limite operacional"
          value={formatBRL(cliente.limiteOperacional)}
          tone="text-primary"
        />
        <Stat
          icon={TrendingUp}
          label="Em aberto"
          value={formatBRL(cliente.totalEmAberto)}
          tone="text-success"
        />
        <Stat
          icon={AlertTriangle}
          label="Vencido"
          value={formatBRL(cliente.totalVencido)}
          tone={cliente.totalVencido > 0 ? "text-destructive" : "text-foreground"}
        />
        <Stat
          icon={FileText}
          label="Títulos"
          value={formatNumber(cliente.qtdTitulos)}
          tone="text-foreground"
        />
      </div>

      {cliente.limiteOperacional > 0 && (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Utilização do limite
            </span>
            <span className="font-semibold text-foreground">{utilizado}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-primary transition-all"
              style={{ width: `${utilizado}%` }}
            />
          </div>
        </div>
      )}

      <Block title="Contato" icon={Mail}>
        <InfoRow icon={Mail} label="E-mail principal" value={cliente.emailPrincipal} />
        <InfoRow icon={Phone} label="Telefone" value={cliente.telefone} />
        <InfoRow icon={Phone} label="WhatsApp" value={cliente.whatsapp} />
      </Block>

      <Block title="Endereço" icon={MapPin}>
        <InfoRow label="CEP" value={cliente.cep} />
        <InfoRow
          label="Logradouro"
          value={`${cliente.endereco}, ${cliente.numero}${
            cliente.complemento ? ` — ${cliente.complemento}` : ""
          }`}
        />
        <InfoRow label="Bairro" value={cliente.bairro} />
        <InfoRow
          label="Cidade / UF"
          value={`${cliente.cidade} / ${cliente.estado}`}
        />
      </Block>

      <Block title="Dados fiscais" icon={Building2}>
        <InfoRow label="Inscrição estadual" value={cliente.inscricaoEstadual} />
        <InfoRow label="Inscrição municipal" value={cliente.inscricaoMunicipal} />
      </Block>

      <Block title="Responsável legal" icon={User}>
        <InfoRow label="Nome" value={cliente.responsavelLegal} />
        <InfoRow label="CPF" value={cliente.cpfResponsavel} />
        <InfoRow label="E-mail" value={cliente.emailResponsavel} />
        <InfoRow label="Telefone" value={cliente.telefoneResponsavel} />
      </Block>

      <Block title="Dados bancários" icon={Landmark}>
        <InfoRow label="Banco" value={cliente.banco} />
        <InfoRow label="Agência" value={cliente.agencia} />
        <InfoRow label="Conta" value={cliente.conta} />
        <InfoRow label="Chave Pix" value={cliente.chavePix} />
      </Block>

      {cliente.observacoes && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Observações internas
            </h3>
          </div>
          <Separator className="mb-3" />
          <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground">
            {cliente.observacoes}
          </p>
        </div>
      )}
      <AnexosSection
        entidadeTipo="cliente"
        entidadeId={cliente.id}
        titulo="Documentos e anexos"
      />
    </div>
  );
}