import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { Mail, Lock, Loader2, Warehouse, ArrowLeft, Package } from "lucide-react";
import confixLogo from '@/assets/confix-logo-black.png';

const CdAuth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('authenticate_cd_user', {
        p_email: formData.email,
        p_password: formData.password
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('Email ou senha incorretos, ou conta pendente de aprovação');
        return;
      }

      const cdUser = data[0];

      // Salvar dados do usuário CD no localStorage
      localStorage.setItem('cd_user', JSON.stringify(cdUser));
      
      toast.success(`Bem-vindo, ${cdUser.nome}!`);
      navigate('/cd/dashboard');
    } catch (error: any) {
      console.error('Erro ao autenticar:', error);
      toast.error('Erro ao fazer login. Verifique suas credenciais.');
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
            <h1 className="text-4xl font-bold text-white mb-4">Centro de Distribuição</h1>
            <p className="text-white/80 text-lg max-w-md">
              Gestão completa de operações logísticas e distribuição
            </p>
          </div>
          <div className="mt-12 flex items-center gap-8 text-white/60">
            <div className="text-center">
              <Package className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Recepção</p>
            </div>
            <div className="text-center">
              <Warehouse className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Triagem</p>
            </div>
            <div className="text-center">
              <Package className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Expedição</p>
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
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <Warehouse className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Centro de Distribuição</CardTitle>
              <CardDescription>
                Faça login para acessar o sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-primary to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-primary/20" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                Não tem uma conta?{' '}
                <Link to="/cd/registro" className="text-primary hover:underline font-medium">
                  Cadastre-se
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CdAuth;
