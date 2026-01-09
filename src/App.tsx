import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import SupportBubble from "@/components/SupportBubble";

// Public pages
import Index from "./pages/Index";
import CotacaoPreview from "./pages/CotacaoPreview";
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

// Support pages
import SuporteAuth from "./pages/suporte/SuporteAuth";
import SuporteTickets from "./pages/suporte/SuporteTickets";
import SuporteNovoTicket from "./pages/suporte/SuporteNovoTicket";
import SuporteTicketDetalhes from "./pages/suporte/SuporteTicketDetalhes";

// Client pages (legacy - will redirect to /painel)
import ClientLayout from "./pages/cliente/ClientLayout";
import ClientDashboard from "./pages/cliente/ClientDashboard";
import ClientCotacoes from "./pages/cliente/ClientCotacoes";
import ClientRemessas from "./pages/cliente/ClientRemessas";
import ClientEtiquetas from "./pages/cliente/ClientEtiquetas";
import ClientRastreio from "./pages/cliente/ClientRastreio";
import ClientHistorico from "./pages/cliente/ClientHistorico";
import ClientConta from "./pages/cliente/ClientConta";
import ClientRemetentes from "./pages/cliente/ClientRemetentes";
import ClientDestinatarios from "./pages/cliente/ClientDestinatarios";

// Unified Panel pages
import PainelLayout from "./pages/painel/PainelLayout";
import PainelDashboard from "./pages/painel/PainelDashboard";
import PainelSuporte from "./pages/painel/PainelSuporte";
import PainelNovoTicket from "./pages/painel/PainelNovoTicket";
import PainelTicketDetalhes from "./pages/painel/PainelTicketDetalhes";

// Admin pages
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboardEnhanced from "./pages/admin/AdminDashboardEnhanced";
import AdminClienteDetalhes from "./pages/admin/AdminClienteDetalhes";
import AdminClientes from "./pages/admin/AdminClientes";
import AdminCadastros from "./pages/admin/AdminCadastros";
import AdminMotoristas from "./pages/admin/AdminMotoristas";
import AdminFiliais from "./pages/admin/AdminFiliais";
import AdminRemessas from "./pages/admin/AdminRemessas";
import AdminRemessasExpresso from "./pages/admin/AdminRemessasExpresso";
import AdminFaturamento from "./pages/admin/AdminFaturamento";
import AdminClientesB2B from "./pages/admin/AdminClientesB2B";
import AdminCadastroClienteB2B from "./pages/admin/AdminCadastroClienteB2B";
import AdminGestaoCd from "./pages/admin/AdminGestaoCd";
import AdminCdUsers from "./pages/admin/AdminCdUsers";
import AdminTickets from "./pages/admin/AdminTickets";

