import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import ClientLayout from '@/components/layouts/ClientLayout';
import ClientDashboard from './client/ClientDashboard';
import Remessas from './client/Remessas';
import Etiquetas from './client/Etiquetas';
import Rastreio from './client/Rastreio';
import Historico from './client/Historico';
import Conta from './client/Conta';

const Dashboard = () => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background/80 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Redirect admins to admin dashboard
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <ClientLayout>
      <Routes>
        <Route index element={<ClientDashboard />} />
        <Route path="remessas" element={<Remessas />} />
        <Route path="etiquetas" element={<Etiquetas />} />
        <Route path="rastreio" element={<Rastreio />} />
        <Route path="historico" element={<Historico />} />
        <Route path="conta" element={<Conta />} />
      </Routes>
    </ClientLayout>
  );
};

export default Dashboard;