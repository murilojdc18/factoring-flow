import { jsPDF } from "jspdf";
import {
  CLAUSULAS_TERMO_ADITIVO,
  TEXTOS_CARTA_CESSAO,
  TIPO_TERMO_ADITIVO,
  type DadosDocumentoOficial,
  type TipoDocumentoOficial,
} from "@/lib/documentosOficiais/dados";

/**
 * PDFs do Termo Aditivo e da Carta de Cessão no layout que a empresa já envia:
 * Helvetica, título centralizado, tabela com cabeçalho escuro e linhas
 * alternadas, demonstrativo alinhado à direita, linhas de assinatura.
 * Recebe o snapshot já formatado (DadosDocumentoOficial) — não faz cálculo.
 */

const PAGINA_ALTURA = 297;
const MARGEM = 20;
const LARGURA = 210 - MARGEM * 2;
const LIMITE_Y = PAGINA_ALTURA - MARGEM;

// Altura de linha em mm para um tamanho de fonte em pt.
const alturaLinha = (pt: number, fator = 1.2) => pt * 0.3528 * fator;

interface Segmento {
  texto: string;
  negrito?: boolean;
}

/**
 * Largura do texto SEM kerning, na fonte/tamanho atuais. O getTextWidth do
 * jsPDF desconta kerning na medição, mas o texto é desenhado sem kerning:
 * palavras como "CONTRATANTE" saíam ~0,8 mm mais largas que o medido e
 * encostavam na palavra seguinte nos parágrafos justificados.
 */
export function larguraTexto(doc: jsPDF, texto: string): number {
  return (
    (doc.getStringUnitWidth(texto, { kerning: {} }) * doc.getFontSize()) /
    doc.internal.scaleFactor
  );
}

function fonte(doc: jsPDF, negrito: boolean, pt: number) {
  doc.setFont("helvetica", negrito ? "bold" : "normal");
  doc.setFontSize(pt);
}

function garantirEspaco(doc: jsPDF, y: number, altura: number): number {
  if (y + altura > LIMITE_Y) {
    doc.addPage();
    return MARGEM;
  }
  return y;
}

/** Parágrafo com trechos em negrito, justificado (última linha à esquerda). */
function paragrafo(
  doc: jsPDF,
  segmentos: Segmento[],
  y: number,
  pt = 9.5,
): number {
  const palavras = segmentos.flatMap((s) =>
    s.texto
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => ({ t, b: !!s.negrito })),
  );
  const largura = (p: { t: string; b: boolean }) => {
    fonte(doc, p.b, pt);
    return larguraTexto(doc, p.t);
  };
  fonte(doc, false, pt);
  const espaco = larguraTexto(doc, " ");

  const linhas: { t: string; b: boolean; w: number }[][] = [];
  let atual: { t: string; b: boolean; w: number }[] = [];
  let larguraAtual = 0;
  for (const p of palavras) {
    const w = largura(p);
    const extra = atual.length > 0 ? espaco + w : w;
    if (atual.length > 0 && larguraAtual + extra > LARGURA) {
      linhas.push(atual);
      atual = [];
      larguraAtual = 0;
    }
    atual.push({ ...p, w });
    larguraAtual += atual.length > 1 ? espaco + w : w;
  }
  if (atual.length > 0) linhas.push(atual);

  const lh = alturaLinha(pt, 1.25);
  linhas.forEach((linha, i) => {
    y = garantirEspaco(doc, y, lh);
    const ultima = i === linhas.length - 1;
    const soma = linha.reduce((a, p) => a + p.w, 0);
    const gap =
      !ultima && linha.length > 1 ? (LARGURA - soma) / (linha.length - 1) : espaco;
    let x = MARGEM;
    for (const p of linha) {
      fonte(doc, p.b, pt);
      doc.text(p.t, x, y);
      x += p.w + gap;
    }
    y += lh;
  });
  return y;
}

interface Coluna {
  titulo: string;
  largura: number;
  alinhar: "left" | "center";
  pt?: number;
}

