import type { Operacao } from "@/data/mockOperacoes";
import type { Cliente } from "@/data/mockClientes";
import type { Sacado } from "@/data/mockSacados";
import type { Titulo } from "@/data/mockTitulos";
import type { DadosEmpresa } from "@/hooks/useDadosEmpresa";
import { calcularSimulacao } from "@/lib/simuladorCalc";
import { formatBR, parseISO } from "@/lib/dateUtils";

/**
 * Documentos OFICIAIS da operação — Termo Aditivo do Contrato de Fomento
 * Mercantil e Carta de Cessão de Crédito — no mesmo formato que a empresa já
 * emite (referência: termos/cartas das operações 49-26 e 57-26).
 *
 * `montarDadosDocumentoOficial` é PURA: recebe operação, cedente, títulos,
 * sacados e dados da empresa e devolve tudo JÁ FORMATADO (strings). Esse objeto
 * é o snapshot salvo em `documentos_gerados.variaveis_preenchidas`, de modo que
 * o PDF re-renderiza idêntico mesmo se cadastro/operação mudarem depois.
 *
 * Premissas (validadas com Murilo em 2026-09-14; revisar no primeiro PDF real):
 * - juros por título pela regra oficial (calcularSimulacao v4) na data da operação;
 * - demonstrativo usa os valores GRAVADOS da operação (canônicos do servidor);
 * - Nota Promissória nº = número da operação;
 * - linhas não modeladas no sistema (diferença de operação anterior, custas de
 *   prorrogação, recompra dos boletos, regresso, adiantamento) = 0,00;
 * - responsável solidário = responsável legal + CPF do cedente;
 * - local = cidade da empresa; data = data da operação por extenso.
 */

export const TIPO_TERMO_ADITIVO = "Termo aditivo de fomento mercantil" as const;
export const TIPO_CARTA_CESSAO = "Carta de cessão de crédito" as const;
export type TipoDocumentoOficial =
  | typeof TIPO_TERMO_ADITIVO
  | typeof TIPO_CARTA_CESSAO;

export function isTipoDocumentoOficial(tipo: string): tipo is TipoDocumentoOficial {
  return tipo === TIPO_TERMO_ADITIVO || tipo === TIPO_CARTA_CESSAO;
}

export interface ParteDocumento {
  razaoSocial: string;
  documento: string;
  endereco: string;
}

/** Uma linha da tabela de títulos (todos os campos já formatados). */
export interface LinhaTituloDocumento {
  valor: string; // "11.260,00"
  vencimento: string; // "28/08/2026"
  numeroDocumento: string; // "67-1"
  dias: string; // "23"
  percentual: string; // "3.067%"
  juros: string; // "345,34"
  liquido: string; // "10.914,66"
  sacado: string; // "NOME - CNPJ"
}

export interface DemonstrativoOperacao {
  valorFace: string; // "R$. 89.439,55"
  totalNegociado: string;
  diferencaOperacaoAnterior: string;
  custasProrrogacao: string;
  rotuloDiferencialCompra: string; // "Diferencial de Compra (4% a.m.)"
  diferencialCompra: string;
  outrasTarifas: string;
  recompraBoletos: string;
  regresso: string; // "0,00"
  retencao: string;
  adiantamento: string;
  totalPago: string; // "R$ 84.867,20"
}

export interface DadosDocumentoOficial {
  versao: 1;
  numeroOperacao: string;
  cedente: ParteDocumento;
  cessionaria: ParteDocumento;
  responsavelSolidario: { nome: string; cpf: string } | null;
  linhas: LinhaTituloDocumento[];
  demonstrativo: DemonstrativoOperacao;
  observacoes: string[];
  /** "São Paulo, 05 de agosto de 2026" (sem ponto final). */
  localData: string;
  /** O que falta/diverge e precisa de revisão antes de emitir. */
  pendencias: string[];
}

const numero2 = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 11260 → "11.260,00" */
export const formatarValor = (v: number): string => numero2.format(v);

