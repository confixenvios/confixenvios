import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  Plus, BarChart3, LogOut, MapPin, Truck, Menu, Car, 
  Search, User, LayoutDashboard,
  ChevronDown, Headphones
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
  const [localOpen, setLocalOpen] = useState(false);
  const [convencionalOpen, setConvencionalOpen] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  // Auto-expand menu based on current route
  useEffect(() => {
    if (location.pathname.includes('/painel/expresso') || location.pathname.includes('/painel/local')) {
      setLocalOpen(true);
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
      
      // Verificar se é admin usando a tabela user_roles
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();
      
      if (adminRole) {
        navigate('/admin/dashboard');
        return;
      }
      
      setUser(user);

      // Carregar perfil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, phone, document')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Carregar ou criar cliente B2B
      let { data: clientData } = await supabase
        .from('b2b_clients')
        .select('company_name, cnpj, phone')
        .eq('user_id', user.id)
        .single();

      if (!clientData && profileData) {
        // Criar novo cliente B2B
        const companyName = profileData.first_name && profileData.last_name 
          ? `${profileData.first_name} ${profileData.last_name}`
          : profileData.first_name || user.email?.split('@')[0] || 'Cliente';
        
        const { data: newClient } = await supabase
          .from('b2b_clients')
          .insert({
            user_id: user.id,
            company_name: companyName,
            email: profileData.email || user.email || '',
            phone: profileData.phone?.replace(/\D/g, '') || null,
            cnpj: profileData.document?.replace(/\D/g, '') || null,
            is_active: true
          })
          .select('company_name, cnpj, phone')
          .single();

        if (newClient) {
          clientData = newClient;
        }
      } else if (clientData && profileData) {
        // Sincronizar dados faltantes do perfil para o cliente B2B
        const needsUpdate = (!clientData.cnpj && profileData.document) || 
                           (!clientData.phone && profileData.phone);
        
        if (needsUpdate) {
          const updateData: { cnpj?: string; phone?: string } = {};
          if (!clientData.cnpj && profileData.document) {
            updateData.cnpj = profileData.document.replace(/\D/g, '');
          }
          if (!clientData.phone && profileData.phone) {
            updateData.phone = profileData.phone.replace(/\D/g, '');
          }
          
          await supabase
            .from('b2b_clients')
            .update(updateData)
            .eq('user_id', user.id);
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

  const localMenuItems = [
    { title: 'Meus Envios', url: '/painel/expresso/envios', icon: Car },
    { title: 'Novo Envio Local', url: '/painel/expresso/novo-envio', icon: Plus },
    { title: 'Endereços', url: '/painel/expresso/enderecos', icon: MapPin },
  ];

  const convencionalMenuItems = [
    { title: 'Meus Envios', url: '/painel/convencional/remessas', icon: Truck },
    { title: 'Novo Envio Nacional', url: '/painel/convencional/cotacoes', icon: Plus },
    { title: 'Cadastros', url: '/painel/convencional/cadastros', icon: User },
  ];

  const isActive = (path: string) => location.pathname === path;
  const isInLocal = location.pathname.includes('/painel/expresso');
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
        <div className="grid grid-cols-2 gap-3 items-start">
          <div className="bg-white rounded-lg p-2 flex items-center justify-center">
            <img src={confixLogo} alt="Confix Envios" className="h-8" />
          </div>
          <div className="text-right flex flex-col">
            <p className="text-xs text-white font-semibold leading-tight">Painel Cliente</p>
            <p className="text-xs text-white/80 leading-tight">Bem vindo,</p>
            <p className="text-sm text-white font-medium truncate leading-tight">{getDisplayName()}</p>
          </div>
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

        {/* Local Section (antigo Expresso) */}
        <Collapsible open={localOpen} onOpenChange={setLocalOpen}>
          <CollapsibleTrigger asChild>
            <button className={cn(
              "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-all mb-1",
              isInLocal 
                ? 'bg-primary/10 text-primary' 
                : 'text-foreground hover:bg-slate-100'
            )}>
              <div className="flex items-center gap-3">
                <Car className="h-4 w-4" />
                <span className="text-sm font-semibold">Envios Locais</span>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                localOpen && "rotate-180"
              )} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 space-y-1">
            {localMenuItems.map((item) => (
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

        {/* Nacional Section */}
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
                <span className="text-sm font-semibold">Envios Nacionais</span>
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

        {/* Relatórios unificado */}
        <NavLink
          to="/painel/relatorios"
          onClick={() => setMenuOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all mt-4",
            isActive('/painel/relatorios')
              ? 'bg-primary text-white shadow-md'
              : 'text-foreground hover:bg-slate-100'
          )}
        >
          <BarChart3 className="h-4 w-4" />
          <span className="text-sm font-medium">Relatórios</span>
        </NavLink>

        {/* Minha Conta */}
        <NavLink
          to="/painel/minha-conta"
          onClick={() => setMenuOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all mt-2",
            isActive('/painel/minha-conta')
              ? 'bg-primary text-white shadow-md'
              : 'text-foreground hover:bg-slate-100'
          )}
        >
          <User className="h-4 w-4" />
          <span className="text-sm font-medium">Minha Conta</span>
        </NavLink>

        {/* Suporte */}
        <NavLink
          to="/painel/suporte"
          onClick={() => setMenuOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all mt-2",
            location.pathname.startsWith('/painel/suporte')
              ? 'bg-primary text-white shadow-md'
              : 'text-foreground hover:bg-slate-100'
          )}
        >
          <Headphones className="h-4 w-4" />
          <span className="text-sm font-medium">Suporte</span>
        </NavLink>
      </div>

      {/* Botão Sair no final do menu lateral */}
      <div className="p-3 border-t lg:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setMenuOpen(false);
            handleLogout();
          }}
          className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair da conta
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
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-medium">Painel</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-white hover:bg-white/20"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex sticky top-0 z-40 bg-white border-b shadow-sm h-14 items-center px-6 justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Painel de Envios</span>
          </div>
          <Button
            size="sm"
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
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
