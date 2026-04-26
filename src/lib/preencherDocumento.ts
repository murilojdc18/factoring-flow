import { Operacao } from "@/data/mockOperacoes";
import { mockClientes } from "@/data/mockClientes";
import { mockTitulos, Titulo } from "@/data/mockTitulos";
import { formatBRL } from "@/lib/format";
import { formatBR } from "@/lib/dateUtils";

/**
 * Constantes da empresa de factoring (mock — em produção viria de Configurações).
 */
const EMPRESA_FACTORING = {
  razaoSocial: "FactorPro Fomento Mercantil LTDA",
  cnpj: "00.123.456/0001-77",
  endereco: "Av. Paulista, 1000 — Bela Vista, São Paulo/SP, CEP 01310-100",
  cidade: "São Paulo",
};

/**
 * Formata a relação de títulos como linhas de tabela ASCII compatíveis com
 * o cabeçalho usado nas minutas:
 * │ Nº         │ Sacado                       │ Vencimento │ Valor (R$)       │
 */
function formatarListaTitulos(titulos: Titulo[]): string {
  if (titulos.length === 0) return "│ (sem títulos)                                                                            │";
  return titulos
    .map((t) => {
      const num = t.numero.padEnd(12).slice(0, 12);
      const sac = t.sacadoNome.padEnd(28).slice(0, 28);
      const venc = formatBR(t.dataVencimento).padEnd(12).slice(0, 12);
      const val = formatBRL(t.valorFace).replace("R$", "").trim().padStart(16);
      return `│ ${num} │ ${sac} │ ${venc} │  ${val}  │`;
    })
    .join("\n");
}

/**
 * Monta o dicionário de placeholders a partir de uma operação mockada.
 * Inclui valores não cobertos pela operação (ex.: contrato master) com
 * defaults plausíveis — todos sujeitos a revisão.
 */
export function montarPlaceholders(
  operacao: Operacao,
): Record<string, string> {
  const cedente = mockClientes.find((c) => c.id === operacao.cedenteId);
  const titulos = mockTitulos.filter((t) =>
    operacao.titulosIds.includes(t.id),
  );

  const cedenteEnderecoLinha = cedente
    ? `${cedente.endereco}, ${cedente.numero}${cedente.complemento ? " - " + cedente.complemento : ""} — ${cedente.bairro}, ${cedente.cidade}/${cedente.estado}, CEP ${cedente.cep}`
    : "[endereço pendente]";

  return {
    // Empresa
    empresa_factoring_razao_social: EMPRESA_FACTORING.razaoSocial,
    empresa_factoring_cnpj: EMPRESA_FACTORING.cnpj,
    empresa_factoring_endereco: EMPRESA_FACTORING.endereco,

    // Contrato master (default; pode ser editado)
    contrato_master_numero: "CM-2025-001",
    contrato_master_data: "10/01/2025",

    // Cedente
    cedente_razao_social: cedente?.razaoSocial ?? "[cedente]",
    cedente_cnpj: cedente?.cnpj ?? "[CNPJ]",
    cedente_endereco: cedenteEnderecoLinha,
    cedente_representante: cedente?.responsavelLegal ?? "[representante]",
    cedente_representante_cpf: cedente?.cpfResponsavel ?? "[CPF]",

    // Operação
    operacao_numero: operacao.id,
    operacao_data: formatBR(operacao.dataOperacao),
    bordero_numero: operacao.numero,

    // Valores
    valor_bruto_total: formatBRL(operacao.valorBruto),
    valor_liquido: formatBRL(operacao.valorLiquido),
    valor_desagio: formatBRL(operacao.valorDesagio),
    valor_tarifas: formatBRL(operacao.valorTarifas),
    valor_retencao: formatBRL(operacao.valorRetencao),
    taxa_aplicada: `${operacao.taxaAplicada.toFixed(2).replace(".", ",")}%`,
    prazo_medio: String(operacao.prazoMedio),
    quantidade_titulos: String(operacao.quantidadeTitulos),

    // Títulos
    lista_titulos: formatarListaTitulos(titulos),

    // Assinatura
    cidade_assinatura: cedente?.cidade ?? EMPRESA_FACTORING.cidade,
    data_assinatura: formatBR(new Date().toISOString().slice(0, 10)),
  };
}

/**
 * Substitui placeholders {{nome}} no texto. Placeholders sem valor mantêm-se
 * marcados como [pendente:nome] para sinalizar a necessidade de revisão.
 */
export function preencherTexto(
  texto: string,
  valores: Record<string, string>,
): string {
  return texto.replace(/\{\{([a-z0-9_]+)\}\}/gi, (_, name: string) => {
    const v = valores[name];
    return v !== undefined ? v : `[pendente:${name}]`;
  });
}
