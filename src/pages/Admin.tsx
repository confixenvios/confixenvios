import { Routes, Route } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import AdminLayout from '@/components/layouts/AdminLayout';
import AdminDashboard from './admin/AdminDashboard';
import WebhookManagement from '@/components/admin/WebhookManagement';
import ActiveClients from '@/components/admin/ActiveClients';

const Admin = () => {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return null;
  }

  return (
    <AdminLayout>
      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="integracoes" element={<div className="p-6"><h1 className="text-2xl font-bold">Integrações</h1><p className="text-muted-foreground">Em breve...</p></div>} />
        <Route path="clientes" element={<div className="p-6"><ActiveClients /></div>} />
        <Route path="remessas" element={<div className="p-6"><h1 className="text-2xl font-bold">Remessas</h1><p className="text-muted-foreground">Em breve...</p></div>} />
        <Route path="webhooks" element={<div className="p-6"><WebhookManagement /></div>} />
        <Route path="configuracoes" element={<div className="p-6"><h1 className="text-2xl font-bold">Configurações</h1><p className="text-muted-foreground">Em breve...</p></div>} />
      </Routes>
    </AdminLayout>
  );
};

export default Admin;