# Autenticação

O sistema usa **Supabase Auth** (e-mail + senha). Não existe cadastro público:
usuários são criados pelo administrador.

## Com supabase-js (recomendado)

```js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: true } },
);

const { data, error } = await supabase.auth.signInWithPassword({
  email: process.env.CORE_EMAIL,
  password: process.env.CORE_SENHA,
});
if (error) throw error;
// A partir daqui, todas as chamadas do `supabase` vão com o token do usuário.
```

- A sessão dura ~1 hora e o supabase-js renova sozinho enquanto o processo roda.
- `persistSession: false`: nada é gravado em disco. Cada script faz login.

## Com HTTP puro (referência)

| Ação | Requisição |
|---|---|
| Login | `POST {SUPABASE_URL}/auth/v1/token?grant_type=password` · header `apikey: {chave publicável}` · body `{"email": "...", "password": "..."}` |
| Renovar | `POST {SUPABASE_URL}/auth/v1/token?grant_type=refresh_token` · body `{"refresh_token": "..."}` |
| Chamadas | header `apikey: {chave publicável}` **e** `Authorization: Bearer {access_token}` |

Resposta do login: `access_token`, `token_type: "bearer"`, `expires_in: 3600`,
`refresh_token`.

Endpoints de dados:

- Tabelas: `{SUPABASE_URL}/rest/v1/{tabela}` (PostgREST)
- Funções: `POST {SUPABASE_URL}/rest/v1/rpc/{funcao}`
- Arquivos: `{SUPABASE_URL}/storage/v1/...` (use supabase-js — ver `ANEXOS.md`)

## Regras

- A **chave publicável** só identifica o projeto; quem decide o acesso são os
  perfis do seu usuário (RLS). Sem login, nada é retornado.
- **Nunca** use chave `service_role`/secret: ela ignora todas as regras de
  segurança.
- Não registre `access_token`/`refresh_token` em log, arquivo ou chat.

Fontes: [Supabase Auth](https://github.com/supabase/auth),
[API keys](https://supabase.com/docs/guides/api/api-keys).
