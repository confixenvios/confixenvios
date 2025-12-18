import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Truck, User, Lock, ArrowLeft, MapPin, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import confixLogo from '@/assets/confix-logo-black.png';

const MotoristaAuth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    senha: ''
  });

  // Verificar se já está logado como motorista
  useEffect(() => {
    const motoristaId = localStorage.getItem('motorista_id');
    if (motoristaId) {
      navigate('/motorista/dashboard');
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Login via função de autenticação do banco
      const { data, error } = await supabase.rpc('authenticate_motorista_username', {
        p_username: formData.username.toLowerCase().trim(),
        p_password: formData.senha
      });

      if (error) {
        console.error('Erro na autenticação:', error);
        throw new Error('Usuário ou senha incorretos');
      }

      if (!data || data.length === 0) {
        throw new Error('Usuário ou senha incorretos');
      }

      const motorista = data[0];

      if (motorista.status !== 'ativo') {
        throw new Error('Sua conta ainda não foi ativada. Aguarde aprovação do administrador.');
      }

      // Salvar dados do motorista no localStorage
      localStorage.setItem('motorista_id', motorista.id);
      localStorage.setItem('motorista_nome', motorista.nome);
      localStorage.setItem('motorista_username', motorista.username);

      toast.success(`Bem-vindo, ${motorista.nome}!`);
      navigate('/motorista/dashboard');

    } catch (error: any) {
      console.error('Erro no login:', error);
      toast.error(error.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-4xl font-bold text-white mb-4">Portal do Motorista</h1>
            <p className="text-white/80 text-lg max-w-md">
              Gerencie suas coletas e entregas de forma simples e eficiente
            </p>
          </div>
          <div className="mt-12 flex items-center gap-8 text-white/60">
            <div className="text-center">
              <Package className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Coletas</p>
            </div>
            <div className="text-center">
              <Truck className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Entregas</p>
            </div>
            <div className="text-center">
              <MapPin className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Rotas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-white">
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
            <img src={confixLogo} alt="Confix Envios" className="h-12" />
          </div>
          
          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
                <Truck className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Portal do Motorista</CardTitle>
              <CardDescription>
                Faça login para acessar suas coletas e entregas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Usuário</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="pl-10"
                      placeholder="Digite seu usuário"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senha">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="senha"
                      type="password"
                      value={formData.senha}
                      onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                      className="pl-10"
                      placeholder="Digite sua senha"
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-primary to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-primary/20" 
                  disabled={loading}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <p className="text-muted-foreground mb-2">
                  Ainda não tem uma conta?{' '}
                  <Link to="/motorista/registro" className="text-primary hover:underline font-medium">
                    Cadastre-se aqui
                  </Link>
                </p>
                <p className="text-xs text-muted-foreground">
                  Problemas para acessar? Entre em contato com o administrador
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MotoristaAuth;
