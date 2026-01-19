import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Truck, 
  Package, 
  BarChart3, 
  LogOut, 
  Menu, 
  Clock,
  CheckCircle,
  AlertCircle,
  Settings
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import confixLogo from '@/assets/confix-logo-black.png';

interface CarrierPartner {
  id: string;
  email: string;
  company_name: string;
  cnpj: string | null;
  contact_name: string | null;
  phone: string | null;
  status: string;
  logo_url: string | null;
}

const ParceirosLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [partner, setPartner] = useState<CarrierPartner | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPartner();
  }, []);

  const loadPartner = () => {
    try {
      const partnerData = sessionStorage.getItem('carrier_partner');
      if (!partnerData) {
        navigate('/parceiros');
        return;
      }
      setPartner(JSON.parse(partnerData));
    } catch (error) {
      console.error('Error loading partner:', error);
      navigate('/parceiros');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('carrier_partner');
    navigate('/parceiros');
  };

  const menuItems = [
    { title: 'Dashboard', url: '/parceiros/dashboard', icon: LayoutDashboard },
    { title: 'Entregas Pendentes', url: '/parceiros/pendentes', icon: Clock },
    { title: 'Entregas Realizadas', url: '/parceiros/realizadas', icon: CheckCircle },
    { title: 'Relatórios', url: '/parceiros/relatorios', icon: BarChart3 },
    { title: 'Configurações', url: '/parceiros/configuracoes', icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header do Sidebar */}
      <div className="p-4 bg-gradient-to-r from-primary to-red-700">
        <div className="grid grid-cols-2 gap-3 items-start">
          <div className="bg-white rounded-lg p-2 flex items-center justify-center">
            <img src={confixLogo} alt="Confix Envios" className="h-8" />
          </div>
          <div className="text-right flex flex-col">
            <p className="text-xs text-white font-semibold leading-tight">Portal Parceiros</p>
            <p className="text-xs text-white/70 leading-tight">Bem vindo,</p>
            <p className="text-sm text-white font-medium truncate leading-tight">{partner?.company_name || 'Parceiro'}</p>
          </div>
        </div>
      </div>

      {/* Partner Info Card */}
      <div className="px-3 py-4">
        <div className="bg-gradient-to-r from-red-50 to-white rounded-lg p-3 border border-red-100">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{partner?.company_name}</p>
              <p className="text-xs text-muted-foreground truncate">{partner?.cnpj || 'CNPJ não informado'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 py-2 px-3">
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
                  : 'text-foreground hover:bg-red-50'
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
          className="w-full justify-start text-red-600 hover:text-white hover:bg-red-600 transition-all duration-200"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-red-50/50 to-white">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r shadow-sm">
        <SidebarContent />
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 bg-gradient-to-r from-primary to-red-700 shadow-lg md:hidden">
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
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-medium">{partner?.company_name}</span>
            </div>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex sticky top-0 z-40 bg-white border-b shadow-sm h-14 items-center px-6 justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Portal de Parceiros - Envios Nacionais</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{partner?.company_name}</p>
              <p className="text-xs text-muted-foreground">{partner?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-red-600 hover:text-white hover:bg-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <Outlet context={{ partner }} />
        </main>
      </div>
    </div>
  );
};

export default ParceirosLayout;