function cabecalhoTabela(doc: jsPDF, colunas: Coluna[], y: number): number {
  const h = 7;
  doc.setFillColor(38, 38, 38);
  doc.rect(MARGEM, y, LARGURA, h, "F");
  fonte(doc, true, 7.5);
  doc.setTextColor(255, 255, 255);
  let x = MARGEM;
  for (const c of colunas) {
    doc.text(c.titulo, x + c.largura / 2, y + h / 2 + 1.2, { align: "center" });
    x += c.largura;
  }
  doc.setTextColor(0, 0, 0);
  return y + h;
}

function tabela(doc: jsPDF, colunas: Coluna[], linhas: string[][], y: number): number {
  y = garantirEspaco(doc, y, 15);
  y = cabecalhoTabela(doc, colunas, y);

  linhas.forEach((celulas, i) => {
    const quebradas = celulas.map((texto, j) => {
      const pt = colunas[j].pt ?? 8;
      fonte(doc, false, pt);
      // splitTextToSize mede com kerning (não dá para desligar): 4% de folga
      // evita que a linha desenhada passe da borda da célula.
      return doc.splitTextToSize(texto, (colunas[j].largura - 2.5) * 0.96) as string[];
    });
    const alturaTexto = Math.max(
      ...quebradas.map((q, j) => q.length * alturaLinha(colunas[j].pt ?? 8, 1.15)),
    );
    const h = Math.max(8, alturaTexto + 3);

    if (y + h > LIMITE_Y) {
      doc.addPage();
      y = cabecalhoTabela(doc, colunas, MARGEM);
    }

    if (i % 2 === 1) {
      doc.setFillColor(244, 244, 244);
      doc.rect(MARGEM, y, LARGURA, h, "F");
    }
    doc.setDrawColor(205, 205, 205);
    doc.setLineWidth(0.1);
    doc.rect(MARGEM, y, LARGURA, h, "S");

    let x = MARGEM;
    quebradas.forEach((q, j) => {
      const c = colunas[j];
      const pt = c.pt ?? 8;
      const lh = alturaLinha(pt, 1.15);
      fonte(doc, false, pt);
      const inicio = y + (h - q.length * lh) / 2 + lh * 0.78;
      q.forEach((l, k) => {
        if (c.alinhar === "center") {
          doc.text(l, x + c.largura / 2, inicio + k * lh, { align: "center" });
        } else {
          doc.text(l, x + 1.5, inicio + k * lh);
        }
      });
      if (j > 0) doc.line(x, y + 1.5, x, y + h - 1.5);
      x += c.largura;
    });
    y += h;
  });
  return y;
}

function linhaValor(doc: jsPDF, rotulo: string, valor: string, y: number, negrito = false): number {
  y = garantirEspaco(doc, y, 5);
  fonte(doc, negrito, 9);
  doc.text(rotulo, MARGEM, y);
  doc.text(valor, MARGEM + LARGURA, y, { align: "right" });
  return y + 5.2;
}

function assinatura(doc: jsPDF, x1: number, x2: number, y: number, linhas: Segmento[]) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(x1, y, x2, y);
  let yy = y + 4.5;
  for (const l of linhas) {
    fonte(doc, !!l.negrito, 7.5);
    doc.text(l.texto, (x1 + x2) / 2, yy, { align: "center" });
    yy += 3.4;
  }
}

