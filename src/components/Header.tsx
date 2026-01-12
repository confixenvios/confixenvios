import { User, LogIn, Truck, Menu, Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
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
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const highlightClass = 'bg-yellow-300 text-black';
  const currentHighlightClass = 'bg-orange-400 text-black';

  // Detect scroll for header background effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Clear highlights when search closes
  useEffect(() => {
    if (!searchOpen) {
      clearHighlights();
      setSearchQuery('');
      setMatchCount(0);
      setCurrentMatch(0);
    }
  }, [searchOpen]);

  const clearHighlights = useCallback(() => {
    const marks = document.querySelectorAll('mark[data-search-highlight]');
    marks.forEach(mark => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
        parent.normalize();
      }
    });
  }, []);

  const highlightText = useCallback((query: string) => {
    clearHighlights();
    
    if (!query.trim()) {
      setMatchCount(0);
      setCurrentMatch(0);
      return;
    }

    const walker = document.createTreeWalker(
      document.querySelector('main') || document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip script, style, header, and already highlighted elements
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tagName = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'mark', 'input', 'textarea'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (parent.closest('header')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const matches: { node: Text; index: number }[] = [];
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const textNode = node as Text;
      const text = textNode.textContent || '';
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({ node: textNode, index: match.index });
      }
    }

    // Highlight matches in reverse order to preserve indices
    const processedNodes = new Set<Text>();
    matches.reverse().forEach((match, reverseIndex) => {
      if (processedNodes.has(match.node)) return;
      
      const textNode = match.node;
      const text = textNode.textContent || '';
      const parent = textNode.parentNode;
      if (!parent) return;

      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      let localRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      let localMatch;
      
      while ((localMatch = localRegex.exec(text)) !== null) {
        if (localMatch.index > lastIndex) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex, localMatch.index)));
        }
        const mark = document.createElement('mark');
        mark.setAttribute('data-search-highlight', 'true');
        mark.className = highlightClass;
        mark.textContent = localMatch[0];
        fragment.appendChild(mark);
        lastIndex = localRegex.lastIndex;
      }
      
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }
      
      parent.replaceChild(fragment, textNode);
      processedNodes.add(textNode);
    });

    const allMarks = document.querySelectorAll('mark[data-search-highlight]');
    setMatchCount(allMarks.length);
    
    if (allMarks.length > 0) {
      setCurrentMatch(1);
      updateCurrentHighlight(1, allMarks);
    } else {
      setCurrentMatch(0);
    }
  }, [clearHighlights, highlightClass]);

  const updateCurrentHighlight = (index: number, marks?: NodeListOf<Element>) => {
    const allMarks = marks || document.querySelectorAll('mark[data-search-highlight]');
    allMarks.forEach((mark, i) => {
      if (i === index - 1) {
        mark.className = currentHighlightClass;
        mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        mark.className = highlightClass;
      }
    });
  };

  const goToNextMatch = () => {
    if (matchCount === 0) return;
    const next = currentMatch >= matchCount ? 1 : currentMatch + 1;
    setCurrentMatch(next);
    updateCurrentHighlight(next);
  };

  const goToPrevMatch = () => {
    if (matchCount === 0) return;
    const prev = currentMatch <= 1 ? matchCount : currentMatch - 1;
    setCurrentMatch(prev);
    updateCurrentHighlight(prev);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    highlightText(value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        goToPrevMatch();
      } else {
        goToNextMatch();
      }
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  };

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

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-border/50' 
          : 'bg-white shadow-sm border-b border-border'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 md:h-20">
          
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center group flex-shrink-0"
            onClick={handleLogoClick}
          >
            <img 
              src={logoConfixEnvios} 
              alt="Confix Envios" 
              className="h-10 sm:h-11 md:h-12 w-auto transition-transform duration-300 group-hover:scale-105"
            />
          </Link>

          {/* Desktop Navigation - Centered */}
          <nav className="hidden md:flex items-center justify-center flex-1 px-8">
            <div className="flex items-center space-x-2 lg:space-x-3">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className="relative px-4 py-2 text-[15px] font-medium text-foreground/80 hover:text-primary transition-colors duration-200 rounded-lg hover:bg-primary/5 group"
                >
                  {link.label}
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-1/2 rounded-full" />
                </button>
              ))}
            </div>
          </nav>
          
          {/* Right Section - Auth */}
          <div className="flex items-center space-x-3">
            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 pt-12">
                <div className="flex items-center mb-8">
                  <img 
                    src={logoConfixEnvios} 
                    alt="Confix Envios" 
                    className="h-10 w-auto"
                  />
                </div>
                <nav className="flex flex-col gap-2">
                  {navLinks.map((link) => (
                    <button
                      key={link.href}
                      onClick={() => handleNavClick(link.href)}
                      className="text-left text-base font-medium text-foreground/80 hover:text-primary hover:bg-primary/5 transition-all duration-200 py-3 px-4 rounded-lg"
                    >
                      {link.label}
                    </button>
                  ))}
                </nav>
                <div className="mt-8 pt-8 border-t border-border">
                  {!user && (
                    <Button 
                      className="w-full justify-center"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setLoginModalOpen(true);
                      }}
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      Entrar
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-muted-foreground hidden lg:block max-w-32 truncate">
                      {user.email}
                    </span>
                    {isAdmin && (
                      <Badge variant="secondary" className="hidden sm:flex text-xs bg-primary/10 text-primary border-0">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin
                      </Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="flex items-center space-x-2 h-10 px-3 hover:bg-primary/5 border border-border/50"
                        >
                          <Avatar className="w-7 h-7">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                              {user.email?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="hidden sm:inline text-sm font-medium">Conta</span>
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
                  <div className="flex items-center space-x-2">
                    {searchOpen ? (
                      <div className="flex items-center space-x-1 bg-background border border-border rounded-lg px-2 py-1 shadow-lg animate-in fade-in slide-in-from-right-2 duration-200">
                        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <Input
                          ref={searchInputRef}
                          type="text"
                          placeholder="Buscar na página..."
                          value={searchQuery}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          onKeyDown={handleSearchKeyDown}
                          className="h-8 w-40 sm:w-48 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                        />
                        {matchCount > 0 && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap px-1">
                            {currentMatch}/{matchCount}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={goToPrevMatch}
                          disabled={matchCount === 0}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={goToNextMatch}
                          disabled={matchCount === 0}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setSearchOpen(false)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="ghost"
                        size="icon"
                        className="hidden sm:flex h-10 w-10 text-foreground/70 hover:text-primary hover:bg-primary/5"
                        onClick={() => setSearchOpen(true)}
                      >
                        <Search className="h-5 w-5" />
                      </Button>
                    )}
                    <Button 
                      className="hidden sm:flex h-10 px-5 bg-primary text-primary-foreground hover:bg-primary font-semibold rounded-md"
                      onClick={() => setLoginModalOpen(true)}
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      Entrar
                    </Button>
                  </div>
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