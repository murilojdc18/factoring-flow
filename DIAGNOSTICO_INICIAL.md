# Diagnóstico Inicial — core-gestao

> Análise estática do estado atual do MVP. Nenhum arquivo do projeto foi modificado.
> Data: 2026-05-11.

---

## 1. Estrutura do projeto

```
core-gestao/
├── .env                       (presença de chave em arquivo — gitignored)
├── .gitignore
├── bun.lockb                  ← lockfile Bun (~253 KB)
├── package-lock.json          ← lockfile npm (~240 KB)  [conflito — ver §6]
├── components.json            (config shadcn/ui)
├── eslint.config.js
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.{app,node,json}   (TypeScript com strict OFF — ver §6)
├── vite.config.ts
├── vitest.config.ts
├── public/
├── supabase/
│   ├── config.toml
│   └── migrations/            (7 migrations, datadas 2026-04-26/28)
└── src/
    ├── App.tsx                (router + providers)
    ├── App.css / index.css
    ├── main.tsx
    ├── components/
    │   ├── ui/                (54 componentes shadcn — vendored)
    │   ├── auth/              ProtectedRoute, PermissionGate
    │   ├── layout/            AppLayout, AppSidebar, PageHeader
    │   ├── anexos/            AnexosSection
    │   ├── clientes/          Form, Detalhes, StatusBadge
    │   ├── sacados/           Form, Detalhes, StatusBadge
    │   ├── titulos/           Form, Detalhes, StatusBadge
    │   ├── operacoes/         StatusBadge
    │   ├── contratos/         ModeloForm, PreviewTexto, GerarDocumentoDialog, StatusBadge
    │   ├── compliance/        AnaliseDialog, RiscoBadge
    │   ├── recompras/         RecompraDialog, RecompraStatusBadge
    │   └── NavLink.tsx
    ├── contexts/              AuthContext (sessão + roles + can/canViewArea)
    ├── data/                  9 arquivos mock* (clientes, sacados, títulos, operações,
    │                          contratos, cobranças, recompras, compliance, docs gerados)
    ├── hooks/                 useClientes, useSacados, useTitulos, useConfiguracoes,
    │                          use-mobile, use-toast
    ├── integrations/supabase/ client.ts, types.ts (gerado, 1154 linhas)
    ├── lib/                   anexos, dataSource (flags), dateUtils, format,
    │                          permissions, simuladorCalc, mappers/, exportar*,
    │                          contratoPreview, preencherDocumento, documentosStore
    ├── pages/                 17 páginas (~6.6k linhas)
    └── test/                  setup.ts + example.test.ts (placeholder)
```

Convenção clara: `pages/` é router, `components/<entidade>/` agrupa por domínio, `data/` guarda mocks, `lib/` utilitários e cálculo, `hooks/` data-access reativo.

---

## 2. Stack completa

**Runtime / build**
- React `^18.3.1` + react-dom `^18.3.1`
- Vite `^5.4.19` com `@vitejs/plugin-react-swc`
- TypeScript `^5.8.3` (config **não-estrita** — ver §6)
- Tailwind `^3.4.17` + `tailwindcss-animate`, `@tailwindcss/typography`

**UI / componentes**
- `shadcn/ui` (Radix UI primitives) — 24+ pacotes `@radix-ui/react-*` (v1.x–2.x)
- `lucide-react ^0.462.0`
- `cmdk`, `embla-carousel-react`, `vaul`, `input-otp`, `react-resizable-panels`, `react-day-picker 8.10`
- `next-themes ^0.3.0` (dark mode)
- `sonner ^1.7.4` + `@radix-ui/react-toast` (dois sistemas de toast carregados)

**Estado / dados**
- `@tanstack/react-query ^5.83.0`
- `react-hook-form ^7.61.1` + `@hookform/resolvers`
- `zod ^3.25.76`

**Backend**
- `@supabase/supabase-js ^2.104.1`