export function gerarPdfTermoAditivo(d: DadosDocumentoOficial): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGEM + 8;

  fonte(doc, true, 13);
  doc.text(
    `Termo Aditivo do Contrato de Fomento Mercantil - Nº ${d.numeroOperacao}`,
    105,
    y,
    { align: "center" },
  );
  y += 10;

  const bloco = (titulo: string, parte: DadosDocumentoOficial["cedente"]) => {
    fonte(doc, true, 9.5);
    doc.text(titulo, MARGEM, y);
    fonte(doc, false, 9.5);
    doc.text(`Empresa: ${parte.razaoSocial}`, MARGEM, (y += 4.6));
    doc.text(`CNPJ: ${parte.documento}`, MARGEM, (y += 4.6));
    y += 6.5;
  };
  bloco("CONTRATANTE - Devedora", d.cedente);
  bloco("CONTRATADA - Compradora", d.cessionaria);

  fonte(doc, true, 9.5);
  doc.text("FOMENTO MERCANTIL - Compra de Créditos à Vista", MARGEM, y);
  y += 3;

  y = tabela(
    doc,
    [
      { titulo: "VALOR", largura: 22, alinhar: "center" },
      { titulo: "VENCTO", largura: 21, alinhar: "center" },
      { titulo: "Nº DOC.", largura: 17, alinhar: "center" },
      { titulo: "DIAS", largura: 11, alinhar: "center" },
      { titulo: "%", largura: 16, alinhar: "center" },
      { titulo: "JUROS", largura: 18, alinhar: "center" },
      { titulo: "LÍQUIDO", largura: 21, alinhar: "center" },
      { titulo: "SACADO", largura: 44, alinhar: "left", pt: 6.5 },
    ],
    d.linhas.map((l) => [
      l.valor,
      l.vencimento,
      l.numeroDocumento,
      l.dias,
      l.percentual,
      l.juros,
      l.liquido,
      l.sacado,
    ]),
    y,
  );

  y += 7;
  y = paragrafo(doc, [{ texto: CLAUSULAS_TERMO_ADITIVO.ratificacao }], y);
  y += 2.5;
  y = paragrafo(doc, [{ texto: CLAUSULAS_TERMO_ADITIVO.notaPromissoria(d.numeroOperacao) }], y);
  y += 2.5;
  y = paragrafo(doc, [{ texto: CLAUSULAS_TERMO_ADITIVO.remuneracao }], y);
  y += 2;

  const dm = d.demonstrativo;
  y = garantirEspaco(doc, y, 80);
  fonte(doc, true, 9.5);
  doc.text("DEMONSTRATIVO DA OPERAÇÃO", MARGEM, y);
  y += 6;
  y = linhaValor(doc, "Valor de face dos títulos:", dm.valorFace, y, true);
  y = linhaValor(doc, "Total de títulos negociados:", dm.totalNegociado, y, true);
  y += 4;
  y = linhaValor(doc, "Deduções", "", y, true);
  y = linhaValor(doc, "Diferença Operação Anterior", dm.diferencaOperacaoAnterior, y);
  y = linhaValor(doc, "Custas de Prorrogação", dm.custasProrrogacao, y);
  y = linhaValor(doc, dm.rotuloDiferencialCompra, dm.diferencialCompra, y);
  y = linhaValor(doc, "Outras tarifas detalhadas no borderô", dm.outrasTarifas, y);
  y = linhaValor(doc, "Recompra dos boletos", dm.recompraBoletos, y);
  y += 4;
  y = linhaValor(doc, "Ajustes", "", y, true);
  y = linhaValor(doc, "( – ) Regresso", dm.regresso, y);
  y = linhaValor(doc, "( – ) Retenção", dm.retencao, y);
  y = linhaValor(doc, "( + ) Adiantamento:", dm.adiantamento, y);
  y += 3;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(MARGEM, y - 3, MARGEM + LARGURA, y - 3);
  y = linhaValor(doc, "Total Pago", dm.totalPago, y + 1, true);

  if (d.observacoes.length > 0) {
    y += 6;
    y = garantirEspaco(doc, y, 20);
    fonte(doc, true, 9.5);
    doc.text("OBSERVAÇÕES", MARGEM, y);
    y += 5;
    for (const o of d.observacoes) {
      y = paragrafo(doc, [{ texto: o }], y, 8.5);
      y += 1.5;
    }
  }

  y = garantirEspaco(doc, y + 10, 75);
  fonte(doc, false, 10);
  doc.text(d.localData, MARGEM, y);

  y += 27;
  assinatura(doc, MARGEM, MARGEM + 82, y, [
    { texto: "CONTRATANTE", negrito: true },
    { texto: d.cedente.razaoSocial },
    { texto: `CNPJ: ${d.cedente.documento}` },
  ]);
  assinatura(doc, MARGEM + 88, MARGEM + LARGURA, y, [
    { texto: "CONTRATADA", negrito: true },
    { texto: d.cessionaria.razaoSocial },
    { texto: `CNPJ: ${d.cessionaria.documento}` },
  ]);

  y += 22;
  fonte(doc, true, 10);
  doc.text("RESPONSÁVEIS SOLIDÁRIOS", 105, y, { align: "center" });
  y += 14;
  assinatura(doc, MARGEM, MARGEM + LARGURA, y, [
    { texto: d.responsavelSolidario?.nome.toUpperCase() ?? "[pendente]" },
    { texto: `CPF: ${d.responsavelSolidario?.cpf || "[pendente]"}` },
  ]);

  return doc;
}

