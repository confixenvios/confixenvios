import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, 
  Package, 
  TrendingUp, 
  Calendar,
  DollarSign,
  Activity,
  ShoppingCart
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalClients: number;
  totalShipments: number;
  pendingShipments: number;
  totalRevenue: number;
  recentShipments: any[];
  pendingLabels: number;
  revenueEvolution: Array<{
    period: string;
    revenue: number;
    shipments: number;
  }>;
  revenueByRegion: Array<{
    region: string;
    revenue: number;
    shipments: number;
  }>;
  revenueByClient: Array<{
    client_name: string;
    revenue: number;
    shipments: number;
  }>;
}

const AdminDashboardEnhanced = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalShipments: 0,
    pendingShipments: 0,
    totalRevenue: 0,
    recentShipments: [],
    pendingLabels: 0,
    revenueEvolution: [],
    revenueByRegion: [],
    revenueByClient: []
  });
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'daily' | 'monthly' | 'quarterly' | 'yearly' | 'custom'>('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, [dateFilter, startDate, endDate]);

  const getDateRangeFilter = () => {
    const now = new Date();
    let startDateFilter: Date;
    let endDateFilter: Date = now;

    switch (dateFilter) {
      case 'daily':
        startDateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        break;
      case 'monthly':
        startDateFilter = new Date(now.getFullYear(), now.getMonth() - 12, 1);
        break;
      case 'quarterly':
        startDateFilter = new Date(now.getFullYear() - 2, 0, 1);
        break;
      case 'yearly':
        startDateFilter = new Date(now.getFullYear() - 5, 0, 1);
        break;
      case 'custom':
        if (startDate && endDate) {
          startDateFilter = new Date(startDate);
          endDateFilter = new Date(endDate);
        } else {
          startDateFilter = new Date(now.getFullYear(), 0, 1);
        }
        break;
      default:
        startDateFilter = new Date(now.getFullYear(), 0, 1);
    }

    return { startDateFilter, endDateFilter };
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const { startDateFilter, endDateFilter } = getDateRangeFilter();

      // Carregar clientes
      const { count: clientCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Carregar envios totais
      const { count: totalShipments } = await supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true });

      // Carregar envios pendentes
      const { count: pendingShipments } = await supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING_LABEL');

      // Carregar envios recentes SEM join com profiles - mesma abordagem do faturamento
      const { data: shipments } = await supabase
        .from('shipments')
        .select(`
          *,
          sender_address:addresses!shipments_sender_address_id_fkey(city, state),
          recipient_address:addresses!shipments_recipient_address_id_fkey(city, state)
        `)
        .gte('created_at', startDateFilter.toISOString())
        .lte('created_at', endDateFilter.toISOString())
        .not('user_id', 'is', null)
        .or('payment_data.not.is.null,quote_data.not.is.null')
        .order('created_at', { ascending: false });

      console.log('📊 [DASHBOARD ENHANCED] Shipments encontrados:', shipments?.length);

      // Buscar profiles separadamente se existirem shipments
      let enrichedShipments = [];
      if (shipments && shipments.length > 0) {
        const userIds = [...new Set(shipments.map(s => s.user_id).filter(Boolean))];
        console.log('👥 [DASHBOARD ENHANCED] User IDs únicos:', userIds.length);
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);
        
        console.log('👤 [DASHBOARD ENHANCED] Profiles encontrados:', profiles?.length);

        enrichedShipments = shipments.map(shipment => {
          const profile = profiles?.find(p => p.id === shipment.user_id);
          return {
            ...shipment,
            profiles: profile || { first_name: 'N/A', last_name: '', email: 'N/A' }
          };
        });
      }

      // Função para calcular valor do shipment - MESMA LÓGICA DO FATURAMENTO
      const calculateShipmentValue = (shipment: any) => {
        const paymentData = shipment.payment_data as any;
        const quoteData = shipment.quote_data as any;
        
        // 1. PIX com pix_details.amount
        if (paymentData?.pix_details?.amount) {
          console.log('✅ [DASHBOARD ENHANCED] Valor PIX encontrado:', paymentData.pix_details.amount);
          return paymentData.pix_details.amount;
        }
        // 2. PIX com amount direto
        if (paymentData?.amount && paymentData?.method === 'pix') {
          console.log('✅ [DASHBOARD ENHANCED] Valor PIX amount encontrado:', paymentData.amount);
          return paymentData.amount;
        }
        // 3. Stripe/cartão (em centavos)
        if (paymentData?.amount) {
          const value = paymentData.amount / 100;
          console.log('✅ [DASHBOARD ENHANCED] Valor Stripe encontrado:', value);
          return value;
        }
        // 4. Quote delivery details
        if (quoteData?.deliveryDetails?.totalPrice) {
          console.log('✅ [DASHBOARD ENHANCED] Valor deliveryDetails encontrado:', quoteData.deliveryDetails.totalPrice);
          return quoteData.deliveryDetails.totalPrice;
        }
        // 5. Quote data shipping quote
        if (quoteData?.quoteData?.shippingQuote) {
          const price = shipment.selected_option === 'express' 
            ? quoteData.quoteData.shippingQuote.expressPrice 
            : quoteData.quoteData.shippingQuote.economicPrice;
          console.log('✅ [DASHBOARD ENHANCED] Valor quoteData.shippingQuote encontrado:', price);
          return price || 0;
        }
        // 6. Shipping quote direto
        if (quoteData?.shippingQuote) {
          const price = shipment.selected_option === 'express' 
            ? quoteData.shippingQuote.expressPrice 
            : quoteData.shippingQuote.economicPrice;
          console.log('✅ [DASHBOARD ENHANCED] Valor shippingQuote encontrado:', price);
          return price || 0;
        }
        
        return 0;
      };

      // Calcular receita total usando enrichedShipments
      let totalRevenue = 0;
      let processedCount = 0;
      
      if (enrichedShipments && enrichedShipments.length > 0) {
        enrichedShipments.forEach((shipment, index) => {
          console.log(`💰 [DASHBOARD ENHANCED] Processando shipment ${index + 1}:`, shipment.id);
          const shipmentValue = calculateShipmentValue(shipment);
          if (shipmentValue > 0) {
            totalRevenue += shipmentValue;
            processedCount++;
            console.log(`✅ [DASHBOARD ENHANCED] Valor adicionado: R$ ${shipmentValue} (Total: R$ ${totalRevenue})`);
          }
        });
      }
      
      console.log('💰 [DASHBOARD ENHANCED] RECEITA TOTAL CALCULADA:', {
        totalShipments: enrichedShipments?.length || 0,
        processedCount,
        totalRevenue,
        formattedRevenue: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      });

      // Evolução da receita por período usando enrichedShipments
      const revenueMap = new Map();
      enrichedShipments?.forEach(shipment => {
        const date = new Date(shipment.created_at);
        let periodKey: string;

        switch (dateFilter) {
          case 'daily':
            periodKey = date.toISOString().split('T')[0];
            break;
          case 'monthly':
            periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
          case 'quarterly':
            const quarter = Math.floor(date.getMonth() / 3) + 1;
            periodKey = `${date.getFullYear()}-Q${quarter}`;
            break;
          case 'yearly':
            periodKey = date.getFullYear().toString();
            break;
          default:
            periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }

        const revenue = calculateShipmentValue(shipment);

        if (!revenueMap.has(periodKey)) {
          revenueMap.set(periodKey, { period: periodKey, revenue: 0, shipments: 0 });
        }

        const current = revenueMap.get(periodKey);
        current.revenue += revenue;
        current.shipments += 1;
      });

      const revenueEvolution = Array.from(revenueMap.values())
        .sort((a, b) => a.period.localeCompare(b.period));

      // Receita por região usando enrichedShipments
      const regionMap = new Map();
      enrichedShipments?.forEach(shipment => {
        const regions = new Set();
        
        if (shipment.sender_address?.city && shipment.sender_address?.state) {
          regions.add(`${shipment.sender_address.city} - ${shipment.sender_address.state}`);
        }
        if (shipment.recipient_address?.city && shipment.recipient_address?.state) {
          regions.add(`${shipment.recipient_address.city} - ${shipment.recipient_address.state}`);
        }

        const revenue = calculateShipmentValue(shipment);

        regions.forEach(region => {
          if (!regionMap.has(region)) {
            regionMap.set(region, { region, revenue: 0, shipments: 0 });
          }
          const current = regionMap.get(region);
          current.revenue += revenue;
          current.shipments += 1;
        });
      });

      const revenueByRegion = Array.from(regionMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Receita por cliente usando enrichedShipments
      const clientMap = new Map();
      enrichedShipments?.forEach(shipment => {
        const profile = shipment.profiles as any;
        const clientKey = shipment.user_id;
        const clientName = profile?.first_name && profile?.last_name 
          ? `${profile.first_name} ${profile.last_name}`
          : profile?.first_name || profile?.email || 'Cliente';

        const revenue = calculateShipmentValue(shipment);

        if (!clientMap.has(clientKey)) {
          clientMap.set(clientKey, { client_name: clientName, revenue: 0, shipments: 0 });
        }

        const current = clientMap.get(clientKey);
        current.revenue += revenue;
        current.shipments += 1;
      });

      const revenueByClient = Array.from(clientMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Usar os enrichedShipments já carregados para a lista de recentes (limitar a 5)
      const recentShipments = enrichedShipments.slice(0, 5);

      setStats({
        totalClients: clientCount || 0,
        totalShipments: totalShipments || 0,
        pendingShipments: pendingShipments || 0,
        totalRevenue,
        recentShipments: recentShipments || [],
        pendingLabels: pendingShipments || 0,
        revenueEvolution,
        revenueByRegion,
        revenueByClient
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return <Badge className="bg-success text-success-foreground">Entregue</Badge>;
      case 'in_transit':
        return <Badge className="bg-primary text-primary-foreground">Em Trânsito</Badge>;
      case 'pending_label':
        return <Badge className="bg-warning text-warning-foreground">Pendente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--muted))'];

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Administrativo</h1>
          <p className="text-muted-foreground">
            Visão geral da plataforma e indicadores de performance
          </p>
        </div>
      </div>

      {/* Date Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Período</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário (30 dias)</SelectItem>
                  <SelectItem value="monthly">Mensal (12 meses)</SelectItem>
                  <SelectItem value="quarterly">Trimestral (2 anos)</SelectItem>
                  <SelectItem value="yearly">Anual (5 anos)</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateFilter === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>Data Inicial</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Final</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalClients}</p>
                <p className="text-sm text-muted-foreground">Total de Clientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Package className="h-8 w-8 text-success" />
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalShipments}</p>
                <p className="text-sm text-muted-foreground">Total de Envios</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-warning" />
              <div>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-sm text-muted-foreground">Faturamento Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.pendingShipments}</p>
                <p className="text-sm text-muted-foreground">Envios Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Evolution */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução do Faturamento</CardTitle>
            <CardDescription>
              Faturamento ao longo do tempo baseado no período selecionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats.revenueEvolution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'revenue' ? formatCurrency(Number(value)) : value,
                    name === 'revenue' ? 'Faturamento' : 'Envios'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Region */}
        <Card>
          <CardHeader>
            <CardTitle>Faturamento por Região</CardTitle>
            <CardDescription>
              Top 5 regiões com maior faturamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.revenueByRegion}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ region, percent }) => 
                    `${region.split(' - ')[0]} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {stats.revenueByRegion.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value)), 'Faturamento']}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Clientes</CardTitle>
            <CardDescription>
              Clientes com maior faturamento no período
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.revenueByClient}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="client_name" 
                  tick={{ fontSize: 12 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value)), 'Faturamento']}
                />
                <Bar 
                  dataKey="revenue" 
                  fill="hsl(var(--primary))" 
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Shipments Evolution */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução de Envios</CardTitle>
            <CardDescription>
              Quantidade de envios ao longo do tempo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.revenueEvolution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="shipments" 
                  stroke="hsl(var(--success))" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Shipments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Envios Recentes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentShipments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum envio encontrado
                </p>
              ) : (
                stats.recentShipments.map((shipment) => {
                  const profile = shipment.profiles as any;
                  const clientName = profile?.first_name && profile?.last_name 
                    ? `${profile.first_name} ${profile.last_name}`
                    : profile?.first_name || profile?.email || 'Cliente';
                    
                  return (
                    <div key={shipment.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">
                          {shipment.tracking_code || `ID${shipment.id.slice(0, 8).toUpperCase()}`}
                        </p>
                        <p className="text-sm text-muted-foreground">{clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(shipment.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(shipment.status)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {stats.recentShipments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <Link to="/admin/remessas">
                  <Button variant="outline" className="w-full">
                    Ver Todas as Remessas
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Ações Rápidas</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <Link to="/admin/clientes">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Gerenciar Clientes
                </Button>
              </Link>
              
              <Link to="/admin/faturamento">
                <Button variant="outline" className="w-full justify-start">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Relatórios de Faturamento
                </Button>
              </Link>

              <Link to="/admin/remessas">
                <Button variant="outline" className="w-full justify-start">
                  <Package className="h-4 w-4 mr-2" />
                  Ver Todas as Remessas
                </Button>
              </Link>

              <Link to="/admin/integracoes">
                <Button variant="outline" className="w-full justify-start">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Configurar Integrações
                </Button>
              </Link>

              <Link to="/admin/docs-integracao">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Documentação da API
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardEnhanced;