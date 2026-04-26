/**
 * Converte um valor para CSV-safe escapando aspas e envolvendo em "..."
 * quando contém vírgula, quebra de linha ou aspas.
 */
function csvCell(v: string | number | undefined | null): string {
  if (v === undefined || v === null) return "";
  const s = String(v);
  if (/[",;\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Gera e baixa um CSV a partir de cabeçalhos + linhas de dados.
 * Usa BOM UTF-8 para abrir corretamente no Excel BR.
 */
export function exportarCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  const sep = ";"; // padrão BR
  const linhas = [
    headers.map(csvCell).join(sep),
    ...rows.map((r) => r.map(csvCell).join(sep)),
  ];
  const conteudo = "\uFEFF" + linhas.join("\n");
  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}