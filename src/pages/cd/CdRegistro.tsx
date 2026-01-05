import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { Package, User, Mail, Lock, Phone, CreditCard, Loader2, ArrowLeft } from "lucide-react";

const CdRegistro = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    email: '',
    telefone: '',
    senha: '',
    confirmarSenha: ''
  });

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const validateForm = () => {
    if (formData.senha !== formData.confirmarSenha) {
      toast.error('As senhas não coincidem');
      return false;
    }
    if (formData.senha.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return false;
    }
    const cpfNumbers = formData.cpf.replace(/\D/g, '');
    if (cpfNumbers.length !== 11) {
      toast.error('CPF inválido');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('register_cd_user', {
        p_nome: formData.nome,
        p_cpf: formData.cpf.replace(/\D/g, ''),
        p_email: formData.email,
        p_telefone: formData.telefone.replace(/\D/g, ''),
        p_senha: formData.senha
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; user_id?: string };

      if (!result.success) {
        toast.error(result.error || 'Erro ao cadastrar');
        return;
      }

      toast.success('Cadastro realizado com sucesso! Aguarde aprovação do administrador.');
      navigate('/cd');
    } catch (error: any) {
      console.error('Erro ao cadastrar:', error);
      toast.error('Erro ao realizar cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <div className="absolute top-4 left-4">
        <Button variant="ghost" onClick={() => navigate('/cd')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Cadastro CD</CardTitle>
          <CardDescription>
            Preencha seus dados para se cadastrar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="nome"
                  type="text"
                  placeholder="Seu nome completo"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').slice(0, 60) })}
                  className="pl-10"
                  maxLength={60}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF *</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                  className="pl-10"
                  maxLength={14}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="telefone"
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })}
                  className="pl-10"
                  maxLength={15}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value.slice(0, 100) })}
                  className="pl-10"
                  maxLength={100}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="senha"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={formData.senha}
                  onChange={(e) => setFormData({ ...formData, senha: e.target.value.slice(0, 50) })}
                  className="pl-10"
                  maxLength={50}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmarSenha">Confirmar Senha *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmarSenha"
                  type="password"
                  placeholder="Confirme sua senha"
                  value={formData.confirmarSenha}
                  onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value.slice(0, 50) })}
                  className="pl-10"
                  maxLength={50}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                'Cadastrar'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Já tem uma conta?{' '}
            <Link to="/cd" className="text-primary hover:underline">
              Faça login
            </Link>
          </div>

          <p className="mt-4 text-xs text-center text-muted-foreground">
            Após o cadastro, aguarde aprovação do administrador para acessar o sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CdRegistro;
