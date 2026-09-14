import { ContratoTipo } from "@/data/mockContratos";
import type { DadosDocumentoOficial } from "@/lib/documentosOficiais/dados";

export type DocumentoStatus =
  | "Rascunho"
  | "Em revisão"
  | "Aprovado internamente"
  | "Cancelado";

export const STATUS_DOCUMENTO: DocumentoStatus[] = [
  "Rascunho",
  "Em revisão",
  "Aprovado internamente",
  "Cancelado",
];

export interface DocumentoGerado {
  id: string;
  tipoDocumento: ContratoTipo;
  modeloId: string;
  modeloNome: string;
  modeloVersao: string;
  operacaoId: string;
  operacaoNumero: string;
  cedenteId: string;
  cedenteNome: string;
  geradoEm: string; // ISO
  status: DocumentoStatus;
  textoFinal: string;
  observacoes: string;
  /**
   * Snapshot formatado dos documentos oficiais (termo aditivo / carta de
   * cessão) — o PDF re-renderiza a partir dele. Ausente nos demais tipos.
   */
  dadosOficiais?: DadosDocumentoOficial;
}

export const mockDocumentosGerados: DocumentoGerado[] = [];
