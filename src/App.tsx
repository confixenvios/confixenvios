import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";

// Public pages
import Index from "./pages/Index";
import Cotacao from "./pages/Cotacao";
import Results from "./pages/Results";
import Label from "./pages/Label";
import Document from "./pages/Document";
import Tracking from "./pages/Tracking";
import Payment from "./pages/Payment";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentSuccessStripe from "./pages/PaymentSuccessStripe";
import PixPayment from "./pages/PixPayment";
import PixPaymentSuccess from "./pages/PixPaymentSuccess";
import Auth from "./pages/Auth";
import AdminAuth from "./pages/admin/AdminAuth";
import NotFound from "./pages/NotFound";

// Client pages
import ClientLayout from "./pages/cliente/ClientLayout";
import ClientDashboard from "./pages/cliente/ClientDashboard";
import ClientCotacoes from "./pages/cliente/ClientCotacoes";
import ClientRemessas from "./pages/cliente/ClientRemessas";
import ClientEtiquetas from "./pages/cliente/ClientEtiquetas";
import ClientRastreio from "./pages/cliente/ClientRastreio";
import ClientHistorico from "./pages/cliente/ClientHistorico";
import ClientConta from "./pages/cliente/ClientConta";

// Admin pages
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboardEnhanced from "./pages/admin/AdminDashboardEnhanced";
import AdminClienteDetalhes from "./pages/admin/AdminClienteDetalhes";
import AdminClientes from "./pages/admin/AdminClientes";
import AdminMotoristas from "./pages/admin/AdminMotoristas";
import AdminFiliais from "./pages/admin/AdminFiliais";
import AdminRemessas from "./pages/admin/AdminRemessas";
import AdminFaturamento from "./pages/admin/AdminFaturamento";
import AdminClientesB2B from "./pages/admin/AdminClientesB2B";
import AdminCadastroClienteB2B from "./pages/admin/AdminCadastroClienteB2B";

import AdminIntegracoes from "./pages/admin/AdminIntegracoes";
import AdminWebhooks from "./pages/admin/AdminWebhooks";
import AdminApiKeys from "./pages/admin/AdminApiKeys";
import ApiDocs from "./pages/ApiDocs";
import AdminApiExterna from "./pages/admin/AdminApiExterna";
import AdminRelatorios from "./pages/admin/AdminRelatorios";
import AdminCte from "./pages/admin/AdminCte";
import MotoristaAuth from "./pages/motorista/MotoristaAuth";
import MotoristaRegistro from "./pages/motorista/MotoristaRegistro";
import MotoristaDashboard from "./pages/motorista/MotoristaDashboard";
import MotoristaRelatorios from "./pages/motorista/MotoristaRelatorios";
import B2BAuth from "./pages/b2b/B2BAuth";
import B2BLayout from "./pages/b2b/B2BLayout";
import B2BDashboard from "./pages/b2b/B2BDashboard";
import B2BNovaRemessa from "./pages/b2b/B2BNovaRemessa";
import B2BRelatorios from "./pages/b2b/B2BRelatorios";
import B2BPixPayment from "./pages/b2b/B2BPixPayment";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/cotacao" element={<Cotacao />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin/auth" element={<AdminAuth />} />
            <Route path="/login" element={<Navigate to="/auth" replace />} />
            <Route path="/cadastro" element={<Navigate to="/auth" replace />} />
            <Route path="/resultados" element={<Results />} />
            <Route path="/etiqueta" element={<Label />} />
            <Route path="/documento" element={<Document />} />
            <Route path="/pagamento" element={<Payment />} />
            <Route path="/pix-pagamento" element={<PixPayment />} />
            <Route path="/pix-sucesso" element={<PixPaymentSuccess />} />
            <Route path="/pagamento-sucesso" element={<PaymentSuccessStripe />} />
            <Route path="/rastreamento" element={<Tracking />} />
            <Route path="/rastreio" element={<Tracking />} />
            <Route path="/rastreio/:codigo" element={<Tracking />} />
            <Route path="/api-docs" element={<ApiDocs />} />

            {/* Client Routes */}
            <Route 
              path="/cliente/*" 
              element={
                <ProtectedRoute requireClient>
                  <ClientLayout>
                    <Routes>
                      <Route index element={<Navigate to="dashboard" replace />} />
                      <Route path="dashboard" element={<ClientDashboard />} />
                      <Route path="cotacoes" element={<ClientCotacoes />} />
                      <Route path="remessas" element={<ClientRemessas />} />
                      <Route path="etiquetas" element={<ClientEtiquetas />} />
                      <Route path="rastreamento" element={<ClientRastreio />} />
                      <Route path="relatorio" element={<ClientHistorico />} />
                      <Route path="minha-conta" element={<ClientConta />} />
                    </Routes>
                  </ClientLayout>
                </ProtectedRoute>
              } 
            />
            
            {/* Admin Routes */}
            <Route 
              path="/admin/*" 
              element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout>
                    <Routes>
                      <Route index element={<Navigate to="dashboard" replace />} />
                      <Route path="dashboard" element={<AdminDashboardEnhanced />} />
                      <Route path="clientes" element={<AdminClientes />} />
                      <Route path="clientes/:id" element={<AdminClienteDetalhes />} />
                      <Route path="clientes-b2b" element={<AdminClientesB2B />} />
                      <Route path="clientes-b2b/novo" element={<AdminCadastroClienteB2B />} />
                      <Route path="motoristas" element={<AdminMotoristas />} />
                      <Route path="filiais" element={<AdminFiliais />} />
                      <Route path="faturamento" element={<AdminFaturamento />} />
                      <Route path="remessas" element={<AdminRemessas />} />
                     <Route path="cte" element={<AdminCte />} />
                       <Route path="api-externa" element={<AdminApiExterna />} />
                       <Route path="relatorios" element={<AdminRelatorios />} />
                       <Route path="integracoes" element={<AdminIntegracoes />} />
                       <Route path="webhooks" element={<AdminWebhooks />} />
                       <Route path="api-keys" element={<AdminApiKeys />} />
                       <Route path="api-docs" element={<Navigate to="/api-docs" replace />} />
                      
                      
                    </Routes>
                  </AdminLayout>
                </ProtectedRoute>
              } 
            />

            {/* Motorista Routes */}
            <Route path="/motorista/auth" element={<MotoristaAuth />} />
            <Route path="/motorista/registro" element={<MotoristaRegistro />} />
            <Route path="/motorista" element={<MotoristaDashboard />} />
            <Route path="/motorista/dashboard" element={<MotoristaDashboard />} />
            <Route path="/motorista/relatorios" element={<MotoristaRelatorios />} />

            {/* B2B Expresso Routes */}
            <Route path="/b2b-expresso" element={<B2BAuth />} />
            <Route path="/b2b-expresso/*" element={<B2BLayout />}>
              <Route path="dashboard" element={<B2BDashboard />} />
              <Route path="nova-remessa" element={<B2BNovaRemessa />} />
              <Route path="pix-pagamento" element={<B2BPixPayment />} />
              <Route path="relatorios" element={<B2BRelatorios />} />
            </Route>

            {/* Legacy redirects */}
            <Route path="/dashboard/*" element={<Navigate to="/cliente" replace />} />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;