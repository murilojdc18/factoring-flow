import {
  Wallet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  MapPin,
  User,
  Gauge,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { SacadoStatusBadge, ScoreBadge } from "./StatusBadge";
import { formatBRL, formatNumber } from "@/lib/format";
import type { Sacado } from "@/data/mockSacados";

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

export function SacadoDetalhes({ sacado }: { sacado: Sacado }) {
  const utilizado =
    sacado.limiteConcentracao > 0
      ? Math.min(
          100,
          Math.round((sacado.totalEmAberto / sacado.limiteConcentracao) * 100),
        )
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-mono text-xs text-muted-foreground">
              {sacado.id}
            </p>
            <Badge variant="outline" className="text-[10px]">
              {sacado.tipo === "PJ" ? "Pessoa Jurídica" : "Pessoa Física"}
            </Badge>
          </div>
          <h2 className="text-xl font-bold text-foreground">{sacado.nome}</h2>
          <p className="text-sm text-muted-foreground">
            {sacado.tipo === "PJ" && sacado.nomeFantasia
              ? `${sacado.nomeFantasia} · `
              : ""}
            {sacado.tipo === "PJ" ? "CNPJ" : "CPF"} {sacado.documento}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <SacadoStatusBadge status={sacado.status} />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Gauge className="h-3.5 w-3.5" />
            Score: <ScoreBadge score={sacado.scoreInterno} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={Wallet}
          label="Em aberto"
          value={formatBRL(sacado.totalEmAberto)}
          tone="text-primary"
        />
        <Stat
          icon={AlertTriangle}
          label="Vencido"
          value={formatBRL(sacado.totalVencido)}
          tone={sacado.totalVencido > 0 ? "text-destructive" : "text-foreground"}
        />
        <Stat
          icon={CheckCircle2}
          label="Títulos pagos"
          value={formatNumber(sacado.titulosPagos)}
          tone="text-success"
        />
        <Stat
          icon={XCircle}
          label="Em atraso"
          value={formatNumber(sacado.titulosEmAtraso)}
          tone={
            sacado.titulosEmAtraso > 0 ? "text-destructive" : "text-foreground"
          }
        />
      </div>

      {sacado.limiteConcentracao > 0 && (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Utilização do limite de concentração
            </span>
            <span className="font-semibold text-foreground">{utilizado}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-primary transition-all"
              style={{ width: `${utilizado}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Limite: {formatBRL(sacado.limiteConcentracao)}
          </p>
        </div>
      )}

      <Block title="Contato" icon={Mail}>
        <InfoRow icon={Mail} label="E-mail" value={sacado.email} />
        <InfoRow icon={Phone} label="Telefone" value={sacado.telefone} />
        <InfoRow icon={Phone} label="WhatsApp" value={sacado.whatsapp} />
        <InfoRow
          icon={User}
          label="Pessoa de contato"
          value={`${sacado.pessoaContato}${
            sacado.cargoContato ? ` — ${sacado.cargoContato}` : ""
          }`}
        />
      </Block>

      <Block title="Endereço" icon={MapPin}>
        <InfoRow label="CEP" value={sacado.cep} />
        <InfoRow
          label="Logradouro"
          value={`${sacado.endereco}, ${sacado.numero}${
            sacado.complemento ? ` — ${sacado.complemento}` : ""
          }`}
        />
        <InfoRow label="Bairro" value={sacado.bairro} />
        <InfoRow
          label="Cidade / UF"
          value={`${sacado.cidade} / ${sacado.estado}`}
        />
      </Block>

      {sacado.observacoes && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Observações internas
            </h3>
          </div>
          <Separator className="mb-3" />
          <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground">
            {sacado.observacoes}
          </p>
        </div>
      )}
    </div>
  );
}