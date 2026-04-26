export function parseISO(date: string): Date {
  // yyyy-mm-dd → Date local (sem timezone shift)
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function formatBR(date: string): string {
  if (!date) return "—";
  const d = parseISO(date);
  return d.toLocaleDateString("pt-BR");
}

/**
 * Dias até a data (positivo = futuro, negativo = passado).
 */
export function daysUntil(dateISO: string): number {
  const d = parseISO(dateISO);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

export function dateToISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}