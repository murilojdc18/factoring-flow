import type { Titulo } from "@/data/mockTitulos";
import type { EstadoCobranca, StatusCobranca } from "@/data/mockCobrancas";
import { daysUntil } from "@/lib/dateUtils";

/**
 * Derivação do estado de cobrança de um título (2.8.4, decisão D2).
 *
 * Função PURA que combina o título com o estado do último evento (vindo de
 * `useCobrancas.estado(tituloId)`) na regra de precedência de 4 níveis do
 * plano-2.8.md §5. O status financeiro do título VENCE o evento (níveis 1/2):
 * um título Liquidado/Recomprado mostra esse estado mesmo havendo evento de
 * cobrança recente.
 *
 * Precedência do STATUS:
 *  1. título "Liquidado"  → "Liquidado"
 *  2. título "Recomprado" → "Para recompra"
 *  3. há eventoEstado     → eventoEstado.status (categoria do último contato)
 *  4. senão               → vencido "Em cobrança" | futuro/hoje "A vencer"
 *
 * Última/próxima ação vêm do evento quando há um; senão, derivam do vencimento.
 * `dataReferencia` existe só para testes determinísticos (a página usa "hoje").
 */
export function deriveEstado(
  titulo: Titulo,
  eventoEstado?: EstadoCobranca,
  dataReferencia?: Date,
): EstadoCobranca {
  const dias = daysUntil(titulo.dataVencimento, dataReferencia);

  let status: StatusCobranca;
  if (titulo.status === "Liquidado") status = "Liquidado";
  else if (titulo.status === "Recomprado") status = "Para recompra";
  else if (eventoEstado) status = eventoEstado.status;
  else status = dias < 0 ? "Em cobrança" : "A vencer";

  return {
    status,
    ultimaAcao: eventoEstado?.ultimaAcao ?? "—",
    proximaAcao:
      eventoEstado?.proximaAcao ??
      (dias < 0 ? "Iniciar contato" : "Aguardar vencimento"),
    proximaAcaoData: eventoEstado?.proximaAcaoData || titulo.dataVencimento,
  };
}
