import type { Cliente, ClienteStatus } from "@/data/mockClientes";
import type { Database } from "@/integrations/supabase/types";

type ClienteRow = Database["public"]["Tables"]["clientes"]["Row"];
type ClienteInsert = Database["public"]["Tables"]["clientes"]["Insert"];

/**
 * Converte uma linha do banco para o shape `Cliente` usado pela UI.
 * Os agregados (`totalEmAberto`, `totalVencido`, `qtdTitulos`) ainda
 * não são calculados no Supabase — serão derivados de `titulos`
 * em etapa posterior. Por ora, ficam zerados.
 */
export function rowToCliente(row: ClienteRow): Cliente {
  return {
    id: row.id,
    razaoSocial: row.razao_social,
    nomeFantasia: row.nome_fantasia ?? "",
    cnpj: row.cnpj,
    inscricaoEstadual: row.inscricao_estadual ?? "",
    inscricaoMunicipal: row.inscricao_municipal ?? "",
    emailPrincipal: row.email_principal ?? "",
    telefone: row.telefone ?? "",
    whatsapp: row.whatsapp ?? "",
    cep: row.cep ?? "",
    endereco: row.endereco ?? "",
    numero: row.numero ?? "",
    complemento: row.complemento ?? "",
    bairro: row.bairro ?? "",
    cidade: row.cidade ?? "",
    estado: row.estado ?? "",
    responsavelLegal: row.responsavel_legal ?? "",
    cpfResponsavel: row.cpf_responsavel ?? "",
    emailResponsavel: row.email_responsavel ?? "",
    telefoneResponsavel: row.telefone_responsavel ?? "",
    banco: row.banco ?? "",
    agencia: row.agencia ?? "",
    conta: row.conta ?? "",
    chavePix: row.chave_pix ?? "",
    status: (row.status as ClienteStatus) ?? "Em análise",
    limiteOperacional: Number(row.limite_operacional ?? 0),
    observacoes: row.observacoes ?? "",
    totalEmAberto: 0,
    totalVencido: 0,
    qtdTitulos: 0,
    criadoEm: row.created_at?.slice(0, 10) ?? "",
  };
}

/**
 * Converte o payload do formulário para o shape de inserção/update.
 * Não inclui agregados nem campos derivados.
 */
export function clienteToRow(
  c: Partial<Cliente>,
): Omit<ClienteInsert, "id" | "created_at" | "updated_at" | "created_by"> {
  return {
    razao_social: c.razaoSocial ?? "",
    nome_fantasia: c.nomeFantasia ?? "",
    cnpj: c.cnpj ?? "",
    inscricao_estadual: c.inscricaoEstadual ?? "",
    inscricao_municipal: c.inscricaoMunicipal ?? "",
    email_principal: c.emailPrincipal ?? "",
    telefone: c.telefone ?? "",
    whatsapp: c.whatsapp ?? "",
    cep: c.cep ?? "",
    endereco: c.endereco ?? "",
    numero: c.numero ?? "",
    complemento: c.complemento ?? "",
    bairro: c.bairro ?? "",
    cidade: c.cidade ?? "",
    estado: c.estado ?? "",
    responsavel_legal: c.responsavelLegal ?? "",
    cpf_responsavel: c.cpfResponsavel ?? "",
    email_responsavel: c.emailResponsavel ?? "",
    telefone_responsavel: c.telefoneResponsavel ?? "",
    banco: c.banco ?? "",
    agencia: c.agencia ?? "",
    conta: c.conta ?? "",
    chave_pix: c.chavePix ?? "",
    status: c.status ?? "Em análise",
    limite_operacional: c.limiteOperacional ?? 0,
    observacoes: c.observacoes ?? "",
  };
}