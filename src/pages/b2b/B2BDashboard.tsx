import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Package, Plus, Clock, CheckCircle, Send, Eye, Loader2, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import B2BLabelGenerator from '@/components/b2b/B2BLabelGenerator';

interface B2BClient {
  id: string;
  company_name: string;
  email: string;
  phone: string | null;
  cnpj: string | null;
}

interface B2BShipment {
  id: string;
  tracking_code: string;
  recipient_name: string | null;
  recipient_city: string | null;
  recipient_state: string | null;
  delivery_type: string | null;
  status: string;
  created_at: string;
  volume_count: number | null;
  delivery_date: string | null;
  package_type: string | null;
  observations: string | null;
}

interface Stats {
  total_shipments: number;
  pending_shipments: number;
  in_transit_shipments: number;
  completed_shipments: number;
  month_shipments: number;
}

const B2BDashboard = () => {
  const navigate = useNavigate();
  const [client, setClient] = useState<B2BClient | null>(null);
  const [shipments, setShipments] = useState<B2BShipment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingWebhook, setSendingWebhook] = useState<string | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<B2BShipment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadClientData();
  }, []);

  const loadClientData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/b2b-expresso');
        return;
      }

      // Buscar dados do cliente
      const { data: clientData, error: clientError } = await supabase
        .from('b2b_clients')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (clientError || !clientData) {
        toast.error('Cliente não encontrado');
        await supabase.auth.signOut();
        navigate('/b2b-expresso');
        return;
      }

      setClient(clientData);

      // Buscar estatísticas
      const { data: statsData } = await supabase
        .rpc('get_b2b_client_stats', { client_id: clientData.id });

      if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }

      // Buscar remessas
      const { data: shipmentsData, error: shipmentsError } = await supabase
        .from('b2b_shipments')
        .select('*')
        .eq('b2b_client_id', clientData.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (shipmentsError) throw shipmentsError;
      setShipments(shipmentsData || []);
    } catch (error: any) {
      toast.error('Erro ao carregar dados');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const parseObservations = (observations: string | null) => {
    if (!observations) return null;
    try {
      return JSON.parse(observations);
    } catch {
      return null;
    }
  };

  const handleSendWebhook = async (shipment: B2BShipment) => {
    setSendingWebhook(shipment.id);
    
    try {
      const observations = parseObservations(shipment.observations);
      
      // Montar os parâmetros para o webhook
      const params = new URLSearchParams({
        shipment_id: shipment.id,
        tracking_code: shipment.tracking_code || '',
        status: shipment.status || '',
        volume_count: String(shipment.volume_count || 0),
        delivery_date: shipment.delivery_date || '',
        created_at: shipment.created_at || '',
        client_company: client?.company_name || '',
        client_email: client?.email || '',
        client_phone: client?.phone || '',
        client_cnpj: client?.cnpj || '',
        vehicle_type: observations?.vehicle_type || '',
        delivery_ceps: observations?.delivery_ceps?.join(',') || '',
        volume_weights: observations?.volume_weights?.join(',') || '',
        total_weight: String(observations?.total_weight || 0),
        amount_paid: String(observations?.amount_paid || 0),
      });

      const webhookUrl = `https://n8n.grupoconfix.com/webhook-test/42283b42-a19e-4be5-8cd2-367d9dbe0511?${params.toString()}`;
      
      const response = await fetch(webhookUrl, {
        method: 'GET',
      });

      if (response.ok) {
        toast.success('Webhook enviado com sucesso!');
      } else {
        toast.error('Erro ao enviar webhook');
      }
    } catch (error) {
      console.error('Erro ao enviar webhook:', error);
      toast.error('Erro ao enviar webhook');
    } finally {
      setSendingWebhook(null);
    }
  };

  const handleShowDetails = (shipment: B2BShipment) => {
    setSelectedShipment(shipment);
    setShowDetailsModal(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      PENDENTE: { variant: 'secondary', label: 'Pendente' },
      PAGO: { variant: 'default', label: 'Pago' },
      EM_TRANSITO: { variant: 'default', label: 'Em Trânsito' },
      CONCLUIDA: { variant: 'outline', label: 'Concluída' },
      CANCELADA: { variant: 'destructive', label: 'Cancelada' },
    };
    const config = variants[status] || variants.PENDENTE;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPackageTypeLabel = (type: string | null) => {
    if (!type) return null;
    const labels: Record<string, string> = {
      envelope: 'Envelope',
      documento: 'Documento',
      caixa_pequena: 'Caixa Pequena',
      caixa_media: 'Caixa Média',
      caixa_grande: 'Caixa Grande',
      peca: 'Peça',
      eletronico: 'Eletrônico',
      medicamento: 'Medicamento',
      fragil: 'Frágil',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Package className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Envios Recentes</CardTitle>
              <CardDescription>Suas últimas solicitações de coleta</CardDescription>
            </div>
            <Button onClick={() => navigate('/b2b-expresso/nova-remessa')}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Envio
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {shipments.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">Nenhum envio cadastrado ainda</p>
              <Button onClick={() => navigate('/b2b-expresso/nova-remessa')}>
                <Plus className="mr-2 h-4 w-4" />
                Solicitar Primeira Coleta
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {shipments.map((shipment) => {
                return (
                  <div
                    key={shipment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-mono text-sm font-semibold">{shipment.tracking_code}</p>
                        {shipment.volume_count && (
                          <Badge variant="outline" className="text-xs">
                            {shipment.volume_count} volume(s)
                          </Badge>
                        )}
                        {getPackageTypeLabel(shipment.package_type) && (
                          <Badge variant="secondary" className="text-xs">
                            {getPackageTypeLabel(shipment.package_type)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {shipment.recipient_name ? (
                          <>
                            <strong>{shipment.recipient_name}</strong> - {shipment.recipient_city}/{shipment.recipient_state}
                          </>
                        ) : (
                          <>
                            {shipment.volume_count && `${shipment.volume_count} volume(s)`}
                            {shipment.delivery_date && ` - Entrega: ${format(new Date(shipment.delivery_date), 'dd/MM/yyyy')}`}
                          </>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(shipment.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShowDetails(shipment)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
          </DialogHeader>
          {selectedShipment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Código de Rastreio</p>
                  <p className="font-mono font-semibold">{selectedShipment.tracking_code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Volumes</p>
                  <p className="font-semibold">{selectedShipment.volume_count || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Data de Entrega</p>
                  <p className="font-semibold">
                    {selectedShipment.delivery_date 
                      ? format(new Date(selectedShipment.delivery_date), 'dd/MM/yyyy')
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Criado em</p>
                  <p className="font-semibold">
                    {format(new Date(selectedShipment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>

              {(() => {
                const obs = parseObservations(selectedShipment.observations);
                if (!obs) return null;
                
                return (
                  <>
                    <hr className="border-border" />
                    <h4 className="font-semibold">Dados do Pagamento</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Veículo</p>
                        <p className="font-semibold capitalize">{obs.vehicle_type || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Valor Pago</p>
                        <p className="font-semibold text-green-600">
                          R$ {obs.amount_paid?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Peso Total</p>
                        <p className="font-semibold">{obs.total_weight?.toFixed(2) || '0'} kg</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pesos por Volume</p>
                        <p className="font-semibold text-sm">
                          {obs.volume_weights?.map((w: number, i: number) => `${w}kg`).join(', ') || '-'}
                        </p>
                      </div>
                    </div>

                    {obs.volume_addresses && obs.volume_addresses.length > 0 && (
                      <>
                        <hr className="border-border" />
                        <h4 className="font-semibold">Endereços de Entrega por Volume</h4>
                        <div className="space-y-3">
                          {obs.volume_addresses.map((addr: any, index: number) => (
                            <div key={index} className="p-3 bg-muted/30 rounded-lg border">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">Volume {index + 1}</Badge>
                                {obs.volume_weights?.[index] && (
                                  <span className="text-xs text-muted-foreground">({obs.volume_weights[index]}kg)</span>
                                )}
                              </div>
                              <p className="text-sm font-semibold">{addr?.recipient_name || addr?.name || '-'}</p>
                              <p className="text-xs text-muted-foreground">{addr?.recipient_phone || '-'}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {addr?.street}, {addr?.number}
                                {addr?.complement && `, ${addr.complement}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {addr?.neighborhood} - {addr?.city}/{addr?.state}
                              </p>
                              <p className="text-xs text-muted-foreground">CEP: {addr?.cep}</p>
                            </div>
                          ))}
                      </div>
                    </>
                  )}

                  {/* Gerador de Etiquetas */}
                  {obs && obs.volume_addresses && obs.volume_addresses.length > 0 && obs.pickup_address && (
                    <>
                      <hr className="border-border" />
                      <h4 className="font-semibold">Etiquetas</h4>
                      <B2BLabelGenerator
                        trackingCode={selectedShipment.tracking_code}
                        volumeCount={selectedShipment.volume_count || 1}
                        volumeWeights={obs.volume_weights || []}
                        volumeAddresses={obs.volume_addresses || []}
                        pickupAddress={obs.pickup_address || {}}
                        companyName={client?.company_name || 'Remetente'}
                        deliveryDate={selectedShipment.delivery_date || undefined}
                      />
                    </>
                  )}
                </>
              );
            })()}

              <hr className="border-border" />
              <h4 className="font-semibold">Dados do Cliente</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Empresa</p>
                  <p className="font-semibold">{client?.company_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CNPJ</p>
                  <p className="font-semibold">{client?.cnpj || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-semibold text-sm">{client?.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-semibold">{client?.phone || '-'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default B2BDashboard;
