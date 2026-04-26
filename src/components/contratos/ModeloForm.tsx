import { useState } from "react";
import {
  ModeloContrato,
  STATUS_CONTRATO,
  TIPOS_CONTRATO,
  PLACEHOLDERS,
} from "@/data/mockContratos";
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
import { Badge } from "@/components/ui/badge";

interface Props {
  modelo?: ModeloContrato;
  onCancel: () => void;
  onSubmit: (m: ModeloContrato) => void;
}

export function ModeloForm({ modelo, onCancel, onSubmit }: Props) {
  const [data, setData] = useState<ModeloContrato>(
    modelo ?? {
      id: `MOD-${Math.floor(Math.random() * 9000 + 1000)}`,
      nome: "",
      tipo: "Contrato master de fomento mercantil",
      versao: "1.0",
      status: "Rascunho",
      atualizadoEm: new Date().toISOString().slice(0, 10),
      texto: "",
      observacoes: "",
    },
  );

  const insertPlaceholder = (name: string) => {
    setData((d) => ({ ...d, texto: `${d.texto}{{${name}}}` }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...data, atualizadoEm: new Date().toISOString().slice(0, 10) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="nome">Nome do modelo</Label>
          <Input
            id="nome"
            required
            value={data.nome}
            onChange={(e) => setData({ ...data, nome: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select
            value={data.tipo}
            onValueChange={(v) => setData({ ...data, tipo: v as ModeloContrato["tipo"] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_CONTRATO.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="versao">Versão</Label>
            <Input
              id="versao"
              required
              value={data.versao}
              onChange={(e) => setData({ ...data, versao: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={data.status}
              onValueChange={(v) => setData({ ...data, status: v as ModeloContrato["status"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_CONTRATO.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="texto">Texto do modelo</Label>
        <Textarea
          id="texto"
          rows={14}
          required
          className="font-mono text-xs"
          value={data.texto}
          onChange={(e) => setData({ ...data, texto: e.target.value })}
          placeholder="Digite o texto do contrato. Use placeholders {{nome_do_campo}}."
        />
        <div>
          <p className="mb-2 text-xs text-muted-foreground">
            Placeholders disponíveis (clique para inserir):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PLACEHOLDERS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => insertPlaceholder(p)}
                className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary transition hover:bg-primary/20"
              >
                {`{{${p}}}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="obs">Observações internas</Label>
        <Textarea
          id="obs"
          rows={3}
          value={data.observacoes}
          onChange={(e) => setData({ ...data, observacoes: e.target.value })}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Salvar modelo</Button>
      </div>
    </form>
  );
}
