import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Briefcase, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().trim().email({ message: "E-mail inválido" }).max(255),
  password: z.string().min(6, { message: "Senha mínima de 6 caracteres" }).max(72),
});

const signupSchema = z.object({
  nomeCompleto: z
    .string()
    .trim()
    .min(2, { message: "Informe seu nome completo" })
    .max(120),
  email: z.string().trim().email({ message: "E-mail inválido" }).max(255),
  password: z.string().min(6, { message: "Senha mínima de 6 caracteres" }).max(72),
});

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate(from, { replace: true });
  }, [user, loading, navigate, from]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setSubmitting(true);
    const { error } = await signIn(parsed.data.email, parsed.data.password);
    setSubmitting(false);
    if (error) {
      setErrorMsg(traduzirErro(error));
      return;
    }
    toast.success("Bem-vindo!");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const parsed = signupSchema.safeParse({ nomeCompleto, email, password });
    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setSubmitting(true);
    const { error } = await signUp(
      parsed.data.email,
      parsed.data.password,
      parsed.data.nomeCompleto,
    );
    setSubmitting(false);
    if (error) {
      setErrorMsg(traduzirErro(error));
      return;
    }
    toast.success("Conta criada.", {
      description:
        "Você entrou como Somente leitura. Solicite ao administrador o perfil correto.",
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-subtle px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-accent text-sidebar-primary-foreground font-bold shadow-elevated">
            <Briefcase className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold tracking-tight">FactorPro</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Acesso interno
            </div>
          </div>
        </div>

        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle>Acesso interno</CardTitle>
            <CardDescription>
              Sistema restrito à equipe da factoring. Não há portal para
              clientes externos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-mail</Label>
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@empresa.com.br"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-pwd">Senha</Label>
                    <Input
                      id="login-pwd"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {errorMsg && (
                    <Alert variant="destructive">
                      <AlertDescription>{errorMsg}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entrar
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="su-nome">Nome completo</Label>
                    <Input
                      id="su-nome"
                      value={nomeCompleto}
                      onChange={(e) => setNomeCompleto(e.target.value)}
                      placeholder="Seu nome"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-email">E-mail corporativo</Label>
                    <Input
                      id="su-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@empresa.com.br"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-pwd">Senha</Label>
                    <Input
                      id="su-pwd"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {errorMsg && (
                    <Alert variant="destructive">
                      <AlertDescription>{errorMsg}</AlertDescription>
                    </Alert>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Novos cadastros entram como{" "}
                    <strong>Somente leitura</strong>. O administrador atribui o
                    perfil correto depois.
                  </p>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar conta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function traduzirErro(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha inválidos.";
  if (m.includes("already registered") || m.includes("user already"))
    return "E-mail já cadastrado. Use a aba Entrar.";
  if (m.includes("password")) return "Senha não atende aos requisitos.";
  return msg;
}