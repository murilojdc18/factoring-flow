# Entidades

Campos completos e tipos: `schema/database.types.ts` (gerado do banco). Aqui
estão os **obrigatórios**, as **regras** e os **valores permitidos**. Todos os
`id` são UUID gerados pelo banco. Datas: `YYYY-MM-DD`. Valores: número com
ponto decimal (`1500.50`).

Ao gravar, preencha `created_by` com o id do seu usuário
(`(await supabase.auth.getUser()).data.user.id`), como a tela faz.

## clientes (cedentes)

| Obrigatório | Regras |
|---|---|
| `razao_social`, `cnpj` | `cnpj` é único. Status nasce `Em análise`; **só cedente `Ativo` pode ter operação criada**. |

Outros campos: `nome_fantasia`, `inscricao_estadual`, `inscricao_municipal`,
`email_principal`, `telefone`, `whatsapp`, `cep`, `endereco`, `numero`,
`complemento`, `bairro`, `cidade`, `estado` (UF), `responsavel_legal`,
`cpf_responsavel`, `email_responsavel`, `telefone_responsavel`, `banco`,
`agencia`, `conta`, `chave_pix`, `limite_operacional`, `observacoes`.

`status`: `Ativo` · `Inativo` · `Em análise` · `Bloqueado`

## sacados

| Obrigatório | Regras |
|---|---|
| `nome`, `documento` | `documento` (CPF/CNPJ) é único. `score_interno` entre 0 e 1000. |

`tipo`: `PJ` · `PF` — `status`: `Ativo` · `Em análise` · `Bloqueado` · `Inativo`

Outros: `nome_fantasia`, `email`, `telefone`, `whatsapp`, endereço (como
clientes), `pessoa_contato`, `cargo_contato`, `limite_concentracao`,
`observacoes`.

## titulos

| Obrigatório | Regras |
|---|---|
| `numero`, `cedente_id`, `sacado_id`, `data_emissao`, `data_vencimento`, `valor_face` | `valor_face >= 0`. O banco **não** valida vencimento ≥ emissão nem número duplicado — confira antes. |

`tipo`: `Duplicata` · `Nota promissória` · `Cheque` · `Boleto` · `Contrato` · `Outro`

`status`: `Disponível` · `Em análise` · `Operado` · `Liquidado` · `Vencido` ·
`Recomprado` · `Cancelado` · `Em análise de recompra` · `Recompra solicitada` ·
`Substituição solicitada` · `Resolvido`

- Novo título para operar: `status: "Disponível"`.
- `Operado` é colocado **pela função** `criar_operacao`; cancelar a operação
  devolve para `Disponível`. Não mude esses dois à mão.
- Pagamento recebido: `update` do título para `Liquidado` (liquidar a
  operação **não** muda os títulos).

Outros: `numero_nota_fiscal`, `chave_nota_fiscal`, `descricao`, `observacoes`.

## operacoes (somente leitura direta — escrita via `OPERACOES.md`)

Campos: `numero`, `cedente_id`, `data_operacao`, `status`, `quantidade_titulos`,
`valor_bruto`, `valor_desagio`, `valor_tarifas`, `valor_retencao`,
`valor_liquido`, `prazo_medio`, `taxa_aplicada`, `responsavel_interno`,
`observacoes`.

`status`: `Rascunho` · `Em análise` · `Aprovada` · `Formalizada` · `Liquidada` ·
`Em atraso` · `Recomprada` · `Cancelada`

Leitura com títulos e histórico:

```js
supabase.from("operacoes")
  .select("*, operacao_titulos(titulo_id), operacao_historico(*)")
  .order("created_at", { ascending: false });
```

## cobrancas_historico

| Obrigatório | Valores |
|---|---|
| `titulo_id`, `tipo`, `resultado` | `tipo`: `Ligação` · `E-mail` · `WhatsApp` · `Visita` · `Carta` · `Outro` |

`resultado`: `Promessa de pagamento` · `Sem retorno` · `Negociado` · `Recusado`
· `Pagamento confirmado` · `Outro`

Outros: `data_contato`, `responsavel` (nome), `observacoes`, `proxima_acao`,
`proximo_contato` (data), `operacao_id`.

## recompras

| Obrigatório | Valores |
|---|---|
| `titulo_id`, `cedente_id`, `acao` | `acao`: `Recompra` · `Substituição` · `Análise interna` |

`status`: `Em análise de recompra` · `Recompra solicitada` ·
`Substituição solicitada` · `Resolvido` · `Cancelado`

Campos de "retrato" (preencha com os dados atuais): `titulo_numero`,
`cedente_nome`, `sacado_nome`, `operacao_numero`, `valor`. Também: `motivo`,
`responsavel`, `observacoes`, `operacao_id`. Cancelar = `update` para
`status: "Cancelado"` (não se apaga). A recompra é um **registro da
solicitação**: não muda status de título nem de operação.

## modelos_documentos e documentos_gerados

Ver `DOCUMENTOS.md`. `documentos_gerados.status`: `Rascunho` · `Em revisão` ·
`Aprovado internamente` · `Cancelado`.

## anexos

Ver `ANEXOS.md`. `entidade_tipo`: `cliente` · `sacado` · `titulo` · `operacao` ·
`documento` · `cobranca` — `status`: `Ativo` · `Arquivado` · `Removido`.
