import type {
  AnexoSimulado,
  TipoTitulo,
  Titulo,
  TituloStatus,
} from "@/data/mockTitulos";
import type { Database } from "@/integrations/supabase/types";

type TituloRow = Database["public"]["Tables"]["titulos"]["Row"];
type TituloInsert = Database["public"]["Tables"]["titulos"]["Insert"];

export interface NameLookup {
  clientes: Map<string, string>;
  sacados: Map<string, string>;
}

/**
 * Converte uma linha do banco em Titulo. Os nomes de cedente/sacado são
 * resolvidos via lookup (mantém o mesmo shape do mock).
 * Anexos JSONB legados são tolerados, mas a fonte oficial é a tabela `anexos`.
 */
export function rowToTitulo(row: TituloRow, lookup?: NameLookup): Titulo {
  const anexosRaw = Array.isArray(row.anexos) ? row.anexos : [];
  const anexos: AnexoSimulado[] = anexosRaw
    .filter(
      (a): a is Record<string, unknown> =>
        typeof a === "object" && a !== null && !Array.isArray(a),
    )
    .map((a, i) => {
      const obj = a as Record<string, unknown>;
      return {
        id: String(obj.id ?? `ANX-${i}`),
        nome: String(obj.nome ?? ""),
        tipo: (obj.tipo as AnexoSimulado["tipo"]) ?? "Nota fiscal",
        tamanhoKb: Number(obj.tamanhoKb ?? 0),
        enviadoEm: String(obj.enviadoEm ?? ""),
      };
    });

  return {
    id: row.id,
    numero: row.numero,
    tipo: (row.tipo as TipoTitulo) ?? "Duplicata",
    cedenteId: row.cedente_id,
    cedenteNome: lookup?.clientes.get(row.cedente_id) ?? "",
    sacadoId: row.sacado_id,
    sacadoNome: lookup?.sacados.get(row.sacado_id) ?? "",
    dataEmissao: row.data_emissao,
    dataVencimento: row.data_vencimento,
    valorFace: Number(row.valor_face ?? 0),
    numeroNotaFiscal: row.numero_nota_fiscal ?? "",
    chaveNotaFiscal: row.chave_nota_fiscal ?? "",
    descricao: row.descricao ?? "",
    status: (row.status as TituloStatus) ?? "Disponível",
    observacoes: row.observacoes ?? "",
    anexos,
    criadoEm: row.created_at?.slice(0, 10) ?? "",
  };
}

export function tituloToRow(
  t: Partial<Titulo>,
): Omit<TituloInsert, "id" | "created_at" | "updated_at" | "created_by"> {
  return {
    numero: t.numero ?? "",
    tipo: t.tipo ?? "Duplicata",
    cedente_id: t.cedenteId ?? "",
    sacado_id: t.sacadoId ?? "",
    data_emissao: t.dataEmissao ?? new Date().toISOString().slice(0, 10),
    data_vencimento:
      t.dataVencimento ?? new Date().toISOString().slice(0, 10),
    valor_face: t.valorFace ?? 0,
    numero_nota_fiscal: t.numeroNotaFiscal ?? "",
    chave_nota_fiscal: t.chaveNotaFiscal ?? "",
    descricao: t.descricao ?? "",
    status: t.status ?? "Disponível",
    observacoes: t.observacoes ?? "",
  };
}