import { PLACEHOLDERS } from "@/data/mockContratos";

/**
 * Renderiza o texto do modelo destacando placeholders {{...}}.
 * Placeholders conhecidos: badge primary. Desconhecidos: badge warning.
 */
export function PreviewTexto({ texto }: { texto: string }) {
  const known = new Set<string>(PLACEHOLDERS);
  const partes = texto.split(/(\{\{[a-z0-9_]+\}\})/gi);

  return (
    <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground">
      {partes.map((p, i) => {
        const m = p.match(/^\{\{([a-z0-9_]+)\}\}$/i);
        if (!m) return <span key={i}>{p}</span>;
        const name = m[1];
        const isKnown = known.has(name);
        return (
          <span
            key={i}
            className={
              isKnown
                ? "rounded bg-primary/15 px-1.5 py-0.5 font-mono text-xs text-primary"
                : "rounded bg-warning/20 px-1.5 py-0.5 font-mono text-xs text-warning-foreground"
            }
            title={isKnown ? "Placeholder reconhecido" : "Placeholder não reconhecido"}
          >
            {p}
          </span>
        );
      })}
    </pre>
  );
}
