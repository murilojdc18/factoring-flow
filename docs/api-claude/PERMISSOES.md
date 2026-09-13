# Permissões

O banco aplica as regras (RLS) — o Claude não consegue fazer mais do que seu
usuário pode. Seu usuário deve ter os perfis **`diretoria` + `operacional` +
`cobranca`**.

Por que os três:

- **`diretoria`** — é o que permite **ler** as tabelas de negócio. Sem ele você
  não vê nada (nem o que acabou de gravar).
- **`operacional`** — cadastrar cedente/sacado/título, simular/criar/mudar status
  de operação, gerar documento, recompra.
- **`cobranca`** — registrar eventos de cobrança e mudar status de título.

## O que seu usuário pode fazer

| Tabela / função | Ler | Criar | Alterar | Apagar |
|---|---|---|---|---|
| `clientes` (cedentes) | ✅ | ✅ | ✅ | ❌ |
| `sacados` | ✅ | ✅ | ✅ | ❌ |
| `titulos` | ✅ | ✅ | ✅ | ❌ |
| `operacoes`, `operacao_titulos`, `operacao_historico` | ✅ | **só via RPC** | **só via RPC** | ❌ |
| RPC `simular_operacao`, `criar_operacao`, `editar_operacao` | — | ✅ | ✅ | — |
| RPC `alterar_status_operacao` (inclui liquidar) | — | — | ✅ | — |
| `cobrancas_historico` | ✅ | ✅ | ✅ | ❌ |
| `recompras` | ✅ | ✅ | ✅ (cancelar = `status: "Cancelado"`) | ❌ |
| `modelos_documentos` | ✅ | ✅ | ✅ | ❌ |
| `documentos_gerados` | ✅ | ✅ | ✅ | ❌ |
| `anexos` + arquivos | ✅ | ✅ | só os seus (arquivar) | ❌ |
| `compliance_analises` | ✅ | ❌ | ❌ | ❌ |
| `configuracoes_financeiras` | ✅ | ❌ | ❌ | ❌ |
| `audit_log`, `audit_log_legivel` | ✅ | ❌ | ❌ | ❌ |
| `user_roles`, `profiles` de outros | ❌ | ❌ | ❌ | ❌ |

`DELETE` é exclusivo do administrador em todo o sistema.

## Consequências práticas

- Registrar **análise de compliance** e mudar **parâmetros financeiros**
  continua sendo pela tela, com o Murilo.
- Todo `insert`/`update` passa pelas regras. Se aparecer erro `42501` ou
  "new row violates row-level security policy", **é permissão** — não insista.
- Toda gravação vira linha no `audit_log` com seu nome.
