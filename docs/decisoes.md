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
