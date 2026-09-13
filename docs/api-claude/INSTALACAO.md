# Instalação

## 1. Pré-requisitos

- **Node.js 22 LTS** (mínimo 20.6, por causa do `--env-file`) — https://nodejs.org
- **Claude Code** — https://code.claude.com (siga o instalador oficial e faça
  login com sua conta Claude).

Confira no terminal:

```bash
node --version    # v20.6 ou maior
claude --version
```

## 2. Preparar a pasta

1. Descompacte o zip numa pasta, por exemplo `~/core-gestao-claude`.
2. Nessa pasta, instale a biblioteca do Supabase:

```bash
npm init -y
npm install @supabase/supabase-js@2
```

## 3. Criar o `.env` (credenciais)

1. Copie `.env.example` para `.env`.
2. Preencha **no editor de texto** (não pelo terminal, para a senha não ficar no
   histórico):
   - `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`: o Murilo envia.
   - `CORE_EMAIL` e `CORE_SENHA`: seu login do sistema.
3. Proteja o arquivo:
   - **macOS/Linux:** `chmod 600 .env`
   - **Windows (PowerShell):**
     `icacls .env /inheritance:r /grant:r "$($env:USERNAME):(R,W)"`
4. **Nunca** mande o `.env` para ninguém, nem cole o conteúdo no chat do Claude.

## 4. Testar a conexão

```bash
node --env-file=.env exemplos/conectar.mjs
```

Resultado esperado: seu e-mail, seus perfis (`diretoria`, `operacional`,
`cobranca`) e a contagem de clientes/sacados/títulos/operações.

| Erro | Causa provável |
|---|---|
| `Invalid login credentials` | e-mail/senha errados |
| perfis vazios / contagens 0 | usuário sem perfil — peça ao Murilo |
| `fetch failed` | URL errada ou sem internet |

## 5. Usar

Abra o Claude Code **dentro da pasta** (ele lê o `CLAUDE.md` automaticamente):

```bash
cd ~/core-gestao-claude
claude
```

Exemplos de pedido:

- "Liste os cedentes ativos com limite operacional."
- "Quais títulos do cedente X estão disponíveis e vencem nos próximos 60 dias?"
- "Simule uma operação com esses títulos, taxa 3,5% a.m., tarifa fixa 150,
  tarifa por título 25, retenção 0."
- "Anexe o arquivo faturamento-2025.xlsx no cadastro do cedente X com a
  descrição 'Faturamento 2025'."

## 6. Se a senha vazar

Troque a senha imediatamente na tela de login do sistema (ou peça ao Murilo) e
atualize o `.env`.