**Outros**
- `react-router-dom ^6.30.1`
- `recharts ^2.15.4` (gráficos do dashboard)
- `jspdf ^4.2.1` (export PDF)
- `date-fns ^3.6.0`

**Dev/test**
- `vitest ^3.2.4` + `jsdom 20` + `@testing-library/react ^16` + `@testing-library/jest-dom ^6.6`
- `eslint ^9.32` + `typescript-eslint ^8.38`
- `lovable-tagger ^1.1.13` (origem Lovable confirmada)

**Script de testes existe** (`vitest run`) mas só há um teste placeholder (`example.test.ts`).

---

## 3. Features implementadas

### Rotas (`src/App.tsx`)
Todas exigem autenticação; cada uma é gated por `area` via `<ProtectedRoute>`:

| Rota                       | Página                  | Status de dados   |
|----------------------------|-------------------------|-------------------|
| `/auth`                    | `Auth.tsx`              | Supabase Auth real |
| `/dashboard`               | `Dashboard.tsx`         | **100% mock inline** (KPIs e charts estáticos) |
| `/clientes`                | `Clientes.tsx`          | hook `useClientes` (flag mock) |
| `/sacados`                 | `Sacados.tsx`           | hook `useSacados` (flag mock) |
| `/titulos`                 | `Titulos.tsx`           | hook `useTitulos` (flag mock) |
| `/operacoes`               | `Operacoes.tsx`         | **lê direto de `mockOperacoes`** |
| `/operacoes/simulador`     | `OperacaoSimulador.tsx` | mock |
| `/operacoes/:id`           | `OperacaoDetalhes.tsx`  | mock |
| `/contratos`               | `Contratos.tsx`         | mock |
| `/cobrancas`               | `Cobrancas.tsx`         | mock |
| `/relatorios`              | `Relatorios.tsx`        | mock |
| `/compliance`              | `Compliance.tsx`        | mock |
| `/configuracoes`           | `Configuracoes.tsx`     | hook `useConfiguracoes` (flag mock) |
| `/sem-acesso`              | `SemAcesso.tsx`         | estático |
| `*`                        | `NotFound.tsx`          | estático |

### Entidades de domínio
Identificadas no schema Supabase (`src/integrations/supabase/types.ts`) e nos mocks:

- **Cliente** (cedente — PJ): razão social, CNPJ, IE/IM, contato, endereço, responsável legal, dados bancários (banco/agência/conta/PIX), `limite_operacional`, status (`Ativo`/`Inativo`/`Em análise`/`Bloqueado`).
- **Sacado** (PF ou PJ): documento, nome, endereço, contato, `limite_concentracao`, `score_interno`, status (`Ativo`/`Em análise`/`Bloqueado`/`Inativo`).
- **Título**: tipo (`Duplicata`/`Nota promissória`/`Cheque`/`Boleto`/`Contrato`/`Outro`), número, NF + chave, valor de face, data emissão/vencimento, vínculo cedente↔sacado, status (11 valores, incluindo fluxo de recompra).
- **Operação / Borderô**: número, cedente, data, status (8 valores), `valor_bruto/desagio/retencao/tarifas/liquido`, `taxa_aplicada`, `prazo_medio`, `quantidade_titulos`, `responsavel_interno`.
- **operacao_titulos** (junção N:N) — existe no DB, sem código que use.
- **operacao_historico** (audit por operação) — existe no DB, sem código que use.
- **Modelo de documento** + **Documento gerado** (status `Rascunho`/`Em revisão`/`Aprovado internamente`/`Cancelado`).
- **Cobrança Histórico**: `tipo` (Ligação/E-mail/WhatsApp/Visita/Carta/Outro), `resultado` (Promessa de pagamento/Sem retorno/Negociado/Recusado/Pagamento confirmado/Outro).
- **Compliance Análise**: `nivel_risco` (Baixo/Médio/Alto/Crítico), `status`, `checklist jsonb`, vínculo a cliente OU operação.
- **Recompra** (referenciada nos mocks e na UI; no schema vive embutida no `titulo_status` + `compliance`).
- **Anexo**: PDF/PNG/JPG até 25 MB, vinculado a entidade polimórfica (`cliente`/`titulo`/`operacao`/`documento`/`cobranca`), com Storage bucket dedicado.
- **Profile / user_roles / usuarios_perfis**: dados de usuário interno + papéis.
- **Configurações financeiras**: chave/valor JSON único; armazena `taxaFatorMensal`, `tarifaFixa`, `tarifaPorTitulo`, `percentualRetencao`, `prazoMaximoDias`, `limiteClientePadrao`, `limiteSacadoPadrao`, `diasToleranciaAtraso`, `observacaoPadrao`, `moeda`.
- **Integração logs** (tabela `integracao_logs`) — preparada, sem uso no front.

