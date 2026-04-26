import { ContratoTipo } from "@/data/mockContratos";

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
}

export const mockDocumentosGerados: DocumentoGerado[] = [];
