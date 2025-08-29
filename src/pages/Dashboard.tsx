import { Routes, Route } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import ClientLayout from '@/components/layouts/ClientLayout';
import ClientDashboard from './client/ClientDashboard';

const Dashboard = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <ClientLayout>
      <Routes>
        <Route index element={<ClientDashboard />} />
        <Route path="remessas" element={<div className="p-6"><h1 className="text-2xl font-bold">Minhas Remessas</h1><p className="text-muted-foreground">Em breve...</p></div>} />
        <Route path="etiquetas" element={<div className="p-6"><h1 className="text-2xl font-bold">Etiquetas</h1><p className="text-muted-foreground">Em breve...</p></div>} />
        <Route path="rastreio" element={<div className="p-6"><h1 className="text-2xl font-bold">Rastreio</h1><p className="text-muted-foreground">Em breve...</p></div>} />
        <Route path="historico" element={<div className="p-6"><h1 className="text-2xl font-bold">Histórico</h1><p className="text-muted-foreground">Em breve...</p></div>} />
        <Route path="conta" element={<div className="p-6"><h1 className="text-2xl font-bold">Minha Conta</h1><p className="text-muted-foreground">Em breve...</p></div>} />
      </Routes>
    </ClientLayout>
  );
};

export default Dashboard;