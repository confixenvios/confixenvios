import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Package2,
  FileText,
  Truck,
  History,
  User,
  LogOut,
  Menu,
  Calculator
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import confixLogo from '@/assets/confix-logo-black.png';

interface ClientLayoutProps {
  children: React.ReactNode;
}

const ClientLayout = ({ children }: ClientLayoutProps) => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  // Check if user is admin and redirect
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setCheckingAdmin(false);
        return;
      }

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (data) {
        // User is admin, redirect to admin panel
        navigate('/admin', { replace: true });
      } else {
        setCheckingAdmin(false);
      }
    };

    checkAdminRole();
  }, [user, navigate]);

  // Show loading while checking admin status
  if (checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.first_name) {
      return profile.first_name;
    }
    return user?.email?.split('@')[0] || 'Cliente';
  };

  const navigation = [
    { name: 'Dashboard', href: '/cliente/dashboard', icon: LayoutDashboard },
    { name: 'Cotações', href: '/cliente/cotacoes', icon: Calculator },
    { name: 'Remessas', href: '/cliente/remessas', icon: Package2 },
    { name: 'Etiquetas', href: '/cliente/etiquetas', icon: FileText },
    { name: 'Rastreamento', href: '/cliente/rastreamento', icon: Truck },
    { name: 'Relatórios', href: '/cliente/relatorio', icon: History },
    { name: 'Minha Conta', href: '/cliente/minha-conta', icon: User },
  ];

  const isActive = (path: string) => {
    if (path === '/cliente/dashboard') {
      return location.pathname === '/cliente/dashboard' || location.pathname === '/cliente';
    }
    return location.pathname.startsWith(path);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header do Sidebar com Banner */}
      <div className="p-4 bg-gradient-to-r from-primary via-primary to-red-700">
        <div className="flex items-center gap-3">
          <img src={confixLogo} alt="Confix Envios" className="h-6" />
        </div>
        <div className="mt-2">
          <span className="text-xs text-white/80 font-medium">Confix Cliente</span>
          <p className="text-sm text-white font-medium truncate">Bem vindo, {getDisplayName()}</p>
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 py-4 px-3">
        <p className="text-xs font-medium text-muted-foreground mb-3 px-2">Menu</p>
        <nav className="space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                isActive(item.href)
                  ? "bg-primary text-white shadow-md"
                  : "text-foreground hover:bg-slate-100"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="text-sm font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>
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
          onClick={signOut}
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
              <img src={confixLogo} alt="Confix Envios" className="h-6" />
            </div>
            <span className="text-sm text-white/90 truncate max-w-[180px]">Bem vindo, {getDisplayName()}</span>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex sticky top-0 z-40 bg-white border-b shadow-sm h-14 items-center px-6">
          <div className="flex items-center gap-3">
            <Truck className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Painel Cliente</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default ClientLayout;