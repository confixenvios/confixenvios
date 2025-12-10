import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, UserX, UserCheck, Clock, Trash2, BarChart3, Calendar, Package, CheckCircle, XCircle, Truck, Zap } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Motorista {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  status: 'ativo' | 'inativo' | 'pendente';
  tipo_pedidos: 'normal' | 'b2b' | 'ambos';
  ve_convencional: boolean;
  ve_b2b_coleta: boolean;
  ve_b2b_entrega: boolean;
  created_at: string;
}

interface MotoristaStats {
  motorista_id: string;
  total_remessas: number;
  remessas_entregues: number;
  remessas_pendentes: number;
  remessas_canceladas: number;
  taxa_sucesso: number;
}

const AdminMotoristas = () => {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [motoristaStats, setMotoristaStats] = useState<MotoristaStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false);
  const [selectedMotoristaStats, setSelectedMotoristaStats] = useState<MotoristaStats | null>(null);
  const [selectedMotorista, setSelectedMotorista] = useState<Motorista | null>(null);
  const [editingMotorista, setEditingMotorista] = useState<Motorista | null>(null);
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    senha: '',
    status: 'ativo' as 'ativo' | 'inativo' | 'pendente',
    tipo_pedidos: 'ambos' as 'normal' | 'b2b' | 'ambos',
    ve_convencional: true,
    ve_b2b_coleta: false,
    ve_b2b_entrega: false
  });

  useEffect(() => {
    loadMotoristas();
  }, []);

  useEffect(() => {
    loadMotoristaStats();
  }, [dateRange, motoristas]);

  const loadMotoristas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('motoristas')
        .select('id, nome, cpf, telefone, email, status, tipo_pedidos, ve_convencional, ve_b2b_coleta, ve_b2b_entrega, created_at, updated_at')
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

  const loadMotoristaStats = async () => {
    if (motoristas.length === 0) return;
    
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          motorista_id,
          status,
          created_at
        `)
        .not('motorista_id', 'is', null)
        .gte('created_at', dateRange.from + 'T00:00:00')
        .lte('created_at', dateRange.to + 'T23:59:59');

      if (error) throw error;

      // Calcular estatísticas por motorista
      const statsMap = new Map<string, MotoristaStats>();
      
      data?.forEach(shipment => {
        if (!shipment.motorista_id) return;
        
        const existing = statsMap.get(shipment.motorista_id) || {
          motorista_id: shipment.motorista_id,
          total_remessas: 0,
          remessas_entregues: 0,
          remessas_pendentes: 0,
          remessas_canceladas: 0,
          taxa_sucesso: 0
        };

        existing.total_remessas++;
        
        switch (shipment.status) {
          case 'DELIVERED':
            existing.remessas_entregues++;
            break;
          case 'CANCELLED':
            existing.remessas_canceladas++;
            break;
          default:
            existing.remessas_pendentes++;
            break;
        }

        existing.taxa_sucesso = existing.total_remessas > 0 
          ? (existing.remessas_entregues / existing.total_remessas) * 100 
          : 0;

        statsMap.set(shipment.motorista_id, existing);
      });

      // Incluir motoristas sem remessas
      motoristas.forEach(motorista => {
        if (!statsMap.has(motorista.id)) {
          statsMap.set(motorista.id, {
            motorista_id: motorista.id,
            total_remessas: 0,
            remessas_entregues: 0,
            remessas_pendentes: 0,
            remessas_canceladas: 0,
            taxa_sucesso: 0
          });
        }
      });

      setMotoristaStats(Array.from(statsMap.values()));
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
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
          status: formData.status,
          tipo_pedidos: formData.tipo_pedidos,
          ve_convencional: formData.ve_convencional,
          ve_b2b_coleta: formData.ve_b2b_coleta,
          ve_b2b_entrega: formData.ve_b2b_entrega
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
          status: formData.status,
          tipo_pedidos: formData.tipo_pedidos,
          ve_convencional: formData.ve_convencional,
          ve_b2b_coleta: formData.ve_b2b_coleta,
          ve_b2b_entrega: formData.ve_b2b_entrega
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
      setFormData({ nome: '', cpf: '', telefone: '', email: '', senha: '', status: 'ativo', tipo_pedidos: 'ambos', ve_convencional: true, ve_b2b_coleta: false, ve_b2b_entrega: false });
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
      status: motorista.status,
      tipo_pedidos: motorista.tipo_pedidos || 'ambos',
      ve_convencional: motorista.ve_convencional ?? true,
      ve_b2b_coleta: motorista.ve_b2b_coleta ?? false,
      ve_b2b_entrega: motorista.ve_b2b_entrega ?? false
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (motorista: Motorista) => {
    try {
      // Verificar se o motorista tem remessas associadas
      const { data: shipments, error: checkError } = await supabase
        .from('shipments')
        .select('id')
        .eq('motorista_id', motorista.id)
        .limit(1);

      if (checkError) throw checkError;

      if (shipments && shipments.length > 0) {
        toast.error('Não é possível excluir motorista com remessas associadas. Inative o motorista em vez de excluir.');
        return;
      }

      const { error } = await supabase
        .from('motoristas')
        .delete()
        .eq('id', motorista.id);

      if (error) throw error;
      
      toast.success('Motorista excluído com sucesso!');
      loadMotoristas();
    } catch (error) {
      console.error('Erro ao excluir motorista:', error);
      toast.error('Erro ao excluir motorista');
    }
  };

  const handleViewStats = (motorista: Motorista) => {
    const stats = motoristaStats.find(s => s.motorista_id === motorista.id);
    setSelectedMotorista(motorista);
    setSelectedMotoristaStats(stats || {
      motorista_id: motorista.id,
      total_remessas: 0,
      remessas_entregues: 0,
      remessas_pendentes: 0,
      remessas_canceladas: 0,
      taxa_sucesso: 0
    });
    setIsStatsDialogOpen(true);
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

  const getMotoristaStats = (motoristaId: string) => {
    return motoristaStats.find(s => s.motorista_id === motoristaId) || {
      motorista_id: motoristaId,
      total_remessas: 0,
      remessas_entregues: 0,
      remessas_pendentes: 0,
      remessas_canceladas: 0,
      taxa_sucesso: 0
    };
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
                setFormData({ nome: '', cpf: '', telefone: '', email: '', senha: '', status: 'ativo', tipo_pedidos: 'ambos', ve_convencional: true, ve_b2b_coleta: false, ve_b2b_entrega: false });
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

              <div className="space-y-2">
                <Label htmlFor="tipo_pedidos">Tipo de Pedidos (legado)</Label>
                 <Select value={formData.tipo_pedidos} onValueChange={(value: 'normal' | 'b2b' | 'ambos') => setFormData({ ...formData, tipo_pedidos: value })}>
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="ambos">Todos (Normal + B2B)</SelectItem>
                     <SelectItem value="normal">Apenas Normais</SelectItem>
                     <SelectItem value="b2b">Apenas B2B Express</SelectItem>
                   </SelectContent>
                 </Select>
              </div>

              {/* Novos controles de visibilidade por tipo de remessa */}
              <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                <Label className="text-sm font-medium">Visibilidade de Remessas</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Selecione quais tipos de remessas o motorista pode visualizar e aceitar
                </p>
                
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="ve_convencional"
                    checked={formData.ve_convencional}
                    onCheckedChange={(checked) => setFormData({ ...formData, ve_convencional: !!checked })}
                  />
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    <Label htmlFor="ve_convencional" className="text-sm font-normal cursor-pointer">
                      Convencional
                    </Label>
                  </div>
                  <span className="text-xs text-muted-foreground">- Coleta + Entrega (fluxo único)</span>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="ve_b2b_coleta"
                    checked={formData.ve_b2b_coleta}
                    onCheckedChange={(checked) => setFormData({ ...formData, ve_b2b_coleta: !!checked })}
                  />
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-orange-500" />
                    <Label htmlFor="ve_b2b_coleta" className="text-sm font-normal cursor-pointer">
                      B2B-1 (Coleta)
                    </Label>
                  </div>
                  <span className="text-xs text-muted-foreground">- Fase inicial após pagamento</span>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="ve_b2b_entrega"
                    checked={formData.ve_b2b_entrega}
                    onCheckedChange={(checked) => setFormData({ ...formData, ve_b2b_entrega: !!checked })}
                  />
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-green-600" />
                    <Label htmlFor="ve_b2b_entrega" className="text-sm font-normal cursor-pointer">
                      B2B-2 (Entrega)
                    </Label>
                  </div>
                  <span className="text-xs text-muted-foreground">- Após coleta finalizada</span>
                </div>
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

      {/* Filtros de período */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Período para Estatísticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">Data Inicial</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">Data Final</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              />
            </div>
            <Button 
              variant="outline"
              onClick={() => setDateRange({
                from: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
                to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
              })}
            >
              Último Mês
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Motoristas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Visibilidade</TableHead>
                <TableHead>Remessas</TableHead>
                <TableHead>Taxa Sucesso</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {motoristas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum motorista cadastrado ainda.
                  </TableCell>
                </TableRow>
              ) : (
                motoristas.map((motorista) => {
                  const stats = getMotoristaStats(motorista.id);
                  return (
                    <TableRow key={motorista.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{motorista.nome}</p>
                          <p className="text-xs text-muted-foreground">{motorista.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{motorista.telefone}</TableCell>
                      <TableCell>{getStatusBadge(motorista.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {motorista.ve_convencional && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs">
                              <Package className="h-3 w-3 mr-1" />
                              Conv
                            </Badge>
                          )}
                          {motorista.ve_b2b_coleta && (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 text-xs">
                              <Zap className="h-3 w-3 mr-1" />
                              B2B-1
                            </Badge>
                          )}
                          {motorista.ve_b2b_entrega && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                              <Truck className="h-3 w-3 mr-1" />
                              B2B-2
                            </Badge>
                          )}
                          {!motorista.ve_convencional && !motorista.ve_b2b_coleta && !motorista.ve_b2b_entrega && (
                            <span className="text-xs text-muted-foreground">Nenhum</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-blue-500" />
                          <span>{stats.total_remessas}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {stats.taxa_sucesso > 80 ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : stats.taxa_sucesso > 50 ? (
                            <Clock className="h-4 w-4 text-yellow-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span>{stats.taxa_sucesso.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(motorista)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewStats(motorista)}
                          >
                            <BarChart3 className="h-3 w-3" />
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

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Motorista</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o motorista "{motorista.nome}"? 
                                  Esta ação não pode ser desfeita e só é possível se o motorista não tiver remessas associadas.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(motorista)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Estatísticas */}
      <Dialog open={isStatsDialogOpen} onOpenChange={setIsStatsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Relatório de Desempenho - {selectedMotorista?.nome}
            </DialogTitle>
          </DialogHeader>
          
          {selectedMotoristaStats && (
            <div className="space-y-6">
              <div className="text-sm text-muted-foreground">
                Período: {format(new Date(dateRange.from), 'dd/MM/yyyy', { locale: ptBR })} até {format(new Date(dateRange.to), 'dd/MM/yyyy', { locale: ptBR })}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="text-2xl font-bold">{selectedMotoristaStats.total_remessas}</div>
                        <div className="text-xs text-muted-foreground">Total de Remessas</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="text-2xl font-bold">{selectedMotoristaStats.remessas_entregues}</div>
                        <div className="text-xs text-muted-foreground">Entregas</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <div>
                        <div className="text-2xl font-bold">{selectedMotoristaStats.remessas_pendentes}</div>
                        <div className="text-xs text-muted-foreground">Pendentes</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <div>
                        <div className="text-2xl font-bold">{selectedMotoristaStats.remessas_canceladas}</div>
                        <div className="text-xs text-muted-foreground">Canceladas</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Taxa de Sucesso</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">
                      {selectedMotoristaStats.taxa_sucesso.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedMotoristaStats.remessas_entregues} de {selectedMotoristaStats.total_remessas} remessas entregues
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${selectedMotoristaStats.taxa_sucesso}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMotoristas;