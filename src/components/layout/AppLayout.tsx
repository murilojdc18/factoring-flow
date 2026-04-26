import { Outlet, useLocation } from "react-router-dom";
import { Bell, LogOut, Search, UserCircle2 } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/lib/permissions";

const ROUTE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Visão geral da operação" },
  "/clientes": { title: "Clientes / Cedentes", subtitle: "Gestão de cedentes" },
  "/sacados": { title: "Sacados", subtitle: "Gestão de sacados" },
  "/titulos": { title: "Títulos", subtitle: "Recebíveis e duplicatas" },
  "/operacoes": { title: "Operações", subtitle: "Borderôs e simulações" },
  "/contratos": { title: "Contratos", subtitle: "Contratos e aditivos proforma" },
  "/cobrancas": { title: "Cobranças", subtitle: "Acompanhamento de vencimentos" },
  "/relatorios": { title: "Relatórios", subtitle: "Análises e indicadores" },
  "/configuracoes": { title: "Configurações", subtitle: "Parâmetros do sistema" },
};

export function AppLayout() {
  const location = useLocation();
  const { user, roles, signOut } = useAuth();
  const meta =
    ROUTE_TITLES[location.pathname] ?? {
      title: "FactorPro",
      subtitle: "Sistema de fomento mercantil",
    };

  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full bg-background">
        <AppSidebar />

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-md">
            <SidebarTrigger className="text-foreground" />

            <div className="hidden md:flex flex-col leading-tight">
              <h1 className="text-base font-semibold text-foreground">
                {meta.title}
              </h1>
              <span className="text-xs text-muted-foreground">
                {meta.subtitle}
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="relative hidden md:block">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar cedente, sacado, título..."
                  className="h-9 w-72 pl-8"
                />
              </div>
              <Button variant="ghost" size="icon" aria-label="Notificações">
                <Bell className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Perfil">
                    <UserCircle2 className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {user?.email ?? "Usuário"}
                      </span>
                      <span className="mt-0.5 text-xs text-muted-foreground">
                        {roles.length > 0
                          ? roles.map((r) => ROLE_LABELS[r]).join(", ")
                          : "Sem perfil atribuído"}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}