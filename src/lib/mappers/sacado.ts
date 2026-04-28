import type { Sacado, SacadoStatus, TipoPessoa } from "@/data/mockSacados";
import type { Database } from "@/integrations/supabase/types";

type SacadoRow = Database["public"]["Tables"]["sacados"]["Row"];
type SacadoInsert = Database["public"]["Tables"]["sacados"]["Insert"];

export function rowToSacado(row: SacadoRow): Sacado {
  return {
    id: row.id,
    tipo: (row.tipo as TipoPessoa) ?? "PJ",
    nome: row.nome,
    nomeFantasia: row.nome_fantasia ?? "",
    documento: row.documento,
    email: row.email ?? "",
    telefone: row.telefone ?? "",
    whatsapp: row.whatsapp ?? "",
    cep: row.cep ?? "",
    endereco: row.endereco ?? "",
    numero: row.numero ?? "",
    complemento: row.complemento ?? "",
    bairro: row.bairro ?? "",
    cidade: row.cidade ?? "",
    estado: row.estado ?? "",
    pessoaContato: row.pessoa_contato ?? "",
    cargoContato: row.cargo_contato ?? "",
    limiteConcentracao: Number(row.limite_concentracao ?? 0),
    scoreInterno: Number(row.score_interno ?? 0),
    status: (row.status as SacadoStatus) ?? "Em análise",
    observacoes: row.observacoes ?? "",
    totalEmAberto: 0,
    totalVencido: 0,
    titulosPagos: 0,
    titulosEmAtraso: 0,
    criadoEm: row.created_at?.slice(0, 10) ?? "",
  };
}

export function sacadoToRow(
  s: Partial<Sacado>,
): Omit<SacadoInsert, "id" | "created_at" | "updated_at" | "created_by"> {
  return {
    tipo: s.tipo ?? "PJ",
    nome: s.nome ?? "",
    nome_fantasia: s.nomeFantasia ?? "",
    documento: s.documento ?? "",
    email: s.email ?? "",
    telefone: s.telefone ?? "",
    whatsapp: s.whatsapp ?? "",
    cep: s.cep ?? "",
    endereco: s.endereco ?? "",
    numero: s.numero ?? "",
    complemento: s.complemento ?? "",
    bairro: s.bairro ?? "",
    cidade: s.cidade ?? "",
    estado: s.estado ?? "",
    pessoa_contato: s.pessoaContato ?? "",
    cargo_contato: s.cargoContato ?? "",
    limite_concentracao: s.limiteConcentracao ?? 0,
    score_interno: s.scoreInterno ?? 0,
    status: s.status ?? "Em análise",
    observacoes: s.observacoes ?? "",
  };
}