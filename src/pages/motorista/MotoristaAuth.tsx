import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Truck, Mail, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MotoristaAuth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    senha: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Usar nossa função customizada de autenticação de motorista
      const { data: motoristaResult, error: motoristaError } = await supabase
        .rpc('authenticate_motorista', {
          input_email: formData.email,
          input_password: formData.senha
        });

      console.log('Resultado da autenticação:', motoristaResult);

      if (motoristaError) {
        console.error('Erro na RPC:', motoristaError);
        throw new Error('Erro interno do servidor');
      }

      // Cast para o tipo correto
      const result = motoristaResult as any;

      if (!result?.success) {
        throw new Error(result?.error || 'E-mail ou senha incorretos');
      }

      // Store motorista session in localStorage
      localStorage.setItem('motorista_session', JSON.stringify({
        id: result.motorista_id,
        nome: result.nome,
        email: formData.email,
        status: result.status,
        tipo_pedidos: result.tipo_pedidos || 'ambos'
      }));

      toast.success(`Bem-vindo, ${result.nome}!`);
      navigate('/motorista/dashboard');

    } catch (error: any) {
      console.error('Erro no login:', error);
      toast.error(error.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <Truck className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Portal do Motorista</CardTitle>
          <p className="text-muted-foreground">
            Faça login para acessar suas coletas e entregas
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10"
                  placeholder="seu@email.com"
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
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground mb-2">
              Ainda não tem uma conta?{' '}
              <Link to="/motorista/registro" className="text-primary hover:underline">
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
  );
};

export default MotoristaAuth;