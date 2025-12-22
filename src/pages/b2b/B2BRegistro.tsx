import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

// Sanitização para nome da empresa: letras, números, espaços e alguns caracteres especiais
const sanitizeCompanyName = (value: string): string => {
  return value
    .replace(/[^a-zA-ZÀ-ÿ0-9\s.,\-&]/g, '')
    .slice(0, 60);
};

// Sanitização para email
const sanitizeEmail = (value: string): string => {
  return value.slice(0, 100);
};

// Sanitização para senha
const sanitizePassword = (value: string): string => {
  return value.slice(0, 50);
};

const B2BRegistro = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    document: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const formatDocument = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      // CPF format: 000.000.000-00
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
        .slice(0, 14);
    }
    // CNPJ format: 00.000.000/0000-00
    return numbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .slice(0, 14);
    }
    return numbers
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  const handleChange = (field: string, value: string) => {
    let sanitizedValue = value;
    
    switch (field) {
      case 'companyName':
        sanitizedValue = sanitizeCompanyName(value);
        break;
      case 'document':
        sanitizedValue = formatDocument(value);
        break;
      case 'phone':
        sanitizedValue = formatPhone(value);
        break;
      case 'email':
        sanitizedValue = sanitizeEmail(value);
        break;
      case 'password':
      case 'confirmPassword':
        sanitizedValue = sanitizePassword(value);
        break;
      default:
        sanitizedValue = value;
    }
    
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
  };

  const validateForm = () => {
    if (!formData.companyName.trim()) {
      toast.error('Nome da empresa é obrigatório');
      return false;
    }
    const docNumbers = formData.document.replace(/\D/g, '');
    if (docNumbers.length !== 11 && docNumbers.length !== 14) {
      toast.error('CPF ou CNPJ inválido');
      return false;
    }
    if (!formData.email.includes('@')) {
      toast.error('E-mail inválido');
      return false;
    }
    if (formData.phone.replace(/\D/g, '').length < 10) {
      toast.error('Telefone inválido');
      return false;
    }
    if (formData.password.length < 6) {
      toast.error('Senha deve ter pelo menos 6 caracteres');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/b2b-expresso/dashboard`,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Erro ao criar usuário');

      // 2. Criar registro na tabela b2b_clients
      const { error: clientError } = await supabase
        .from('b2b_clients')
        .insert({
          user_id: authData.user.id,
          company_name: formData.companyName.trim(),
          cnpj: formData.document.replace(/\D/g, ''),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.replace(/\D/g, ''),
          is_active: true,
        });

      if (clientError) {
        // Tentar remover usuário criado em caso de erro
        console.error('Erro ao criar cliente B2B:', clientError);
        throw new Error('Erro ao criar cadastro. Tente novamente.');
      }

      toast.success('Cadastro realizado com sucesso! Você já pode fazer login.');
      navigate('/b2b-expresso');
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      if (error.message?.includes('already registered')) {
        toast.error('Este e-mail já está cadastrado');
      } else {
        toast.error(error.message || 'Erro ao realizar cadastro');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link 
          to="/b2b-expresso" 
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao login
        </Link>
        <Card>
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Package className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Cadastro B2B Expresso</CardTitle>
            <CardDescription>
              Crie sua conta para começar a enviar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nome da Empresa *</Label>
                <Input
                  id="companyName"
                  type="text"
                  placeholder="Minha Empresa LTDA"
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  maxLength={60}
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="document">CPF / CNPJ *</Label>
                <Input
                  id="document"
                  type="text"
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  value={formData.document}
                  onChange={(e) => handleChange('document', e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contato@empresa.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  maxLength={100}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  maxLength={50}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repita a senha"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  maxLength={50}
                  required
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  'Criar Conta'
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Já tem uma conta?{' '}
                <Link to="/b2b-expresso" className="text-primary hover:underline">
                  Faça login
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default B2BRegistro;
