# Fluxos do dia a dia

Cada passo que **grava** exige confirmação do usuário (ver `CLAUDE.md`).

## 1. Cadastrar cedente

1. Verificar se já existe: `from("clientes").select("id, razao_social, status").eq("cnpj", cnpj)`.
2. Confirmar com o usuário e inserir (`razao_social`, `cnpj`, demais campos,
   `status: "Em análise"`, `created_by`).
3. Anexar documentos (contrato social, faturamento…) — `ANEXOS.md`.
4. Quando aprovado internamente: `update({ status: "Ativo" })`.

## 2. Cadastrar sacado

Igual ao cedente, na tabela `sacados` (`nome`, `documento`, `tipo` PJ/PF).
Checar duplicidade por `documento`.

## 3. Cadastrar títulos

1. Resolver `cedente_id` e `sacado_id` (buscar por CNPJ/CPF).
2. Conferir que `numero` não existe para o mesmo cedente.
3. Inserir com `status: "Disponível"`, `data_emissao`, `data_vencimento`,
   `valor_face`, `tipo`, dados da NF se houver.

## 4. Operação (borderô)

1. **Listar títulos elegíveis**: do cedente, `status = "Disponível"`,
   `data_vencimento >= data da operação`.
2. **Simular** (`simular_operacao`) e mostrar o resultado ao usuário.
3. Definir `numero` da operação (conferir que não existe) e `responsavel_interno`.
4. Com o "sim" do usuário: **criar** (`criar_operacao`) com os mesmos parâmetros
   da simulação.
5. **Termo aditivo e carta de cessão**: pedir ao usuário para gerar na tela da
   operação (layout oficial) — `DOCUMENTOS.md`. Pela API, conferir que foram
   gerados e se há pendências.
6. Anexar documentos assinados na operação — `ANEXOS.md`, `entidade_tipo: "operacao"`.
7. Avançar status conforme o andamento, um de cada vez, com confirmação:
   `Aprovada` → `Formalizada` → `Liquidada`.

## 5. Cobrança e baixa

1. Títulos a vencer / vencidos: `titulos` com `status = "Operado"` filtrando
   `data_vencimento`.
2. Registrar contato: insert em `cobrancas_historico` (`titulo_id`, `tipo`,
   `resultado`, `observacoes`, `proxima_acao`, `proximo_contato`).
3. Pagamento confirmado: registrar evento com `resultado: "Pagamento confirmado"`
   **e** `update` do título para `status: "Liquidado"` (duas escritas, confirmar).

## 6. Recompra / substituição

1. Insert em `recompras` com `titulo_id`, `cedente_id`, `acao`, `motivo`,
   `responsavel`, `valor` e os campos de retrato (`titulo_numero`,
   `cedente_nome`, `sacado_nome`, `operacao_numero`, `operacao_id`).
2. Acompanhar e fechar com `update({ status: "Resolvido", resolvido_em: <agora> })`
   ou `status: "Cancelado"`.

## 7. Consultas úteis

- Exposição por sacado: somar `valor_face` de títulos `Operado` agrupando por
  `sacado_id` e comparar com `sacados.limite_concentracao`.
- Uso de limite do cedente: somar títulos `Operado` do cedente vs
  `clientes.limite_operacional`.
- Quem alterou o quê: `from("audit_log_legivel").select("*").eq("tabela", "operacoes").order("created_at", { ascending: false })`.
