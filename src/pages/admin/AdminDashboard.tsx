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

  useEffect(() => {
    loadDashboardData();
    
    // Set up real-time subscriptions for dashboard updates
    const shipmentChannel = supabase
      .channel('dashboard-shipments')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'shipments'
        },
        (payload) => {
          console.log('Shipment change detected:', payload);
          // Reload dashboard data when shipments change
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
          // Reload dashboard data when profiles change
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
      // Total clients
      const { count: clientsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Total shipments
      const { count: shipmentsCount } = await supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true });

      // Pending shipments
      const { count: pendingCount } = await supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true })
        .in('status', ['PENDING_DOCUMENT', 'PENDING_LABEL', 'PENDING_PAYMENT']);

      // Recent shipments with payment data
      const { data: recentShipments } = await supabase
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
          sender_address:addresses!sender_address_id(city, state, name),
          recipient_address:addresses!recipient_address_id(city, state, name)
        `)
        .not('user_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get user profiles for recent shipments
      let enrichedShipments = [];
      if (recentShipments && recentShipments.length > 0) {
        const userIds = recentShipments.map(s => s.user_id).filter(Boolean);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        enrichedShipments = recentShipments.map(shipment => {
          const profile = profiles?.find(p => p.id === shipment.user_id);
          return {
            ...shipment,
            profile: profile || { first_name: 'N/A', last_name: '', email: 'N/A' }
          };
        });
      }

      // Calculate total revenue from shipments with valid payment data
      let totalRevenue = 0;
      recentShipments?.forEach(shipment => {
        const paymentData = shipment.payment_data as any;
        const quoteData = shipment.quote_data as any;
        
        if (paymentData?.pixData?.amount) {
          totalRevenue += paymentData.pixData.amount / 100;
        } else if (paymentData?.amount) {
          totalRevenue += paymentData.amount / 100;
        } else if (quoteData?.amount) {
          totalRevenue += quoteData.amount;
        } else if (quoteData?.deliveryDetails?.totalPrice) {
          totalRevenue += quoteData.deliveryDetails.totalPrice;
        } else if (quoteData?.shippingQuote) {
          const price = quoteData.deliveryDetails?.selectedOption === 'express' 
            ? quoteData.shippingQuote.expressPrice 
            : quoteData.shippingQuote.economicPrice;
          totalRevenue += price || 0;
        }
      });

      setStats({
        totalClients: clientsCount || 0,
        totalShipments: shipmentsCount || 0,
        pendingShipments: pendingCount || 0,
        totalRevenue: totalRevenue,
        recentShipments: enrichedShipments || [],
        pendingLabels: pendingCount || 0
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Administrativo</h1>
          <p className="text-muted-foreground">
            Visão geral do sistema Confix Envios
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
        <Card className="border-border/50 shadow-card">
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

        <Card className="border-border/50 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total de Remessas</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? '...' : stats.totalShipments}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Remessas Pendentes</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? '...' : stats.pendingShipments}
                </p>
              </div>
              <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Faturamento Total</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? '...' : `R$ ${stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </p>
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Shipments */}
        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Package className="w-5 h-5" />
                <span>Remessas Recentes</span>
              </span>
              <Button variant="ghost" size="sm" asChild>
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
                            const paymentData = shipment.payment_data as any;
                            const quoteData = shipment.quote_data as any;
                            let amount = null;
                            
                            if (paymentData?.pixData?.amount) {
                              amount = paymentData.pixData.amount / 100;
                            } else if (paymentData?.amount) {
                              amount = paymentData.amount / 100;
                            } else if (quoteData?.amount) {
                              amount = quoteData.amount;
                            } else if (quoteData?.deliveryDetails?.totalPrice) {
                              amount = quoteData.deliveryDetails.totalPrice;
                            } else if (quoteData?.shippingQuote) {
                              const price = quoteData.deliveryDetails?.selectedOption === 'express' 
                                ? quoteData.shippingQuote.expressPrice 
                                : quoteData.shippingQuote.economicPrice;
                              amount = price;
                            }

                            return amount ? (
                              <p className="font-medium text-success">
                                R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            ) : (
                              <p className="font-medium text-muted-foreground">R$ 0,00</p>
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
        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Ações Rápidas</span>
            </CardTitle>
            <CardDescription>
              Acesse rapidamente as funcionalidades principais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full justify-start">
              <Link to="/admin/clientes">
                <Users className="w-4 h-4 mr-2" />
                Gerenciar Clientes
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/admin/remessas">
                <Package className="w-4 h-4 mr-2" />
                Ver Todas as Remessas
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/admin/integracoes">
                <Webhook className="w-4 h-4 mr-2" />
                Configurar Integrações
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/admin/docs-integracao">
                <FileText className="w-4 h-4 mr-2" />
                Documentação TMS
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/admin/webhooks/logs">
                <FileText className="w-4 h-4 mr-2" />
                Ver Logs de Webhooks
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;