import { Link } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/lib/permissions";

export default function SemAcesso() {
  const { roles, signOut } = useAuth();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldOff className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-bold">Sem acesso a esta área</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Seu perfil atual não tem permissão para visualizar este módulo. Solicite
        ao administrador a atribuição do perfil adequado.
      </p>
      <p className="text-xs text-muted-foreground">
        Perfis atuais:{" "}
        {roles.length > 0
          ? roles.map((r) => ROLE_LABELS[r]).join(", ")
          : "nenhum"}
      </p>
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link to="/dashboard">Ir para o dashboard</Link>
        </Button>
        <Button variant="ghost" onClick={() => signOut()}>
          Sair
        </Button>
      </div>
    </div>
  );
}