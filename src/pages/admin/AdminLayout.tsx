import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  LogOut,
  Menu,
  Shield,
  FileText,
  DollarSign,
  Building2,
  BarChart3,
  Search,
  ChevronDown,
  Zap,
  Globe
} from "lucide-react";
import { NavLink, useLocation } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import confixLogo from '@/assets/confix-logo-black.png';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [remessasOpen, setRemessasOpen] = useState(
    location.pathname.includes('/admin/remessas')
  );

  const getDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.first_name) {
      return profile.first_name;
    }
    return user?.email?.split('@')[0] || 'Admin';
  };

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Filiais', href: '/admin/filiais', icon: Building2 },
  ];

  const remessasSubItems = [
    { name: 'Expresso', href: '/admin/remessas-expresso', icon: Zap },
    { name: 'Nacional', href: '/admin/remessas', icon: Globe },
  ];

  const navigationAfterRemessas = [
    { name: 'Rastreamento', href: '/admin/rastreamento', icon: Search },
    { name: 'Cadastros', href: '/admin/cadastros', icon: Users },
    { name: 'CTe', href: '/admin/cte', icon: FileText },
    { name: 'Faturamento', href: '/admin/faturamento', icon: DollarSign },
    { name: 'Relatórios', href: '/admin/relatorios', icon: BarChart3 },
  ];

  const isActive = (path: string) => {
    if (path === '/admin/dashboard') {
      return location.pathname === '/admin/dashboard' || location.pathname === '/admin';
    }
    if (path === '/admin/remessas') {
      return location.pathname === '/admin/remessas';
    }
    return location.pathname.startsWith(path);
  };

  const isRemessasActive = remessasSubItems.some(item => isActive(item.href));

  const NavItem = ({ item, onClick }: { item: { name: string; href: string; icon: React.ElementType }; onClick?: () => void }) => (
    <NavLink
      to={item.href}
      onClick={onClick}
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
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header do Sidebar com Banner */}
      <div className="p-4 bg-gradient-to-r from-primary via-primary to-red-700">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg p-1">
            <img src={confixLogo} alt="Confix Envios" className="h-5" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-xs text-white/80 font-medium">Confix Admin</span>
          <p className="text-sm text-white font-medium truncate">Bem vindo, {getDisplayName()}</p>
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 py-4 px-3 overflow-y-auto">
        <p className="text-xs font-medium text-muted-foreground mb-3 px-2">Menu</p>
        <nav className="space-y-1">
          {navigation.map((item) => (
            <NavItem key={item.name} item={item} onClick={() => setMenuOpen(false)} />
          ))}

          {/* Remessas Collapsible */}
          <Collapsible open={remessasOpen} onOpenChange={setRemessasOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-all",
                  isRemessasActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-slate-100"
                )}
              >
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4" />
                  <span className="text-sm font-medium">Remessas</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", remessasOpen && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 mt-1 space-y-1">
              {remessasSubItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm",
                    isActive(item.href)
                      ? "bg-primary text-white shadow-md"
                      : "text-foreground hover:bg-slate-100"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="font-medium">{item.name}</span>
                </NavLink>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {navigationAfterRemessas.map((item) => (
            <NavItem key={item.name} item={item} onClick={() => setMenuOpen(false)} />
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
          onClick={() => signOut('/admin/auth')}
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
              <div className="bg-white rounded-lg p-1">
                <img src={confixLogo} alt="Confix Envios" className="h-5" />
              </div>
            </div>
            <span className="text-sm text-white/90 truncate max-w-[180px]">Bem vindo, {getDisplayName()}</span>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex sticky top-0 z-40 bg-white border-b shadow-sm h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Painel Administrativo</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{getDisplayName()}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut('/admin/auth')}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
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

export default AdminLayout;