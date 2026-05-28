import type { Cliente } from "@/data/mockClientes";
import type { Sacado } from "@/data/mockSacados";
import { formatBR, dateToISO } from "@/lib/dateUtils";

export interface Filtros {
  inicio?: Date;
  fim?: Date;
  cedenteId: string; // "" = todos
  sacadoId: string;
  statusOperacao: string; // "" = todos
  tipoTitulo: string;
  responsavel: string;
}

/**
 * Resumo legível dos filtros aplicados (mostrado no topo da página e nos PDFs
 * exportados). Recebe `clientes` e `sacados` por parâmetro para resolver os ids
 * em nomes — função pura, não acessa fontes de dados.
 */
export function montarResumoFiltros(
  f: Filtros,
  clientes: Cliente[],
  sacados: Sacado[],
): string {
  const partes: string[] = [];
  if (f.inicio) partes.push(`início ${formatBR(dateToISO(f.inicio))}`);
  if (f.fim) partes.push(`fim ${formatBR(dateToISO(f.fim))}`);
  if (f.cedenteId)
    partes.push(
      `cedente ${clientes.find((c) => c.id === f.cedenteId)?.razaoSocial ?? f.cedenteId}`,
    );
  if (f.sacadoId)
    partes.push(
      `sacado ${sacados.find((s) => s.id === f.sacadoId)?.nome ?? f.sacadoId}`,
    );
  if (f.statusOperacao) partes.push(`status ${f.statusOperacao}`);
  if (f.tipoTitulo) partes.push(`tipo ${f.tipoTitulo}`);
  if (f.responsavel) partes.push(`resp. ${f.responsavel}`);
  return partes.length ? partes.join(" • ") : "Sem filtros aplicados";
}
