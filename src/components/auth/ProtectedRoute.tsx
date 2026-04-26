import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppArea } from "@/lib/permissions";

interface Props {
  area?: AppArea;
}

export function ProtectedRoute({ area }: Props) {
  const { user, loading, canViewArea } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Carregando…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/auth"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (area && !canViewArea(area)) {
    return <Navigate to="/sem-acesso" replace />;
  }

  return <Outlet />;
}