import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, LogIn, UserPlus, ArrowLeft, Mail, FileText, Building, User, Package, Truck, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import logoConfixEnvios from '@/assets/confix-logo-black.png';
import { formatDocument, validateDocument, getDocumentType } from "@/utils/documentValidation";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";

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
    document: '',
    documentType: '' as 'CPF' | 'CNPJ' | '',
    inscricaoEstadual: '',
    isIsento: false
  });

  // Reset password form
  const [resetEmail, setResetEmail] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !loading) {
      console.log('User authenticated:', !!user, 'Loading:', loading, 'UserRole:', userRole);
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

    if (!signupData.email || !signupData.password || !signupData.confirmPassword || !signupData.phone || !signupData.document || !signupData.documentType) {
      setError('Preencha todos os campos obrigatórios');
      setIsLoading(false);
      return;
    }

    if (signupData.documentType === 'CNPJ' && !signupData.isIsento && !signupData.inscricaoEstadual.trim()) {
      setError('Inscrição Estadual é obrigatória para CNPJ');
      setIsLoading(false);
      return;
    }

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
        signupData.document,
        signupData.inscricaoEstadual || 'ISENTO'
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
        setSignupData({
          email: '',
          password: '',
          confirmPassword: '',
          firstName: '',
          lastName: '',
          phone: '',
          document: '',
          documentType: '',
          inscricaoEstadual: '',
          isIsento: false
        });
        setError('');
      } else {
        toast({
          title: "Conta criada e login realizado!",
          description: "Redirecionando...",
        });
      }
    } catch (error: any) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
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
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary to-red-700 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/4 w-32 h-32 border border-white/10 rounded-2xl rotate-45" />
          <div className="absolute bottom-1/3 right-1/4 w-24 h-24 border border-white/10 rounded-full" />
          {/* Transport pattern lines */}
          <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          <div className="bg-white rounded-xl p-4 mb-8 shadow-lg">
            <img src={logoConfixEnvios} alt="Confix Envios" className="h-16" />
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">Área do Cliente</h1>
            <p className="text-white/80 text-lg max-w-md">
              Envie suas encomendas com rapidez e segurança para todo o Brasil
            </p>
          </div>
          <div className="mt-12 flex items-center gap-8 text-white/60">
            <div className="text-center">
              <Truck className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Entregas Rápidas</p>
            </div>
            <div className="text-center">
              <Package className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Rastreamento</p>
            </div>
            <div className="text-center">
              <Shield className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Segurança</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-white overflow-y-auto">
        <div className="w-full max-w-md">
          <Link 
            to="/" 
            className="inline-flex items-center text-muted-foreground hover:text-primary mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao site
          </Link>
          
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-6">
            <img src={logoConfixEnvios} alt="Confix Envios" className="h-12" />
          </div>
          
          <Card className="border-0 shadow-xl overflow-hidden">
            {/* Red accent bar at top */}
            <div className="h-1.5 bg-gradient-to-r from-primary to-red-600" />
            <CardHeader className="space-y-1 text-center pb-4 pt-6">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
                <User className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl text-primary">Área do Cliente</CardTitle>
              <CardDescription>
                Faça login ou crie sua conta para continuar
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
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                          className="pl-10"
                        />
                      </div>
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
                      className="w-full bg-gradient-to-r from-primary to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-primary/20" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Entrando...
                        </>
                      ) : (
                        'Entrar'
                      )}
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
                      <PhoneInput
                        value={signupData.phone}
                        onChange={(e) => setSignupData(prev => ({
                          ...prev,
                          phone: e.target.value
                        }))}
                        placeholder="(11) 99999-9999"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-document-type">Tipo de Documento *</Label>
                      <Select
                        value={signupData.documentType}
                        onValueChange={(value: 'CPF' | 'CNPJ') => {
                          setSignupData(prev => ({
                            ...prev,
                            documentType: value,
                            document: '',
                            inscricaoEstadual: '',
                            isIsento: false
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de documento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CPF">
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-2" />
                              CPF - Pessoa Física
                            </div>
                          </SelectItem>
                          <SelectItem value="CNPJ">
                            <div className="flex items-center">
                              <Building className="h-4 w-4 mr-2" />
                              CNPJ - Pessoa Jurídica
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {signupData.documentType && (
                      <div className="space-y-2">
                        <Label htmlFor="signup-document" className="flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          {signupData.documentType === 'CPF' ? 'CPF' : 'CNPJ'} *
                        </Label>
                        <Input
                          id="signup-document"
                          type="text"
                          placeholder={signupData.documentType === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
                          value={signupData.document}
                          onChange={(e) => {
                            const formattedValue = formatDocument(e.target.value);
                            const docType = getDocumentType(formattedValue);
                            setSignupData(prev => ({
                              ...prev,
                              document: formattedValue,
                              documentType: docType || prev.documentType
                            }));
                          }}
                          disabled={isLoading}
                          maxLength={18}
                        />
                      </div>
                    )}

                    {signupData.documentType === 'CNPJ' && (
                      <>
                        <div className="space-y-3">
                          <Label>Inscrição Estadual *</Label>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="isento-checkbox"
                              checked={signupData.isIsento}
                              onCheckedChange={(checked) => {
                                setSignupData(prev => ({
                                  ...prev,
                                  isIsento: !!checked,
                                  inscricaoEstadual: checked ? 'ISENTO' : ''
                                }));
                              }}
                            />
                            <Label htmlFor="isento-checkbox" className="text-sm font-normal">
                              Isento de Inscrição Estadual
                            </Label>
                          </div>
                          
                          {!signupData.isIsento && (
                            <Input
                              id="signup-inscricao"
                              type="text"
                              placeholder="Digite a Inscrição Estadual"
                              value={signupData.inscricaoEstadual}
                              onChange={(e) => setSignupData(prev => ({
                                ...prev,
                                inscricaoEstadual: e.target.value
                              }))}
                              disabled={isLoading}
                            />
                          )}
                        </div>
                      </>
                    )}
                    
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
                      className="w-full bg-gradient-to-r from-primary to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-primary/20" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Criando conta...
                        </>
                      ) : (
                        'Criar Conta'
                      )}
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
                      className="w-full bg-gradient-to-r from-primary to-red-600 hover:from-red-600 hover:to-red-700" 
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
    </div>
  );
};

export default Auth;
