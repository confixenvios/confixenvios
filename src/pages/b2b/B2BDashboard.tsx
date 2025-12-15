import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package, Plus, Clock, CheckCircle, Send, Eye, Loader2, FileDown, History } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import B2BStatusHistory from '@/components/b2b/B2BStatusHistory';
import B2BStatusBadge from '@/components/b2b/B2BStatusBadge';

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
  status: string;
  created_at: string;
  total_volumes: number;
  delivery_date: string | null;
  observations: string | null;
  total_weight: number;
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
        .select('id, tracking_code, status, created_at, total_volumes, delivery_date, observations, total_weight')
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

  const handleShowDetails = (shipment: B2BShipment) => {
    setSelectedShipment(shipment);
    setShowDetailsModal(true);
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
                const obs = parseObservations(shipment.observations);
                return (
                  <div
                    key={shipment.id}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-mono text-sm font-semibold">{shipment.tracking_code}</p>
                        <Badge variant="outline" className="text-xs">
                          {shipment.total_volumes} volume(s)
                        </Badge>
                      </div>
                      <B2BStatusBadge status={shipment.status} showIcon size="sm" />
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {shipment.delivery_date 
                        ? `Entrega: ${format(new Date(shipment.delivery_date), 'dd/MM/yyyy')}`
                        : 'Data de entrega não definida'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(shipment.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-3">
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
        <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>Detalhes do Pedido</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[calc(85vh-100px)] px-6 py-4">
          {selectedShipment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Código de Rastreio</p>
                  <p className="font-mono font-semibold">{selectedShipment.tracking_code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Volumes</p>
                  <p className="font-semibold">{selectedShipment.total_volumes || '-'}</p>
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

              <hr className="border-border" />
              <h4 className="font-semibold">Histórico de Status</h4>
              <B2BStatusHistory shipmentId={selectedShipment.id} />
            </div>
          )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default B2BDashboard;
