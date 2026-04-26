import { useEffect, useMemo, useState } from "react";
import { FileSignature, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ModeloContrato } from "@/data/mockContratos";
import { mockOperacoes, Operacao } from "@/data/mockOperacoes";
import {
  DocumentoGerado,
  DocumentoStatus,
} from "@/data/mockDocumentosGerados";
import {
  montarPlaceholders,
  preencherTexto,
} from "@/lib/preencherDocumento";
import { formatBR } from "@/lib/dateUtils";

/** Tipos de documento suportados pelo gerador. */
const TIPOS_GERAVEIS = [
  "Contrato de cessão de direitos creditórios",
  "Aditivo de operação",
  "Borderô de títulos",
] as const;
type TipoGeravel = (typeof TIPOS_GERAVEIS)[number];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelos: ModeloContrato[];
  onSalvar: (doc: DocumentoGerado) => void;
}

export function GerarDocumentoDialog({
  open,
  onOpenChange,
  modelos,
  onSalvar,
}: Props) {
  const [tipo, setTipo] = useState<TipoGeravel>(
    "Contrato de cessão de direitos creditórios",
  );
  const [modeloId, setModeloId] = useState<string>("");
  const [operacaoId, setOperacaoId] = useState<string>("");
  const [textoFinal, setTextoFinal] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");
  const [status, setStatus] = useState<DocumentoStatus>("Rascunho");

  // Modelos ativos do tipo selecionado
  const modelosDoTipo = useMemo(
    () => modelos.filter((m) => m.tipo === tipo && m.status === "Ativo"),
    [modelos, tipo],
  );

  const modeloSelecionado = modelos.find((m) => m.id === modeloId);
  const operacaoSelecionada: Operacao | undefined = mockOperacoes.find(
    (o) => o.id === operacaoId,
  );

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setTipo("Contrato de cessão de direitos creditórios");
      setModeloId("");
      setOperacaoId("");
      setTextoFinal("");
      setObservacoes("");
      setStatus("Rascunho");
    }
  }, [open]);

  // Auto-seleciona o primeiro modelo do tipo
  useEffect(() => {
    if (modelosDoTipo.length > 0 && !modelosDoTipo.find((m) => m.id === modeloId)) {
      setModeloId(modelosDoTipo[0].id);
    } else if (modelosDoTipo.length === 0) {
      setModeloId("");
    }
  }, [modelosDoTipo, modeloId]);

  const handleGerarPreview = () => {
    if (!modeloSelecionado || !operacaoSelecionada) return;
    const valores = montarPlaceholders(operacaoSelecionada);
    const texto = preencherTexto(modeloSelecionado.texto, valores);
    setTextoFinal(texto);
  };

  const handleSalvar = () => {
    if (!modeloSelecionado || !operacaoSelecionada || !textoFinal) return;
    const doc: DocumentoGerado = {
      id: `DOC-${Date.now()}`,
      tipoDocumento: modeloSelecionado.tipo,
      modeloId: modeloSelecionado.id,
      modeloNome: modeloSelecionado.nome,
      modeloVersao: modeloSelecionado.versao,
      operacaoId: operacaoSelecionada.id,
      operacaoNumero: operacaoSelecionada.numero,
      cedenteId: operacaoSelecionada.cedenteId,
      cedenteNome: operacaoSelecionada.cedenteNome,
      geradoEm: new Date().toISOString().slice(0, 10),
      status,
      textoFinal,
      observacoes,
    };
    onSalvar(doc);
  };

  const podeGerarPreview = !!modeloSelecionado && !!operacaoSelecionada;
  const podeSalvar = podeGerarPreview && textoFinal.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            Gerar documento proforma
          </DialogTitle>
          <DialogDescription>
            Escolha tipo, modelo e operação. O preview gerado pode ser editado
            antes de salvar — o modelo original não é alterado.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertTitle>Documento proforma</AlertTitle>
          <AlertDescription>
            O texto resultante é uma minuta editável e deve passar por revisão
            jurídica antes de qualquer formalização.
          </AlertDescription>
        </Alert>

        {/* 1. Tipo + 2. Modelo + 3. Operação */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>1. Tipo de documento</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoGeravel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_GERAVEIS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>2. Modelo ativo</Label>
            <Select
              value={modeloId}
              onValueChange={setModeloId}
              disabled={modelosDoTipo.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={modelosDoTipo.length === 0 ? "Sem modelo ativo" : "Escolha o modelo"} />
              </SelectTrigger>
              <SelectContent>
                {modelosDoTipo.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome} (v{m.versao})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>3. Operação</Label>
            <Select value={operacaoId} onValueChange={setOperacaoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a operação" />
              </SelectTrigger>
              <SelectContent>
                {mockOperacoes.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.numero} — {o.cedenteNome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {operacaoSelecionada && (
          <div className="rounded-md border bg-muted/40 p-3 text-xs">
            <p>
              <span className="text-muted-foreground">Cedente:</span>{" "}
              <span className="font-medium">{operacaoSelecionada.cedenteNome}</span>
              {" • "}
              <span className="text-muted-foreground">Data:</span>{" "}
              {formatBR(operacaoSelecionada.dataOperacao)}
              {" • "}
              <span className="text-muted-foreground">Títulos:</span>{" "}
              {operacaoSelecionada.quantidadeTitulos}
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleGerarPreview}
            disabled={!podeGerarPreview}
            variant="outline"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {textoFinal ? "Regenerar a partir do modelo" : "Gerar preview preenchido"}
          </Button>
        </div>

        <Separator />

        {/* Preview / edição */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="textoFinal">Texto final (editável)</Label>
            <span className="text-xs text-muted-foreground">
              Edições aqui não alteram o modelo original.
            </span>
          </div>
          <Textarea
            id="textoFinal"
            rows={16}
            className="font-mono text-xs"
            value={textoFinal}
            onChange={(e) => setTextoFinal(e.target.value)}
            placeholder="Gere o preview para ver o texto preenchido aqui."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as DocumentoStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Rascunho">Rascunho</SelectItem>
                <SelectItem value="Em revisão">Em revisão</SelectItem>
                <SelectItem value="Aprovado internamente">Aprovado internamente</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="obs">Observações internas</Label>
            <Textarea
              id="obs"
              rows={3}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={!podeSalvar}>
            Salvar como documento gerado
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
