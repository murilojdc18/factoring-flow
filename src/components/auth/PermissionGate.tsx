import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppAction, AppArea } from "@/lib/permissions";

/**
 * Renderiza children apenas se o usuário tiver a permissão.
 * Bloqueio puramente visual — proteção real precisa estar no backend (RLS).
 */
export function PermissionGate({
  area,
  action = "view",
  fallback = null,
  children,
}: {
  area: AppArea;
  action?: AppAction;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { can } = useAuth();
  if (!can(area, action)) return <>{fallback}</>;
  return <>{children}</>;
}