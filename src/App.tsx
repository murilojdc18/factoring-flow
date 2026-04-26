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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/sacados" element={<Sacados />} />
            <Route path="/titulos" element={<Titulos />} />
            <Route path="/operacoes/simulador" element={<OperacaoSimulador />} />
            <Route path="/operacoes" element={<Operacoes />} />
            <Route path="/operacoes/:id" element={<OperacaoDetalhes />} />
            <Route path="/contratos" element={<Contratos />} />
            <Route
              path="/cobrancas"
              element={
                <Placeholder
                  title="Cobranças"
                  description="Acompanhamento de vencimentos e baixas manuais."
                />
              }
            />
            <Route
              path="/relatorios"
              element={
                <Placeholder
                  title="Relatórios"
                  description="Análises operacionais e indicadores gerenciais."
                />
              }
            />
            <Route path="/configuracoes" element={<Configuracoes />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
