import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const AuthModal = ({ open, onOpenChange, onSuccess }: AuthModalProps) => {
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('login');
  
  // Login form
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  
  // Signup form
  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: ''
  });

  const resetForms = () => {
    setLoginData({ email: '', password: '' });
    setSignupData({
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      phone: ''
    });
    setError('');
    setIsLoading(false);
  };

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
          setError('Confirme seu email antes de fazer login. Verifique sua caixa de entrada.');
        } else if (error.message.includes('Too many requests')) {
          setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
        } else {
          setError(`Erro ao fazer login: ${error.message}`);
        }
        console.error('Login error:', error);
      } else {
        toast({
          title: "Login realizado com sucesso!",
          description: "Continuando o processo...",
        });
        resetForms();
        onOpenChange(false);
        // Wait a bit for auth state to settle
        setTimeout(() => {
          onSuccess?.();
        }, 1000);
      }
    } catch (error: any) {
      console.error('Unexpected login error:', error);
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!signupData.email || !signupData.password || !signupData.confirmPassword || !signupData.firstName) {
      setError('Preencha todos os campos obrigatórios');
      setIsLoading(false);
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      setError('As senhas não coincidem');
      setIsLoading(false);
      return;
    }

    if (signupData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      setIsLoading(false);
      return;
    }

    try {
      const result = await signUp(
        signupData.email,
        signupData.password,
        signupData.firstName,
        signupData.lastName
      );
      
      if (result.error) {
        if (result.error.message.includes('User already registered')) {
          setError('Este email já está cadastrado. Tente fazer login.');
        } else if (result.error.message.includes('Unable to validate email address')) {
          setError('Email inválido. Verifique o formato do email.');
        } else if (result.error.message.includes('Password should be at least')) {
          setError('A senha deve ter pelo menos 6 caracteres');
        } else {
          setError(`Erro ao criar conta: ${result.error.message}`);
        }
        console.error('Signup error:', result.error);
      } else if (result.needsConfirmation) {
        toast({
          title: "Conta criada!",
          description: "Verifique seu email para confirmar a conta antes de fazer login.",
          variant: "default"
        });
        resetForms();
        onOpenChange(false);
        // Switch to login tab
        setActiveTab('login');
      } else {
        // Auto-login successful
        toast({
          title: "Conta criada e login realizado!",
          description: "Você foi logado automaticamente. Continuando...",
        });
        resetForms();
        onOpenChange(false);
        // Wait a bit for auth state to settle
        setTimeout(() => {
          onSuccess?.();
        }, 1000);
      }
    } catch (error: any) {
      console.error('Unexpected signup error:', error);
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForms();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold">Login Necessário</DialogTitle>
          <DialogDescription>
            Faça login ou crie sua conta para continuar com o envio
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">
              <LogIn className="h-4 w-4 mr-2" />
              Entrar
            </TabsTrigger>
            <TabsTrigger value="signup">
              <UserPlus className="h-4 w-4 mr-2" />
              Criar conta
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="space-y-4 mt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="modal-login-email">E-mail</Label>
                <Input
                  id="modal-login-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={loginData.email}
                  onChange={(e) => setLoginData(prev => ({
                    ...prev,
                    email: e.target.value
                  }))}
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="modal-login-password">Senha</Label>
                <Input
                  id="modal-login-password"
                  type="password"
                  placeholder="Sua senha"
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
                  <LogIn className="h-4 w-4 mr-2" />
                )}
                Entrar
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="signup" className="space-y-4 mt-6">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="modal-signup-firstname">Nome *</Label>
                  <Input
                    id="modal-signup-firstname"
                    placeholder="Seu nome"
                    value={signupData.firstName}
                    onChange={(e) => setSignupData(prev => ({
                      ...prev,
                      firstName: e.target.value
                    }))}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modal-signup-lastname">Sobrenome</Label>
                  <Input
                    id="modal-signup-lastname"
                    placeholder="Seu sobrenome"
                    value={signupData.lastName}
                    onChange={(e) => setSignupData(prev => ({
                      ...prev,
                      lastName: e.target.value
                    }))}
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="modal-signup-email">E-mail *</Label>
                <Input
                  id="modal-signup-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={signupData.email}
                  onChange={(e) => setSignupData(prev => ({
                    ...prev,
                    email: e.target.value
                  }))}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modal-signup-phone">Telefone</Label>
                <Input
                  id="modal-signup-phone"
                  type="tel"
                  placeholder="(XX) XXXXX-XXXX"
                  value={signupData.phone}
                  onChange={(e) => setSignupData(prev => ({
                    ...prev,
                    phone: e.target.value
                  }))}
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="modal-signup-password">Senha *</Label>
                <Input
                  id="modal-signup-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={signupData.password}
                  onChange={(e) => setSignupData(prev => ({
                    ...prev,
                    password: e.target.value
                  }))}
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="modal-signup-confirm">Confirmar Senha *</Label>
                <Input
                  id="modal-signup-confirm"
                  type="password"
                  placeholder="Repita sua senha"
                  value={signupData.confirmPassword}
                  onChange={(e) => setSignupData(prev => ({
                    ...prev,
                    confirmPassword: e.target.value
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
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Cadastrar
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;