import { Package, User, LogIn, Building2, Truck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LayoutDashboard, Shield, RefreshCw, LogOut } from 'lucide-react';
import logoConfixEnvios from '@/assets/confix-logo-black.png';

const Header = () => {
  const { user, loading, signOut, isAdmin, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  return (
    <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 group">
            <img 
              src={logoConfixEnvios} 
              alt="Confix Envios" 
              className="h-16 sm:h-20 md:h-24 w-auto group-hover:scale-105 transition-transform duration-200"
            />
          </Link>
          
          <nav className="flex items-center space-x-2 sm:space-x-6">
            <Link 
              to="#quemsomos" 
              className="text-muted-foreground hover:text-foreground transition-colors font-medium text-lg sm:text-xl hidden md:block"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('quemsomos')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Quem Somos
            </Link>
            <Link 
              to="#servicos" 
              className="text-muted-foreground hover:text-foreground transition-colors font-medium text-lg sm:text-xl hidden md:block"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('servicos')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Nossos Serviços
            </Link>
            <Link 
              to="#diferencial" 
              className="text-muted-foreground hover:text-foreground transition-colors font-medium text-lg sm:text-xl hidden lg:block"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('diferencial')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Nosso Diferencial
            </Link>
            <Link 
              to="#contato" 
              className="text-muted-foreground hover:text-foreground transition-colors font-medium text-lg sm:text-xl hidden lg:block"
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
                  <Button 
                    size="sm" 
                    className="text-xs sm:text-sm px-3 sm:px-4"
                    onClick={() => setLoginModalOpen(true)}
                  >
                    <LogIn className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span>Entrar</span>
                  </Button>
                )}
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Modal de Escolha de Login */}
      <Dialog open={loginModalOpen} onOpenChange={setLoginModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">Escolha o tipo de acesso</DialogTitle>
            <DialogDescription className="text-center">
              Selecione como deseja entrar no sistema
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button
              size="lg"
              className="h-auto py-6 flex flex-col gap-2"
              onClick={() => {
                setLoginModalOpen(false);
                navigate('/auth');
              }}
            >
              <User className="h-8 w-8" />
              <div className="text-center">
                <div className="font-semibold text-lg">Login Normal</div>
                <div className="text-xs opacity-90">Acesso para clientes e usuários gerais</div>
              </div>
            </Button>

            <Button
              size="lg"
              className="h-auto py-6 flex flex-col gap-2"
              onClick={() => {
                setLoginModalOpen(false);
                navigate('/b2b-expresso');
              }}
            >
              <Building2 className="h-8 w-8" />
              <div className="text-center">
                <div className="font-semibold text-lg">B2B Expresso</div>
                <div className="text-xs opacity-90">Acesso exclusivo para clientes B2B</div>
              </div>
            </Button>

            <Button
              size="lg"
              className="h-auto py-6 flex flex-col gap-2"
              onClick={() => {
                setLoginModalOpen(false);
                navigate('/motorista');
              }}
            >
              <Truck className="h-8 w-8" />
              <div className="text-center">
                <div className="font-semibold text-lg">Motorista</div>
                <div className="text-xs opacity-90">Acesso exclusivo para motoristas</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Header;