import { Package, User, LogIn, Building2, Truck, Menu, X } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { LayoutDashboard, Shield, RefreshCw, LogOut } from 'lucide-react';
import logoConfixEnvios from '@/assets/confix-logo-black.png';

const Header = () => {
  const { user, loading, signOut, isAdmin, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '#servicos', label: 'Serviços' },
    { href: '#diferencial', label: 'Diferencial' },
    { href: '#quemsomos', label: 'Sobre' },
    { href: '#contato', label: 'Contato' },
  ];

  const handleNavClick = (href: string) => {
    const id = href.replace('#', '');
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <header className="border-b border-border bg-white fixed top-0 left-0 right-0 z-50 shadow-sm">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between">
          {/* Mobile Menu Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="mr-2">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <nav className="flex flex-col gap-4 mt-8">
                {navLinks.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => handleNavClick(link.href)}
                    className="text-left text-lg font-medium hover:text-primary transition-colors py-2"
                  >
                    {link.label}
                  </button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <Link 
            to="/" 
            className="flex items-center space-x-2 group"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <img 
              src={logoConfixEnvios} 
              alt="Confix Envios" 
              className="h-10 sm:h-12 md:h-14 w-auto group-hover:scale-105 transition-transform duration-200"
            />
          </Link>
          
          <nav className="hidden md:flex items-center justify-center flex-1 space-x-8">
            <Link 
              to="#servicos" 
              className="relative text-lg font-normal transition-colors hover:text-primary after:content-[''] after:absolute after:w-full after:scale-x-0 after:h-0.5 after:bottom-[-4px] after:left-0 after:bg-primary after:origin-bottom-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left"
              style={{ fontFamily: 'Arial, sans-serif', color: '#000000' }}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('servicos')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Serviços
            </Link>
            <Link 
              to="#diferencial" 
              className="relative text-lg font-normal transition-colors hover:text-primary after:content-[''] after:absolute after:w-full after:scale-x-0 after:h-0.5 after:bottom-[-4px] after:left-0 after:bg-primary after:origin-bottom-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left"
              style={{ fontFamily: 'Arial, sans-serif', color: '#000000' }}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('diferencial')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Diferencial
            </Link>
            <Link 
              to="#quemsomos" 
              className="relative text-lg font-normal transition-colors hover:text-primary after:content-[''] after:absolute after:w-full after:scale-x-0 after:h-0.5 after:bottom-[-4px] after:left-0 after:bg-primary after:origin-bottom-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left"
              style={{ fontFamily: 'Arial, sans-serif', color: '#000000' }}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('quemsomos')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Sobre
            </Link>
            <Link 
              to="#contato" 
              className="relative text-lg font-normal transition-colors hover:text-primary after:content-[''] after:absolute after:w-full after:scale-x-0 after:h-0.5 after:bottom-[-4px] after:left-0 after:bg-primary after:origin-bottom-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left"
              style={{ fontFamily: 'Arial, sans-serif', color: '#000000' }}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Contato
            </Link>
          </nav>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            
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
                          <Link to="/painel" className="flex items-center">
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
                        <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
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
          </div>
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
              <div className="font-semibold text-lg">Cliente</div>
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
              <div className="font-semibold text-lg">Motorista</div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Header;