import { Paperclip, FileText, Calendar, User, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { TituloStatusBadge } from "./StatusBadge";
import { formatBRL } from "@/lib/format";
import { formatBR, daysUntil } from "@/lib/dateUtils";
import type { Titulo } from "@/data/mockTitulos";
import { AnexosSection } from "@/components/anexos/AnexosSection";

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ElementType;
  label: string;
  value: string;
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

export function TituloDetalhes({ titulo }: { titulo: Titulo }) {
  const dias = daysUntil(titulo.dataVencimento);
  const vencido = dias < 0;
  const liquidado = titulo.status === "Liquidado";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{titulo.id}</p>
          <h2 className="text-xl font-bold text-foreground">
            {titulo.numero}
          </h2>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="text-[10px]">
              {titulo.tipo}
            </Badge>
            <span>·</span>
            <span>{titulo.descricao || "Sem descrição"}</span>
          </div>
        </div>
        <TituloStatusBadge status={titulo.status} />
      </div>

      <Card className="shadow-card">
        <CardContent className="grid grid-cols-2 gap-4 p-4 lg:grid-cols-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Valor de face
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums text-primary">
              {formatBRL(titulo.valorFace)}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Emissão
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {formatBR(titulo.dataEmissao)}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Vencimento
            </p>
            <p
              className={`mt-1 text-sm font-semibold ${
                vencido && !liquidado ? "text-destructive" : "text-foreground"
              }`}
            >
              {formatBR(titulo.dataVencimento)}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {liquidado ? "Status" : vencido ? "Atraso" : "Vence em"}
            </p>
            <p
              className={`mt-1 text-sm font-semibold ${
                liquidado
                  ? "text-success"
                  : vencido
                    ? "text-destructive"
                    : "text-foreground"
              }`}
            >
              {liquidado
                ? "Liquidado"
                : vencido
                  ? `${Math.abs(dias)} dias`
                  : dias === 0
                    ? "Hoje"
                    : `${dias} dias`}
            </p>
          </div>
        </CardContent>
      </Card>

      <Block title="Partes" icon={User}>
        <InfoRow icon={Building2} label="Cedente" value={titulo.cedenteNome} />
        <InfoRow icon={Building2} label="Sacado" value={titulo.sacadoNome} />
      </Block>

      <Block title="Documento fiscal" icon={FileText}>
        <InfoRow label="Número da NF" value={titulo.numeroNotaFiscal} />
        <InfoRow label="Chave da NF" value={titulo.chaveNotaFiscal} />
      </Block>

      <Block title="Datas" icon={Calendar}>
        <InfoRow label="Emissão" value={formatBR(titulo.dataEmissao)} />
        <InfoRow label="Vencimento" value={formatBR(titulo.dataVencimento)} />
        <InfoRow label="Criado em" value={formatBR(titulo.criadoEm)} />
      </Block>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Anexos ({titulo.anexos.length})
          </h3>
        </div>
        <Separator className="mb-3" />
        {titulo.anexos.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-center text-xs text-muted-foreground">
            Nenhum anexo enviado.
          </p>
        ) : (
          <ul className="space-y-2">
            {titulo.anexos.map((a) => (
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
                      <span>
                        {a.tamanhoKb} KB · {formatBR(a.enviadoEm)}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {titulo.observacoes && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            Observações
          </h3>
          <Separator className="mb-3" />
          <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground">
            {titulo.observacoes}
          </p>
        </div>
      )}
      <AnexosSection
        entidadeTipo="titulo"
        entidadeId={titulo.id}
        titulo="Documentos do título"
      />
    </div>
  );
}