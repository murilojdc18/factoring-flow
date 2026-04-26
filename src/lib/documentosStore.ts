import { useEffect, useState } from "react";
import {
  DocumentoGerado,
  mockDocumentosGerados,
} from "@/data/mockDocumentosGerados";

/**
 * Store em memória para documentos gerados.
 * Compartilhado entre /contratos e /operacoes via pub/sub simples.
 * NÃO persiste entre recargas — substituir por backend real em fase futura.
 */
let docs: DocumentoGerado[] = [...mockDocumentosGerados];
const listeners = new Set<(d: DocumentoGerado[]) => void>();

function emit() {
  listeners.forEach((l) => l(docs));
}

export const documentosStore = {
  get: () => docs,
  add: (d: DocumentoGerado) => {
    docs = [d, ...docs];
    emit();
  },
  update: (id: string, patch: Partial<DocumentoGerado>) => {
    docs = docs.map((d) => (d.id === id ? { ...d, ...patch } : d));
    emit();
  },
  subscribe: (fn: (d: DocumentoGerado[]) => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function useDocumentos() {
  const [state, setState] = useState<DocumentoGerado[]>(documentosStore.get());
  useEffect(() => documentosStore.subscribe(setState) as unknown as () => void, []);
  return state;
}
