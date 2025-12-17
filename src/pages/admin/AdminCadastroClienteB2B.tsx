import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import InputMask from 'react-input-mask';
import { PhoneInput } from "@/components/ui/phone-input";

const AdminCadastroClienteB2B = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    cnpj: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/b2b-expresso/dashboard`,
          data: {
            company_name: formData.company_name,
            user_type: 'b2b_client'
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Erro ao criar usuário');

      // 2. Criar registro na tabela b2b_clients
      const { error: clientError } = await supabase
        .from('b2b_clients')
        .insert({
          user_id: authData.user.id,
          company_name: formData.company_name,
          email: formData.email,
          phone: formData.phone || null,
          cnpj: formData.cnpj || null,
          is_active: true,
        });

      if (clientError) throw clientError;

      // 3. Atualizar o perfil para tipo B2B
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ tipo_cliente: 'b2b_expresso' })
        .eq('id', authData.user.id);

      if (profileError) {
        console.warn('Aviso ao atualizar perfil:', profileError);
      }

      toast.success('Cliente B2B cadastrado com sucesso!');
      navigate('/admin/clientes-b2b');
    } catch (error: any) {
      console.error('Erro ao cadastrar cliente B2B:', error);
      toast.error(error.message || 'Erro ao cadastrar cliente B2B');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/admin/clientes-b2b')}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Cadastrar Cliente B2B</CardTitle>
              <CardDescription>
                Crie um novo cliente para o módulo B2B Expresso
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Nome da Empresa *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
                required
                placeholder="Ex: Empresa LTDA"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                placeholder="contato@empresa.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  required
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  required
                  placeholder="Repita a senha"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <PhoneInput
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="(00) 0000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <InputMask
                mask="99.999.999/9999-99"
                value={formData.cnpj}
                onChange={(e) => handleChange('cnpj', e.target.value)}
              >
                {(inputProps: any) => (
                  <Input
                    {...inputProps}
                    id="cnpj"
                    placeholder="00.000.000/0000-00"
                  />
                )}
              </InputMask>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/clientes-b2b')}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  <>
                    <Building2 className="mr-2 h-4 w-4" />
                    Cadastrar Cliente
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCadastroClienteB2B;
