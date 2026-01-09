import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  Plus, BarChart3, LogOut, MapPin, Truck, Menu, Car, Package2, 
  FileText, Search, History, User, Calculator, LayoutDashboard,
  ChevronDown
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import confixLogo from '@/assets/confix-logo-black.png';

interface UserProfile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface B2BClient {
  company_name: string;
}

const PainelLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [b2bClient, setB2BClient] = useState<B2BClient | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [expressoOpen, setExpressoOpen] = useState(false);
  const [convencionalOpen, setConvencionalOpen] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  // Auto-expand menu based on current route
  useEffect(() => {
    if (location.pathname.includes('/painel/expresso')) {
      setExpressoOpen(true);
    } else if (location.pathname.includes('/painel/convencional')) {
      setConvencionalOpen(true);
    }
  }, [location.pathname]);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);

      // Carregar perfil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Carregar ou criar cliente B2B
      let { data: clientData } = await supabase
        .from('b2b_clients')
        .select('company_name')
        .eq('user_id', user.id)
        .single();

      if (!clientData && profileData) {
        const companyName = profileData.first_name && profileData.last_name 
          ? `${profileData.first_name} ${profileData.last_name}`
          : profileData.first_name || user.email?.split('@')[0] || 'Cliente';
        
        const { data: newClient } = await supabase
          .from('b2b_clients')
          .insert({
            user_id: user.id,
            company_name: companyName,
            email: profileData.email || user.email || '',
            is_active: true
          })
          .select('company_name')
          .single();

        if (newClient) {
          clientData = newClient;
        }
      }

      if (clientData) {
        setB2BClient(clientData);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const getDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.first_name) {
      return profile.first_name;
    }
    if (b2bClient?.company_name) {
      return b2bClient.company_name;
    }
    return user?.email?.split('@')[0] || 'Cliente';
  };

  const expressoMenuItems = [
    { title: 'Envios', url: '/painel/expresso/envios', icon: Truck },
    { title: 'Novo Envio', url: '/painel/expresso/novo-envio', icon: Plus },
    { title: 'Endereços de Coleta', url: '/painel/expresso/enderecos-coleta', icon: MapPin },
    { title: 'Endereços de Entrega', url: '/painel/expresso/enderecos', icon: MapPin },
    { title: 'Relatórios', url: '/painel/expresso/relatorios', icon: BarChart3 },
  ];

  const convencionalMenuItems = [
    { title: 'Cotações', url: '/painel/convencional/cotacoes', icon: Calculator },
    { title: 'Remessas', url: '/painel/convencional/remessas', icon: Package2 },
    { title: 'Etiquetas', url: '/painel/convencional/etiquetas', icon: FileText },
    { title: 'Rastreamento', url: '/painel/convencional/rastreamento', icon: Search },
    { title: 'Relatórios', url: '/painel/convencional/relatorios', icon: History },
  ];

  const isActive = (path: string) => location.pathname === path;
  const isInExpresso = location.pathname.includes('/painel/expresso');
  const isInConvencional = location.pathname.includes('/painel/convencional');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-primary via-primary to-red-700">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg p-1">
            <img src={confixLogo} alt="Confix Envios" className="h-5" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-xs text-white/80 font-medium">Painel do Cliente</span>
          <p className="text-sm text-white font-medium truncate">Bem vindo, {getDisplayName()}</p>
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 py-4 px-3 overflow-y-auto">
        {/* Dashboard Link */}
        <NavLink
          to="/painel"
          end
          onClick={() => setMenuOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all mb-4",
            location.pathname === '/painel'
              ? 'bg-primary text-white shadow-md'
              : 'text-foreground hover:bg-slate-100'
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span className="text-sm font-medium">Início</span>
        </NavLink>

        {/* Expresso Section */}
        <Collapsible open={expressoOpen} onOpenChange={setExpressoOpen}>
          <CollapsibleTrigger asChild>
            <button className={cn(
              "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-all mb-1",
              isInExpresso 
                ? 'bg-primary/10 text-primary' 
                : 'text-foreground hover:bg-slate-100'
            )}>
              <div className="flex items-center gap-3">
                <Car className="h-4 w-4" />
                <span className="text-sm font-semibold">Expresso</span>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                expressoOpen && "rotate-180"
              )} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 space-y-1">
            {expressoMenuItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                  isActive(item.url)
                    ? 'bg-primary text-white shadow-md'
                    : 'text-foreground hover:bg-slate-100'
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="text-sm">{item.title}</span>
              </NavLink>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Convencional Section */}
        <Collapsible open={convencionalOpen} onOpenChange={setConvencionalOpen} className="mt-2">
          <CollapsibleTrigger asChild>
            <button className={cn(
              "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-all mb-1",
              isInConvencional 
                ? 'bg-primary/10 text-primary' 
                : 'text-foreground hover:bg-slate-100'
            )}>
              <div className="flex items-center gap-3">
                <Truck className="h-4 w-4" />
                <span className="text-sm font-semibold">Nacional</span>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                convencionalOpen && "rotate-180"
              )} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 space-y-1">
            {convencionalMenuItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                  isActive(item.url)
                    ? 'bg-primary text-white shadow-md'
                    : 'text-foreground hover:bg-slate-100'
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="text-sm">{item.title}</span>
              </NavLink>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Minha Conta */}
        <NavLink
          to="/painel/minha-conta"
          onClick={() => setMenuOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all mt-4",
            isActive('/painel/minha-conta')
              ? 'bg-primary text-white shadow-md'
              : 'text-foreground hover:bg-slate-100'
          )}
        >
          <User className="h-4 w-4" />
          <span className="text-sm font-medium">Minha Conta</span>
        </NavLink>
      </div>

      {/* User Section & Logout */}
      <div className="p-3 border-t">
        <div className="px-2 py-2 mb-2">
          <p className="text-sm font-medium text-foreground truncate">{getDisplayName()}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start text-red-600 hover:text-white hover:bg-primary transition-all duration-200"
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
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r shadow-sm">
        <SidebarContent />
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 bg-gradient-to-r from-primary via-primary to-red-700 shadow-lg lg:hidden">
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
            <span className="text-white text-sm font-medium">Painel</span>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex sticky top-0 z-40 bg-white border-b shadow-sm h-14 items-center px-6 justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Painel de Envios</span>
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

export default PainelLayout;
