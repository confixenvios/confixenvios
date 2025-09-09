import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";

// Public pages
import Index from "./pages/Index";
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
import AdminHistorico from "./pages/admin/AdminHistorico";
import AdminIntegracoes from "./pages/admin/AdminIntegracoes";
import AdminWebhooks from "./pages/admin/AdminWebhooks";
import AdminWebhookLogs from "./pages/admin/AdminWebhookLogs";
import AdminTestarTabela from "./pages/admin/AdminTestarTabela";
import AdminDocsIntegracao from "./pages/admin/AdminDocsIntegracao";
import MotoristaAuth from "./pages/motorista/MotoristaAuth";
import MotoristaRegistro from "./pages/motorista/MotoristaRegistro";
import MotoristaDashboard from "./pages/motorista/MotoristaDashboard";
import MotoristaRelatorios from "./pages/motorista/MotoristaRelatorios";

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
            <Route path="/" element={<Navigate to="/cotacao" replace />} />
            <Route path="/cotacao" element={<Index />} />
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
                      <Route path="motoristas" element={<AdminMotoristas />} />
                      <Route path="filiais" element={<AdminFiliais />} />
                      <Route path="faturamento" element={<AdminFaturamento />} />
                      <Route path="remessas" element={<AdminRemessas />} />
                      <Route path="integracoes" element={<AdminIntegracoes />} />
                      <Route path="webhooks" element={<AdminWebhooks />} />
                      <Route path="docs-integracao" element={<AdminDocsIntegracao />} />
                      <Route path="webhooks/logs" element={<AdminWebhookLogs />} />
                      <Route path="historico" element={<AdminHistorico />} />
                      <Route path="testar-tabela" element={<AdminTestarTabela />} />
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