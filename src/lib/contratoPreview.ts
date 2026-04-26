/**
 * Dados mockados usados apenas para preview de modelos de contrato.
 * Não representam operações reais.
 */
export const PREVIEW_MOCK_DATA: Record<string, string> = {
  empresa_factoring_razao_social: "FactorPro Fomento Mercantil LTDA",
  empresa_factoring_cnpj: "00.123.456/0001-77",
  empresa_factoring_endereco:
    "Av. Paulista, 1000 — Bela Vista, São Paulo/SP, CEP 01310-100",
  contrato_master_numero: "CM-2025-001",
  contrato_master_data: "10/01/2025",
  cedente_razao_social: "Comercial Vitória LTDA",
  cedente_cnpj: "12.345.678/0001-90",
  cedente_endereco:
    "Rua das Acácias, 250 — Centro, Campinas/SP, CEP 13010-001",
  cedente_representante: "Mariana Souza",
  cedente_representante_cpf: "123.456.789-00",
  operacao_numero: "OPR-2041",
  operacao_data: "15/04/2026",
  bordero_numero: "BOR-2041",
  valor_bruto_total: "R$ 18.420,00",
  valor_liquido: "R$ 16.403,00",
  valor_desagio: "R$ 921,00",
  valor_tarifas: "R$ 175,00",
  valor_retencao: "R$ 921,00",
  taxa_aplicada: "3,50%",
  prazo_medio: "15",
  quantidade_titulos: "1",
  cidade_assinatura: "São Paulo",
  data_assinatura: "26/04/2026",
  // Tabela de títulos formatada para o monoespaço da minuta
  lista_titulos: [
    "│ DUP-58921    │ Supermercado Atlas SA        │ 11/05/2026   │       18.420,00  │",
  ].join("\n"),
};

/**
 * Substitui placeholders {{nome}} pelos valores mockados.
 * Placeholders desconhecidos são preservados como [pendente:nome].
 */
export function aplicarMockNoTexto(texto: string): string {
  return texto.replace(/\{\{([a-z0-9_]+)\}\}/gi, (_, name: string) => {
    const v = PREVIEW_MOCK_DATA[name];
    return v !== undefined ? v : `[pendente:${name}]`;
  });
}
