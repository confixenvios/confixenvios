import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus, BarChart3, LogOut, MapPin, Truck, Menu, Package } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import confixLogo from '@/assets/confix-logo-black.png';
import PendingApprovalBanner from '@/components/PendingApprovalBanner';

interface B2BClient {
  company_name: string;
}

const B2BLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [client, setClient] = useState<B2BClient | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  useEffect(() => {
    loadClient();
  }, []);

  const loadClient = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/b2b-expresso');
        return;
      }

      // Check profile status
      const { data: profileData } = await supabase
        .from('profiles')
        .select('status, first_name, last_name, email, phone, document')
        .eq('id', user.id)
        .single();

      if (profileData) {
        if (profileData.status !== 'aprovado') {
          setIsPendingApproval(true);
          setLoading(false);
          return;
        }
      }

      // Check if b2b_clients record exists
      let { data: clientData } = await supabase
        .from('b2b_clients')
        .select('company_name')
        .eq('user_id', user.id)
        .single();

      // If no b2b_clients record exists, create one automatically
      if (!clientData && profileData) {
        const companyName = profileData.first_name && profileData.last_name 
          ? `${profileData.first_name} ${profileData.last_name}`
          : profileData.first_name || user.email?.split('@')[0] || 'Cliente';
        
        const { data: newClient, error: createError } = await supabase
          .from('b2b_clients')
          .insert({
            user_id: user.id,
            company_name: companyName,
            email: profileData.email || user.email || '',
            phone: profileData.phone || '',
            cnpj: profileData.document || '',
            is_active: true
          })
          .select('company_name')
          .single();

        if (!createError && newClient) {
          clientData = newClient;
        }
      }

      if (clientData) {
        setClient(clientData);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/b2b-expresso');
  };

  const menuItems = [
    { title: 'Envios', url: '/b2b-expresso/dashboard', icon: Truck },
    { title: 'Novo Envio', url: '/b2b-expresso/nova-remessa', icon: Plus },
    { title: 'Endereços de Coleta', url: '/b2b-expresso/enderecos-coleta', icon: MapPin },
    { title: 'Endereços de Entrega', url: '/b2b-expresso/enderecos', icon: MapPin },
    { title: 'Relatórios', url: '/b2b-expresso/relatorios', icon: BarChart3 },
  ];

  const isActive = (path: string) => location.pathname === path;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show pending approval banner
  if (isPendingApproval) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <PendingApprovalBanner type="b2b" />
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header do Sidebar */}
      <div className="p-4 bg-gradient-to-r from-primary via-primary to-red-700">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg p-1">
            <img src={confixLogo} alt="Confix Envios" className="h-5" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-xs text-white/80 font-medium">B2B Express</span>
          {client && (
            <p className="text-sm text-white font-medium truncate">Bem vindo, {client.company_name}</p>
          )}
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 py-4 px-3">
        <p className="text-xs font-medium text-muted-foreground mb-3 px-2">Menu</p>
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                isActive(item.url)
                  ? 'bg-primary text-white shadow-md'
                  : 'text-foreground hover:bg-slate-100'
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span className="text-sm font-medium">{item.title}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Logout */}
      <div className="p-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r shadow-sm">
        <SidebarContent />
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-gradient-to-r from-primary via-primary to-red-700 shadow-lg md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72">
                  <SidebarContent />
                </SheetContent>
              </Sheet>
              <div className="bg-white rounded-lg p-1">
                <img src={confixLogo} alt="Confix Envios" className="h-5" />
              </div>
            </div>
            {client && (
              <span className="text-sm text-white/90 truncate max-w-[180px]">Bem vindo, {client.company_name}</span>
            )}
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex sticky top-0 z-40 bg-white border-b shadow-sm h-14 items-center px-6">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Painel B2B Express</span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default B2BLayout;
