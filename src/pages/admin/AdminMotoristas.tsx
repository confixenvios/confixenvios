import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, UserX, UserCheck, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Motorista {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  status: 'ativo' | 'inativo' | 'pendente';
  created_at: string;
}

const AdminMotoristas = () => {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMotorista, setEditingMotorista] = useState<Motorista | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    senha: '',
    status: 'ativo' as 'ativo' | 'inativo' | 'pendente'
  });

  useEffect(() => {
    loadMotoristas();
  }, []);

  const loadMotoristas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('motoristas')
        .select('id, nome, cpf, telefone, email, status, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro na consulta de motoristas:', error);
        throw error;
      }
      
      console.log('Motoristas carregados:', data);
      setMotoristas((data || []) as Motorista[]);
    } catch (error: any) {
      console.error('Erro ao carregar motoristas:', error);
      toast.error(`Erro ao carregar motoristas: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingMotorista) {
        // Update existing motorista (without password if not provided)
        const updateData: any = {
          nome: formData.nome,
          cpf: formData.cpf,
          telefone: formData.telefone,
          email: formData.email,
          status: formData.status
        };

        if (formData.senha) {
          updateData.senha = formData.senha;
        }

        console.log('Atualizando motorista:', updateData);
        const { error } = await supabase
          .from('motoristas')
          .update(updateData)
          .eq('id', editingMotorista.id);

        if (error) {
          console.error('Erro ao atualizar motorista:', error);
          throw error;
        }
        toast.success('Motorista atualizado com sucesso!');
      } else {
        // Create new motorista
        const insertData = {
          nome: formData.nome,
          cpf: formData.cpf,
          telefone: formData.telefone,
          email: formData.email,
          senha: formData.senha,
          status: formData.status
        };

        console.log('Criando novo motorista:', { ...insertData, senha: '[HIDDEN]' });
        const { data, error } = await supabase
          .from('motoristas')
          .insert([insertData])
          .select();

        if (error) {
          console.error('Erro ao criar motorista:', error);
          throw error;
        }
        
        console.log('Motorista criado com sucesso:', data);
        toast.success('Motorista cadastrado com sucesso!');
      }

      setIsDialogOpen(false);
      setEditingMotorista(null);
      setFormData({ nome: '', cpf: '', telefone: '', email: '', senha: '', status: 'ativo' });
      loadMotoristas();
    } catch (error: any) {
      console.error('Erro ao salvar motorista:', error);
      toast.error(`Erro ao salvar motorista: ${error.message || error.details || 'Erro desconhecido'}`);
    }
  };

  const handleEdit = (motorista: Motorista) => {
    setEditingMotorista(motorista);
    setFormData({
      nome: motorista.nome,
      cpf: motorista.cpf,
      telefone: motorista.telefone,
      email: motorista.email,
      senha: '',
      status: motorista.status
    });
    setIsDialogOpen(true);
  };

  const approveMotorista = async (motorista: Motorista) => {
    try {
      const { error } = await supabase
        .from('motoristas')
        .update({ status: 'ativo' })
        .eq('id', motorista.id);

      if (error) throw error;
      
      toast.success('Motorista aprovado com sucesso!');
      loadMotoristas();
    } catch (error) {
      console.error('Erro ao aprovar motorista:', error);
      toast.error('Erro ao aprovar motorista');
    }
  };

  const toggleStatus = async (motorista: Motorista) => {
    const newStatus = motorista.status === 'ativo' ? 'inativo' : 'ativo';
    
    try {
      const { error } = await supabase
        .from('motoristas')
        .update({ status: newStatus })
        .eq('id', motorista.id);

      if (error) throw error;
      
      toast.success(`Motorista ${newStatus === 'ativo' ? 'ativado' : 'desativado'} com sucesso!`);
      loadMotoristas();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status do motorista');
    }
  };

  const getStatusBadge = (status: 'ativo' | 'inativo' | 'pendente') => {
    let variant: 'default' | 'secondary' | 'outline' = 'secondary';
    let icon;
    let text;
    
    switch (status) {
      case 'ativo':
        variant = 'default';
        icon = <UserCheck className="h-3 w-3 mr-1" />;
        text = 'Ativo';
        break;
      case 'inativo':
        variant = 'secondary';
        icon = <UserX className="h-3 w-3 mr-1" />;
        text = 'Inativo';
        break;
      case 'pendente':
        variant = 'outline';
        icon = <Clock className="h-3 w-3 mr-1" />;
        text = 'Pendente';
        break;
    }
    
    return (
      <Badge variant={variant}>
        {icon}
        {text}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Motoristas</h1>
            <p className="text-muted-foreground">
              Gerencie os motoristas e suas aprovações. Motoristas com status "Pendente" aguardam aprovação.
            </p>
          </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                setEditingMotorista(null);
                setFormData({ nome: '', cpf: '', telefone: '', email: '', senha: '', status: 'ativo' });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Motorista
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingMotorista ? 'Editar Motorista' : 'Novo Motorista'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha">
                  {editingMotorista ? 'Nova Senha (deixe vazio para manter)' : 'Senha'}
                </Label>
                <Input
                  id="senha"
                  type="password"
                  value={formData.senha}
                  onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                  required={!editingMotorista}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                 <Select value={formData.status} onValueChange={(value: 'ativo' | 'inativo' | 'pendente') => setFormData({ ...formData, status: value })}>
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="ativo">Ativo</SelectItem>
                     <SelectItem value="inativo">Inativo</SelectItem>
                     <SelectItem value="pendente">Pendente</SelectItem>
                   </SelectContent>
                 </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit">
                  {editingMotorista ? 'Atualizar' : 'Cadastrar'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Motoristas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {motoristas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum motorista cadastrado ainda.
                  </TableCell>
                </TableRow>
              ) : (
                motoristas.map((motorista) => (
                  <TableRow key={motorista.id}>
                    <TableCell className="font-medium">{motorista.nome}</TableCell>
                    <TableCell>{motorista.cpf}</TableCell>
                    <TableCell>{motorista.telefone}</TableCell>
                    <TableCell>{motorista.email}</TableCell>
                    <TableCell>{getStatusBadge(motorista.status)}</TableCell>
                     <TableCell>
                       <div className="flex gap-2">
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => handleEdit(motorista)}
                         >
                           <Pencil className="h-3 w-3" />
                         </Button>
                         
                          {motorista.status === 'pendente' ? (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => approveMotorista(motorista)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <UserCheck className="h-3 w-3 mr-1" />
                              Aprovar
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleStatus(motorista)}
                            >
                              {motorista.status === 'ativo' ? (
                                <UserX className="h-3 w-3" />
                              ) : (
                                <UserCheck className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                       </div>
                     </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMotoristas;