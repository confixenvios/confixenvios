import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Truck, Package, MapPin, Phone, LogOut, CheckCircle, Clock, Calendar, Eye } from 'lucide-react';
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
  weight: number;
  length: number;
  width: number;
  height: number;
  format: string;
  selected_option: string;
  pickup_option: string;
  sender_address: {
    name: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
    complement?: string;
    reference?: string;
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
    complement?: string;
    reference?: string;
    phone?: string;
  };
  quote_data: any;
  payment_data: any;
  cte_key?: string;
}

const MotoristaDashboard = () => {
  const navigate = useNavigate();
  const [motoristaSession, setMotoristaSession] = useState<MotoristaSession | null>(null);
  const [remessas, setRemessas] = useState<Remessa[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRemessa, setSelectedRemessa] = useState<Remessa | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

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
        .rpc('get_motorista_shipments', { 
          motorista_uuid: motoristaId 
        });

      if (error) throw error;
      
      // Transformar os dados para o formato esperado pelo componente
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        sender_address: item.sender_address || {},
        recipient_address: item.recipient_address || {}
      }));
      
      setRemessas(transformedData);
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

  const getAvailableActions = (status: string, remessaId: string, remessa: Remessa) => {
    const actions = [];

    // Adicionar botão de detalhes sempre
    actions.push(
      <Button
        key="detalhes"
        variant="outline"
        size="sm"
        onClick={() => {
          setSelectedRemessa(remessa);
          setDetailsModalOpen(true);
        }}
      >
        <Eye className="h-3 w-3 mr-1" />
        Ver Detalhes
      </Button>
    );

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount / 100);
  };

  const getStatusBadgeForDetails = (status: string) => {
    const statusConfig = {
      'PENDING_LABEL': { variant: 'secondary', label: 'Pendente' },
      'PENDING_DOCUMENT': { variant: 'destructive', label: 'Aguardando Documento' },
      'PENDING_PAYMENT': { variant: 'destructive', label: 'Aguardando Pagamento' },
      'PAYMENT_CONFIRMED': { variant: 'success', label: 'Pagamento Confirmado' },
      'PAGO_AGUARDANDO_ETIQUETA': { variant: 'secondary', label: 'Aguardando Etiqueta' },
      'LABEL_AVAILABLE': { variant: 'success', label: 'Etiqueta Disponível' },
      'IN_TRANSIT': { variant: 'default', label: 'Em Trânsito' },
      'DELIVERED': { variant: 'success', label: 'Entregue' },
      'PAID': { variant: 'success', label: 'Pago' },
      'COLETA_ACEITA': { variant: 'default', label: 'Coleta Aceita' },
      'COLETA_FINALIZADA': { variant: 'default', label: 'Coleta Finalizada' },
      'ENTREGA_FINALIZADA': { variant: 'success', label: 'Entrega Finalizada' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
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

        {/* Remessas Cards */}
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
              <div className="space-y-4">
                {remessas.map((remessa) => (
                  <Card key={remessa.id} className="border-border/30 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-lg">
                              {remessa.tracking_code || `ID${remessa.id.slice(0, 8).toUpperCase()}`}
                            </h3>
                            {getStatusBadge(remessa.status)}
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4 mr-2" />
                            <span className="font-medium">Criado em:</span>
                            <span className="ml-1">{format(new Date(remessa.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {getAvailableActions(remessa.status, remessa.id, remessa)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="space-y-1">
                          <p className="font-medium text-muted-foreground">Remetente</p>
                          <p className="font-medium">{remessa.sender_address?.name || 'Nome não informado'}</p>
                          <div className="flex items-center text-muted-foreground">
                            <MapPin className="w-3 h-3 mr-1" />
                            {remessa.sender_address?.city ? 
                              `${remessa.sender_address.city} - ${remessa.sender_address.state}` : 
                              'Cidade não informada'
                            }
                          </div>
                          {remessa.sender_address?.phone && (
                            <div className="flex items-center text-muted-foreground">
                              <Phone className="w-3 h-3 mr-1" />
                              {remessa.sender_address.phone}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <p className="font-medium text-muted-foreground">Destinatário</p>
                          <p className="font-medium">{remessa.recipient_address?.name || 'Nome não informado'}</p>
                          <div className="flex items-center text-muted-foreground">
                            <MapPin className="w-3 h-3 mr-1" />
                            {remessa.recipient_address?.city ? 
                              `${remessa.recipient_address.city} - ${remessa.recipient_address.state}` : 
                              'Cidade não informada'
                            }
                          </div>
                          {remessa.recipient_address?.phone && (
                            <div className="flex items-center text-muted-foreground">
                              <Phone className="w-3 h-3 mr-1" />
                              {remessa.recipient_address.phone}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <p className="font-medium text-muted-foreground">Informações</p>
                          <div className="flex items-center text-muted-foreground">
                            <Package className="w-3 h-3 mr-1" />
                            Peso: {remessa.weight}kg
                          </div>
                          <div className="flex items-center text-muted-foreground">
                            <Truck className="w-3 h-3 mr-1" />
                            {remessa.selected_option === 'express' ? 'Expresso' : 'Econômico'}
                          </div>
                          {(() => {
                            // Tentar obter o valor do frete de várias fontes
                            let amount = null;
                            
                            if (remessa.payment_data?.pixData?.amount) {
                              amount = remessa.payment_data.pixData.amount;
                            } else if (remessa.payment_data?.amount) {
                              amount = remessa.payment_data.amount;
                            } else if (remessa.quote_data?.amount) {
                              amount = remessa.quote_data.amount * 100;
                            } else if (remessa.quote_data?.shippingQuote) {
                              const price = remessa.selected_option === 'express' 
                                ? remessa.quote_data.shippingQuote.expressPrice 
                                : remessa.quote_data.shippingQuote.economicPrice;
                              amount = price * 100;
                            } else if (remessa.quote_data?.totalPrice) {
                              amount = remessa.quote_data.totalPrice * 100;
                            }

                            return amount ? (
                              <p className="font-medium text-success">
                                {formatCurrency(amount)}
                              </p>
                            ) : (
                              <p className="font-medium text-muted-foreground">Valor não disponível</p>
                            );
                          })()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Detalhes da Remessa */}
        <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Detalhes da Remessa - {selectedRemessa?.tracking_code || `ID${selectedRemessa?.id.slice(0, 8).toUpperCase()}`}
              </DialogTitle>
            </DialogHeader>
            
            <ScrollArea className="max-h-[60vh] pr-4">
              {selectedRemessa && (
                <div className="space-y-6">
                  {/* Informações Gerais */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Informações Gerais</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Código de Rastreamento</p>
                        <p className="font-medium">{selectedRemessa.tracking_code || `ID${selectedRemessa.id.slice(0, 8).toUpperCase()}`}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <div className="mt-1">{getStatusBadgeForDetails(selectedRemessa.status)}</div>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Data de Criação</p>
                        <p className="font-medium">{formatDate(selectedRemessa.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tipo de Serviço</p>
                        <p className="font-medium">{selectedRemessa.selected_option === 'standard' ? 'Econômico' : 'Expresso'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Opção de Coleta</p>
                        <p className="font-medium">{selectedRemessa.pickup_option === 'dropoff' ? 'Entrega no Hub' : 'Coleta no Local'}</p>
                      </div>
                      {selectedRemessa.cte_key && (
                        <div>
                          <p className="text-muted-foreground">Chave CTE</p>
                          <p className="font-medium font-mono text-xs">{selectedRemessa.cte_key}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Dados do Remetente */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Dados do Remetente</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Nome</p>
                        <p className="font-medium">{selectedRemessa.sender_address?.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">CEP</p>
                        <p className="font-medium">{selectedRemessa.sender_address?.cep}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Endereço</p>
                        <p className="font-medium">
                          {selectedRemessa.sender_address?.street}, {selectedRemessa.sender_address?.number}
                          {selectedRemessa.sender_address?.complement && `, ${selectedRemessa.sender_address.complement}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Bairro</p>
                        <p className="font-medium">{selectedRemessa.sender_address?.neighborhood}</p>
                      </div>
                       <div>
                         <p className="text-muted-foreground">Cidade/Estado</p>
                         <p className="font-medium">
                           {selectedRemessa.sender_address?.city && selectedRemessa.sender_address?.city !== 'A definir' ? 
                             `${selectedRemessa.sender_address.city} - ${selectedRemessa.sender_address.state}` : 
                             selectedRemessa.quote_data?.senderData?.city ? 
                               `${selectedRemessa.quote_data.senderData.city} - ${selectedRemessa.quote_data.senderData.state}` :
                               'Goiânia - GO'
                           }
                         </p>
                       </div>
                      {selectedRemessa.sender_address?.phone && (
                        <div>
                          <p className="text-muted-foreground">Telefone</p>
                          <p className="font-medium flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {selectedRemessa.sender_address.phone}
                          </p>
                        </div>
                      )}
                      {selectedRemessa.sender_address?.reference && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Referência</p>
                          <p className="font-medium">{selectedRemessa.sender_address.reference}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Dados do Destinatário */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Dados do Destinatário</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Nome</p>
                        <p className="font-medium">{selectedRemessa.recipient_address?.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">CEP</p>
                        <p className="font-medium">{selectedRemessa.recipient_address?.cep}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Endereço</p>
                        <p className="font-medium">
                          {selectedRemessa.recipient_address?.street}, {selectedRemessa.recipient_address?.number}
                          {selectedRemessa.recipient_address?.complement && `, ${selectedRemessa.recipient_address.complement}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Bairro</p>
                        <p className="font-medium">{selectedRemessa.recipient_address?.neighborhood}</p>
                      </div>
                       <div>
                         <p className="text-muted-foreground">Cidade/Estado</p>
                         <p className="font-medium">
                           {selectedRemessa.recipient_address?.city && selectedRemessa.recipient_address?.city !== 'A definir' ? 
                             `${selectedRemessa.recipient_address.city} - ${selectedRemessa.recipient_address.state}` : 
                             selectedRemessa.quote_data?.recipientData?.city ? 
                               `${selectedRemessa.quote_data.recipientData.city} - ${selectedRemessa.quote_data.recipientData.state}` :
                               selectedRemessa.quote_data?.shippingQuote?.zoneName || 'N/A'
                           }
                         </p>
                       </div>
                      {selectedRemessa.recipient_address?.phone && (
                        <div>
                          <p className="text-muted-foreground">Telefone</p>
                          <p className="font-medium flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {selectedRemessa.recipient_address.phone}
                          </p>
                        </div>
                      )}
                      {selectedRemessa.recipient_address?.reference && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Referência</p>
                          <p className="font-medium">{selectedRemessa.recipient_address.reference}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Dados do Pacote */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Dados do Pacote</h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Peso</p>
                        <p className="font-medium">{selectedRemessa.weight}kg</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Comprimento</p>
                        <p className="font-medium">{selectedRemessa.length}cm</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Largura</p>
                        <p className="font-medium">{selectedRemessa.width}cm</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Altura</p>
                        <p className="font-medium">{selectedRemessa.height}cm</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Formato</p>
                        <p className="font-medium capitalize">{selectedRemessa.format}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Dados de Pagamento */}
                  {selectedRemessa.payment_data && (
                    <>
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Dados de Pagamento</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Método de Pagamento</p>
                            <p className="font-medium">{selectedRemessa.payment_data.method?.toUpperCase()}</p>
                          </div>
                          {selectedRemessa.payment_data.amount && (
                            <div>
                              <p className="text-muted-foreground">Valor Pago</p>
                              <p className="font-medium">{formatCurrency(selectedRemessa.payment_data.amount)}</p>
                            </div>
                          )}
                          {selectedRemessa.payment_data.paidAt && (
                            <div>
                              <p className="text-muted-foreground">Data do Pagamento</p>
                              <p className="font-medium">{formatDate(selectedRemessa.payment_data.paidAt)}</p>
                            </div>
                          )}
                          {selectedRemessa.payment_data.status && (
                            <div>
                              <p className="text-muted-foreground">Status do Pagamento</p>
                              <p className="font-medium">{selectedRemessa.payment_data.status === 'paid' ? 'PAGO' : selectedRemessa.payment_data.status}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* Dados da Cotação */}
                  {selectedRemessa.quote_data && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Dados da Cotação</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {selectedRemessa.quote_data.shippingQuote && (
                          <>
                            <div>
                              <p className="text-muted-foreground">Zona de Entrega</p>
                              <p className="font-medium">{selectedRemessa.quote_data.shippingQuote.zoneName} ({selectedRemessa.quote_data.shippingQuote.zone})</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Prazo Econômico</p>
                              <p className="font-medium">{selectedRemessa.quote_data.shippingQuote.economicDays} dias</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Prazo Expresso</p>
                              <p className="font-medium">{selectedRemessa.quote_data.shippingQuote.expressDays} dias</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Preço Original</p>
                              <p className="font-medium">R$ {selectedRemessa.quote_data.shippingQuote.economicPrice.toFixed(2).replace('.', ',')}</p>
                            </div>
                          </>
                        )}
                        {selectedRemessa.quote_data.totalMerchandiseValue && (
                          <div>
                            <p className="text-muted-foreground">Valor da Mercadoria</p>
                            <p className="font-medium">R$ {selectedRemessa.quote_data.totalMerchandiseValue.toFixed(2).replace('.', ',')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default MotoristaDashboard;