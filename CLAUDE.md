# CLAUDE.md — core-gestao (Factoring)

> Este arquivo é lido automaticamente pelo Claude Code em toda sessão neste projeto.
> Última atualização: 2026-05-13

---

## Contexto do projeto

**O que é:** Sistema interno de gestão de uma empresa de **factoring (fomento mercantil)** brasileira em fase inicial.

**Quem usa:** 2 sócios. Murilo (operacional/técnico — único acesso ao Supabase admin) e o sócio comercial (acesso futuro como `diretoria`).

**Estado atual:** MVP em React originado no Lovable. Sistema 100% mockado em runtime (flags em `src/lib/dataSource.ts` todas `false`). 4 das ~10 entidades têm hooks Supabase prontos (clientes, sacados, titulos, configuracoes). Faltam: operacoes, cobrancas, compliance, contratos, documentos.

**Posição estratégica:** Não é SaaS comercial. Foco em "funciona e é confiável" > "é elegante". Sem pressa, sem escala. Operação enxuta com 2 usuários.

---

## Stack

- React 18 + TypeScript 5.8 + Vite 5
- Tailwind CSS + shadcn/ui (Radix)
- Supabase (Auth + Postgres + Storage + RLS)
- react-query, react-hook-form, zod
- Vitest (configurado mas com 1 teste placeholder apenas)

**Project Supabase:** `uirxgfnfqcyjzsigubme` (URL em `.env`, NÃO versionada).

---

## Quem é Murilo (você está conversando com ele)

- **Iniciante em programação** — não assuma conhecimento de termos técnicos. Explique conceitos como Git, terminal, hooks, RLS antes de usá-los em ordens.
- **Tem consultor estratégico no Claude.ai** — em paralelo, ele consulta um Claude no claude.ai pra decisões de produto e revisão. Você (Claude Code) é o braço executor.
- **Aprende fazendo** — prefere comandos explicados ("vamos rodar X porque Y") sobre execução cega ("vou rodar X").
- **Disciplina recente em segurança** — já vazou chaves duas vezes acidentalmente em chat. Reforce hábito de não expor segredos.

---

## Regras de operação não-negociáveis

### Segurança
- **NUNCA** modifique `.env` automaticamente. Sempre peça a Murilo pra editar manualmente.
- **NUNCA** comite arquivos com chaves, senhas, tokens, mesmo se aparentarem ser de teste.
- **NUNCA** rode comandos destrutivos (drop, delete, reset, force) sem confirmação explícita por escrito de Murilo.
- Para qualquer comando que toque banco em produção (Supabase remoto), **avise antes** e peça confirmação.

### Código
- Sistema **financeiro**. Cálculos (`simuladorCalc.ts`) precisam de teste antes de mudança.
- Antes de mexer em arquivo grande (>300 linhas), proponha o plano e espere confirmação.
- Não reescreva arquivos inteiros sem necessidade — prefira mudanças cirúrgicas.
- Mantenha o padrão de pastas existente: `components/<entidade>/`, `hooks/use<Entidade>.ts`, `lib/mappers/`, `pages/`.

### Git
- Cada tarefa = um commit. Sem commits gigantes misturando assuntos.
- Mensagens em padrão **Conventional Commits**: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`.
- Antes de commit grande (>5 arquivos), liste o que vai entrar e peça confirmação.
- **Não faça push automaticamente** após commit. Murilo controla quando publicar.

### Comunicação
- Português brasileiro.
- Direto e prático. Sem floreio.
- Use tabelas para comparações.
- Quando tiver decisão técnica, apresente **trade-offs**, não só "a melhor opção".
- Termine respostas com **"Próximo passo"** concreto.
- Em dúvida, **pergunte** ao invés de assumir.

### Limitações respeitadas
- Não dá conselho jurídico (sugere advogado).
- Não calcula tributação real (sugere contador).
- Em código de pagamento/financeiro, sempre alerta sobre testes antes de produção.

---

## Convenções do projeto

### Estrutura de pastas
src/
├── components/<entidade>/    Componentes específicos por domínio
├── components/ui/            shadcn vendored (não modifique sem motivo)
├── contexts/                 AuthContext, providers globais
├── data/                     Mocks (mock<Entidade>.ts) — temporário
├── hooks/                    use<Entidade>.ts — data access reativo
├── integrations/supabase/    client.ts, types.ts (gerado)
├── lib/                      Utilitários, mappers, permissions, simuladorCalc
├── pages/                    Rotas (1 arquivo por rota)
└── test/                     Setup + testes (vitest)

### Padrão de hook de domínio
Ver `src/hooks/useClientes.ts` como referência. Padrão: feature flag em `dataSource.ts`, fallback mock → Supabase.

### Padrão de migration Supabase
Sempre idempotente (`drop ... if exists` antes de `create`). Numeração: timestamp `YYYYMMDDHHMMSS`.

---

## Pendências críticas conhecidas (snapshot de 2026-05-11)

Ordem de prioridade:

1. **Sistema 100% mock** — `dataSource.ts` flags todas false. Tudo desaparece no F5.
2. ~~**Signup público** na `/auth` permite qualquer um criar conta.~~ ✅ Resolvido em 2026-05-14 (formulário de cadastro removido do frontend e "Enable signups" desligado no painel Supabase).
3. **RLS de SELECT abertas** (`using (true)`) em quase todas as tabelas de domínio.
4. ~~**Bug "Sem acesso a esta área"** mesmo para perfil administrador (descoberto 2026-05-11).~~ ✅ Resolvido em 2026-05-14 (race condition em `AuthContext.onAuthStateChange` — `loading` não era gerenciado durante o carregamento de roles pós-login).
5. **`simuladorCalc.ts` sem testes** — calcula deságio, retenção, líquido das operações.
6. ~~**2 lockfiles** coexistindo (bun.lockb + package-lock.json) — decisão: manter npm.~~ ✅ Resolvido em 2026-05-14 (bun.lockb removido, `.gitignore` atualizado).
7. **`tsconfig` não-estrito** (`strictNullChecks: false`).
8. **Mappers e hooks faltantes** para operacoes, cobrancas, compliance, contratos, documentos.

Diagnóstico completo: `DIAGNOSTICO_INICIAL.md` na raiz.

---

## Decisões de negócio já tomadas

- **Estrutura jurídica:** ainda não definida (pendente com advogado tributarista).
- **Funding:** não definido.
- **Tomador-alvo:** não definido (fase de descoberta).
- **Lovable:** desconectado. Repositório é canônico. Lovable usado apenas para hospedagem futura.
- **2FA:** Fase 4.
- **Recompra/substituição de título:** parte ativa do negócio (implementar na Fase 2).
- **Apenas 1 admin no sistema agora** (Murilo). Sócio comercial entra como `diretoria` quando precisar.

---

## Workflow padrão de tarefa

Quando Murilo pedir uma mudança, siga este fluxo:

1. **Entender:** confirme o que ele quer com 1-2 perguntas se ambíguo.
2. **Planejar:** apresente o plano (arquivos afetados, abordagem) antes de mexer.
3. **Confirmar:** espere "ok, pode fazer".
4. **Executar:** faça mudanças cirúrgicas.
5. **Reportar:** mostre o diff/resumo do que mudou.
6. **Testar:** rode lint/typecheck/teste se aplicável.
7. **Sugerir commit:** proponha mensagem em formato Conventional Commits, mas NÃO comite automaticamente — Murilo decide.