import AdminIntegracoes from "./pages/admin/AdminIntegracoes";
import AdminWebhooks from "./pages/admin/AdminWebhooks";
import AdminApiKeys from "./pages/admin/AdminApiKeys";
import ApiDocs from "./pages/ApiDocs";
import AdminApiExterna from "./pages/admin/AdminApiExterna";
import AdminRelatorios from "./pages/admin/AdminRelatorios";
import AdminCte from "./pages/admin/AdminCte";
import AdminRastreio from "./pages/admin/AdminRastreio";
import MotoristaAuth from "./pages/motorista/MotoristaAuth";
import MotoristaRegistro from "./pages/motorista/MotoristaRegistro";
import MotoristaDashboard from "./pages/motorista/MotoristaDashboard";
import MotoristaRelatorios from "./pages/motorista/MotoristaRelatorios";
import CdAuth from "./pages/cd/CdAuth";
import CdRegistro from "./pages/cd/CdRegistro";
import CdDashboard from "./pages/cd/CdDashboard";
import B2BAuth from "./pages/b2b/B2BAuth";
import B2BRegistro from "./pages/b2b/B2BRegistro";
import B2BLayout from "./pages/b2b/B2BLayout";
import B2BDashboard from "./pages/b2b/B2BDashboard";
import B2BNovaRemessa from "./pages/b2b/B2BNovaRemessa";
import B2BRelatorios from "./pages/b2b/B2BRelatorios";
import B2BPixPayment from "./pages/b2b/B2BPixPayment";
import B2BPixPaymentSuccess from "./pages/b2b/B2BPixPaymentSuccess";
import B2BRastreamento from "./pages/b2b/B2BRastreamento";
import PainelEnderecos from "./pages/painel/PainelEnderecos";
import PainelCadastros from "./pages/painel/PainelCadastros";
import PainelRelatorios from "./pages/painel/PainelRelatorios";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SupportBubble />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/cotacaopreview" element={<CotacaoPreview />} />
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

            {/* Support Routes - redirect to painel if logged in, show FAQ if not */}
            <Route path="/suporte" element={<SuporteAuth />} />
            <Route path="/suporte/tickets" element={<Navigate to="/painel/suporte" replace />} />
            <Route path="/suporte/novo-ticket" element={<Navigate to="/painel/suporte/novo" replace />} />
            <Route path="/suporte/ticket/:id" element={<Navigate to="/painel/suporte" replace />} />

            {/* Client Routes (legacy - redirect to painel) */}
            <Route path="/cliente/*" element={<Navigate to="/painel" replace />} />

            {/* Unified Panel Routes */}
            <Route 
              path="/painel/*" 
              element={
                <ProtectedRoute requireClient>
                  <Routes>
                    <Route element={<PainelLayout />}>
                      <Route index element={<PainelDashboard />} />
                      {/* Local (antigo Expresso) Routes */}
                      <Route path="expresso/envios" element={<B2BDashboard />} />
                      <Route path="expresso/novo-envio" element={<B2BNovaRemessa />} />
                      <Route path="expresso/enderecos" element={<PainelEnderecos />} />
                      <Route path="expresso/rastreamento" element={<B2BRastreamento />} />
                      <Route path="expresso/pix-pagamento" element={<B2BPixPayment />} />
                      <Route path="expresso/pix-sucesso" element={<B2BPixPaymentSuccess />} />
                      {/* Nacional Routes */}
                      <Route path="convencional/cotacoes" element={<ClientCotacoes />} />
                      <Route path="convencional/remessas" element={<ClientRemessas />} />
                      <Route path="convencional/cadastros" element={<PainelCadastros />} />
                      <Route path="convencional/remetentes" element={<ClientRemetentes />} />
                      <Route path="convencional/destinatarios" element={<ClientDestinatarios />} />
                      <Route path="convencional/rastreamento" element={<ClientRastreio />} />
                      {/* Relatórios unificado */}
                      <Route path="relatorios" element={<PainelRelatorios />} />
                      {/* Shared */}
                      <Route path="minha-conta" element={<ClientConta />} />
                      {/* Suporte */}
                      <Route path="suporte" element={<PainelSuporte />} />
                      <Route path="suporte/novo" element={<PainelNovoTicket />} />
                      <Route path="suporte/ticket/:id" element={<PainelTicketDetalhes />} />
                    </Route>
                  </Routes>
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
                      <Route path="cadastros" element={<AdminCadastros />} />
                      <Route path="clientes" element={<AdminClientes />} />
                      <Route path="clientes/:id" element={<AdminClienteDetalhes />} />
                      <Route path="clientes-b2b" element={<AdminClientesB2B />} />
                      <Route path="clientes-b2b/novo" element={<AdminCadastroClienteB2B />} />
                      <Route path="motoristas" element={<AdminMotoristas />} />
                      <Route path="gestaocd" element={<AdminGestaoCd />} />
                      <Route path="cd-users" element={<AdminCdUsers />} />
                      <Route path="filiais" element={<AdminFiliais />} />
                      <Route path="faturamento" element={<AdminFaturamento />} />
                      <Route path="remessas" element={<AdminRemessas />} />
                      <Route path="remessas-expresso" element={<AdminRemessasExpresso />} />
                      <Route path="rastreamento" element={<AdminRastreio />} />
                      <Route path="cte" element={<AdminCte />} />
                       <Route path="api-externa" element={<AdminApiExterna />} />
                       <Route path="relatorios" element={<AdminRelatorios />} />
                       <Route path="tickets" element={<AdminTickets />} />
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

            {/* CD Routes */}
            <Route path="/cd" element={<CdAuth />} />
            <Route path="/cd/registro" element={<CdRegistro />} />
            <Route path="/cd/dashboard" element={<CdDashboard />} />

            {/* B2B Expresso Routes (legacy - redirect to painel) */}
            <Route path="/b2b-expresso" element={<B2BAuth />} />
            <Route path="/b2b-expresso/registro" element={<B2BRegistro />} />
            <Route path="/b2b-expresso/*" element={<Navigate to="/painel" replace />} />

            {/* Legacy redirects */}
            <Route path="/dashboard/*" element={<Navigate to="/painel" replace />} />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;