import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Package, 
  TrendingUp, 
  Clock,
  ArrowRight,
  FileText,
  Webhook,
  AlertCircle
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalClients: number;
  totalShipments: number;
  pendingShipments: number;
  totalRevenue: number;
  recentShipments: any[];
  pendingLabels: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalShipments: 0,
    pendingShipments: 0,
    totalRevenue: 0,
    recentShipments: [],
    pendingLabels: 0
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Função para calcular o valor de um shipment - IGUAL AO FATURAMENTO
  const calculateShipmentValue = (shipment: any) => {
    const paymentData = shipment.payment_data as any;
    const quoteData = shipment.quote_data as any;
    
    // 1. PIX com pix_details.amount
    if (paymentData?.pix_details?.amount) {
      console.log('✅ [DASHBOARD] Valor PIX encontrado:', paymentData.pix_details.amount);
      return paymentData.pix_details.amount;
    }
    // 2. PIX com amount direto
    if (paymentData?.amount && paymentData?.method === 'pix') {
      console.log('✅ [DASHBOARD] Valor PIX amount encontrado:', paymentData.amount);
      return paymentData.amount;
    }
    // 3. Stripe/cartão (em centavos)
    if (paymentData?.amount) {
      const value = paymentData.amount / 100;
      console.log('✅ [DASHBOARD] Valor Stripe encontrado:', value);
      return value;
    }
    // 4. Quote delivery details
    if (quoteData?.deliveryDetails?.totalPrice) {
      console.log('✅ [DASHBOARD] Valor deliveryDetails encontrado:', quoteData.deliveryDetails.totalPrice);
      return quoteData.deliveryDetails.totalPrice;
    }
    // 5. Quote data shipping quote
    if (quoteData?.quoteData?.shippingQuote) {
      const price = shipment.selected_option === 'express' 
        ? quoteData.quoteData.shippingQuote.expressPrice 
        : quoteData.quoteData.shippingQuote.economicPrice;
      console.log('✅ [DASHBOARD] Valor quoteData.shippingQuote encontrado:', price);
      return price || 0;
    }
    // 6. Shipping quote direto
    if (quoteData?.shippingQuote) {
      const price = shipment.selected_option === 'express' 
        ? quoteData.shippingQuote.expressPrice 
        : quoteData.shippingQuote.economicPrice;
      console.log('✅ [DASHBOARD] Valor shippingQuote encontrado:', price);
      return price || 0;
    }
    
    return 0;
  };

  useEffect(() => {
    loadDashboardData();
    
    // Set up real-time subscriptions for dashboard updates
    const shipmentChannel = supabase
      .channel('dashboard-shipments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipments'
        },
        (payload) => {
          console.log('Shipment change detected:', payload);
          loadDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'b2b_shipments'
        },
        (payload) => {
          console.log('B2B Shipment change detected:', payload);
          loadDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'profiles'
        },
        (payload) => {
          console.log('Profile change detected:', payload);
          loadDashboardData();
        }
      )
      .subscribe();

    // Auto-refresh every 5 minutes as fallback
    const autoRefreshInterval = setInterval(() => {
      loadDashboardData();
    }, 5 * 60 * 1000);

    // Cleanup subscriptions and interval on unmount
    return () => {
      supabase.removeChannel(shipmentChannel);
      clearInterval(autoRefreshInterval);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      console.log('🔄 [DASHBOARD] Iniciando carregamento de dados...');
      
      // Total clients
      const { count: clientsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      console.log('👥 [DASHBOARD] Total de clientes:', clientsCount);

      // Total shipments (convencional + B2B)
      const { count: conventionalCount } = await supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true });
      
      const { count: b2bCount } = await supabase
        .from('b2b_shipments')
        .select('*', { count: 'exact', head: true });
      
      const totalShipmentsCount = (conventionalCount || 0) + (b2bCount || 0);
      console.log('📦 [DASHBOARD] Total de shipments:', totalShipmentsCount, '(Conv:', conventionalCount, 'B2B:', b2bCount, ')');

      // Pending shipments (convencional + B2B)
      const { count: pendingConventional } = await supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true })
        .in('status', ['PENDING_DOCUMENT', 'PENDING_LABEL', 'PENDING_PAYMENT']);
      
      const { count: pendingB2B } = await supabase
        .from('b2b_shipments')
        .select('*', { count: 'exact', head: true })
        .in('status', ['AGUARDANDO_ACEITE_COLETA', 'COLETA_ACEITA', 'COLETADO', 'EM_TRIAGEM', 'AGUARDANDO_ACEITE_EXPEDICAO']);
      
      const totalPendingCount = (pendingConventional || 0) + (pendingB2B || 0);
      console.log('⏳ [DASHBOARD] Shipments pendentes:', totalPendingCount);

      // Buscar shipments convencionais recentes
      const { data: recentConventional } = await supabase
        .from('shipments')
        .select(`
          id,
          tracking_code,
          status,
          created_at,
          user_id,
          quote_data,
          payment_data,
          weight,
          selected_option,
          sender_address:addresses!shipments_sender_address_id_fkey(city, state, name),
          recipient_address:addresses!shipments_recipient_address_id_fkey(city, state, name)
        `)
        .not('user_id', 'is', null)
        .or('payment_data.not.is.null,quote_data.not.is.null')
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Buscar shipments B2B recentes
      const { data: recentB2B } = await supabase
        .from('b2b_shipments')
        .select(`
          id,
          tracking_code,
          status,
          created_at,
          b2b_client_id,
          total_price,
          total_weight,
          total_volumes,
          payment_data
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // Buscar profiles dos usuários convencionais
      let enrichedConventional: any[] = [];
      if (recentConventional && recentConventional.length > 0) {
        const userIds = [...new Set(recentConventional.map(s => s.user_id).filter(Boolean))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        enrichedConventional = recentConventional.map(shipment => {
          const profile = profiles?.find(p => p.id === shipment.user_id);
          return {
            ...shipment,
            type: 'conventional',
            profile: profile || { first_name: 'N/A', last_name: '', email: 'N/A' }
          };
        });
      }

      // Buscar dados dos clientes B2B
      let enrichedB2B: any[] = [];
      if (recentB2B && recentB2B.length > 0) {
        const clientIds = [...new Set(recentB2B.map(s => s.b2b_client_id).filter(Boolean))];
        const { data: b2bClients } = await supabase
          .from('b2b_clients')
          .select('id, company_name, email')
          .in('id', clientIds);

        enrichedB2B = recentB2B.map(shipment => {
          const client = b2bClients?.find(c => c.id === shipment.b2b_client_id);
          return {
            ...shipment,
            type: 'b2b',
            weight: shipment.total_weight,
            profile: { 
              first_name: client?.company_name || 'Cliente B2B', 
              last_name: '', 
              email: client?.email || 'N/A' 
            }
          };
        });
      }

      // Combinar e ordenar por data
      const allRecentShipments = [...enrichedConventional, ...enrichedB2B]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

      console.log('📋 [DASHBOARD] Recent shipments encontrados:', allRecentShipments.length);

      // Calculate total revenue from ALL shipments (convencional + B2B)
      const { data: allConventional } = await supabase
        .from('shipments')
        .select('id, payment_data, quote_data, selected_option')
        .or('payment_data.not.is.null,quote_data.not.is.null');
      
      const { data: allB2B } = await supabase
        .from('b2b_shipments')
        .select('id, total_price, payment_data');

      let totalRevenue = 0;
      
      // Receita convencional
      if (allConventional && allConventional.length > 0) {
        allConventional.forEach((shipment) => {
          const shipmentValue = calculateShipmentValue(shipment);
          if (shipmentValue > 0) {
            totalRevenue += shipmentValue;
          }
        });
      }
      
      // Receita B2B
      if (allB2B && allB2B.length > 0) {
        allB2B.forEach((shipment) => {
          if (shipment.total_price && shipment.total_price > 0) {
            totalRevenue += Number(shipment.total_price);
          }
        });
      }
      
      console.log('💰 [DASHBOARD] RESULTADO FINAL:', {
        totalShipments: totalShipmentsCount,
        totalRevenue: totalRevenue,
        formattedRevenue: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      });

      setStats({
        totalClients: clientsCount || 0,
        totalShipments: totalShipmentsCount,
        pendingShipments: totalPendingCount,
        totalRevenue: totalRevenue,
        recentShipments: allRecentShipments,
        pendingLabels: totalPendingCount
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('❌ [DASHBOARD] Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_LABEL':
        return <Badge variant="destructive">Aguardando Etiqueta</Badge>;
      case 'PENDING_DOCUMENT':
        return <Badge variant="destructive">Aguardando Documento</Badge>;
      case 'PAID':
        return <Badge className="bg-success text-success-foreground">Pago</Badge>;
      case 'DELIVERED':
        return <Badge className="bg-success text-success-foreground">Entregue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header - Simple like reference */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Administrativo</h1>
          <p className="text-muted-foreground">
            Visão geral da plataforma e indicadores de performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            Atualizado: {lastUpdated.toLocaleTimeString('pt-BR')}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadDashboardData}
            disabled={loading}
            className="border-primary/30 hover:bg-primary/5 hover:border-primary"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <TrendingUp className="w-4 h-4 mr-2" />
            )}
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-t-4 border-t-primary shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total de Clientes</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? '...' : stats.totalClients}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-blue-500 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total de Envios</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? '...' : stats.totalShipments}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-green-500 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Faturamento Total</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? '...' : `R$ ${stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-amber-500 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Envios Pendentes</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? '...' : stats.pendingShipments}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Shipments */}
        <Card className="border-t-4 border-t-primary shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-foreground">
              <span className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-primary" />
                <span>Envios Recentes</span>
              </span>
              <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary hover:bg-primary/5">
                <Link to="/admin/remessas">
                  Ver todas
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : stats.recentShipments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma remessa encontrada
              </p>
            ) : (
              <div className="space-y-4">
                {stats.recentShipments.map((shipment) => (
                  <Card key={shipment.id} className="border-border/30 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold text-sm">
                              {shipment.tracking_code || `ID${shipment.id.slice(0, 8).toUpperCase()}`}
                            </h4>
                            {getStatusBadge(shipment.status)}
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="w-3 h-3 mr-1" />
                            <span className="font-medium">Criado em:</span>
                            <span className="ml-1">{new Date(shipment.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="space-y-1">
                          <p className="font-medium text-muted-foreground">Cliente</p>
                          <p className="font-medium">
                            {shipment.profile?.first_name} {shipment.profile?.last_name}
                          </p>
                          <p className="text-muted-foreground">{shipment.profile?.email}</p>
                        </div>

                        <div className="space-y-1">
                          <p className="font-medium text-muted-foreground">Rota</p>
                          <p className="font-medium">
                            {shipment.sender_address?.city && shipment.recipient_address?.city
                              ? `${shipment.sender_address.city} → ${shipment.recipient_address.city}`
                              : 'Rota não informada'
                            }
                          </p>
                          <p className="text-muted-foreground">Peso: {shipment.weight}kg</p>
                        </div>

                        <div className="space-y-1">
                          <p className="font-medium text-muted-foreground">Valor</p>
                          {(() => {
                            const amount = calculateShipmentValue(shipment);
                            
                            return amount > 0 ? (
                              <p className="font-bold text-success">
                                R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            ) : (
                              <p className="text-muted-foreground">
                                N/A
                              </p>
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

        {/* Quick Actions */}
        <Card className="border-t-4 border-t-primary shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-foreground">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span>Ações Rápidas</span>
            </CardTitle>
            <CardDescription>
              Acesso rápido aos recursos administrativos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" size="sm" className="w-full justify-start border-primary/30 hover:bg-primary/5 hover:border-primary" asChild>
              <Link to="/admin/clientes">
                <Users className="w-4 h-4 mr-2" />
                Gerenciar Clientes
              </Link>
            </Button>
            
            <Button variant="outline" size="sm" className="w-full justify-start border-primary/30 hover:bg-primary/5 hover:border-primary" asChild>
              <Link to="/admin/remessas">
                <Package className="w-4 h-4 mr-2" />
                Visualizar Remessas
              </Link>
            </Button>
            
            <Button variant="outline" size="sm" className="w-full justify-start border-primary/30 hover:bg-primary/5 hover:border-primary" asChild>
              <Link to="/admin/integracoes">
                <Webhook className="w-4 h-4 mr-2" />
                Configurar Integrações
              </Link>
            </Button>
            
            <Button variant="outline" size="sm" className="w-full justify-start border-primary/30 hover:bg-primary/5 hover:border-primary" asChild>
              <Link to="/admin/docs-integracao">
                <FileText className="w-4 h-4 mr-2" />
                Documentação
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;