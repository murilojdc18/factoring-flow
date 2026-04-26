import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "./pages/NotFound.tsx";
import { AppLayout } from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Placeholder from "./pages/Placeholder";

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
            <Route
              path="/clientes"
              element={
                <Placeholder
                  title="Clientes / Cedentes"
                  description="Cadastro e gestão dos cedentes que cedem títulos."
                  primaryAction="Novo cedente"
                />
              }
            />
            <Route
              path="/sacados"
              element={
                <Placeholder
                  title="Sacados"
                  description="Cadastro e gestão dos sacados (devedores dos títulos)."
                  primaryAction="Novo sacado"
                />
              }
            />
            <Route
              path="/titulos"
              element={
                <Placeholder
                  title="Títulos / Recebíveis"
                  description="Lançamento e acompanhamento de duplicatas e recebíveis."
                  primaryAction="Lançar título"
                />
              }
            />
            <Route
              path="/operacoes"
              element={
                <Placeholder
                  title="Operações / Borderôs"
                  description="Simulação e geração de borderôs de fomento."
                  primaryAction="Nova operação"
                />
              }
            />
            <Route
              path="/contratos"
              element={
                <Placeholder
                  title="Contratos & Aditivos"
                  description="Documentos proforma — sujeitos a revisão jurídica."
                  primaryAction="Novo contrato"
                />
              }
            />
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
            <Route
              path="/configuracoes"
              element={
                <Placeholder
                  title="Configurações"
                  description="Parâmetros financeiros, taxas e usuários do sistema."
                />
              }
            />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