### Cálculo financeiro
`src/lib/simuladorCalc.ts` faz simulação de operação:
- Deságio = `valor_bruto × (taxa_mensal/30) × prazo_médio_ponderado`
- Tarifa = `tarifa_fixa + tarifa_por_titulo × n`
- Retenção = `% × valor_bruto`
- Líquido = bruto − deságio − tarifas − retenção
- Marca-se explicitamente como "estimativo, NÃO definitivo". **Sem testes unitários**.

---

## 4. Uso do Supabase

### Cliente
`src/integrations/supabase/client.ts` instancia o client com `localStorage`, `persistSession: true`, `autoRefreshToken: true`. URL e chave anon vêm de `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (presença de chave em `.env` — não exibida; arquivo está em `.gitignore` e há commit `chore: remove .env do tracking e atualiza gitignore` no histórico, indicando que esteve versionada antes).

### Tabelas referenciadas em código (`supabase.from(...)`)
| Tabela                       | Onde                                |
|------------------------------|-------------------------------------|
| `user_roles`                 | `contexts/AuthContext.tsx`          |
| `clientes`                   | `hooks/useClientes.ts`              |
| `sacados`                    | `hooks/useSacados.ts`               |
| `titulos`                    | `hooks/useTitulos.ts`               |
| `configuracoes_financeiras`  | `hooks/useConfiguracoes.ts`         |
| `anexos`                     | `lib/anexos.ts` + Storage bucket `anexos` |

Tabelas existentes no schema **sem leitura/escrita no front**: `operacoes`, `operacao_titulos`, `operacao_historico`, `modelos_documentos`, `documentos_gerados`, `cobrancas_historico`, `compliance_analises`, `integracao_logs`, `profiles`, `usuarios_perfis`.

### Feature flags de migração (`src/lib/dataSource.ts`)
Todas em `false` no momento:
```
configuracoes, clientes, sacados, titulos, operacoes,
contratos, cobrancas, compliance  → false
```
Ou seja: **o app, em runtime, ainda é 100% mock** mesmo com hooks Supabase prontos para 4 deles.

### Autenticação
- Supabase Auth via email/senha (`signInWithPassword`, `signUp`).
- Trigger `handle_new_user` cria `profiles` + insere role `somente_leitura` em `user_roles`.
- `AuthContext` carrega roles após sessão, expõe `can(area, action)` e `canViewArea(area)`.
- `ProtectedRoute` gate por sessão + permissão de área (redireciona para `/auth` ou `/sem-acesso`).
- `signUp` está habilitado na tela `/auth` (qualquer um com a URL cria conta como "somente_leitura").

### RLS — Row Level Security
RLS está **habilitado em todas as tabelas** (`enable row level security`). Funções `has_role(uid, role)` e `has_any_role(uid, roles[])` definidas em `security definer` para o app_role enum.

**Padrão observado nas policies:**
- **SELECT**: `to authenticated using (true)` — todo usuário autenticado vê **tudo** em quase todas as tabelas (`clientes`, `sacados`, `titulos`, `operacoes`, `operacao_titulos`, `operacao_historico`, `modelos_documentos`, `documentos_gerados`, `cobrancas_historico`, `configuracoes_financeiras`, `compliance_analises`, `anexos`). Exceções com filtro real: `user_roles`, `profiles`, `usuarios_perfis` (próprio usuário ou admin).
- **INSERT/UPDATE/DELETE**: filtros via `has_role`/`has_any_role` por área (ex.: `admin/operacional/compliance` criam clientes; só `administrador` deleta).

A matriz de permissões em `src/lib/permissions.ts` cobre 7 perfis: `administrador`, `diretoria`, `operacional`, `cobranca`, `financeiro`, `compliance`, `somente_leitura` — com 6 ações: `view`, `create`, `edit`, `delete`, `approve`, `export`. O próprio arquivo alerta no comentário: *"estas regras valem apenas no front. Backend deve replicar via RLS"*.

### Storage
Bucket `anexos` com policies próprias (autor ou admin remove, qualquer autenticado lista/envia). Tipos permitidos: PDF, PNG, JPG. Limite 25 MB. Validação client-side em `lib/anexos.ts`.

---

## 5. Gaps críticos

### BLOQUEANTES (não pode ir para uso interno em produção)

**B1. App está rodando 100% em mocks**
- O QUE É: Todas as flags em `src/lib/dataSource.ts` estão `false`. Mesmo para clientes/sacados/títulos/configurações (onde há hooks Supabase implementados), o estado vive em `useState` local e some no F5. Operações, Contratos, Cobranças, Compliance, Relatórios e Dashboard nem têm hook — leem direto de `src/data/mock*.ts`.
- POR QUE IMPORTA: Sócios não podem operar nada real (nada persiste entre sessões; nada multi-usuário; nada audita).
- ESFORÇO: **Alto** — virar flags + criar hooks faltantes (operações, cobranças, compliance, contratos, documentos) + seed inicial. Estimativa razoável: 2–4 semanas.

**B2. Mappers e hooks de domínio incompletos**
- O QUE É: O README em `src/lib/mappers/` lista 7 mappers (cliente, sacado, titulo, operacao, documento, cobranca, compliance). Só existem 3 (cliente, sacado, titulo). Hooks paralelos: existem para `clientes`, `sacados`, `titulos`, `configuracoes`. **Faltam** `useOperacoes`, `useCobrancas`, `useCompliance`, `useContratos`, `useDocumentos`.
- POR QUE IMPORTA: Sem isso, virar as flags em (B1) não tem efeito — não há canal para gravar essas entidades no DB.
- ESFORÇO: **Médio** — seguir padrão de `useClientes` para cada entidade (~1 dia por entidade).

**B3. Cadastro público de usuário**
- O QUE É: A tela `/auth` permite *signup* livre. Qualquer pessoa com a URL do app cria conta (entra como `somente_leitura` mas já vê tudo via RLS `select using (true)`).
- POR QUE IMPORTA: Sistema é de uso interno com 2 sócios. Não deveria haver cadastro aberto, ainda mais dando acesso de leitura total ao banco. CNPJ/CPF de cedentes e sacados são dados sensíveis (LGPD).
- ESFORÇO: **Baixo** — remover aba "Criar conta" de `pages/Auth.tsx` ou exigir invite/admin para criar usuário (criar usuários via Supabase Dashboard ou função admin-only).

**B4. SELECT universal nas RLS**
- O QUE É: As policies de SELECT da grande maioria das tabelas do domínio são `to authenticated using (true)`. Qualquer usuário autenticado lê tudo, independentemente do perfil. A matriz do front bloqueia *navegação*, mas a API REST do Supabase entrega os dados se chamada diretamente com o token do usuário.
- POR QUE IMPORTA: Hoje, com 2 sócios, é tolerável. Mas se entrar contador externo, auditor, ou um perfil "somente_leitura" restrito por cliente, esse modelo quebra silenciosamente. Combinado com (B3), o risco é real.
- ESFORÇO: **Médio** — alinhar policies de SELECT com a matriz `permissions.ts` (por exemplo, `compliance` só vê o que cabe a compliance), e/ou aceitar formalmente que "todo interno vê tudo" e documentar.

**B5. Sem audit trail efetivo das operações financeiras**
- O QUE É: Existe `operacao_historico` no schema, **mas não há código que escreve ou lê dessa tabela**. Não há registro de quem aprovou, quem alterou, qual valor antes/depois.
- POR QUE IMPORTA: Sistema financeiro sem rastro de mudança em operação/título é problema regulatório e de governança, mesmo interno.
- ESFORÇO: **Médio** — gatilhos no banco (`AFTER UPDATE` populando `operacao_historico` com `OLD/NEW`), ou registrar nos mutations dos hooks.

---

### IMPORTANTES (deveria ter em 30–60 dias)

**I1. TypeScript com strict OFF**
- O QUE É: `tsconfig.json` tem `strictNullChecks: false`, `noImplicitAny: false`, `noUnusedLocals: false`, `noUnusedParameters: false`.
- POR QUE IMPORTA: Em código que calcula deságio, retenção e líquido de operação, um `undefined` silencioso vira `NaN` no bordero. Strict pega isso em build.
- ESFORÇO: **Médio** — ligar gradualmente (`strictNullChecks` primeiro) e corrigir os pontos que aparecerem.

**I2. Cobertura de testes essencialmente zero**
- O QUE É: O único teste é `src/test/example.test.ts` com `expect(true).toBe(true)`. `simuladorCalc.ts` (fórmulas de deságio/retenção/líquido) não tem teste.
- POR QUE IMPORTA: Cálculo financeiro errado escala. Vitest já está configurado.
- ESFORÇO: **Baixo–Médio** — começar por `simuladorCalc`, `lib/mappers/*`, `lib/permissions.ts`, `lib/dateUtils`.

**I3. Permissões duplicadas em duas fontes que podem divergir**
- O QUE É: Matriz no front (`lib/permissions.ts`) e policies RLS no banco vivem separadas. Já há sinais de divergência: a matriz dá a `financeiro` permissão `edit` em `operacoes`; a RLS permite só a `operacional/admin/diretoria/financeiro` editarem operações (alinhado). Mas a matriz dá `configuracoes: ["view", "edit"]` a `financeiro`, enquanto a policy de `configuracoes_financeiras` exige `admin/financeiro` (alinhado). Verificar caso a caso é manual.
- POR QUE IMPORTA: A fonte autoritativa precisa ser a RLS. Front é só UX. Toda divergência futura é bug latente.
- ESFORÇO: **Médio** — gerar testes/assertions que validam: para cada perfil em cada área, o front concorda com o banco.

**I4. .env já esteve versionada**
- O QUE É: Existe commit `chore: remove .env do tracking e atualiza gitignore`. A chave atual no `.env` é `anon` (segura para client), mas se a `service_role` chegou a entrar em algum commit anterior, **continua acessível no histórico** (`git log -p`).
- POR QUE IMPORTA: Anon key não é crítico. Service role é. Verificar histórico do git e, se houver service_role exposta, **rotacionar no Supabase Dashboard**.
- ESFORÇO: **Baixo** — auditoria de `git log -p -- .env` e rotação se for o caso.

**I5. Lockfiles em conflito (`bun.lockb` + `package-lock.json`)**
- O QUE É: Os dois lockfiles coexistem no repo (~250 KB cada).
- POR QUE IMPORTA: Cada desenvolvedor pode instalar dependências diferentes dependendo do gerenciador que usar (bun vs npm), gerando "funciona na minha máquina" e divergência de versões resolvidas.
- ESFORÇO: **Baixo** — decidir um gerenciador (bun OU npm), apagar o outro lockfile, adicionar nota no README.

**I6. Sem 2FA / MFA para Supabase Auth**
- O QUE É: Login só email+senha mínimo de 6 caracteres (`zod schema` em `Auth.tsx`).
- POR QUE IMPORTA: 2 sócios, acesso total ao financeiro. MFA é higiene básica.
- ESFORÇO: **Baixo–Médio** — Supabase suporta TOTP nativo; precisa UI de enrollment.

**I7. Dois sistemas de toast carregados em paralelo**
- O QUE É: `<Toaster />` (Radix toast via `components/ui/toaster`) **e** `<Sonner />` (sonner) ambos montados em `App.tsx`.
- POR QUE IMPORTA: Bundle extra e UX inconsistente.
- ESFORÇO: **Baixo** — escolher um, remover o outro.

---

### DESEJÁVEIS (boa prática, pode esperar mais)

**D1. README praticamente vazio**
- O QUE É: `README.md` tem só "TODO: Document your project here".
- POR QUE IMPORTA: Onboarding de qualquer novo colaborador ou de você daqui a 6 meses.
- ESFORÇO: **Baixo**.

**D2. Sem CI**
- O QUE É: Não há `.github/workflows` (não encontrado). Lint e testes só localmente.
- POR QUE IMPORTA: Validar `vitest run` + `eslint .` + `tsc --noEmit` antes de merge.
- ESFORÇO: **Baixo** — um workflow simples.

**D3. Páginas muito grandes**
- O QUE É: `Relatorios.tsx` 1190 linhas, `Cobrancas.tsx` 794, `Contratos.tsx` 545, `Titulos.tsx` 557, `OperacaoDetalhes.tsx` 499.
- POR QUE IMPORTA: Difícil revisar, fácil quebrar feature ao mexer em outra.
- ESFORÇO: **Médio** — extrair tabelas, filtros e dialogs para `components/<entidade>/`.

**D4. shadcn/ui inteiro vendored**
- O QUE É: 54 componentes em `src/components/ui/` (~4.300 linhas). Provavelmente nem todos são usados (carousel, drawer, hover-card, menubar, etc.).
- POR QUE IMPORTA: Bundle e ruído.
- ESFORÇO: **Baixo** — script tipo `knip` ou `ts-prune` para detectar e remover não-usados.

**D5. Sem rate limiting / observabilidade**
- O QUE É: Sem Sentry/Datadog/logflare. Sem retry policy explícita no react-query.
- POR QUE IMPORTA: Quando um sócio reportar "não consegui salvar", você não terá log estruturado.
- ESFORÇO: **Baixo–Médio**.

**D6. LGPD — sem trilha de consentimento/exclusão**
- O QUE É: Sistema armazena CNPJ/CPF (cedentes, sacados, responsáveis legais) sem trilha de finalidade, retenção ou processo de exclusão.
- POR QUE IMPORTA: Mesmo uso interno, dados de terceiros (sacados) caem na LGPD.
- ESFORÇO: **Médio** — política + endpoint/rotina de exclusão.

---

## 6. Débito técnico óbvio

1. **Dois lockfiles** (`bun.lockb` + `package-lock.json`) — confirma duas instalações alternativas no projeto. (ver I5)

2. **TypeScript não-estrito** em sistema financeiro — `strictNullChecks: false`, `noImplicitAny: false`. (ver I1)

3. **Mocks vivem ao lado de hooks Supabase**: `src/data/mock*.ts` é importado por **11 das 17 páginas**, mesmo onde há `useClientes`/`useSacados`/`useTitulos` prontos. O comentário em `dataSource.ts` ("os mocks NÃO devem ser removidos enquanto qualquer flag estiver em `false`") é honesto, mas mantém duas fontes de verdade em paralelo.

4. **Padrão de hook misto e replicado**: `useClientes`, `useSacados`, `useTitulos`, `useConfiguracoes` repetem o mesmo padrão `if (!enabled) { ...mock state...} else { ...query...}` com `useEffect` sincronizando `mockState` ↔ `query.data`. ~100 linhas duplicadas por hook, 4× ≈ 400 linhas. Daria para extrair um `createDataHook<T>()` genérico.

5. **`StatusBadge` duplicado por feature**: existem 6 arquivos `components/<feature>/StatusBadge.tsx` (clientes, sacados, titulos, operacoes, contratos, recompras). Provavelmente são variantes de um mesmo componente parametrizado por mapa de cores.

6. **Operação cria histórico mas nada lê/escreve `operacao_historico`** — schema sem código (ver B5).

7. **`anexos` é polimórfica sem FK** — `entidade_id: string` aceita "UUID ou ID textual" (comentário em `lib/anexos.ts`). Sem FK no banco, sem integridade referencial. Aceitável para anexos genéricos, mas vale documentar.

8. **Datas das migrations em "2026-04-26/28"** — bate com a data de hoje (2026-05-11), então OK. Mas todas as 7 migrations foram criadas no mesmo dia/dois dias — provavelmente bundle gerado pelo Lovable de uma vez, e não evolução incremental.

9. **README placeholder** ("TODO: Document your project here").

10. **Dois sistemas de toast carregados em paralelo** em `App.tsx`. (ver I7)

11. **`react-day-picker 8.x` com `date-fns 3.x`** — versões compatíveis, mas day-picker v9 já existe; ficar atento em futuro upgrade.

12. **`jspdf` no client** para gerar PDFs — funcional mas pesado no bundle. Pode aparecer no orçamento de performance no futuro.

13. **`OperacaoSimulador.tsx` calcula valores que vão virar dinheiro real** mas pega cedentes via `mockClientes.filter(c.status === "Ativo")` e títulos via `mockTitulos` — sem teste de cálculo (ver I2).

14. **`Cobrancas.tsx` (794 linhas)** referencia tabela existente (`cobrancas_historico`) mas não há `useCobrancas` para gravá-la.

---

## PERGUNTAS QUE PRECISO PRA SEGUIR

1. **Quem opera o sistema hoje, exatamente?** Você diz "2 sócios". Os dois têm perfil `administrador` ou um deles é `diretoria`/`financeiro`? Isso muda o que precisa estar em RLS.
2. **A factoring trabalha com recompra/substituição de título?** O schema tem `recompra_acao` (`Recompra`/`Substituição`/`Análise interna`) e mocks de `mockRecompras.ts`, mas não consegui mapear o fluxo end-to-end pelas páginas. É um fluxo ativo ou está apenas modelado para o futuro?
3. **Existe integração com bureau (Serasa / SPC / Quod / Boa Vista)?** A tabela `integracao_logs` existe mas não tem consumidor. O `score_interno` do sacado é calculado, importado ou preenchido na mão?
4. **Como vocês querem persistência de cálculo da simulação?** O simulador faz contas no client; salva como `Rascunho` na tabela `operacoes`, ou descarta? Hoje não vejo gravação.
5. **Plano para emissão de borderô / contrato / aditivo:** o módulo `Contratos` tem modelos + geração de documento. Esses documentos têm validade jurídica (precisa de assinatura digital tipo D4Sign / Clicksign / DocuSign) ou são só impressão interna?
6. **`operacao_historico` e auditoria:** vocês precisam de trilha "quem aprovou esta operação" para algum órgão (BC/ABF), ou é só para controle interno?
7. **LGPD e exposição:** o sistema vai ficar em domínio público (mesmo com login) ou atrás de VPN/whitelist de IP? Isso muda a postura sobre signup e SELECT universal.
8. **Service role do Supabase:** ela está exposta em algum lugar (Edge Function, env do hosting)? Pergunto pra cruzar com o ponto I4.
9. **Limites de concentração** (`limite_concentracao` no sacado, `limite_operacional` no cliente): são apenas informativos hoje ou o sistema deve bloquear operação que extrapole? Não vi enforcement.
10. **Recompra automática vs. manual:** existe regra automática de "passou X dias do vencimento → vira `Em análise de recompra`"? Ou cabe ao operador mudar status à mão?
11. **Você quer continuar usando Lovable** (que regenera código) ou tomou posse do repo? Isso decide se vale refatorar `components/ui/` e tsconfig agora.
12. **Quem é o "administrador" inicial?** Trigger `handle_new_user` cria todo mundo como `somente_leitura`. Como vocês promovem o primeiro admin? Provavelmente via SQL direto no Dashboard, mas vale formalizar.
