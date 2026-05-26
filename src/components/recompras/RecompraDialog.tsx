import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Titulo } from "@/data/mockTitulos";
import {
  TIPOS_ACAO_RECOMPRA,
  TipoAcaoRecompra,
} from "@/data/mockRecompras";
import { useRecompras } from "@/hooks/useRecompras";
import { formatBRL } from "@/lib/format";
import { formatBR } from "@/lib/dateUtils";
import { toast } from "sonner";

interface Props {
  titulo: Titulo | null;
  /** Operação vinculada, se aberto a partir do detalhe da operação. */
  operacaoId?: string;
  operacaoNumero?: string;
  onClose: () => void;
  /** Callback após salvar (ex.: registrar no histórico da operação). */
  onSaved?: (descricao: string) => void;
}

/**
 * Modal compartilhado entre /operacoes e /cobrancas para registrar
 * recompra, substituição ou análise interna de um título.
 * NÃO gera cobrança real, NÃO altera valores definitivos.
 */
export function RecompraDialog({
  titulo,
  operacaoId,
  operacaoNumero,
  onClose,
  onSaved,
}: Props) {
  const { create } = useRecompras();
  const [tipoAcao, setTipoAcao] = useState<TipoAcaoRecompra>("Recompra");
  const [motivo, setMotivo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Reset ao abrir um novo título
  useEffect(() => {
    if (titulo) {
      setTipoAcao("Recompra");
      setMotivo("");
      setObservacoes("");
      setResponsavel("");
    }
  }, [titulo]);

  const open = !!titulo;

  const handleSalvar = async () => {
    if (!titulo) return;
    if (!motivo.trim()) {
      toast.error("Informe o motivo da solicitação.");
      return;
    }
    if (!responsavel.trim()) {
      toast.error("Informe o responsável.");
      return;
    }
    setIsCreating(true);
    try {
      // cedente_id e operacao_id (FKs) não moram no SolicitacaoRecompra: vão no
      // ctx. cedenteId sai do título; operacaoId pode ser undefined quando
      // aberto de /cobranças (o hook/mapper grava null — 2.6.1c).
      const nova = await create(
        {
          tituloId: titulo.id,
          tituloNumero: titulo.numero,
          cedenteNome: titulo.cedenteNome,
          sacadoNome: titulo.sacadoNome,
          operacaoId,
          operacaoNumero,
          tipoAcao,
          motivo: motivo.trim(),
          observacoes: observacoes.trim(),
          responsavel: responsavel.trim(),
        },
        { cedenteId: titulo.cedenteId, operacaoId },
      );
      toast.success(`${tipoAcao} registrada para ${titulo.numero}.`, {
        description: `Status: ${nova.status}`,
      });
      // onSaved só no sucesso (ex.: registrar no histórico da operação).
      onSaved?.(
        `${tipoAcao} solicitada para ${titulo.numero} por ${nova.responsavel} — ${motivo.trim()}`,
      );
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Erro ao registrar a solicitação.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        {titulo && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-warning" />
                Recompra ou substituição — {titulo.numero}
              </DialogTitle>
              <DialogDescription>
                {titulo.cedenteNome} → {titulo.sacadoNome} •{" "}
                {formatBRL(titulo.valorFace)} • venc.{" "}
                {formatBR(titulo.dataVencimento)}
              </DialogDescription>
            </DialogHeader>

            <Alert>
              <AlertTitle>Fluxo proforma</AlertTitle>
              <AlertDescription>
                Esta ação registra uma solicitação interna. Não gera cobrança
                automática, não altera valores financeiros nem cria obrigação
                jurídica.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo de ação *</Label>
                <Select
                  value={tipoAcao}
                  onValueChange={(v) => setTipoAcao(v as TipoAcaoRecompra)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_ACAO_RECOMPRA.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="resp">Responsável *</Label>
                <Input
                  id="resp"
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  placeholder="Quem está conduzindo esta solicitação"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo *</Label>
              <Textarea
                id="motivo"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex.: Sacado contestou a NF; cedente não apresentou comprovante de entrega."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="obs">Observações internas</Label>
              <Textarea
                id="obs"
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Notas para a equipe (não enviadas ao cedente)."
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleSalvar} disabled={isCreating}>
                {isCreating ? "Salvando..." : "Registrar solicitação"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}