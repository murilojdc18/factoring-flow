import { useEffect, useRef, useState } from "react";
import { Paperclip, Upload, Download, Archive, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatBR } from "@/lib/dateUtils";
import {
  type Anexo,
  type AnexoEntidade,
  arquivarAnexo,
  EXTENSOES_PERMITIDAS,
  formatarTamanho,
  gerarUrlDownload,
  listarAnexos,
  TAMANHO_MAX_BYTES,
  uploadAnexo,
  validarArquivo,
} from "@/lib/anexos";

interface Props {
  entidadeTipo: AnexoEntidade;
  entidadeId: string;
  titulo?: string;
  className?: string;
}

export function AnexosSection({
  entidadeTipo,
  entidadeId,
  titulo = "Anexos",
  className,
}: Props) {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [baixando, setBaixando] = useState<string | null>(null);

  const podeEnviar =
    !!user &&
    !!role &&
    ["administrador", "operacional", "financeiro", "compliance", "cobranca"].includes(role);
  const isAdmin = role === "administrador";

  async function recarregar() {
    if (!entidadeId) return;
    setCarregando(true);
    const { data, error } = await listarAnexos(entidadeTipo, entidadeId);
    setCarregando(false);
    if (error) {
      toast({ title: "Erro ao carregar anexos", description: error, variant: "destructive" });
      return;
    }
    setAnexos(data);
  }

  useEffect(() => {
    recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entidadeTipo, entidadeId]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!podeEnviar) {
      toast({
        title: "Sem permissão",
        description: "Seu perfil não pode enviar anexos.",
        variant: "destructive",
      });
      return;
    }
    setEnviando(true);
    let sucesso = 0;
    let falhas = 0;
    for (const file of Array.from(files)) {
      const v = validarArquivo(file);
      if (!v.ok) {
        falhas++;
        toast({
          title: `Não foi possível enviar ${file.name}`,
          description: v.erro,
          variant: "destructive",
        });
        continue;
      }
      const { error } = await uploadAnexo({
        file,
        entidadeTipo,
        entidadeId,
      });
      if (error) {
        falhas++;
        toast({
          title: `Falha ao enviar ${file.name}`,
          description: error,
          variant: "destructive",
        });
      } else {
        sucesso++;
      }
    }
    setEnviando(false);
    if (inputRef.current) inputRef.current.value = "";
    if (sucesso > 0) {
      toast({
        title: `${sucesso} arquivo(s) enviado(s)`,
        description: falhas > 0 ? `${falhas} falharam.` : undefined,
      });
      recarregar();
    }
  }

  async function baixar(anexo: Anexo) {
    setBaixando(anexo.id);
    const { url, error } = await gerarUrlDownload(anexo.storage_path, 60);
    setBaixando(null);
    if (error || !url) {
      toast({
        title: "Falha ao gerar link",
        description: error ?? "URL indisponível",
        variant: "destructive",
      });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function arquivar(anexo: Anexo) {
    const podeArquivar = isAdmin || anexo.enviado_por === user?.id;
    if (!podeArquivar) {
      toast({
        title: "Sem permissão",
        description: "Apenas quem enviou o anexo ou um administrador pode arquivar.",
        variant: "destructive",
      });
      return;
    }
    if (!confirm(`Arquivar "${anexo.nome_arquivo}"?`)) return;
    const { error } = await arquivarAnexo(anexo.id);
    if (error) {
      toast({ title: "Erro ao arquivar", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Anexo arquivado" });
    recarregar();
  }

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            {titulo} ({anexos.length})
          </h3>
        </div>
        {podeEnviar && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={EXTENSOES_PERMITIDAS.join(",")}
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={enviando}
              onClick={() => inputRef.current?.click()}
            >
              {enviando ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="mr-1 h-3.5 w-3.5" />
              )}
              Enviar arquivos
            </Button>
          </>
        )}
      </div>
      <Separator className="mb-3" />

      <p className="mb-2 text-[11px] text-muted-foreground">
        PDF, PNG, JPG ou JPEG · até {Math.round(TAMANHO_MAX_BYTES / 1024 / 1024)} MB por arquivo
      </p>

      {carregando ? (
        <div className="flex items-center justify-center rounded-md border border-dashed border-border bg-muted/30 p-4 text-xs text-muted-foreground">
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Carregando anexos…
        </div>
      ) : anexos.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-center text-xs text-muted-foreground">
          Nenhum anexo enviado ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {anexos.map((a) => {
            const podeArquivar = isAdmin || a.enviado_por === user?.id;
            return (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {a.nome_arquivo}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <Badge
                        variant={a.status === "Ativo" ? "outline" : "secondary"}
                        className="text-[10px]"
                      >
                        {a.status}
                      </Badge>
                      <span>{formatarTamanho(a.tamanho_bytes)}</span>
                      <span>·</span>
                      <span>{formatBR(a.created_at.slice(0, 10))}</span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => baixar(a)}
                    disabled={baixando === a.id}
                    aria-label="Baixar"
                  >
                    {baixando === a.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  {podeArquivar && a.status === "Ativo" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => arquivar(a)}
                      aria-label="Arquivar"
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}