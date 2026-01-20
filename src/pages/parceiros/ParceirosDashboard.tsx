import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getStatusTranslation } from '@/utils/shipmentStatusTranslations';
import PeriodFilterComponent, { 
  PeriodFilter, 
  getDateRangeFromPeriod
} from '@/components/parceiros/PeriodFilter';
import { 
  Package, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  ArrowRight,
  Calendar,
  MapPin,
  X
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
  delivered: number;
  totalToday: number;
  totalPeriod: number;
  totalValue: number;
}

interface RecentShipment {
  id: string;
  tracking_code: string;
  status: string;
  created_at: string;
  recipient_city: string;
  recipient_state: string;
  freight_value: number;
}

const ParceirosDashboard = () => {
  const navigate = useNavigate();
  const { partner } = useOutletContext<{ partner: CarrierPartner }>();
  const [stats, setStats] = useState<DashboardStats>({
    pending: 0,
    delivered: 0,
    totalToday: 0,
    totalPeriod: 0,
    totalValue: 0
  });
  const [recentShipments, setRecentShipments] = useState<RecentShipment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Period filter states
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });

  useEffect(() => {
    if (partner) {
      loadDashboardData();
    }
  }, [partner, periodFilter, customDateRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRangeFromPeriod(periodFilter, customDateRange);
      
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
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
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

      // Calculate stats - pending includes all non-delivered (em processo)
      const pending = shipments?.filter(s => 
        s.status !== 'delivered' && s.status !== 'cancelled'
      ).length || 0;
      const delivered = shipments?.filter(s => s.status === 'delivered').length || 0;
      
      // Count today's shipments
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const totalToday = shipments?.filter(s => new Date(s.created_at) >= today).length || 0;

      // Count period shipments (within the filtered period)
      const totalPeriod = shipments.length;

      // Calculate total freight value
      const totalValue = shipments?.reduce((sum, s) => {
        const quoteData = s.quote_data as any;
        const price = quoteData?.deliveryDetails?.totalPrice || 
                      quoteData?.deliveryDetails?.shippingPrice || 
                      quoteData?.quoteData?.shippingQuote?.jadlog?.preco_total ||
                      0;
        return sum + Number(price);
      }, 0) || 0;

      setStats({
        pending,
        delivered,
        totalToday,
        totalPeriod,
        totalValue
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

          const quoteData = shipment.quote_data as any;
          const freightValue = quoteData?.deliveryDetails?.totalPrice || 
                               quoteData?.deliveryDetails?.shippingPrice || 
                               quoteData?.quoteData?.shippingQuote?.jadlog?.preco_total ||
                               0;

          recentWithAddresses.push({
            id: shipment.id,
            tracking_code: shipment.tracking_code || 'N/A',
            status: shipment.status,
            created_at: shipment.created_at,
            recipient_city: address?.city || 'N/A',
            recipient_state: address?.state || 'N/A',
            freight_value: Number(freightValue)
          });
        }

        setRecentShipments(recentWithAddresses);
      } else {
        setRecentShipments([]);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = getStatusTranslation(status);
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
          <div className="h-8 bg-primary/10 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-primary/5 rounded-lg"></div>
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
        <div className="flex items-center gap-4 flex-wrap">
          {/* Period Filter Component */}
          <PeriodFilterComponent
            value={periodFilter}
            onChange={setPeriodFilter}
            customRange={customDateRange}
            onCustomRangeChange={setCustomDateRange}
            onClear={() => {
              setPeriodFilter('month');
              setCustomDateRange({ from: undefined, to: undefined });
            }}
          />
          
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-amber-500"
          onClick={() => navigate('/parceiros/pendentes')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Processo</CardTitle>
            <Clock className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando ou em trânsito</p>
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

        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total</CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {stats.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Frete acumulado</p>
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
              <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
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
              
              <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Período Selecionado</p>
                    <p className="text-xs text-muted-foreground">Total de entregas</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-foreground">{stats.totalPeriod}</span>
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
                    className="flex items-center justify-between p-3 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer"
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
                        <p className="text-xs font-medium text-primary mt-0.5">
                          {shipment.freight_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
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
