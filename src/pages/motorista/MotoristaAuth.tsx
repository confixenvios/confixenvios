import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Truck, User, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
              <Label htmlFor="username">Usuário</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="pl-10"
                  placeholder="seu.usuario"
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
