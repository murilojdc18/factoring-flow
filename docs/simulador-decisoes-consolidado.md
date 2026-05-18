# Simulador de Operações — Decisões Consolidadas

> **Status:** ✅ Desenho fechado e validado contra o sistema em 2026-05-14.
> **Fonte das decisões:** documento `Decisoes_Simulador.docx` respondido por Murilo + sócio.
> **Próximo passo:** implementar em três sub-tarefas (1.7a lógica, 1.7b testes, 1.7c tela).

Este arquivo é a referência canônica do que o simulador **deve fazer** após os ajustes da Fase 1. Ele substitui qualquer suposição prévia do código.

---

## Como o cálculo funciona (decisões do Grupo 1 — confirmadas)

Todas as decisões estruturais do cálculo **confirmam o comportamento atual do código**. Nada muda na fórmula central:

| # | Decisão | Comportamento |
|---|---------|---------------|
| 1 | Regime de juros | **Simples** (não composto) |
| 2 | Conversão mês → dia | **Dividir por 30** (ano comercial 360) |
| 3 | Granularidade do deságio | **Por lote**, com prazo médio ponderado pelo valor de face |
| 4 | Base da retenção | **Sobre o valor bruto** (não sobre o líquido) |
| 5 | Ordem das deduções | **Paralelas** — deságio, tarifa e retenção todas descontam do bruto |
| 16 | Tipos de tarifa | **Tarifa fixa por operação + tarifa por título.** Sem tarifa percentual |
| 17 | Granularidade da taxa | **Taxa única para o lote** (não por título nem por sacado) |

**Fórmula resumida (inalterada):**
valorBruto         = Σ valorFace dos títulos selecionados
prazoMedio         = Σ (diasAteVencimento × valorFace) / valorBruto
taxaDiaria         = taxaFatorMensal / 30
valorDesagio       = valorBruto × (taxaDiaria / 100) × prazoMedio
valorTarifas       = tarifaFixa + tarifaPorTitulo × quantidadeTitulos
valorRetencao      = valorBruto × (percentualRetencao / 100)
valorLiquido       = valorBruto − valorDesagio − valorTarifas − valorRetencao

---

## Ajustes a implementar (Grupo 3 — regras de proteção)

Estes 7 ajustes precisam entrar no código. Cada um foi mapeado para qual arquivo afeta.

### A — Zerar tudo quando há zero títulos
- **Comportamento atual:** com lista de títulos vazia, o sistema retorna `valorTarifas = tarifaFixa` (R$ 150 padrão). Tudo o resto é zero.
- **Comportamento alvo:** com lista vazia, retorna tudo zerado (inclusive a tarifa fixa).
- **Onde:** `src/lib/simuladorCalc.ts`
- **Origem:** Decisão 6 (Opção B — zera tudo se não há título)

### B — Bloquear título vencido de entrar na simulação
- **Comportamento atual:** títulos vencidos entram com prazo zero (`Math.max(0, daysUntil(...))`). Deságio fica zero pra eles, mas eles continuam contando no `valorBruto` e na tarifa por título.
- **Comportamento alvo:** título vencido **não pode entrar** na simulação. A validação acontece quando o título é selecionado — se vencido, recusa.
- **Onde:** `src/lib/simuladorCalc.ts` (lógica) + `src/pages/OperacaoSimulador.tsx` (UI da seleção)
- **Origem:** Decisão 9 (Opção A — não pode entrar)

### C — Piso mínimo de 1 dia no prazo
- **Comportamento atual:** título vencendo hoje → prazo zero → deságio zero.
- **Comportamento alvo:** se o prazo médio ponderado calcular menos de 1 dia, **usar 1 como mínimo** no cálculo do deságio. Mantém o `prazoMedio` exibido como o valor real (pode ser fracionário); só o deságio usa o piso.
- **Onde:** `src/lib/simuladorCalc.ts`
- **Origem:** Decisão 10 (Opção B — cobra 1 dia mínimo)

### D — Bloquear conclusão quando o líquido é negativo
- **Comportamento atual:** se taxa/prazo/tarifa estourarem o bruto, `valorLiquido` fica negativo e o sistema mostra o número sem aviso.
- **Comportamento alvo:** a função de cálculo continua retornando o número (não trava por si). Mas o `SimuladorResultado` ganha uma flag `liquidoInvalido: boolean`. A tela usa essa flag para **bloquear a conclusão** da simulação (botão de avançar fica desabilitado, mensagem clara aparece).
- **Onde:** `src/lib/simuladorCalc.ts` (adicionar flag) + `src/pages/OperacaoSimulador.tsx` (bloquear botão)
- **Origem:** Decisão 12 (Opção A — bloqueia, não deixa concluir)

### E — Bloquear valores negativos nos campos de input
- **Comportamento atual:** se o usuário digita `-5` em taxa, retenção ou tarifa, o cálculo aceita e produz números absurdos.
- **Comportamento alvo:** os inputs **não aceitam valores negativos**. Validação no `onChange` ou via `min="0"` no input.
- **Onde:** `src/pages/OperacaoSimulador.tsx` (é mudança na tela, não na função de cálculo)
- **Origem:** Decisão 13 (Opção A — bloquear na digitação)

