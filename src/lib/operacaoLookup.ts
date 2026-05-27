import { supabase } from "@/integrations/supabase/client";

/**
 * Util compartilhado de lookup de operação a partir de um título.
 *
 * Originado no `useRecompras` (2.7.1) e extraído na 2.8.2 (decisão D5) para ser
 * reutilizado também pelo `useCobrancas` — ambos precisam preencher `operacao_id`
 * por back-link quando o registro nasce sem operação (ex.: criado em /cobranças).
 * Centralizar evita duplicar as duas queries em cada hook.
 *
 * Reutilizável: qualquer hook/serviço que grave uma linha com `operacao_id`
 * nullable e queira herdar a operação mais recente do título pode importar daqui.
 */

/**
 * Back-link automático: resolve a operação mais recente que contém o título, para
 * preencher `operacao_id`/`operacao_numero` quando o registro nasce sem operação.
 * São duas leituras — o vínculo em `operacao_titulos` (ordenado pelo `created_at`
 * do vínculo, que acompanha a criação da operação) e o `numero` em `operacoes`
 * para o snapshot. Qualquer falha/ausência devolve `null`: o caller segue gravando
 * `operacao_id` null (defensivo — título nunca operado não bloqueia o registro).
 */
export async function resolverOperacaoDoTitulo(
  tituloId: string,
): Promise<{ operacaoId: string; operacaoNumero: string } | null> {
  const { data: vinculo, error: vinculoErro } = await supabase
    .from("operacao_titulos")
    .select("operacao_id, created_at")
    .eq("titulo_id", tituloId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (vinculoErro || !vinculo) return null;

  const { data: operacao } = await supabase
    .from("operacoes")
    .select("numero")
    .eq("id", vinculo.operacao_id)
    .maybeSingle();

  return {
    operacaoId: vinculo.operacao_id,
    operacaoNumero: operacao?.numero ?? "",
  };
}
