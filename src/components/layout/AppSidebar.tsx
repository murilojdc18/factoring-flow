import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Briefcase,
  ScrollText,
  Wallet,
  BarChart3,
  Settings,
  ShieldCheck,
  History,
  LucideIcon,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { AppArea } from "@/lib/permissions";

type NavItem = { title: string; url: string; icon: LucideIcon; area: AppArea };

const mainItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, area: "dashboard" },
  { title: "Clientes", url: "/clientes", icon: Users, area: "clientes" },
  { title: "Sacados", url: "/sacados", icon: Building2, area: "sacados" },
  { title: "Títulos", url: "/titulos", icon: FileText, area: "titulos" },
  { title: "Operações", url: "/operacoes", icon: Briefcase, area: "operacoes" },
  { title: "Contratos", url: "/contratos", icon: ScrollText, area: "contratos" },
  { title: "Cobranças", url: "/cobrancas", icon: Wallet, area: "cobrancas" },
];

const systemItems: NavItem[] = [
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, area: "relatorios" },
  { title: "Compliance", url: "/compliance", icon: ShieldCheck, area: "compliance" },
  { title: "Auditoria", url: "/auditoria", icon: History, area: "auditoria" },
  { title: "Configurações", url: "/configuracoes", icon: Settings, area: "configuracoes" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { canViewArea } = useAuth();

  const visibleMain = mainItems.filter((i) => canViewArea(i.area));
  const visibleSystem = systemItems.filter((i) => canViewArea(i.area));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-accent text-sidebar-primary-foreground font-bold shadow-elevated">
            F
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
                FactorPro
              </span>
              <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
                Fomento Mercantil
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            Operacional
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMain.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="!bg-sidebar-accent !text-sidebar-primary font-semibold border-l-2 border-sidebar-primary"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            Sistema
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleSystem.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="!bg-sidebar-accent !text-sidebar-primary font-semibold border-l-2 border-sidebar-primary"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}