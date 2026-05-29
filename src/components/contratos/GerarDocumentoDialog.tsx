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
import { useModelosDocumento } from "@/hooks/useModelosDocumento";
import type { Operacao } from "@/data/mockOperacoes";
import { useOperacoes } from "@/hooks/useOperacoes";
import { useClientes } from "@/hooks/useClientes";
import { useTitulos } from "@/hooks/useTitulos";
import { useSacados } from "@/hooks/useSacados";
import { useDocumentosGerados } from "@/hooks/useDocumentosGerados";
import { useDadosEmpresa } from "@/hooks/useDadosEmpresa";
import { toast } from "sonner";
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
  "Recibo de pagamento",
] as const;
type TipoGeravel = (typeof TIPOS_GERAVEIS)[number];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSalvar: (doc: DocumentoGerado) => void;
  /** Pré-seleciona o tipo de documento ao abrir. */
  initialTipo?: TipoGeravel;
  /** Pré-seleciona a operação ao abrir. */
  initialOperacaoId?: string;
}

export function GerarDocumentoDialog({
  open,
  onOpenChange,
  onSalvar,
  initialTipo,
  initialOperacaoId,
}: Props) {
  const { modelos, isLoading: isLoadingModelos } = useModelosDocumento();
  const { operacoes, isLoading: isLoadingOperacoes } = useOperacoes();
  const { clientes } = useClientes();
  const { titulos } = useTitulos();
  const { sacados } = useSacados();
  const { create } = useDocumentosGerados();
  const { dados: empresa } = useDadosEmpresa();
  const [tipo, setTipo] = useState<TipoGeravel>(
    initialTipo ?? "Contrato de cessão de direitos creditórios",
  );
  const [modeloId, setModeloId] = useState<string>("");
  const [operacaoId, setOperacaoId] = useState<string>("");
  const [textoFinal, setTextoFinal] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");
  const [status, setStatus] = useState<DocumentoStatus>("Rascunho");
  const [isCreating, setIsCreating] = useState(false);

  // Modelos ativos do tipo selecionado
  const modelosDoTipo = useMemo(
    () => modelos.filter((m) => m.tipo === tipo && m.status === "Ativo"),
    [modelos, tipo],
  );

  const modeloSelecionado = modelos.find((m) => m.id === modeloId);
  const operacaoSelecionada: Operacao | undefined = operacoes.find(
    (o) => o.id === operacaoId,
  );

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setTipo(initialTipo ?? "Contrato de cessão de direitos creditórios");
      setModeloId("");
      setOperacaoId(initialOperacaoId ?? "");
      setTextoFinal("");
      setObservacoes("");
      setStatus("Rascunho");
    }
  }, [open, initialTipo, initialOperacaoId]);

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
    const cedente = clientes.find((c) => c.id === operacaoSelecionada.cedenteId);
    const titulosDaOperacao = titulos.filter((t) =>
      operacaoSelecionada.titulosIds.includes(t.id),
    );
    const valores = montarPlaceholders(
      operacaoSelecionada,
      cedente,
      titulosDaOperacao,
      sacados,
      empresa,
    );
    const texto = preencherTexto(modeloSelecionado.texto, valores);
    setTextoFinal(texto);
  };

  const handleSalvar = async () => {
    if (!modeloSelecionado || !operacaoSelecionada || !textoFinal) return;
    setIsCreating(true);
    try {
      const doc = await create({
        tipoDocumento: modeloSelecionado.tipo,
        modeloId: modeloSelecionado.id,
        modeloNome: modeloSelecionado.nome,
        modeloVersao: modeloSelecionado.versao,
        operacaoId: operacaoSelecionada.id,
        operacaoNumero: operacaoSelecionada.numero,
        cedenteId: operacaoSelecionada.cedenteId,
        cedenteNome: operacaoSelecionada.cedenteNome,
        status,
        textoFinal,
        observacoes,
      });
      onSalvar(doc);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Não foi possível salvar o documento.",
      );
    } finally {
      setIsCreating(false);
    }
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
              disabled={isLoadingModelos || modelosDoTipo.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isLoadingModelos
                      ? "Carregando..."
                      : modelosDoTipo.length === 0
                        ? "Nenhum modelo disponível"
                        : "Selecione..."
                  }
                />
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
            <Select
              value={operacaoId}
              onValueChange={setOperacaoId}
              disabled={isLoadingOperacoes || operacoes.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isLoadingOperacoes
                      ? "Carregando..."
                      : operacoes.length === 0
                        ? "Nenhuma operação disponível"
                        : "Selecione a operação"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {operacoes.map((o) => (
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
          <Button onClick={handleSalvar} disabled={!podeSalvar || isCreating}>
            {isCreating ? "Gerando..." : "Salvar como documento gerado"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
