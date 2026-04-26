import jsPDF from "jspdf";
import { formatBR } from "@/lib/dateUtils";

const EMPRESA_FACTORING_NOME = "FactorPro Fomento Mercantil LTDA";
const AVISO =
  "Relatório gerencial gerado automaticamente. Não constitui demonstração financeira oficial nem contabilidade formal.";

/**
 * Exporta uma tabela simples em PDF A4 paisagem com cabeçalho e rodapé.
 * Não tenta replicar gráficos — apenas dados tabulares.
 */
export function exportarRelatorioPdf(opts: {
  titulo: string;
  filename: string;
  filtrosResumo: string;
  headers: string[];
  rows: (string | number)[][];
  totaisRodape?: string;
}) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 12;
  const marginTop = 22;
  const marginBottom = 16;
  const usableWidth = pageWidth - marginX * 2;

  let pageNum = 1;

  const drawHeader = () => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(20, 20, 20);
    pdf.text(EMPRESA_FACTORING_NOME, marginX, 10);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 80);
    pdf.text(opts.titulo, pageWidth - marginX, 10, { align: "right" });
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.2);
    pdf.line(marginX, 13, pageWidth - marginX, 13);
    pdf.setFontSize(8);
    pdf.setTextColor(110, 110, 110);
    pdf.text(`Filtros: ${opts.filtrosResumo}`, marginX, 18);
  };

  const drawFooter = () => {
    const footerY = pageHeight - 8;
    pdf.setDrawColor(180, 180, 180);
    pdf.line(marginX, footerY - 4, pageWidth - marginX, footerY - 4);
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(7);
    pdf.setTextColor(120, 120, 120);
    pdf.text(AVISO, marginX, footerY);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(80, 80, 80);
    const meta = `Gerado em ${formatBR(new Date().toISOString().slice(0, 10))} • Pág. ${pageNum}`;
    pdf.text(meta, pageWidth - marginX, footerY, { align: "right" });
  };

  // Larguras: distribuídas igualmente
  const colCount = opts.headers.length;
  const colW = usableWidth / colCount;
  const rowH = 6;

  drawHeader();
  let y = marginTop;

  const drawHeaderRow = () => {
    pdf.setFillColor(235, 238, 245);
    pdf.rect(marginX, y - 4, usableWidth, rowH, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(30, 30, 30);
    opts.headers.forEach((h, i) => {
      const text = pdf.splitTextToSize(h, colW - 2)[0] as string;
      pdf.text(text, marginX + 1 + i * colW, y);
    });
    y += rowH;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(20, 20, 20);
  };

  drawHeaderRow();

  for (const row of opts.rows) {
    if (y > pageHeight - marginBottom - rowH) {
      drawFooter();
      pdf.addPage();
      pageNum += 1;
      drawHeader();
      y = marginTop;
      drawHeaderRow();
    }
    row.forEach((cell, i) => {
      const text = pdf.splitTextToSize(String(cell ?? ""), colW - 2)[0] as string;
      pdf.text(text, marginX + 1 + i * colW, y);
    });
    pdf.setDrawColor(230, 230, 230);
    pdf.line(marginX, y + 1.5, pageWidth - marginX, y + 1.5);
    y += rowH;
  }

  if (opts.totaisRodape) {
    if (y > pageHeight - marginBottom - rowH) {
      drawFooter();
      pdf.addPage();
      pageNum += 1;
      drawHeader();
      y = marginTop;
    }
    y += 2;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text(opts.totaisRodape, marginX, y);
  }

  drawFooter();
  pdf.save(opts.filename.endsWith(".pdf") ? opts.filename : `${opts.filename}.pdf`);
}