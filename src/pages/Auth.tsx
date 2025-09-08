import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, LogIn, UserPlus, ArrowLeft, Mail, Key, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import logoConfixEnvios from '@/assets/logo-confix-envios.png';
import { formatDocument, validateDocument } from "@/utils/documentValidation";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isResetMode = searchParams.get('reset') === 'true';
  const { signIn, signUp, resetPassword, user, loading, userRole, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
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
    phone: '',
    document: ''
  });

  // Reset password form
  const [resetEmail, setResetEmail] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !loading) {
      console.log('User authenticated:', !!user, 'Loading:', loading, 'UserRole:', userRole);
      // Redirect immediately after authentication, don't wait for user role
      navigate('/cliente/dashboard');
    }
  }, [user, loading, navigate]);

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
          title: "Login realizado com sucesso!",
          description: "Redirecionando...",
        });
      }
    } catch (error: any) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!resetEmail) {
      setError('Digite seu email');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await resetPassword(resetEmail);
      
      if (error) {
        setError('Erro ao enviar email de redefinição: ' + error.message);
      } else {
        toast({
          title: "Email enviado!",
          description: "Verifique sua caixa de entrada para redefinir sua senha.",
        });
        setShowForgotPassword(false);
        setResetEmail('');
      }
    } catch (error: any) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!signupData.email || !signupData.password || !signupData.confirmPassword || !signupData.phone || !signupData.document) {
      setError('Preencha todos os campos obrigatórios');
      setIsLoading(false);
      return;
    }

    // Validate document (CPF/CNPJ)
    const documentValidation = validateDocument(signupData.document);
    if (!documentValidation.isValid) {
      setError('CPF ou CNPJ inválido');
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
        signupData.lastName,
        signupData.phone,
        signupData.document
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
          title: "🎉 Conta criada com sucesso!",  
          description: "Verifique seu email para confirmar sua conta e depois faça login.",
        });
        // Clear form
        setSignupData({
          email: '',
          password: '',
          confirmPassword: '',
          firstName: '',
          lastName: '',
          phone: '',
          document: ''
        });
        setError('');
      } else {
        // Auto-login successful (email confirmation disabled)
        toast({
          title: "Conta criada e login realizado!",
          description: "Redirecionando...",
        });
        // Will redirect automatically due to useEffect
      }
    } catch (error: any) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
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
        <Button 
          variant="ghost" 
          onClick={handleBack}
          className="mb-6 hover:bg-background/80"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img 
                src={logoConfixEnvios} 
                alt="Confix Envios" 
                className="h-24 w-auto"
              />
            </div>
            <CardTitle className="text-2xl font-bold">Cliente</CardTitle>
            <CardDescription>
              Faça login ou crie sua conta de cliente para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">
                  <LogIn className="h-4 w-4 mr-2" />
                  Login
                </TabsTrigger>
                <TabsTrigger value="signup">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Cadastro
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
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
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
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

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => setShowForgotPassword(true)}
                      className="p-0 h-auto text-sm text-primary"
                    >
                      Esqueci minha senha
                    </Button>
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
              
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-firstname">Nome</Label>
                      <Input
                        id="signup-firstname"
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
                      <Label htmlFor="signup-lastname">Sobrenome</Label>
                      <Input
                        id="signup-lastname"
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
                    <Label htmlFor="signup-phone">WhatsApp *</Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={signupData.phone}
                      onChange={(e) => setSignupData(prev => ({
                        ...prev,
                        phone: e.target.value
                      }))}
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-document" className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      CPF ou CNPJ *
                    </Label>
                    <Input
                      id="signup-document"
                      type="text"
                      placeholder="000.000.000-00 ou 00.000.000/0000-00"
                      value={signupData.document}
                      onChange={(e) => {
                        const formattedValue = formatDocument(e.target.value);
                        setSignupData(prev => ({
                          ...prev,
                          document: formattedValue
                        }));
                      }}
                      disabled={isLoading}
                      maxLength={18}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email *</Label>
                    <Input
                      id="signup-email"
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
                    <Label htmlFor="signup-password">Senha *</Label>
                    <Input
                      id="signup-password"
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
                    <Label htmlFor="signup-confirm">Confirmar Senha *</Label>
                    <Input
                      id="signup-confirm"
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
                    Criar Conta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Forgot Password Modal */}
            {showForgotPassword && (
              <div className="mt-6 p-4 border border-border rounded-lg bg-accent/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Mail className="w-5 h-5 mr-2 text-primary" />
                    Redefinir Senha
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmail('');
                      setError('');
                    }}
                  >
                    ✕
                  </Button>
                </div>
                
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="Digite seu email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Enviaremos um link para redefinir sua senha no email informado.
                  </p>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    Enviar Link de Redefinição
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;