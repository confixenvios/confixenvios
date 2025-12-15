import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Search, RefreshCw, Check, X, Eye, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Motorista {
  id: string;
  nome: string;
  username: string;
  cpf: string;
  telefone: string;
  status: string;
  created_at: string;
}

const AdminMotoristas = () => {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMotorista, setSelectedMotorista] = useState<Motorista | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadMotoristas();
  }, []);

  const loadMotoristas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('motoristas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMotoristas(data || []);
    } catch (error) {
      toast.error('Erro ao carregar motoristas');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (motorista: Motorista, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('motoristas')
        .update({ status: newStatus })
        .eq('id', motorista.id);

      if (error) throw error;

      toast.success(`Motorista ${newStatus === 'ativo' ? 'ativado' : 'desativado'} com sucesso`);
      loadMotoristas();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleShowDetails = (motorista: Motorista) => {
    setSelectedMotorista(motorista);
    setShowDetailsModal(true);
  };

  const filteredMotoristas = motoristas.filter(m => 
    m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.cpf.includes(searchTerm)
  );

  const pendentes = motoristas.filter(m => m.status === 'pendente').length;
  const ativos = motoristas.filter(m => m.status === 'ativo').length;

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'pendente': { label: 'Pendente', variant: 'secondary' },
      'ativo': { label: 'Ativo', variant: 'default' },
      'inativo': { label: 'Inativo', variant: 'destructive' },
    };
    const config = configs[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCPF = (cpf: string) => {
    const clean = cpf.replace(/\D/g, '');
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 11) {
      return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{motoristas.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <Truck className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendentes}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{ativos}</p>
              <p className="text-sm text-muted-foreground">Ativos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Gerenciamento de Motoristas
            </CardTitle>
            <Button variant="outline" size="sm" onClick={loadMotoristas}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, usuário ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="animate-pulse">Carregando...</div>
                    </TableCell>
                  </TableRow>
                ) : filteredMotoristas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum motorista encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMotoristas.map((motorista) => (
                    <TableRow key={motorista.id}>
                      <TableCell className="font-medium">{motorista.nome}</TableCell>
                      <TableCell className="font-mono text-sm">{motorista.username}</TableCell>
                      <TableCell className="font-mono text-sm">{formatCPF(motorista.cpf)}</TableCell>
                      <TableCell>{formatPhone(motorista.telefone)}</TableCell>
                      <TableCell>{getStatusBadge(motorista.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShowDetails(motorista)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {motorista.status === 'pendente' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleStatusChange(motorista, 'ativo')}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Aprovar
                            </Button>
                          )}
                          {motorista.status === 'ativo' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleStatusChange(motorista, 'inativo')}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Desativar
                            </Button>
                          )}
                          {motorista.status === 'inativo' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(motorista, 'ativo')}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Reativar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Motorista</DialogTitle>
          </DialogHeader>
          {selectedMotorista && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{selectedMotorista.nome}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Usuário</p>
                  <p className="font-mono">{selectedMotorista.username}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">CPF</p>
                  <p className="font-mono">{formatCPF(selectedMotorista.cpf)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p>{formatPhone(selectedMotorista.telefone)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedMotorista.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cadastrado em</p>
                  <p>{new Date(selectedMotorista.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMotoristas;