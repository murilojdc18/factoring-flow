# Documentos (contratos, aditivos, cartas)

Os textos-base ficam em `modelos_documentos`; cada documento emitido é salvo em
`documentos_gerados` como **retrato imutável** do texto final.

## 1. Escolher o modelo

```js
supabase.from("modelos_documentos")
  .select("id, nome, tipo, versao, status, conteudo")
  .eq("status", "Ativo");
```

Tipos em uso: `Contrato master de fomento mercantil` ·
`Contrato de cessão de direitos creditórios` · `Aditivo de operação` ·
`Borderô de títulos` · `Termo de recompra` · `Notificação ao sacado` ·
`Recibo de pagamento`.

> Os modelos oficiais **Termo Aditivo** e **Carta de Cessão** da empresa estão
> sendo cadastrados. Enquanto um modelo não estiver `Ativo`, não gere documento
> dele — avise o usuário.

## 2. Preencher

O `conteudo` tem campos no formato `{{nome_do_campo}}` (ex.:
`{{cedente_razao_social}}`, `{{cedente_cnpj}}`, `{{operacao_numero}}`,
`{{valor_bruto_total}}`, `{{lista_titulos}}`, `{{data_assinatura}}`).

- Preencha cada campo com dados **lidos do sistema** (cedente, sacados,
  títulos, operação) e da empresa (`configuracoes_financeiras`, chave
  `dados_empresa`, se existir).
- Valores em reais no formato brasileiro (`R$ 1.234,56`), datas `dd/mm/aaaa`.
- Campo sem dado: **não invente** — deixe `[pendente: nome_do_campo]` e avise.
- Não altere cláusulas. Mostre o texto final ao usuário antes de salvar.

## 3. Salvar

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

Status: `Rascunho` → `Em revisão` → `Aprovado internamente` (ou `Cancelado`),
via `update({ status })`. O texto salvo não deve ser reescrito: se precisar
mudar, gere um novo documento e cancele o anterior.

A versão assinada volta ao sistema como **anexo** da operação (`ANEXOS.md`).
Documentos gerados são minutas para revisão; validade jurídica depende de
revisão e assinatura.
