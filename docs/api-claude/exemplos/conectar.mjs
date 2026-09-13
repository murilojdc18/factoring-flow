// Teste de conexão: login, perfis e contagens. Não grava nada.
// Uso: node --env-file=.env exemplos/conectar.mjs
import { createClient } from "@supabase/supabase-js";

const obrigatorias = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "CORE_EMAIL", "CORE_SENHA"];
const faltando = obrigatorias.filter((v) => !process.env[v]);
if (faltando.length > 0) {
  console.error(`Faltam variáveis no .env: ${faltando.join(", ")}`);
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { data: login, error: loginErr } = await supabase.auth.signInWithPassword({
  email: process.env.CORE_EMAIL,
  password: process.env.CORE_SENHA,
});
if (loginErr) {
  console.error(`Falha no login: ${loginErr.message}`);
  process.exit(1);
}

const user = login.user;
console.log(`Conectado como: ${user.email}`);

const { data: roles, error: rolesErr } = await supabase
  .from("user_roles")
  .select("role")
  .eq("user_id", user.id);
if (rolesErr) console.error(`Não foi possível ler perfis: ${rolesErr.message}`);
const perfis = (roles ?? []).map((r) => r.role);
console.log(`Perfis: ${perfis.length > 0 ? perfis.join(", ") : "(nenhum)"}`);

const esperados = ["diretoria", "operacional", "cobranca"];
const ausentes = esperados.filter((p) => !perfis.includes(p) && !perfis.includes("administrador"));
if (ausentes.length > 0) {
  console.warn(`Atenção: faltam os perfis ${ausentes.join(", ")} — peça ao administrador.`);
}

for (const tabela of ["clientes", "sacados", "titulos", "operacoes"]) {
  const { count, error } = await supabase
    .from(tabela)
    .select("id", { count: "exact", head: true });
  console.log(`${tabela}: ${error ? `erro (${error.message})` : count}`);
}

await supabase.auth.signOut();
