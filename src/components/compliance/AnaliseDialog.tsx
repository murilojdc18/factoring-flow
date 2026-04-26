import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  alvosDisponiveis,
  AnaliseCompliance,
  checklistDoEscopo,
  complianceStore,
  EscopoAnalise,
  NIVEIS_RISCO,
  NivelRisco,
  RespostaChecklist,
} from "@/data/mockCompliance";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  escopo: EscopoAnalise;
  alvoIdInicial?: string;
  analiseExistente?: AnaliseCompliance;
}

export function AnaliseDialog({
  open,
  onOpenChange,
  escopo,
  alvoIdInicial,
  analiseExistente,
}: Props) {
  const itens = useMemo(() => checklistDoEscopo(escopo), [escopo]);
  const alvos = useMemo(() => alvosDisponiveis(escopo), [escopo]);

  const [alvoId, setAlvoId] = useState<string>("");
  const [nivel, setNivel] = useState<NivelRisco>("Baixo");
  const [responsavel, setResponsavel] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [respostas, setRespostas] = useState<RespostaChecklist[]>([]);

  useEffect(() => {
    if (!open) return;
    if (analiseExistente) {
      setAlvoId(analiseExistente.alvoId);
      setNivel(analiseExistente.nivelRisco);
      setResponsavel(analiseExistente.responsavel);
      setJustificativa(analiseExistente.justificativa);
      setObservacoes(analiseExistente.observacoes ?? "");
      setRespostas(analiseExistente.respostas);
    } else {
      setAlvoId(alvoIdInicial ?? "");
      setNivel("Baixo");
      setResponsavel("");
      setJustificativa("");
      setObservacoes("");
      setRespostas(itens.map((i) => ({ itemId: i.id, conferido: false })));
    }
  }, [open, analiseExistente, alvoIdInicial, itens]);

  const toggleItem = (itemId: string, conferido: boolean) => {
    setRespostas((prev) => {
      const exists = prev.find((r) => r.itemId === itemId);
      if (exists) {
        return prev.map((r) => (r.itemId === itemId ? { ...r, conferido } : r));
      }
      return [...prev, { itemId, conferido }];
    });
  };

  const obrigatoriosPendentes = itens
    .filter((i) => i.obrigatorio)
    .filter((i) => !respostas.find((r) => r.itemId === i.id)?.conferido);

  const handleSubmit = () => {
    if (!alvoId) {
      toast.error(`Selecione um ${escopo.toLowerCase()}.`);
      return;
    }
    if (!responsavel.trim()) {
      toast.error("Informe o responsável pela análise.");
      return;
    }
    if (!justificativa.trim()) {
      toast.error("Justifique o nível de risco atribuído.");
      return;
    }
    const alvoNome = alvos.find((a) => a.id === alvoId)?.nome ?? alvoId;
    complianceStore.salvar({
      escopo,
      alvoId,
      alvoNome,
      nivelRisco: nivel,
      justificativa: justificativa.trim(),
      responsavel: responsavel.trim(),
      respostas,
      observacoes: observacoes.trim() || undefined,
    });
    toast.success("Análise registrada.", {
      description: "Registro interno. Não substitui revisão jurídica.",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {analiseExistente ? "Revisar análise" : "Nova análise"} —{" "}
            {escopo === "Cliente" ? "Onboarding" : "Operação"}
          </DialogTitle>
          <DialogDescription>
            Registro interno de PLD/FT. Não constitui comunicação oficial nem
            substitui assessoria jurídica ou de compliance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{escopo}</Label>
              <Select
                value={alvoId}
                onValueChange={setAlvoId}
                disabled={!!analiseExistente}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Selecionar ${escopo.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {alvos.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nível de risco</Label>
              <Select
                value={nivel}
                onValueChange={(v) => setNivel(v as NivelRisco)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NIVEIS_RISCO.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="resp">Responsável pela análise</Label>
              <Input
                id="resp"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                placeholder="Nome do analista responsável"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="just">Justificativa do risco</Label>
              <Textarea
                id="just"
                rows={3}
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Descreva os motivos para o nível de risco atribuído."
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Checklist</Label>
            <ul className="space-y-2 rounded-md border bg-muted/30 p-3">
              {itens.map((i) => {
                const r = respostas.find((x) => x.itemId === i.id);
                return (
                  <li key={i.id} className="flex items-start gap-3">
                    <Checkbox
                      id={`chk-${i.id}`}
                      checked={!!r?.conferido}
                      onCheckedChange={(v) => toggleItem(i.id, !!v)}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor={`chk-${i.id}`}
                      className="flex-1 cursor-pointer text-sm font-normal"
                    >
                      {i.titulo}
                      {i.obrigatorio && (
                        <span className="ml-1 text-xs text-destructive">
                          *
                        </span>
                      )}
                    </Label>
                  </li>
                );
              })}
            </ul>
            {obrigatoriosPendentes.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                {obrigatoriosPendentes.length} item(ns) obrigatório(s) ainda não
                conferido(s). Você pode salvar mesmo assim, mas o status ficará
                pendente.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="obs">Observações internas</Label>
            <Textarea
              id="obs"
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações de uso interno."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {analiseExistente ? "Salvar revisão" : "Registrar análise"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}