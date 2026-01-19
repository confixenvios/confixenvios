import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  ArrowRight,
  Calendar,
  MapPin
} from 'lucide-react';

interface CarrierPartner {
  id: string;
  email: string;
  company_name: string;
  cnpj: string | null;
  contact_name: string | null;
  phone: string | null;
  status: string;
  logo_url: string | null;
}

interface DashboardStats {
  pending: number;
  inTransit: number;
  delivered: number;
  occurrences: number;
  totalToday: number;
  totalMonth: number;
}

interface RecentShipment {
  id: string;
  tracking_code: string;
  status: string;
  created_at: string;
  recipient_city: string;
  recipient_state: string;
}

const ParceirosDashboard = () => {
  const navigate = useNavigate();
  const { partner } = useOutletContext<{ partner: CarrierPartner }>();
  const [stats, setStats] = useState<DashboardStats>({
    pending: 0,
    inTransit: 0,
    delivered: 0,
    occurrences: 0,
    totalToday: 0,
    totalMonth: 0
  });
  const [recentShipments, setRecentShipments] = useState<RecentShipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (partner) {
      loadDashboardData();
    }
  }, [partner]);

  const loadDashboardData = async () => {
    try {
      // Load all shipments and filter by selectedCarrier in quote_data
      const { data: allShipments, error } = await supabase
        .from('shipments')
        .select(`
          id,
          tracking_code,
          status,
          created_at,
          recipient_address_id,
          quote_data
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Filter shipments that have jadlog as selectedCarrier
      const shipments = allShipments?.filter(s => {
        const quoteData = s.quote_data as any;
        const selectedCarrier = quoteData?.deliveryDetails?.selectedCarrier || 
                                quoteData?.selectedCarrier;
        return selectedCarrier?.toLowerCase() === 'jadlog';
      }) || [];

      if (error) throw error;

      // Calculate stats
      const pending = shipments?.filter(s => s.status === 'pending' || s.status === 'paid').length || 0;
      const inTransit = shipments?.filter(s => s.status === 'in_transit' || s.status === 'accepted').length || 0;
      const delivered = shipments?.filter(s => s.status === 'delivered').length || 0;
      
      // Count today's shipments
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const totalToday = shipments?.filter(s => new Date(s.created_at) >= today).length || 0;

      // Count this month's shipments
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const totalMonth = shipments?.filter(s => new Date(s.created_at) >= firstOfMonth).length || 0;

      setStats({
        pending,
        inTransit,
        delivered,
        occurrences: 0, // TODO: implement occurrences count
        totalToday,
        totalMonth
      });

      // Get recent shipments with address info
      if (shipments && shipments.length > 0) {
        const recentWithAddresses: RecentShipment[] = [];
        
        for (const shipment of shipments.slice(0, 5)) {
          const { data: address } = await supabase
            .from('addresses')
            .select('city, state')
            .eq('id', shipment.recipient_address_id)
            .single();

          recentWithAddresses.push({
            id: shipment.id,
            tracking_code: shipment.tracking_code || 'N/A',
            status: shipment.status,
            created_at: shipment.created_at,
            recipient_city: address?.city || 'N/A',
            recipient_state: address?.state || 'N/A'
          });
        }

        setRecentShipments(recentWithAddresses);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pendente', variant: 'secondary' },
      paid: { label: 'Pago', variant: 'default' },
      accepted: { label: 'Aceito', variant: 'default' },
      in_transit: { label: 'Em Trânsito', variant: 'default' },
      delivered: { label: 'Entregue', variant: 'secondary' },
      cancelled: { label: 'Cancelado', variant: 'destructive' }
    };
    
    const config = statusConfig[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-red-100 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-red-50 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo ao portal de parceiros, {partner?.company_name}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {new Date().toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-amber-500"
          onClick={() => navigate('/parceiros/pendentes')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
            <Clock className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando coleta</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-blue-500"
          onClick={() => navigate('/parceiros/em-transito')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Trânsito</CardTitle>
            <Truck className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.inTransit}</div>
            <p className="text-xs text-muted-foreground mt-1">Em transporte</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-green-500"
          onClick={() => navigate('/parceiros/realizadas')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Entregues</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.delivered}</div>
            <p className="text-xs text-muted-foreground mt-1">Finalizadas</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-red-500"
          onClick={() => navigate('/parceiros/ocorrencias')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ocorrências</CardTitle>
            <AlertCircle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.occurrences}</div>
            <p className="text-xs text-muted-foreground mt-1">Requer atenção</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Resumo do Período
            </CardTitle>
            <CardDescription>Visão geral das entregas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Hoje</p>
                    <p className="text-xs text-muted-foreground">Entregas solicitadas</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-foreground">{stats.totalToday}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Este Mês</p>
                    <p className="text-xs text-muted-foreground">Total de entregas</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-foreground">{stats.totalMonth}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Shipments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Entregas Recentes</CardTitle>
              <CardDescription>Últimas solicitações</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/parceiros/pendentes')}>
              Ver todas
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentShipments.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma entrega encontrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentShipments.map((shipment) => (
                  <div 
                    key={shipment.id} 
                    className="flex items-center justify-between p-3 bg-red-50/50 rounded-lg hover:bg-red-100/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{shipment.tracking_code}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {shipment.recipient_city}/{shipment.recipient_state}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(shipment.status)}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(shipment.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ParceirosDashboard;