/** "2026-08-05" → "05 de agosto de 2026" */
export function dataPorExtenso(iso: string): string {
  return parseISO(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function rotuloTaxa(taxa: number): string {
  return `${String(taxa).replace(".", ",")}%`;
}

/** "Rua X, 05 – Bairro – Cidade – UF – CEP: 00000-000" (partes vazias somem). */
function enderecoDoCedente(c: Cliente): string {
  const logradouro =
    [c.endereco, c.numero].filter((p) => p && p.trim()).join(", ") +
    (c.complemento && c.complemento.trim() ? ` ${c.complemento.trim()}` : "");
  return [logradouro, c.bairro, c.cidade, c.estado, c.cep ? `CEP: ${c.cep}` : ""]
    .filter((p) => p && p.trim())
    .join(" – ");
}

/** Vencimento crescente; empate pelo número do documento em ordem natural. */
function ordenarTitulos(titulos: Titulo[]): Titulo[] {
  return [...titulos].sort(
    (a, b) =>
      a.dataVencimento.localeCompare(b.dataVencimento) ||
      a.numero.localeCompare(b.numero, "pt-BR", { numeric: true }),
  );
}

export function montarDadosDocumentoOficial(
  operacao: Operacao,
  cedente: Cliente | undefined,
  titulosDaOperacao: Titulo[],
  sacados: Sacado[],
  empresa: DadosEmpresa,
): DadosDocumentoOficial {
  const pendencias: string[] = [];
  const dataReferencia = parseISO(operacao.dataOperacao);
  const parametros = {
    taxaFatorMensal: operacao.taxaAplicada,
    tarifaFixa: 0,
    tarifaPorTitulo: 0,
    percentualRetencao: 0,
  };

  if (!cedente) pendencias.push("Cedente da operação não encontrado.");
  if (titulosDaOperacao.length === 0) pendencias.push("Operação sem títulos vinculados.");

  let jurosCentavos = 0;
  const linhas: LinhaTituloDocumento[] = [];
  for (const t of ordenarTitulos(titulosDaOperacao)) {
    const calculado = calcularSimulacao([t], parametros, dataReferencia).titulosCalculados[0];
    if (!calculado) {
      pendencias.push(`Título ${t.numero} vence antes da data da operação.`);
      continue;
    }
    jurosCentavos += Math.round(calculado.juros * 100);
    const sacado = sacados.find((s) => s.id === t.sacadoId);
    linhas.push({
      valor: formatarValor(t.valorFace),
      vencimento: formatBR(t.dataVencimento),
      numeroDocumento: t.numero,
      dias: String(calculado.dias),
      percentual: `${calculado.percentual.toFixed(3)}%`,
      juros: formatarValor(calculado.juros),
      liquido: formatarValor(calculado.liquido),
      sacado: sacado ? `${sacado.nome} - ${sacado.documento}` : t.sacadoNome,
    });
  }

  const desagioGravadoCentavos = Math.round(operacao.valorDesagio * 100);
  if (linhas.length > 0 && jurosCentavos !== desagioGravadoCentavos) {
    pendencias.push(
      `Soma dos juros por título (R$ ${formatarValor(jurosCentavos / 100)}) difere do deságio gravado na operação (R$ ${formatarValor(operacao.valorDesagio)}).`,
    );
  }

  const enderecoCedente = cedente ? enderecoDoCedente(cedente) : "";
  if (cedente && !enderecoCedente) pendencias.push("Endereço do cedente não cadastrado.");
  if (!empresa.endereco.trim()) pendencias.push("Endereço da empresa não cadastrado (Configurações).");

  const responsavelSolidario =
    cedente && cedente.responsavelLegal.trim()
      ? { nome: cedente.responsavelLegal.trim(), cpf: cedente.cpfResponsavel.trim() }
      : null;
  if (cedente && !responsavelSolidario) {
    pendencias.push("Responsável legal do cedente não cadastrado (responsável solidário).");
  } else if (responsavelSolidario && !responsavelSolidario.cpf) {
    pendencias.push("CPF do responsável legal do cedente não cadastrado.");
  }

  const reais = (v: number) => `R$. ${formatarValor(v)}`;

  return {
    versao: 1,
    numeroOperacao: operacao.numero,
    cedente: {
      razaoSocial: cedente?.razaoSocial ?? operacao.cedenteNome,
      documento: cedente?.cnpj ?? "",
      endereco: enderecoCedente,
    },
    cessionaria: {
      razaoSocial: empresa.razaoSocial,
      documento: empresa.cnpj,
      endereco: empresa.endereco,
    },
    responsavelSolidario,
    linhas,
    demonstrativo: {
      valorFace: reais(operacao.valorBruto),
      totalNegociado: reais(operacao.valorBruto),
      diferencaOperacaoAnterior: reais(0),
      custasProrrogacao: reais(0),
      rotuloDiferencialCompra: `Diferencial de Compra (${rotuloTaxa(operacao.taxaAplicada)} a.m.)`,
      diferencialCompra: reais(operacao.valorDesagio),
      outrasTarifas: reais(operacao.valorTarifas),
      recompraBoletos: reais(0),
      regresso: formatarValor(0),
      retencao: formatarValor(operacao.valorRetencao),
      adiantamento: formatarValor(0),
      totalPago: `R$ ${formatarValor(operacao.valorLiquido)}`,
    },
    observacoes: operacao.observacoes
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean),
    localData: `${empresa.cidade}, ${dataPorExtenso(operacao.dataOperacao)}`,
    pendencias,
  };
}

// ─────────────────────────── textos fixos dos instrumentos ───────────────────────────

export const CLAUSULAS_TERMO_ADITIVO = {
  ratificacao:
    "O presente Termo Aditivo ao Contrato de Fomento Mercantil é formalizado de acordo com as condições gerais estipuladas no Contrato-Geral de FOMENTO MERCANTIL firmado, as quais a CONTRATANTE e a CONTRATADA ratificam em sua plenitude.",
  notaPromissoria: (numero: string) =>
    `A CONTRATADA recebe, neste ato, a Nota Promissória ${numero} ofertada em garantia ao fomento mercantil prestado a CONTRATANTE, tendo por objeto a compra de matéria prima, conforme as cláusulas constantes do Contrato Geral de Fomento Mercantil acima referido.`,
  remuneracao:
    "Por este instrumento, acertam a remuneração dos serviços prestados pela CONTRATADA à CONTRATANTE e o preço (diferencial), conforme se demonstra a seguir:",
} as const;

/**
 * Carta de cessão. O 2º parágrafo foi CORRIGIDO (decisão de Murilo,
 * 2026-09-14): o modelo antigo dizia que o cedente era credor dele mesmo; aqui
 * o cedente é credor do(s) sacado(s) listados. PENDENTE revisão do advogado.
 */
export const TEXTOS_CARTA_CESSAO = {
  credor:
    "é credor do(s) sacado(s) relacionado(s) abaixo, referente ao crédito do pagamento da(s) Notas Fiscais de Venda Mercantil (duplicatas) relacionada(s) abaixo:",
  cessao:
    "o referido crédito, bem como todo direito e ação conferidos por lei. Os valores do crédito(s) do cedente devidos pela empresa será pago(s) por boleto ou TED a empresa ora CESSIONÁRIA, os dados serão passados via e-mail.",
} as const;

/** Texto corrido do documento — gravado em `documentos_gerados.conteudo`. */
export function textoDocumentoOficial(
  tipo: TipoDocumentoOficial,
  d: DadosDocumentoOficial,
): string {
  const tabela = d.linhas.map((l) =>
    tipo === TIPO_TERMO_ADITIVO
      ? `${l.valor} | ${l.vencimento} | ${l.numeroDocumento} | ${l.dias} | ${l.percentual} | ${l.juros} | ${l.liquido} | ${l.sacado}`
      : `${l.valor} | ${l.vencimento} | ${l.numeroDocumento} | ${l.sacado}`,
  );

  if (tipo === TIPO_CARTA_CESSAO) {
    return [
      "CESSÃO DE CRÉDITO",
      "",
      `Pelo presente instrumento particular de um lado ${d.cedente.razaoSocial}, inscrita no CNPJ: ${d.cedente.documento}, estabelecida na ${d.cedente.endereco}, doravante designado CEDENTE e de outro lado ${d.cessionaria.razaoSocial}, inscrita no CNPJ: ${d.cessionaria.documento}, estabelecida na ${d.cessionaria.endereco}, doravante designado CESSIONÁRIO, tem entre si como justo e contratado o que se segue:`,
      "",
      `O CEDENTE ${TEXTOS_CARTA_CESSAO.credor}`,
      "",
      "VALOR | VENCIMENTO | Nº DOC. | SACADO",
      ...tabela,
      "",
      `Por força do ora pactuado o CEDENTE cede e transfere ao CESSIONÁRIO ${TEXTOS_CARTA_CESSAO.cessao}`,
      "",
      `${d.localData}.`,
      "",
      `${d.cedente.razaoSocial} - CNPJ: ${d.cedente.documento}`,
    ].join("\n");
  }

  const dm = d.demonstrativo;
  return [
    `Termo Aditivo do Contrato de Fomento Mercantil - Nº ${d.numeroOperacao}`,
    "",
    "CONTRATANTE - Devedora",
    `Empresa: ${d.cedente.razaoSocial}`,
    `CNPJ: ${d.cedente.documento}`,
    "",
    "CONTRATADA - Compradora",
    `Empresa: ${d.cessionaria.razaoSocial}`,
    `CNPJ: ${d.cessionaria.documento}`,
    "",
    "FOMENTO MERCANTIL - Compra de Créditos à Vista",
    "VALOR | VENCTO | Nº DOC. | DIAS | % | JUROS | LÍQUIDO | SACADO",
    ...tabela,
    "",
    CLAUSULAS_TERMO_ADITIVO.ratificacao,
    "",
    CLAUSULAS_TERMO_ADITIVO.notaPromissoria(d.numeroOperacao),
    "",
    CLAUSULAS_TERMO_ADITIVO.remuneracao,
    "",
    "DEMONSTRATIVO DA OPERAÇÃO",
    `Valor de face dos títulos: ${dm.valorFace}`,
    `Total de títulos negociados: ${dm.totalNegociado}`,
    "Deduções",
    `Diferença Operação Anterior ${dm.diferencaOperacaoAnterior}`,
    `Custas de Prorrogação ${dm.custasProrrogacao}`,
    `${dm.rotuloDiferencialCompra} ${dm.diferencialCompra}`,
    `Outras tarifas detalhadas no borderô ${dm.outrasTarifas}`,
    `Recompra dos boletos ${dm.recompraBoletos}`,
    "Ajustes",
    `( – ) Regresso ${dm.regresso}`,
    `( – ) Retenção ${dm.retencao}`,
    `( + ) Adiantamento: ${dm.adiantamento}`,
    `Total Pago ${dm.totalPago}`,
    ...(d.observacoes.length > 0 ? ["", "OBSERVAÇÕES", ...d.observacoes] : []),
    "",
    d.localData,
    "",
    "CONTRATANTE",
    `${d.cedente.razaoSocial}`,
    `CNPJ: ${d.cedente.documento}`,
    "CONTRATADA",
    `${d.cessionaria.razaoSocial}`,
    `CNPJ: ${d.cessionaria.documento}`,
    "RESPONSÁVEIS SOLIDÁRIOS",
    d.responsavelSolidario
      ? `${d.responsavelSolidario.nome.toUpperCase()} - CPF: ${d.responsavelSolidario.cpf}`
      : "[pendente: responsável solidário]",
  ].join("\n");
}
