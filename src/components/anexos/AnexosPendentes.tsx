import { useRef } from "react";
import { FileText, Paperclip, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  type ArquivoPendente,
  EXTENSOES_PERMITIDAS,
  formatarTamanho,
  ROLES_ANEXO,
  TAMANHO_MAX_BYTES,
  validarArquivo,
} from "@/lib/anexos";

interface Props {
  value: ArquivoPendente[];
  onChange: (value: ArquivoPendente[]) => void;
  disabled?: boolean;
}

/**
 * Seleção de anexos no formulário de CADASTRO. Os arquivos ficam em memória e a
 * página os envia logo após o insert, quando o id da entidade já existe
 * (`enviarAnexosPendentes`). Na edição, o formulário usa `AnexosSection`.
 */
export function AnexosPendentes({ value, onChange, disabled }: Props) {
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const podeEnviar =
    !!user && roles.some((r) => (ROLES_ANEXO as readonly string[]).includes(r));
  if (!podeEnviar) return null;

  function adicionar(files: FileList | null) {
    if (!files) return;
    const novos: ArquivoPendente[] = [];
    for (const file of Array.from(files)) {
      const v = validarArquivo(file);
      if (!v.ok) {
        toast({
          title: `Não foi possível adicionar ${file.name}`,
          description: v.erro,
          variant: "destructive",
        });
        continue;
      }
      novos.push({ file, descricao: "" });
    }
    onChange([...value, ...novos]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function setDescricao(indice: number, descricao: string) {
    onChange(value.map((p, i) => (i === indice ? { ...p, descricao } : p)));
  }

  function remover(indice: number) {
    onChange(value.filter((_, i) => i !== indice));
  }

  return (
    <div>
      <div className="mb-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Paperclip className="h-4 w-4" />
            Documentos e anexos ({value.length})
          </h3>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={EXTENSOES_PERMITIDAS.join(",")}
            className="hidden"
            onChange={(e) => adicionar(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="mr-1 h-3.5 w-3.5" />
            Adicionar arquivos
          </Button>
        </div>
        <Separator className="mt-2" />
      </div>

      <p className="mb-2 text-[11px] text-muted-foreground">
        Contrato social, faturamento, documentos dos sócios etc. PDF, imagem, Excel
        (XLSX/XLS/CSV) ou Word (DOCX) · até {Math.round(TAMANHO_MAX_BYTES / 1024 / 1024)} MB
        por arquivo. Os arquivos são enviados ao salvar o cadastro.
      </p>

      {value.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-center text-xs text-muted-foreground">
          Nenhum arquivo adicionado.
        </p>
      ) : (
        <ul className="space-y-2">
          {value.map((p, i) => (
            <li
              key={`${p.file.name}-${i}`}
              className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 items-center gap-2 sm:w-1/3">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{p.file.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatarTamanho(p.file.size)}
                  </p>
                </div>
              </div>
              <Input
                value={p.descricao}
                onChange={(e) => setDescricao(i, e.target.value)}
                placeholder="Descrição (ex.: Faturamento 2025)"
                maxLength={200}
                disabled={disabled}
                className="h-8 flex-1 text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => remover(i)}
                aria-label={`Remover ${p.file.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
