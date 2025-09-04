import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Truck, Package, MapPin, Phone, LogOut, CheckCircle, Clock, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MotoristaSession {
  id: string;
  nome: string;
  email: string;
  status: string;
}

interface Remessa {
  id: string;
  tracking_code: string;
  status: string;
  created_at: string;
  sender_address: {
    name: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
    phone?: string;
  };
  recipient_address: {
    name: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
    phone?: string;
  };
  weight: number;
  quote_data: any;
}

const MotoristaDashboard = () => {
  const navigate = useNavigate();
  const [motoristaSession, setMotoristaSession] = useState<MotoristaSession | null>(null);
  const [remessas, setRemessas] = useState<Remessa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check motorista session
    const sessionData = localStorage.getItem('motorista_session');
    if (!sessionData) {
      navigate('/motorista/auth');
      return;
    }

    const session = JSON.parse(sessionData);
    setMotoristaSession(session);
    loadMinhasRemessas(session.id);
  }, [navigate]);

  const loadMinhasRemessas = async (motoristaId: string) => {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          sender_address:addresses!shipments_sender_address_id_fkey(*),
          recipient_address:addresses!shipments_recipient_address_id_fkey(*)
        `)
        .eq('motorista_id', motoristaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRemessas(data || []);
    } catch (error) {
      console.error('Erro ao carregar remessas:', error);
      toast.error('Erro ao carregar suas coletas');
    } finally {
      setLoading(false);
    }
  };

  const updateRemessaStatus = async (remessaId: string, newStatus: string, observacoes?: string) => {
    if (!motoristaSession) return;

    try {
      // Update shipment status
      const { error: shipmentError } = await supabase
        .from('shipments')
        .update({ status: newStatus })
        .eq('id', remessaId);

      if (shipmentError) throw shipmentError;

      // Add to status history
      const { error: historyError } = await supabase
        .from('shipment_status_history')
        .insert([{
          shipment_id: remessaId,
          status: newStatus,
          motorista_id: motoristaSession.id,
          observacoes
        }]);

      if (historyError) throw historyError;

      toast.success('Status atualizado com sucesso!');
      loadMinhasRemessas(motoristaSession.id);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleLogout = async () => {
    try {
      // Só limpar localStorage, não precisamos do Supabase auth
      localStorage.removeItem('motorista_session');
      navigate('/motorista/auth');
      toast.success('Logout realizado com sucesso');
    } catch (error) {
      console.error('Erro no logout:', error);
      localStorage.removeItem('motorista_session');
      navigate('/motorista/auth');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any; icon: any }> = {
      'PENDING_LABEL': { label: 'Pendente', variant: 'secondary', icon: Clock },
      'COLETA_ACEITA': { label: 'Coleta Aceita', variant: 'default', icon: CheckCircle },
      'COLETA_FINALIZADA': { label: 'Coleta Finalizada', variant: 'default', icon: Package },
      'ENTREGA_FINALIZADA': { label: 'Entrega Finalizada', variant: 'default', icon: CheckCircle }
    };

    const config = statusConfig[status] || { label: status, variant: 'outline', icon: Package };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getAvailableActions = (status: string, remessaId: string) => {
    const actions = [];

    switch (status) {
      case 'PENDING_LABEL':
      case 'LABEL_GENERATED':
        actions.push(
          <Button
            key="aceitar"
            size="sm"
            onClick={() => updateRemessaStatus(remessaId, 'COLETA_ACEITA')}
          >
            Aceitar Coleta
          </Button>
        );
        break;
      case 'COLETA_ACEITA':
        actions.push(
          <Button
            key="finalizar-coleta"
            size="sm"
            onClick={() => updateRemessaStatus(remessaId, 'COLETA_FINALIZADA')}
          >
            Finalizar Coleta
          </Button>
        );
        break;
      case 'COLETA_FINALIZADA':
        actions.push(
          <Button
            key="confirmar-entrega"
            size="sm"
            onClick={() => updateRemessaStatus(remessaId, 'ENTREGA_FINALIZADA')}
          >
            Confirmar Entrega
          </Button>
        );
        break;
    }

    return actions;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background/80 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-8 w-32 bg-muted rounded mx-auto mb-4"></div>
          <div className="h-4 w-24 bg-muted rounded mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Truck className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold">Portal do Motorista</h1>
              <p className="text-sm text-muted-foreground">
                Bem-vindo, {motoristaSession?.nome}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Minhas Coletas</h2>
          <p className="text-muted-foreground">
            Gerencie suas coletas e entregas atribuídas
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/20">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                  <p className="text-xl font-bold">
                    {remessas.filter(r => ['PENDING_LABEL', 'LABEL_GENERATED'].includes(r.status)).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Em Andamento</p>
                  <p className="text-xl font-bold">
                    {remessas.filter(r => ['COLETA_ACEITA', 'COLETA_FINALIZADA'].includes(r.status)).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Concluídas</p>
                  <p className="text-xl font-bold">
                    {remessas.filter(r => r.status === 'ENTREGA_FINALIZADA').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Remessas Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Remessas</CardTitle>
          </CardHeader>
          <CardContent>
            {remessas.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Nenhuma coleta atribuída</p>
                <p className="text-muted-foreground">
                  Aguarde novas remessas serem designadas para você.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Remetente</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Endereços</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {remessas.map((remessa) => (
                    <TableRow key={remessa.id}>
                      <TableCell className="font-mono">
                        {remessa.tracking_code || 'Pendente'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{remessa.sender_address.name}</p>
                          {remessa.sender_address.phone && (
                            <p className="text-sm text-muted-foreground flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {remessa.sender_address.phone}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{remessa.recipient_address.name}</p>
                          {remessa.recipient_address.phone && (
                            <p className="text-sm text-muted-foreground flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {remessa.recipient_address.phone}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            <p className="font-medium flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              Coleta
                            </p>
                            <p className="text-muted-foreground">
                              {remessa.sender_address.street}, {remessa.sender_address.number}
                            </p>
                            <p className="text-muted-foreground">
                              {remessa.sender_address.neighborhood}, {remessa.sender_address.city}
                            </p>
                          </div>
                          <div className="text-sm">
                            <p className="font-medium flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              Entrega
                            </p>
                            <p className="text-muted-foreground">
                              {remessa.recipient_address.street}, {remessa.recipient_address.number}
                            </p>
                            <p className="text-muted-foreground">
                              {remessa.recipient_address.neighborhood}, {remessa.recipient_address.city}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(remessa.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3 mr-1" />
                          {format(new Date(remessa.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {getAvailableActions(remessa.status, remessa.id)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MotoristaDashboard;