# Decisões — Projeto Factoring

> Registro cronológico de decisões importantes do projeto (técnicas e de negócio).
> Cada decisão: data, o que foi decidido, e por quê.
> Mantido manualmente. Decisão nova = entrada nova.

---

## 2026-05 — Infraestrutura e setup

### Banco de dados — Supabase em conta compartilhada
**Decidido:** O banco do sistema (projeto Supabase `uirxgfnfqcyjzsigubme`) fica na conta Supabase controlada por Murilo (originalmente nomeada "Sistemas ivan").
**Por quê:** Murilo é o sócio operacional/técnico e único responsável por infraestrutura. O sócio (comercial) não acessa o Supabase diretamente — quando precisar consultar dados, terá acesso pelo sistema, com perfil de negócio.
**Pendência futura:** quando entrar dado real, avaliar rotação da chave anon e revisão de acesso.

### Gerenciador de pacotes — npm
**Decidido:** npm é o único gerenciador de pacotes do projeto. `bun.lockb` foi removido; `.gitignore` impede que volte.
**Por quê:** o projeto veio do Lovable com dois lockfiles (bun + npm). Manter dois é receita para inconsistência de versões. npm foi escolhido por já vir com o Node, ser o mais documentado, e Murilo já o ter usado.

### Lovable — desconectado, só hospedagem futura
**Decidido:** o Lovable foi desconectado do repositório. O código do GitHub é a fonte canônica. O Lovable será usado apenas para hospedagem, no futuro.
**Por quê:** evita que o Lovable regenere/sobrescreva código enquanto o sistema é desenvolvido manualmente com Claude Code. Permite refatorações livres.

### Ferramentas de desenvolvimento
**Decidido:** desenvolvimento local em VS Code + Claude Code, com terminal PowerShell. Supabase CLI instalada via Scoop. MCP do Supabase configurado em modo read-only.
**Por quê:** Claude Code como braço executor de código; Claude.ai (projeto Factoring) como camada de estratégia e revisão. MCP read-only dá ao Claude Code acesso de leitura ao banco sem risco de escrita acidental.

---

## 2026-05 — Produto e acesso

### Usuários do sistema — só administradores por enquanto
**Decidido:** apenas Murilo tem usuário no sistema, com perfil `administrador`. O sócio comercial entrará futuramente, com perfil `diretoria`, quando precisar consultar a operação.
**Por quê:** sistema em construção, uso restrito. Não faz sentido criar acessos antes de haver o que acessar.

### Criação de usuários — manual, sem cadastro público
**Decidido:** removido o cadastro público (signup) da tela de login. Novos usuários são criados manualmente por Murilo no painel Supabase. "Enable signups" também desligado no servidor Supabase.
**Por quê:** sistema interno de 2 pessoas. Cadastro aberto permitia que qualquer um com a URL criasse conta e — por causa das RLS abertas — visse dados sensíveis (CNPJ/CPF de cedentes e sacados). Risco de LGPD.

### Recompra/substituição de título — parte ativa do negócio
**Decidido:** o fluxo de recompra e substituição de títulos é parte ativa da operação e deve ser implementado como funcionalidade completa (não mock).
**Por quê:** confirmado por Murilo como prática real do negócio. Entra na Fase 2 do roadmap.

---

## Decisões ainda PENDENTES (não tomadas)

Registradas aqui para não serem esquecidas. Mover para a seção de decisões quando resolvidas.

- **Estrutura jurídica:** factoring tradicional, FIDC, securitizadora — ainda não definido. Requer advogado tributarista.
- **Funding:** origem do capital para operar — não definido.
- **Tomador-alvo (cedente):** perfil de cliente, setor, faturamento — não definido (fase de descoberta).
- **Ticket médio e prazo médio:** não definidos.
- **Política de taxa:** ad-valorem + deságio — não definida.
- **Política de risco:** limites de concentração, score mínimo — não definida.
- **Registradora:** CERC, TAG ou CIP — não escolhida.

