import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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
    if (user && !loading) {
      if (userRole !== null) {
        if (isAdmin) {
          navigate('/admin/dashboard');
        } else {
          // Non-admin users should go to client area
          navigate('/cliente/dashboard');
        }
      }
    }
  }, [user, loading, userRole, isAdmin, navigate]);

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
      } else {
        toast({
          title: "Login administrativo realizado com sucesso!",
          description: "Redirecionando para o painel admin...",
        });
      }
    } catch (error: any) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToClient = () => {
    navigate('/auth');
  };

  const handleBackToSite = () => {
    navigate('/cotacao');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background/80 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex gap-2 mb-6">
          <Button 
            variant="ghost" 
            onClick={handleBackToClient}
            className="hover:bg-background/80"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Login Cliente
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleBackToSite}
            className="hover:bg-background/80"
          >
            Voltar ao Site
          </Button>
        </div>
        
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold flex items-center justify-center">
              <Shield className="h-6 w-6 mr-2 text-primary" />
              Acesso Administrativo
            </CardTitle>
            <CardDescription>
              Login exclusivo para administradores do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email Administrativo</Label>
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
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="admin-password">Senha</Label>
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
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full" 
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
  );
};

export default AdminAuth;