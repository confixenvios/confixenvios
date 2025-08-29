import { Routes, Route } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import ClientLayout from '@/components/layouts/ClientLayout';
import ClientDashboard from './client/ClientDashboard';
import Remessas from './client/Remessas';
import Etiquetas from './client/Etiquetas';
import Rastreio from './client/Rastreio';
import Historico from './client/Historico';
import Conta from './client/Conta';

const Dashboard = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
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