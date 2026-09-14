# Operações — funções do servidor (RPC)

Toda escrita de operação passa por estas funções. Elas validam, **recalculam os
valores no servidor** e gravam tudo numa transação. Chamada:
`supabase.rpc("nome", { ...argumentos })`.

## Cálculo (igual para simular e criar)

- Títulos com vencimento **antes** da data de referência são ignorados na
  simulação (e **proibidos** na criação).
- **Deságio por título** (mesma regra dos termos aditivos da empresa):
  - `% do título = dias × taxa_mensal ÷ 30`, arredondado em **3 casas** (mínimo 1 dia)
  - `juros do título = valor × % ÷ 100`, arredondado em **2 casas**
  - **Deságio** = soma dos juros de todos os títulos
  - Ex.: R$ 11.260,00 em 23 dias a 4% a.m. → 3,067% → juros R$ 345,34
- Prazo médio ponderado (informativo) = Σ(dias × valor) ÷ bruto.
- **Tarifas** = tarifa_fixa + tarifa_por_titulo × quantidade
- **Retenção** = bruto × percentual_retencao ÷ 100
- **Líquido** = bruto − deságio − tarifas − retenção
- Valores monetários arredondados em 2 casas.

Taxa, tarifas e retenção **são definidas por operação** (não há valor fixo
obrigatório). Os padrões sugeridos estão em `configuracoes_financeiras`.

---

## simular_operacao (só leitura)

```js
const { data, error } = await supabase.rpc("simular_operacao", {
  p_titulo_ids: ["uuid-titulo-1", "uuid-titulo-2"],
  p_taxa_fator_mensal: 3.5,     // % ao mês
  p_tarifa_fixa: 150,
  p_tarifa_por_titulo: 25,
  p_percentual_retencao: 0,
  p_data_referencia: "2026-09-15", // opcional; padrão = hoje
});
```

Retorno:

```json
{
  "quantidade_titulos": 2,
  "valor_bruto": 20000.00,
  "valor_desagio": 700.00,
  "valor_tarifas": 200.00,
  "valor_retencao": 0.00,
  "valor_liquido": 19100.00,
  "prazo_medio_ponderado": 30.0,
  "taxa_diaria_equivalente": 0.1166,
  "liquido_invalido": false,
  "titulos_vencidos_ignorados": [],
  "titulos": [
    { "numero": "NF-1", "valor_face": 10000, "data_vencimento": "2026-10-15",
      "dias": 30, "percentual": 3.5, "juros": 350.00, "liquido": 9650.00 },
    { "numero": "NF-2", "valor_face": 10000, "data_vencimento": "2026-10-15",
      "dias": 30, "percentual": 3.5, "juros": 350.00, "liquido": 9650.00 }
  ]
}
```

`titulos` traz a linha de cada título válido (a mesma do termo aditivo).
Não verifica status do título nem cedente — isso é feito na criação.

## criar_operacao

```js
const { data: operacaoId, error } = await supabase.rpc("criar_operacao", {
  payload: {
    numero: "OP-2026-0012",            // único
    cedente_id: "uuid-cedente",        // cedente com status Ativo
    data_operacao: "2026-09-15",
    responsavel_interno: "Nome do sócio",
    titulo_ids: ["uuid-1", "uuid-2"],  // Disponível, do mesmo cedente, não vencidos
    taxa_aplicada: 3.5,
    tarifa_fixa: 150,
    tarifa_por_titulo: 25,
    percentual_retencao: 0,
    observacoes: "",                   // opcional
    // opcionais, só conferidos (tolerância R$ 0,01):
    valor_bruto: 20000, valor_liquido: 19100,
  },
});
```

Efeitos: cria a operação com status **`Em análise`** e os valores do servidor,
vincula os títulos, muda os títulos para `Operado` e registra "Operação criada"
no histórico. Retorna o `id` (uuid).

## alterar_status_operacao

```js
await supabase.rpc("alterar_status_operacao", {
  p_operacao_id: "uuid",
  p_novo_status: "Aprovada",
  p_observacao: "",   // obrigatório (não vazio) para Cancelada
});
```

Transições permitidas:

| De | Para |
|---|---|
| Em análise | Aprovada · Cancelada |
| Aprovada | Formalizada · Cancelada |
| Formalizada | Liquidada · Cancelada |
| Liquidada, Cancelada, outras | nenhuma |

Cancelar devolve os títulos `Operado` → `Disponível`. Liquidar **não** muda os
títulos (dar baixa título a título em `titulos.status = "Liquidado"`).

## editar_operacao

```js
await supabase.rpc("editar_operacao", {
  p_operacao_id: "uuid",
  p_observacoes: "texto",
  p_responsavel_interno: "Nome",   // não pode ser vazio
});
```

Só altera observações e responsável. Não permitido em `Liquidada`, `Cancelada`
ou `Recomprada`. Valores e títulos **não** são editáveis: cancele e crie outra.

---

## Erros

| Código | Função | Significado |
|---|---|---|
| `42501` | todas | Sem permissão (perfil não permite) |
| `P0001` | simular | Lista de títulos vazia |
| `P0001` | criar | Payload inválido: campo indicado na mensagem |
| `P0001` | status / editar | Operação não encontrada |
| `P0002` | simular | Um ou mais títulos não encontrados |
| `P0002` | criar | Cedente não encontrado / não está ativo |
| `P0002` | status | Transição inválida (mensagem mostra de → para) |
| `P0003` | criar | Título não está `Disponível` (inclusive se outro usuário operou antes) |
| `P0010` | criar | Título não pertence ao cedente |
| `P0010` | status | Cancelamento sem motivo |
| `P0011` | editar | Status não permite edição |
| `P0012` | editar | Responsável vazio |
| `P0013` | criar | Valor informado diverge do calculado pelo servidor |
| `P0014` | criar | Título vencido na data da operação |
| `P0015` | criar | Líquido negativo |
| `23505` | criar | Número de operação já existe |
| `22P02` | todas | UUID ou valor mal formado |
