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
import logoConfixEnvios from '@/assets/logo-confix-envios.png';

const Header = () => {
  const { user, loading, signOut, isAdmin, refreshUserData } = useAuth();

  return (
    <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 group">
            <img 
              src={logoConfixEnvios} 
              alt="Confix Envios" 
              className="h-12 sm:h-16 md:h-20 w-auto group-hover:scale-105 transition-transform duration-200"
            />
          </Link>
          
          <nav className="flex items-center space-x-2 sm:space-x-6">
            <Link 
              to="#quemsomos" 
              className="text-muted-foreground hover:text-foreground transition-colors font-medium text-base sm:text-lg hidden md:block"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('quemsomos')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Quem Somos
            </Link>
            <Link 
              to="#servicos" 
              className="text-muted-foreground hover:text-foreground transition-colors font-medium text-base sm:text-lg hidden md:block"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('servicos')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Nossos Serviços
            </Link>
            <Link 
              to="#diferencial" 
              className="text-muted-foreground hover:text-foreground transition-colors font-medium text-base sm:text-lg hidden lg:block"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('diferencial')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Nosso Diferencial
            </Link>
            <Link 
              to="#contato" 
              className="text-muted-foreground hover:text-foreground transition-colors font-medium text-base sm:text-lg hidden lg:block"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Fale com a gente
            </Link>
            
            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center space-x-2 sm:space-x-4">
                    <span className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                      Olá, {user.email}
                    </span>
                    {isAdmin && (
                      <Badge variant="secondary" className="hidden sm:flex text-xs">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin
                      </Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm px-2 sm:px-3">
                          <Avatar className="w-5 h-5 sm:w-6 sm:h-6">
                            <AvatarFallback className="text-xs">
                              {user.email?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="hidden sm:inline">Minha Conta</span>
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
                  <Button asChild size="sm" className="text-xs sm:text-sm px-3 sm:px-4">
                    <Link to="/auth">
                      <LogIn className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span>Entrar</span>
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