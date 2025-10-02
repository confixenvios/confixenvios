import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Plus, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface B2BClient {
  id: string;
  company_name: string;
  email: string;
}

interface B2BShipment {
  id: string;
  tracking_code: string;
  recipient_name: string;
  recipient_city: string;
  recipient_state: string;
  delivery_type: string;
  status: string;
  created_at: string;
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      PENDENTE: { variant: 'secondary', label: 'Pendente' },
      EM_TRANSITO: { variant: 'default', label: 'Em Trânsito' },
      CONCLUIDA: { variant: 'outline', label: 'Concluída' },
      CANCELADA: { variant: 'destructive', label: 'Cancelada' },
    };
    const config = variants[status] || variants.PENDENTE;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getDeliveryTypeLabel = (type: string) => {
    return type === 'mesmo_dia' ? 'Mesmo Dia' : 'Próximo Dia';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_shipments || 0}</div>
              <p className="text-xs text-muted-foreground">remessas cadastradas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pending_shipments || 0}</div>
              <p className="text-xs text-muted-foreground">aguardando coleta</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Trânsito</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.in_transit_shipments || 0}</div>
              <p className="text-xs text-muted-foreground">em andamento</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.month_shipments || 0}</div>
              <p className="text-xs text-muted-foreground">remessas no mês</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Remessas Recentes</CardTitle>
                <CardDescription>Suas últimas remessas cadastradas</CardDescription>
              </div>
              <Button onClick={() => navigate('/b2b-expresso/nova-remessa')}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Remessa
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {shipments.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">Nenhuma remessa cadastrada ainda</p>
                <Button onClick={() => navigate('/b2b-expresso/nova-remessa')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar Primeira Remessa
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {shipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-mono text-sm font-semibold">{shipment.tracking_code}</p>
                        {getStatusBadge(shipment.status)}
                        <Badge variant="outline" className="text-xs">
                          {getDeliveryTypeLabel(shipment.delivery_type)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <strong>{shipment.recipient_name}</strong> - {shipment.recipient_city}/{shipment.recipient_state}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(shipment.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
};

export default B2BDashboard;
