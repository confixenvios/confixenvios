import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, ArrowLeft, Mail, Lock, Settings, BarChart3, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import confixLogo from '@/assets/confix-logo-black.png';

const AdminAuth = () => {
  const navigate = useNavigate();
  const { signIn, user, loading, userRole, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !loading && userRole !== null) {
      console.log('AdminAuth - Checking redirect:', { isAdmin, userRole });
      if (isAdmin) {
        console.log('AdminAuth - Redirecting to admin dashboard');
        navigate('/admin/dashboard', { replace: true });
      } else {
        console.log('AdminAuth - User is not admin, redirecting to client area');
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão de administrador",
          variant: "destructive"
        });
        navigate('/cliente/dashboard', { replace: true });
      }
    }
  }, [user, loading, userRole, isAdmin, navigate, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!loginData.email || !loginData.password) {
      setError('Preencha todos os campos');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await signIn(loginData.email, loginData.password);
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos');
        } else if (error.message.includes('Email not confirmed')) {
          setError('⚠️ Email não confirmado. Verifique sua caixa de entrada e clique no link de confirmação antes de fazer login.');
        } else {
          setError(error.message);
        }
        setIsLoading(false);
      } else {
        toast({
          title: "Login administrativo realizado com sucesso!",
          description: "Redirecionando para o painel admin...",
        });
        // Wait for user role to be loaded, then redirect
        // useEffect will handle the actual redirect
      }
    } catch (error: any) {
      setError('Erro inesperado. Tente novamente.');
      setIsLoading(false);
    }
  };

  const handleBackToSite = () => {
    navigate('/cotacao');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-red-700 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-white/80">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary to-red-700 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/4 w-32 h-32 border border-white/10 rounded-2xl rotate-45" />
          <div className="absolute bottom-1/3 right-1/4 w-24 h-24 border border-white/10 rounded-full" />
          {/* Grid pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          <div className="bg-white rounded-xl p-4 mb-8 shadow-lg">
            <img src={confixLogo} alt="Confix Envios" className="h-16" />
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">Painel Administrativo</h1>
            <p className="text-white/80 text-lg max-w-md">
              Controle total sobre operações, clientes e relatórios do sistema
            </p>
          </div>
          <div className="mt-12 flex items-center gap-8 text-white/60">
            <div className="text-center">
              <Users className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Usuários</p>
            </div>
            <div className="text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Relatórios</p>
            </div>
            <div className="text-center">
              <Settings className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Configurações</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-white">
        <div className="w-full max-w-md">
          <div className="flex gap-2 mb-6">
            <Link 
              to="/auth"
              className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Login Cliente
            </Link>
            <span className="text-muted-foreground">|</span>
            <button 
              onClick={handleBackToSite}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Voltar ao Site
            </button>
          </div>
          
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-6">
            <img src={confixLogo} alt="Confix Envios" className="h-12" />
          </div>
          
          <Card className="border-0 shadow-xl overflow-hidden">
            {/* Red accent bar at top */}
            <div className="h-1.5 bg-gradient-to-r from-primary to-red-600" />
            <CardHeader className="text-center pb-4 pt-6">
              <div className="flex justify-center mb-3">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-primary">Acesso Administrativo</CardTitle>
              <CardDescription>
                Login exclusivo para administradores do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email Administrativo</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@confix.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData(prev => ({
                        ...prev,
                        email: e.target.value
                      }))}
                      disabled={isLoading}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="admin-password"
                      type="password"
                      placeholder="Sua senha administrativa"
                      value={loginData.password}
                      onChange={(e) => setLoginData(prev => ({
                        ...prev,
                        password: e.target.value
                      }))}
                      disabled={isLoading}
                      className="pl-10"
                    />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-primary to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-primary/20" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  Entrar como Admin
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <div className="text-center mt-4">
            <p className="text-xs text-muted-foreground">
              Área restrita para administradores autorizados
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAuth;