### F — Data-base da operação selecionável
- **Comportamento atual:** a função `daysUntil` usa `new Date()` (sempre "hoje"). Não há parâmetro de data-base.
- **Comportamento alvo:** a função de cálculo aceita um parâmetro `dataReferencia: Date` (default = hoje). A tela do simulador ganha um seletor de data com valor inicial = hoje.
- **Onde:** `src/lib/dateUtils.ts` (adicionar parâmetro) + `src/lib/simuladorCalc.ts` (propagar parâmetro) + `src/pages/OperacaoSimulador.tsx` (seletor de data)
- **Origem:** Decisão 14 (Opção B — permitir escolher a data-base)

### G — Alertar quando ultrapassa o limite do cedente
- **Comportamento atual:** o sistema exibe o `limiteOperacional` e `totalEmAberto` do cedente na tela, mas não usa esses valores para nada — não trava, não alerta.
- **Comportamento alvo:** se `valorBruto > (limiteOperacional - totalEmAberto)`, aparece um **alerta visível** na tela (não bloqueante). A simulação pode continuar, mas o usuário vê o aviso.
- **Onde:** `src/pages/OperacaoSimulador.tsx`
- **Origem:** Decisão 15 (Opção B — alerta, mas deixa continuar)

---

## Fragilidades técnicas a corrigir junto

Estas vêm do relatório de investigação do Claude Code (não são decisões de negócio — são correções técnicas). Entram na 1.7a junto com os ajustes acima.

### Floating point
- **Problema:** somas de valores decimais podem gerar artefatos (`30000.000000004`).
- **Decisão:** usar `Math.round(valor * 100) / 100` no retorno de cada valor monetário da função `calcularSimulacao`. Para escala atual (2 sócios, sistema interno), suficiente; não vale migrar para `Decimal.js` ou inteiros em centavos agora.

### Mock de data nos testes
- **Problema:** `daysUntil` depende de `new Date()` no momento da chamada. Testes ficam frágeis (resultado varia com o relógio).
- **Decisão:** os testes da 1.7b vão mockar a data atual com `vi.useFakeTimers()` e `vi.setSystemTime()` (recursos nativos do Vitest). A função em si não muda.

### Proteção contra NaN nos parâmetros
- **Problema:** se algum parâmetro chegar como `NaN` por bug em outra parte, o cálculo inteiro vira `NaN`.
- **Decisão:** no início de `calcularSimulacao`, sanear os 4 parâmetros numéricos (`taxaFatorMensal`, `tarifaFixa`, `tarifaPorTitulo`, `percentualRetencao`): se `NaN` ou negativo, força para 0.

### Validação de range nos parâmetros
- **Problema:** retenção de 150% é aceita; taxa de 5000% também.
- **Decisão:** validação acontece **na tela** (input com `max="100"` para retenção, e razoável para taxa). A função de cálculo confia nos parâmetros recebidos.

---

## Funcionalidades futuras anotadas (não entram na 1.7)

### "Ajuste na próxima operação" (saldo devedor do cedente)
Ideia levantada pelo Murilo na Decisão 12 original: se o líquido der negativo, o valor vira crédito/débito do cedente, aplicado automaticamente na próxima operação dele.

**Por que não entra agora:** isso é uma **funcionalidade de conta-corrente do cedente** — exige: guardar o saldo, vincular a um cedente, lembrar dele em operações futuras, aplicar o desconto automaticamente. Não existe no sistema hoje. É projeto separado, Fase 2 ou 3.

Status: **registrado como pendência futura**, não implementado agora. Na 1.7, o comportamento é apenas bloquear a conclusão (regra D).

### Exibir PIS / COFINS / ISS no simulador
**Por que não entra agora:** decidido na revisão da resposta P8 ficar totalmente fora por enquanto. Quando a estrutura jurídica for definida (Decisão 1 do checklist de negócio), revisitar.

Status: **fora do escopo da 1.7**.

---

## Validação no sistema

Antes de aprovar este desenho, Murilo executou um roteiro de validação em 2026-05-14 — abriu o simulador em `npm run dev` e conferiu que o comportamento atual bate com o que o relatório de investigação descreveu. **Utilização aprovada.**

---

## Como o Claude Code deve usar este arquivo

Quando for implementar a 1.7a, 1.7b ou 1.7c, **leia este arquivo como referência primária**. Em particular:

- A seção "Como o cálculo funciona" descreve o comportamento que **não muda**.
- A seção "Ajustes a implementar" tem os 7 ajustes A-G, cada um com arquivo afetado.
- A seção "Fragilidades técnicas" tem o que entra junto.
- A seção "Funcionalidades futuras" descreve o que **não fazer agora** (importante para evitar over-engineering).

Sempre que houver ambiguidade entre este arquivo e o código existente, este arquivo é a verdade.