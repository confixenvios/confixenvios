import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Building2, Plus, Edit, Trash2, MapPin, Phone, Mail } from 'lucide-react';
import AdminLayout from './AdminLayout';

interface CompanyBranch {
  id: string;
  name: string;
  cnpj: string;
  fantasy_name?: string;
  email?: string;
  phone?: string;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  is_main_branch: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const AdminFiliais = () => {
  const [branches, setBranches] = useState<CompanyBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<CompanyBranch | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    fantasy_name: '',
    email: '',
    phone: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    is_main_branch: false,
    active: true
  });
  const { toast } = useToast();

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('company_branches')
        .select('*')
        .order('is_main_branch', { ascending: false })
        .order('name');

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Erro ao carregar filiais:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar filiais',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingBranch) {
        const { error } = await supabase
          .from('company_branches')
          .update(formData)
          .eq('id', editingBranch.id);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Filial atualizada com sucesso!' });
      } else {
        const { error } = await supabase
          .from('company_branches')
          .insert([formData]);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Filial criada com sucesso!' });
      }

      setIsDialogOpen(false);
      setEditingBranch(null);
      resetForm();
      loadBranches();
    } catch (error) {
      console.error('Erro ao salvar filial:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar filial',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta filial?')) return;

    try {
      const { error } = await supabase
        .from('company_branches')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Filial excluída com sucesso!' });
      loadBranches();
    } catch (error) {
      console.error('Erro ao excluir filial:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir filial',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      cnpj: '',
      fantasy_name: '',
      email: '',
      phone: '',
      cep: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      is_main_branch: false,
      active: true
    });
  };

  const openDialog = (branch?: CompanyBranch) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        name: branch.name,
        cnpj: branch.cnpj,
        fantasy_name: branch.fantasy_name || '',
        email: branch.email || '',
        phone: branch.phone || '',
        cep: branch.cep,
        street: branch.street,
        number: branch.number,
        complement: branch.complement || '',
        neighborhood: branch.neighborhood,
        city: branch.city,
        state: branch.state,
        is_main_branch: branch.is_main_branch,
        active: branch.active
      });
    } else {
      setEditingBranch(null);
      resetForm();
    }
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="container mx-auto max-w-7xl p-6 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground text-lg">Carregando filiais...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto max-w-7xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-7 w-7" />
              Filiais do Embarcador
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie as filiais da empresa para emissão de CTe
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Filial
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingBranch ? 'Editar Filial' : 'Nova Filial'}
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados da filial do embarcador
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Razão Social *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Nome da empresa"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fantasy_name">Nome Fantasia</Label>
                  <Input
                    id="fantasy_name"
                    value={formData.fantasy_name}
                    onChange={(e) => setFormData({...formData, fantasy_name: e.target.value})}
                    placeholder="Nome fantasia"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                    placeholder="00.000.000/0001-00"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="email@empresa.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP *</Label>
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={(e) => setFormData({...formData, cep: e.target.value})}
                    placeholder="00000-000"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="street">Logradouro *</Label>
                  <Input
                    id="street"
                    value={formData.street}
                    onChange={(e) => setFormData({...formData, street: e.target.value})}
                    placeholder="Rua/Avenida"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="number">Número *</Label>
                  <Input
                    id="number"
                    value={formData.number}
                    onChange={(e) => setFormData({...formData, number: e.target.value})}
                    placeholder="123"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={formData.complement}
                    onChange={(e) => setFormData({...formData, complement: e.target.value})}
                    placeholder="Apto, Sala, etc."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro *</Label>
                  <Input
                    id="neighborhood"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({...formData, neighborhood: e.target.value})}
                    placeholder="Bairro"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    placeholder="Cidade"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="state">Estado *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_main_branch"
                    checked={formData.is_main_branch}
                    onCheckedChange={(checked) => setFormData({...formData, is_main_branch: checked})}
                  />
                  <Label htmlFor="is_main_branch">Filial Principal</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({...formData, active: checked})}
                  />
                  <Label htmlFor="active">Ativo</Label>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  {editingBranch ? 'Atualizar' : 'Criar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {branches.map((branch) => (
            <Card key={branch.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <Building2 className="h-5 w-5 text-primary" />
                      {branch.fantasy_name || branch.name}
                      {branch.is_main_branch && (
                        <Badge variant="default" className="text-xs">Principal</Badge>
                      )}
                      {!branch.active && (
                        <Badge variant="destructive" className="text-xs">Inativo</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1 text-sm">
                      CNPJ: {branch.cnpj}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDialog(branch)}
                      className="flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      <span className="hidden sm:inline">Editar</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(branch.id)}
                      className="flex items-center gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Excluir</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium mb-1">Endereço</p>
                      <p className="text-muted-foreground leading-relaxed">
                        {branch.street}, {branch.number}
                        {branch.complement && `, ${branch.complement}`}
                        <br />
                        {branch.neighborhood} - {branch.city}/{branch.state}
                        <br />
                        CEP: {branch.cep}
                      </p>
                    </div>
                  </div>
                  {branch.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium mb-1">E-mail</p>
                        <p className="text-muted-foreground">{branch.email}</p>
                      </div>
                    </div>
                  )}
                  {branch.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium mb-1">Telefone</p>
                        <p className="text-muted-foreground">{branch.phone}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {branches.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="text-center py-12">
                <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma filial cadastrada</h3>
                <p className="text-muted-foreground mb-6">
                  Clique em "Nova Filial" para começar a gerenciar as filiais da empresa.
                </p>
                <Button onClick={() => openDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar primeira filial
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminFiliais;