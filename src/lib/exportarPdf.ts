import jsPDF from "jspdf";
import { DocumentoGerado } from "@/data/mockDocumentosGerados";
import { formatBR } from "@/lib/dateUtils";

const AVISO_PROFORMA =
  "Documento proforma gerado automaticamente. Revisão jurídica obrigatória antes de assinatura ou uso externo.";

/**
 * Sugere o nome do arquivo a partir do tipo do documento e da operação.
 */
export function sugerirNomeArquivo(doc: DocumentoGerado): string {
  const op = doc.operacaoNumero || doc.operacaoId;
  const slug = (() => {
    const t = doc.tipoDocumento.toLowerCase();
    if (t.includes("cessão") || t.includes("cessao")) return "contrato-cessao";
    if (t.includes("aditivo")) return "aditivo";
    if (t.includes("borderô") || t.includes("bordero")) return "bordero";
    if (t.includes("master")) return "contrato-master";
    if (t.includes("recibo")) return "recibo";
    return "documento";
  })();
  return `${slug}-operacao-${op}.pdf`;
}

/**
 * Exporta um DocumentoGerado em PDF A4 com cabeçalho, rodapé e fonte
 * monoespaçada (preserva tabelas ASCII e quebras de linha). O nome da empresa
 * (cabeçalho) chega por parâmetro, vindo de useDadosEmpresa.
 */
export function exportarDocumentoPdf(
  doc: DocumentoGerado,
  empresaNome: string,
): void {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const marginX = 15;
  const marginTop = 22;
  const marginBottom = 18;
  const usableWidth = pageWidth - marginX * 2;

  // ---- Conteúdo principal (monoespaçado, preserva tabelas ASCII) ----
  pdf.setFont("courier", "normal");
  pdf.setFontSize(9);
  const lineHeight = 4;

  // Quebra cada linha para caber na largura (mantém quebras explícitas)
  const linhasOriginais = doc.textoFinal.split("\n");
  const linhas: string[] = [];
  for (const linha of linhasOriginais) {
    if (linha === "") {
      linhas.push("");
      continue;
    }
    const wrapped = pdf.splitTextToSize(linha, usableWidth) as string[];
    linhas.push(...wrapped);
  }

  let y = marginTop;
  let pageNum = 1;

  const drawHeaderFooter = () => {
    // Header
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(20, 20, 20);
    pdf.text(empresaNome, marginX, 12);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(90, 90, 90);
    pdf.text(doc.tipoDocumento, pageWidth - marginX, 12, { align: "right" });
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.2);
    pdf.line(marginX, 15, pageWidth - marginX, 15);

    // Footer
    const footerY = pageHeight - 10;
    pdf.setDrawColor(180, 180, 180);
    pdf.line(marginX, footerY - 5, pageWidth - marginX, footerY - 5);
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(7);
    pdf.setTextColor(120, 120, 120);
    const avisoLinhas = pdf.splitTextToSize(
      AVISO_PROFORMA,
      usableWidth - 30,
    ) as string[];
    avisoLinhas.forEach((l, i) => {
      pdf.text(l, marginX, footerY - 1 + i * 2.8);
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(80, 80, 80);
    const meta = `${doc.id} • Gerado em ${formatBR(doc.geradoEm)} • Status: ${doc.status} • Pág. ${pageNum}`;
    pdf.text(meta, pageWidth - marginX, footerY, { align: "right" });

    // Restaura estilo do conteúdo
    pdf.setFont("courier", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(15, 15, 15);
  };

  drawHeaderFooter();

  for (const linha of linhas) {
    if (y > pageHeight - marginBottom) {
      pdf.addPage();
      pageNum += 1;
      y = marginTop;
      drawHeaderFooter();
    }
    if (linha.length > 0) {
      pdf.text(linha, marginX, y);
    }
    y += lineHeight;
  }

  // Observações internas (se houver) — em fonte sans, ao final
  if (doc.observacoes && doc.observacoes.trim().length > 0) {
    y += 4;
    if (y > pageHeight - marginBottom - 20) {
      pdf.addPage();
      pageNum += 1;
      y = marginTop;
      drawHeaderFooter();
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(20, 20, 20);
    pdf.text("Observações internas", marginX, y);
    y += 5;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const obsLinhas = pdf.splitTextToSize(
      doc.observacoes,
      usableWidth,
    ) as string[];
    for (const ol of obsLinhas) {
      if (y > pageHeight - marginBottom) {
        pdf.addPage();
        pageNum += 1;
        y = marginTop;
        drawHeaderFooter();
      }
      pdf.text(ol, marginX, y);
      y += 4.5;
    }
  }

  pdf.save(sugerirNomeArquivo(doc));
}