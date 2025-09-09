import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Star, Building2 } from 'lucide-react';
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
}

const AdminFiliais = () => {
  const [branches, setBranches] = useState<CompanyBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<CompanyBranch | null>(null);
  const { toast } = useToast();

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

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('company_branches')
        .select('*')
        .order('is_main_branch', { ascending: false })
        .order('name');

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Erro ao buscar filiais:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar filiais",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
    setEditingBranch(null);
  };

  const openEditDialog = (branch: CompanyBranch) => {
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
    setEditingBranch(branch);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingBranch) {
        const { error } = await supabase
          .from('company_branches')
          .update(formData)
          .eq('id', editingBranch.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Filial atualizada com sucesso",
        });
      } else {
        const { error } = await supabase
          .from('company_branches')
          .insert([formData]);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Filial cadastrada com sucesso",
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchBranches();
    } catch (error) {
      console.error('Erro ao salvar filial:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar filial",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="text-center">Carregando...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              Filiais do Embarcador
            </h1>
            <p className="text-muted-foreground">
              Gerencie as filiais da empresa para emissão de CTE
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Filial
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingBranch ? 'Editar Filial' : 'Nova Filial'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Razão Social *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="fantasy_name">Nome Fantasia</Label>
                    <Input
                      id="fantasy_name"
                      value={formData.fantasy_name}
                      onChange={(e) => setFormData({ ...formData, fantasy_name: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cnpj">CNPJ *</Label>
                    <Input
                      id="cnpj"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                      placeholder="00.000.000/0001-00"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cep">CEP *</Label>
                    <Input
                      id="cep"
                      value={formData.cep}
                      onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                      placeholder="00000-000"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="street">Logradouro *</Label>
                    <Input
                      id="street"
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="number">Número *</Label>
                    <Input
                      id="number"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      value={formData.complement}
                      onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="neighborhood">Bairro *</Label>
                    <Input
                      id="neighborhood"
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="city">Cidade *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="state">Estado *</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="SP"
                      maxLength={2}
                      required
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_main_branch"
                    checked={formData.is_main_branch}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_main_branch: checked })}
                  />
                  <Label htmlFor="is_main_branch">Filial Principal</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  />
                  <Label htmlFor="active">Ativo</Label>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingBranch ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {branches.map((branch) => (
            <Card key={branch.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {branch.is_main_branch && <Star className="h-4 w-4 text-yellow-500" />}
                    {branch.fantasy_name || branch.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={branch.active ? "default" : "secondary"}>
                      {branch.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    {branch.is_main_branch && (
                      <Badge variant="outline">Principal</Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(branch)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Razão Social:</strong> {branch.name}</p>
                    <p><strong>CNPJ:</strong> {branch.cnpj}</p>
                    {branch.email && <p><strong>Email:</strong> {branch.email}</p>}
                    {branch.phone && <p><strong>Telefone:</strong> {branch.phone}</p>}
                  </div>
                  <div>
                    <p><strong>Endereço:</strong></p>
                    <p>{branch.street}, {branch.number}</p>
                    {branch.complement && <p>{branch.complement}</p>}
                    <p>{branch.neighborhood}</p>
                    <p>{branch.city} - {branch.state}</p>
                    <p>CEP: {branch.cep}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {branches.length === 0 && (
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma filial cadastrada</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminFiliais;