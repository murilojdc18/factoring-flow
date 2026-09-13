import { describe, expect, it, vi } from "vitest";

// anexos.ts importa o client do Supabase; as funções testadas aqui são puras.
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import {
  EXTENSOES_PERMITIDAS,
  mimeDoArquivo,
  TAMANHO_MAX_BYTES,
  TIPOS_PERMITIDOS,
  validarArquivo,
} from "./anexos";

function arquivo(nome: string, tamanho = 10, type = ""): File {
  const f = new File(["x"], nome, { type });
  Object.defineProperty(f, "size", { value: tamanho });
  return f;
}

describe("anexos — mimeDoArquivo", () => {
  it.each([
    ["contrato.pdf", "application/pdf"],
    ["foto.PNG", "image/png"],
    ["rg.jpg", "image/jpeg"],
    ["rg.jpeg", "image/jpeg"],
    ["faturamento.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    ["faturamento.xls", "application/vnd.ms-excel"],
    ["faturamento.csv", "text/csv"],
    ["contrato.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ])("%s → %s", (nome, mime) => {
    expect(mimeDoArquivo(nome)).toBe(mime);
  });

  it("rejeita formato fora da lista e arquivo sem extensão", () => {
    expect(mimeDoArquivo("virus.exe")).toBeNull();
    expect(mimeDoArquivo("contrato.doc")).toBeNull();
    expect(mimeDoArquivo("semextensao")).toBeNull();
  });

  it("todo MIME canônico está na lista do bucket (TIPOS_PERMITIDOS)", () => {
    for (const ext of EXTENSOES_PERMITIDAS) {
      expect(TIPOS_PERMITIDOS).toContain(mimeDoArquivo("a" + ext));
    }
  });
});

describe("anexos — validarArquivo", () => {
  it("aceita CSV mesmo quando o navegador manda type vazio ou vnd.ms-excel", () => {
    expect(validarArquivo(arquivo("fat.csv", 10, "")).ok).toBe(true);
    expect(validarArquivo(arquivo("fat.csv", 10, "application/vnd.ms-excel")).ok).toBe(true);
  });

  it("não aceita arquivo com type permitido mas extensão proibida", () => {
    expect(validarArquivo(arquivo("x.exe", 10, "application/pdf")).ok).toBe(false);
  });

  it("rejeita vazio e acima de 25 MB", () => {
    expect(validarArquivo(arquivo("a.pdf", 0)).erro).toMatch(/vazio/);
    expect(validarArquivo(arquivo("a.pdf", TAMANHO_MAX_BYTES + 1)).erro).toMatch(/25 MB/);
    expect(validarArquivo(arquivo("a.pdf", TAMANHO_MAX_BYTES)).ok).toBe(true);
  });
});
