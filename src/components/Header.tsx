import { Package, User, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { LayoutDashboard, Shield, RefreshCw, LogOut } from 'lucide-react';

const Header = () => {
  const { user, loading, signOut, isAdmin, refreshUserData } = useAuth();

  return (
    <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/cotacao" className="flex items-center space-x-2 group">
            <div className="relative">
              <Package className="h-8 w-8 text-primary group-hover:scale-110 transition-transform duration-200" />
              <div className="absolute inset-0 bg-primary rounded-full blur-xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
            </div>
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Confix Envios
            </span>
          </Link>
          
          <nav className="flex items-center space-x-6">
            <Link 
              to="/cotacao" 
              className="text-muted-foreground hover:text-foreground transition-colors font-medium hidden md:block"
            >
              Cotação
            </Link>
            <Link 
              to="/rastreio" 
              className="text-muted-foreground hover:text-foreground transition-colors font-medium hidden md:block"
            >
              Rastreio
            </Link>
            
            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-muted-foreground hidden md:block">
                      Olá, {user.email}
                    </span>
                    {isAdmin && (
                      <Badge variant="secondary" className="hidden md:flex">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin
                      </Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="flex items-center space-x-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs">
                              {user.email?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="hidden md:inline">Minha Conta</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem asChild>
                          <Link to="/cliente/dashboard" className="flex items-center">
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            Dashboard
                          </Link>
                        </DropdownMenuItem>
                        {isAdmin && (
                          <DropdownMenuItem asChild>
                            <Link to="/admin/dashboard" className="flex items-center">
                              <Shield className="mr-2 h-4 w-4" />
                              Admin
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={refreshUserData} className="flex items-center">
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Atualizar Dados
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={signOut} className="text-destructive">
                          <LogOut className="mr-2 h-4 w-4" />
                          Sair
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : (
                  <Button asChild>
                    <Link to="/auth">
                      <LogIn className="h-4 w-4 mr-2" />
                      Entrar
                    </Link>
                  </Button>
                )}
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;