import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "./pages/NotFound.tsx";
import { AppLayout } from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Placeholder from "./pages/Placeholder";
import Clientes from "./pages/Clientes";
import Sacados from "./pages/Sacados";
import Titulos from "./pages/Titulos";
import OperacaoSimulador from "./pages/OperacaoSimulador";
import Operacoes from "./pages/Operacoes";
import OperacaoDetalhes from "./pages/OperacaoDetalhes";
import Configuracoes from "./pages/Configuracoes";
import Contratos from "./pages/Contratos";
import Cobrancas from "./pages/Cobrancas";
import Relatorios from "./pages/Relatorios";
import Compliance from "./pages/Compliance";
import AuditoriaLog from "./pages/AuditoriaLog";
import Auth from "./pages/Auth";
import SemAcesso from "./pages/SemAcesso";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            {/* Tudo abaixo exige autenticação */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/sem-acesso" element={<SemAcesso />} />

                <Route element={<ProtectedRoute area="dashboard" />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                </Route>
                <Route element={<ProtectedRoute area="clientes" />}>
                  <Route path="/clientes" element={<Clientes />} />
                </Route>
                <Route element={<ProtectedRoute area="sacados" />}>
                  <Route path="/sacados" element={<Sacados />} />
                </Route>
                <Route element={<ProtectedRoute area="titulos" />}>
                  <Route path="/titulos" element={<Titulos />} />
                </Route>
                <Route element={<ProtectedRoute area="operacoes" />}>
                  <Route path="/operacoes/simulador" element={<OperacaoSimulador />} />
                  <Route path="/operacoes" element={<Operacoes />} />
                  <Route path="/operacoes/:id" element={<OperacaoDetalhes />} />
                </Route>
                <Route element={<ProtectedRoute area="contratos" />}>
                  <Route path="/contratos" element={<Contratos />} />
                </Route>
                <Route element={<ProtectedRoute area="cobrancas" />}>
                  <Route path="/cobrancas" element={<Cobrancas />} />
                </Route>
                <Route element={<ProtectedRoute area="relatorios" />}>
                  <Route path="/relatorios" element={<Relatorios />} />
                </Route>
                <Route element={<ProtectedRoute area="compliance" />}>
                  <Route path="/compliance" element={<Compliance />} />
                </Route>
                <Route element={<ProtectedRoute area="auditoria" />}>
                  <Route path="/auditoria" element={<AuditoriaLog />} />
                </Route>
                <Route element={<ProtectedRoute area="configuracoes" />}>
                  <Route path="/configuracoes" element={<Configuracoes />} />
                </Route>
              </Route>
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
