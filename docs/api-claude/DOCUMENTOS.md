# Documentos (termo aditivo, carta de cessão, borderô, recibo)

Os textos-base ficam em `modelos_documentos`; cada documento emitido é salvo em
`documentos_gerados` como **retrato imutável** do conteúdo final.

## Documentos oficiais da operação — gerar pela TELA

| Tipo (`tipo_documento`) | Onde gerar |
|---|---|
| `Termo aditivo de fomento mercantil` | Sistema web → Operações → abrir a operação → **Termo aditivo** |
| `Carta de cessão de crédito` | Sistema web → Operações → abrir a operação → **Carta de cessão** |

Esses dois saem no **layout oficial da empresa** (tabela por título com dias, %,
juros e líquido; demonstrativo; assinaturas). O layout e o PDF são montados pelo
sistema web — **pela API não gere esses dois tipos**: oriente o usuário a gerar
na tela. O sistema mostra "Pendências antes de emitir" (ex.: endereço do cedente
ou responsável legal faltando) — ajuste o cadastro e gere de novo.

Pela API você pode **consultar** os já gerados:

```js
supabase.from("documentos_gerados")
  .select("id, tipo_documento, operacao_numero, status, created_at, conteudo, variaveis_preenchidas")
  .eq("operacao_id", operacaoId)
  .order("created_at", { ascending: false });
```

- `conteudo`: texto corrido do documento.
- `variaveis_preenchidas`: dados formatados do PDF (linhas por título,
  demonstrativo, partes, `pendencias`).
- A versão **assinada** volta ao sistema como **anexo** da operação (`ANEXOS.md`).

Regras que o documento segue (para conferir com o usuário):

- Juros por título = regra de `OPERACOES.md`; demonstrativo usa os valores
  gravados na operação.
- Nota Promissória nº = número da operação; responsável solidário = responsável
  legal do cedente; local = cidade da empresa; data = data da operação.
- Linhas sem controle no sistema (diferença de operação anterior, custas de
  prorrogação, recompra dos boletos, regresso, adiantamento) saem 0,00.
- A carta de cessão está **pendente de revisão do advogado**.

## Outros documentos (borderô, recibo) — modelo de texto

1. Modelo ativo:

```js
supabase.from("modelos_documentos")
  .select("id, nome, tipo, versao, status, conteudo")
  .eq("status", "Ativo")
  .in("tipo", ["Borderô de títulos", "Recibo de pagamento"]);
```

2. O `conteudo` tem campos `{{nome_do_campo}}` (ex.: `{{cedente_razao_social}}`,
   `{{operacao_numero}}`, `{{valor_bruto_total}}`, `{{lista_titulos_bordero}}`,
   `{{data_assinatura}}`). Preencha com dados **lidos do sistema** e da empresa
   (`configuracoes_financeiras`, chave `dados_empresa`). Valores `R$ 1.234,56`,
   datas `dd/mm/aaaa`. Campo sem dado: **não invente** — deixe
   `[pendente:nome_do_campo]` e avise. Não altere cláusulas; mostre o texto final
   ao usuário antes de salvar.

3. Salvar:

```js
const { data: { user } } = await supabase.auth.getUser();
await supabase.from("documentos_gerados").insert({
  tipo_documento: modelo.tipo,
  modelo_id: modelo.id,
  modelo_nome: modelo.nome,
  modelo_versao: modelo.versao,
  operacao_id: operacao.id,
  operacao_numero: operacao.numero,
  cliente_id: operacao.cedente_id,
  conteudo: textoFinal,
  status: "Rascunho",
  observacoes: "",
  created_by: user.id,
}).select().single();
```

## Status (todos os tipos)

`Rascunho` → `Em revisão` → `Aprovado internamente` (ou `Cancelado`), via
`update({ status })`. O conteúdo salvo não deve ser reescrito: se precisar
mudar, gere um novo documento e cancele o anterior.
