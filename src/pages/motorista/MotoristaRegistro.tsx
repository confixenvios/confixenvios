import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Truck, Lock, User, Phone, FileText, AtSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MotoristaRegistro = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    username: '',
    senha: '',
    confirmarSenha: ''
  });

  const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{3})(\d{2})$/);
    if (match) {
      return `${match[1]}.${match[2]}.${match[3]}-${match[4]}`;
    }
    return cleaned;
  };

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{4,5})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return cleaned;
  };

  const formatUsername = (value: string) => {
    // Apenas letras minúsculas, números, pontos e underscores
    return value.toLowerCase().replace(/[^a-z0-9._]/g, '');
  };

  const validateForm = () => {
    if (formData.senha !== formData.confirmarSenha) {
      toast.error('As senhas não coincidem');
      return false;
    }

    if (formData.senha.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return false;
    }

    if (formData.username.length < 3) {
      toast.error('O usuário deve ter pelo menos 3 caracteres');
      return false;
    }

    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    if (!cpfRegex.test(formData.cpf)) {
      toast.error('CPF deve estar no formato 000.000.000-00');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      console.log('🔄 Iniciando cadastro de motorista...');

      // Verificar se username já existe
      const { data: existingUser } = await supabase
        .from('motoristas')
        .select('id')
        .eq('username', formData.username.toLowerCase())
        .maybeSingle();

      if (existingUser) {
        throw new Error('Este nome de usuário já está em uso. Escolha outro.');
      }

      // Verificar se CPF já existe
      const { data: existingCPF } = await supabase
        .from('motoristas')
        .select('id')
        .eq('cpf', formData.cpf)
        .maybeSingle();

      if (existingCPF) {
        throw new Error('Este CPF já está cadastrado.');
      }

      // Inserir motorista na tabela (senha será hasheada pelo trigger)
      const { data, error } = await supabase
        .from('motoristas')
        .insert({
          username: formData.username.toLowerCase(),
          nome: formData.nome,
          cpf: formData.cpf,
          telefone: formData.telefone,
          senha: formData.senha,
          status: 'pendente'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao cadastrar:', error);
        throw new Error('Erro ao realizar cadastro. Tente novamente.');
      }

      console.log('✅ Motorista cadastrado:', data.id);
      
      toast.success('Cadastro realizado com sucesso!');
      toast.info('Aguarde a aprovação do administrador para acessar o sistema.');
      navigate('/motorista/auth');

    } catch (error: any) {
      console.error('❌ Erro ao cadastrar motorista:', error);
      toast.error(error.message || 'Erro ao realizar cadastro');
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
          <CardTitle className="text-2xl">Cadastro de Motorista</CardTitle>
          <p className="text-muted-foreground">
            Registre-se para se tornar um motorista parceiro
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="nome"
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="pl-10"
                  placeholder="Seu nome completo"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Nome de Usuário</Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: formatUsername(e.target.value) })}
                  className="pl-10"
                  placeholder="seu.usuario"
                  minLength={3}
                  maxLength={30}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Apenas letras minúsculas, números, pontos e underscores
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cpf"
                  type="text"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                  className="pl-10"
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="telefone"
                  type="text"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })}
                  className="pl-10"
                  placeholder="(00) 00000-0000"
                  maxLength={15}
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
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmarSenha">Confirmar Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmarSenha"
                  type="password"
                  value={formData.confirmarSenha}
                  onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value })}
                  className="pl-10"
                  placeholder="Confirme sua senha"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground">
              Já tem uma conta?{' '}
              <Link to="/motorista/auth" className="text-primary hover:underline">
                Faça login
              </Link>
            </p>
          </div>

          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              Após o cadastro, aguarde a aprovação do administrador para acessar o sistema.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MotoristaRegistro;