export function gerarPdfCartaCessao(d: DadosDocumentoOficial): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGEM + 8;

  fonte(doc, true, 13);
  doc.text("CESSÃO DE CRÉDITO", 105, y, { align: "center" });
  y += 11;

  y = paragrafo(
    doc,
    [
      { texto: "Pelo presente instrumento particular de um lado" },
      { texto: d.cedente.razaoSocial + ",", negrito: true },
      { texto: "inscrita no CNPJ:" },
      { texto: d.cedente.documento + ",", negrito: true },
      { texto: `estabelecida na ${d.cedente.endereco}, doravante designado` },
      { texto: "CEDENTE", negrito: true },
      { texto: "e de outro lado" },
      { texto: d.cessionaria.razaoSocial + ",", negrito: true },
      { texto: "inscrita no CNPJ:" },
      { texto: d.cessionaria.documento + ",", negrito: true },
      { texto: `estabelecida na ${d.cessionaria.endereco}, doravante designado` },
      { texto: "CESSIONÁRIO,", negrito: true },
      { texto: "tem entre si como justo e contratado o que se segue:" },
    ],
    y,
  );
  y += 2.5;
  y = paragrafo(
    doc,
    [
      { texto: "O" },
      { texto: "CEDENTE", negrito: true },
      { texto: TEXTOS_CARTA_CESSAO.credor },
    ],
    y,
  );
  y += 1;

  y = tabela(
    doc,
    [
      { titulo: "VALOR", largura: 28, alinhar: "center" },
      { titulo: "VENCIMENTO", largura: 30, alinhar: "center" },
      { titulo: "Nº DOC.", largura: 24, alinhar: "center" },
      { titulo: "SACADO", largura: 88, alinhar: "left", pt: 7.5 },
    ],
    d.linhas.map((l) => [l.valor, l.vencimento, l.numeroDocumento, l.sacado]),
    y,
  );

  y += 9;
  y = paragrafo(
    doc,
    [
      { texto: "Por força do ora pactuado o" },
      { texto: "CEDENTE", negrito: true },
      { texto: "cede e transfere ao" },
      { texto: "CESSIONÁRIO", negrito: true },
      { texto: TEXTOS_CARTA_CESSAO.cessao },
    ],
    y,
  );

  y = garantirEspaco(doc, y + 16, 45);
  fonte(doc, false, 10);
  doc.text(`${d.localData}.`, MARGEM, y);

  y += 30;
  assinatura(doc, MARGEM, MARGEM + LARGURA, y, [
    { texto: `${d.cedente.razaoSocial} - CNPJ: ${d.cedente.documento}` },
  ]);

  return doc;
}

export function gerarPdfDocumentoOficial(
  tipo: TipoDocumentoOficial,
  dados: DadosDocumentoOficial,
): jsPDF {
  return tipo === TIPO_TERMO_ADITIVO
    ? gerarPdfTermoAditivo(dados)
    : gerarPdfCartaCessao(dados);
}