---

*Última atualização: 2026-05-14*

---

## 2026-05 — Decisões de negócio (checklist com sócio)

> Respostas do checklist `Checklist_Decisoes_Negocio.docx` consolidadas com o sócio em 22/05/2026.
> Documento original: gerado em 14/05/2026.

### Decisão 1 — Estrutura jurídica
**Decidido:** Factoring (tradicional).
**Status:** ✅ definido.
**Implicações no sistema:** tributação calculada como factoring (PIS/COFINS/ISS sobre deságio). Modelo de contrato segue padrão de factoring de mercado.

### Decisão 2 — Contador
**Decidido:** Contador já contratado. Regime tributário: **Lucro Real**.
**Status:** ✅ definido.
**Implicações no sistema:** quando a Pergunta 8 do simulador for revisitada, exibir tributos de acordo com Lucro Real.

### Decisão 3 — Tomador-alvo (perfil de cedente)
**Decidido:** Sem perfil específico no momento. "Atendemos quem vier" enquanto se constrói carteira; afunilar no futuro.
**Status:** 🟡 conscientemente em aberto.
**Implicações no sistema:** cadastro de cliente fica com campos genéricos. Sem validação específica por setor/porte. Revisitar em ~3 meses.

### Decisão 4 — Funding
**Decidido:** Aproximadamente R$ 1.000.000 disponível (talvez mais).
**Status:** ✅ definido.
**Implicações no sistema:** limite operacional padrão e tamanho de carteira inicial devem ser configurados com base nesse valor. Política de risco a definir.

### Decisão 5 — Ticket médio e prazo médio
**Decidido:** Sem definição agora. "Construindo portfólio."
**Status:** 🟡 conscientemente em aberto.
**Implicações no sistema:** sem alerta de "operação fora do padrão" até definição. Revisitar quando houver volume real.

### Decisão 6 — Política de taxa
**Decidido:** Manter taxa/tarifa como campos variáveis por operação. Sem valores fixos padrão impostos pelo sistema. A estrutura de cálculo (tarifa fixa + tarifa por título) está validada no `simulador-decisoes-consolidado.md`.
**Status:** ✅ definido.
**Implicações no sistema:** seed (2.9) **não** define valores padrão obrigatórios. Defaults atuais (R$ 150 fixa, R$ 25 por título, taxa 3,5%) ficam apenas como sugestão de preenchimento.

### Decisão 7 — Política de risco
**Decidido:** Ainda não temos definição.
**Status:** ❌ pendente.
**Implicações no sistema:** sistema **só exibe** limite do cedente (Regra G já implementada como alerta, não trava). Quando definir, criar regras de bloqueio.

### Decisão 8 — Registradora (CERC, TAG ou CIP)
**Decidido:** Aguardando orientação. Insegurança regulatória registrada.
**Status:** ❌ pendente. **Conversa separada será aberta com Claude para entender o panorama.**
**Implicações no sistema:** sem integração de registro de duplicatas. Não bloqueia desenvolvimento da Fase 2.

### Decisão 9 — KYC / PLD / COAF
**Decidido:** Ainda não temos definição.
**Status:** ❌ pendente. Mesma conversa separada da Decisão 8.
**Implicações no sistema:** módulo de compliance fica genérico até a política ser definida. Cadastro de clientes não bloqueia por documentos faltantes nesta fase.

### Notas adicionais

- Sobre estrutura/decisões "deliberadamente em aberto" (3, 5, 7): aceitas como estratégia de início consciente. A consequência no código é que o sistema vai ser **mais permissivo e menos validador** nas fases iniciais. Plano: revisitar trimestralmente.
- Sobre Decisões 8 e 9: há risco regulatório real (factoring tem obrigações específicas perante BACEN/COAF). A insegurança expressada pelo Murilo é legítima e deve ser endereçada com advogado antes da operação real começar.