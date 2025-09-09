import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  DollarSign,
  Users,
  MapPin,
  Calendar,
  Download,
  Package,
  TrendingUp,
  Filter,
  FileText
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
  ResponsiveContainer 
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BillingData {
  totalRevenue: number;
  totalShipments: number;
  averageValue: number;
  revenueByClient: Array<{
    client_name: string;
    client_email: string;
    total_value: number;
    shipment_count: number;
  }>;
  revenueByRegion: Array<{
    region: string;
    total_value: number;
    shipment_count: number;
  }>;
  revenueByPeriod: Array<{
    period: string;
    total_value: number;
    shipment_count: number;
  }>;
  shipmentDetails: Array<{
    id: string;
    tracking_code: string | null;
    client_name: string;
    client_email: string;
    value: number;
    status: string;
    created_at: string;
    origin_city: string;
    origin_state: string;
    destination_city: string;
    destination_state: string;
  }>;
}

const AdminFaturamento = () => {
  const { toast } = useToast();
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'daily' | 'monthly' | 'quarterly' | 'yearly' | 'custom'>('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [clients, setClients] = useState<Array<{id: string, name: string, email: string}>>([]);
  const [regions, setRegions] = useState<Array<string>>([]);

  useEffect(() => {
    loadBillingData();
    loadFilters();
  }, [dateRange, startDate, endDate, selectedClient, selectedRegion]);

  const loadFilters = async () => {
    try {
      // Carregar lista de clientes
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email');

      if (profilesData) {
        const clientsList = profilesData.map(profile => ({
          id: profile.id,
          name: profile.first_name && profile.last_name 
            ? `${profile.first_name} ${profile.last_name}`
            : profile.first_name || profile.email || 'Cliente',
          email: profile.email || ''
        }));
        setClients(clientsList);
      }

      // Carregar lista de regiões (cidades/estados únicos)
      const { data: addressesData } = await supabase
        .from('addresses')
        .select('city, state')
        .not('city', 'is', null)
        .not('state', 'is', null);

      if (addressesData) {
        const regionsList = Array.from(new Set(
          addressesData.map(addr => `${addr.city} - ${addr.state}`)
        )).sort();
        setRegions(regionsList);
      }
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  };

  const getDateRangeFilter = () => {
    const now = new Date();
    let startDateFilter: Date;
    let endDateFilter: Date = now;

    switch (dateRange) {
      case 'daily':
        startDateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        break;
      case 'monthly':
        startDateFilter = new Date(now.getFullYear(), now.getMonth() - 12, 1);
        break;
      case 'quarterly':
        startDateFilter = new Date(now.getFullYear() - 1, 0, 1);
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

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const { startDateFilter, endDateFilter } = getDateRangeFilter();

      // Query base para shipments
      let shipmentsQuery = supabase
        .from('shipments')
        .select(`
          id,
          tracking_code,
          status,
          created_at,
          quote_data,
          user_id,
          sender_address:addresses!shipments_sender_address_id_fkey(city, state),
          recipient_address:addresses!shipments_recipient_address_id_fkey(city, state),
          profiles(first_name, last_name, email)
        `)
        .gte('created_at', startDateFilter.toISOString())
        .lte('created_at', endDateFilter.toISOString())
        .not('quote_data', 'is', null);

      // Aplicar filtros
      if (selectedClient !== 'all') {
        shipmentsQuery = shipmentsQuery.eq('user_id', selectedClient);
      }

      const { data: shipments } = await shipmentsQuery;

      if (!shipments) {
        setBillingData({
          totalRevenue: 0,
          totalShipments: 0,
          averageValue: 0,
          revenueByClient: [],
          revenueByRegion: [],
          revenueByPeriod: [],
          shipmentDetails: []
        });
        return;
      }

      // Processar dados
      let filteredShipments = shipments;

      // Filtro por região
      if (selectedRegion !== 'all') {
        const [cityFilter, stateFilter] = selectedRegion.split(' - ');
        filteredShipments = shipments.filter(shipment => {
          const senderMatch = shipment.sender_address?.city === cityFilter && 
                             shipment.sender_address?.state === stateFilter;
          const recipientMatch = shipment.recipient_address?.city === cityFilter && 
                               shipment.recipient_address?.state === stateFilter;
          return senderMatch || recipientMatch;
        });
      }

      // Calcular valores
      const totalRevenue = filteredShipments.reduce((sum, shipment) => {
        const quoteData = shipment.quote_data as any;
        
        // 1. Tentar quote_data.deliveryDetails.totalPrice
        if (quoteData?.deliveryDetails?.totalPrice) {
          return sum + quoteData.deliveryDetails.totalPrice;
        }
        // 2. Tentar quote_data.quoteData.shippingQuote baseado na opção selecionada
        else if (quoteData?.quoteData?.shippingQuote) {
          const price = quoteData.deliveryDetails?.selectedOption === 'express' 
            ? quoteData.quoteData.shippingQuote.expressPrice 
            : quoteData.quoteData.shippingQuote.economicPrice;
          return sum + (price || 0);
        }
        // 3. Tentar quote_data.shippingQuote baseado na opção selecionada
        else if (quoteData?.shippingQuote) {
          const price = quoteData.deliveryDetails?.selectedOption === 'express' 
            ? quoteData.shippingQuote.expressPrice 
            : quoteData.shippingQuote.economicPrice;
          return sum + (price || 0);
        }
        return sum;
      }, 0);

      const totalShipments = filteredShipments.length;
      const averageValue = totalShipments > 0 ? totalRevenue / totalShipments : 0;

      // Faturamento por cliente
      const clientRevenue = new Map();
      filteredShipments.forEach(shipment => {
        const profile = shipment.profiles as any;
        const clientKey = shipment.user_id;
        const clientName = profile?.first_name && profile?.last_name 
          ? `${profile.first_name} ${profile.last_name}`
          : profile?.first_name || profile?.email || 'Cliente';
        const clientEmail = profile?.email || '';
        
        const quoteData = shipment.quote_data as any;
        let value = 0;
        
        // 1. Tentar quote_data.deliveryDetails.totalPrice
        if (quoteData?.deliveryDetails?.totalPrice) {
          value = quoteData.deliveryDetails.totalPrice;
        }
        // 2. Tentar quote_data.quoteData.shippingQuote baseado na opção selecionada
        else if (quoteData?.quoteData?.shippingQuote) {
          const price = quoteData.deliveryDetails?.selectedOption === 'express' 
            ? quoteData.quoteData.shippingQuote.expressPrice 
            : quoteData.quoteData.shippingQuote.economicPrice;
          value = price || 0;
        }
        // 3. Tentar quote_data.shippingQuote baseado na opção selecionada
        else if (quoteData?.shippingQuote) {
          const price = quoteData.deliveryDetails?.selectedOption === 'express' 
            ? quoteData.shippingQuote.expressPrice 
            : quoteData.shippingQuote.economicPrice;
          value = price || 0;
        }

        if (!clientRevenue.has(clientKey)) {
          clientRevenue.set(clientKey, {
            client_name: clientName,
            client_email: clientEmail,
            total_value: 0,
            shipment_count: 0
          });
        }
        
        const current = clientRevenue.get(clientKey);
        current.total_value += value;
        current.shipment_count += 1;
      });

      const revenueByClient = Array.from(clientRevenue.values())
        .sort((a, b) => b.total_value - a.total_value)
        .slice(0, 10);

      // Faturamento por região
      const regionRevenue = new Map();
      filteredShipments.forEach(shipment => {
        const regions = new Set();
        
        if (shipment.sender_address?.city && shipment.sender_address?.state) {
          regions.add(`${shipment.sender_address.city} - ${shipment.sender_address.state}`);
        }
        if (shipment.recipient_address?.city && shipment.recipient_address?.state) {
          regions.add(`${shipment.recipient_address.city} - ${shipment.recipient_address.state}`);
        }

        const quoteData = shipment.quote_data as any;
        let value = 0;
        
        // 1. Tentar quote_data.deliveryDetails.totalPrice
        if (quoteData?.deliveryDetails?.totalPrice) {
          value = quoteData.deliveryDetails.totalPrice;
        }
        // 2. Tentar quote_data.quoteData.shippingQuote baseado na opção selecionada
        else if (quoteData?.quoteData?.shippingQuote) {
          const price = quoteData.deliveryDetails?.selectedOption === 'express' 
            ? quoteData.quoteData.shippingQuote.expressPrice 
            : quoteData.quoteData.shippingQuote.economicPrice;
          value = price || 0;
        }
        // 3. Tentar quote_data.shippingQuote baseado na opção selecionada
        else if (quoteData?.shippingQuote) {
          const price = quoteData.deliveryDetails?.selectedOption === 'express' 
            ? quoteData.shippingQuote.expressPrice 
            : quoteData.shippingQuote.economicPrice;
          value = price || 0;
        }

        regions.forEach(region => {
          if (!regionRevenue.has(region)) {
            regionRevenue.set(region, { region, total_value: 0, shipment_count: 0 });
          }
          const current = regionRevenue.get(region);
          current.total_value += value;
          current.shipment_count += 1;
        });
      });

      const revenueByRegion = Array.from(regionRevenue.values())
        .sort((a, b) => b.total_value - a.total_value)
        .slice(0, 10);

      // Faturamento por período
      const periodRevenue = new Map();
      filteredShipments.forEach(shipment => {
        const date = new Date(shipment.created_at);
        let periodKey: string;

        switch (dateRange) {
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

        const quoteData = shipment.quote_data as any;
        let value = 0;
        
        // 1. Tentar quote_data.deliveryDetails.totalPrice
        if (quoteData?.deliveryDetails?.totalPrice) {
          value = quoteData.deliveryDetails.totalPrice;
        }
        // 2. Tentar quote_data.quoteData.shippingQuote baseado na opção selecionada
        else if (quoteData?.quoteData?.shippingQuote) {
          const price = quoteData.deliveryDetails?.selectedOption === 'express' 
            ? quoteData.quoteData.shippingQuote.expressPrice 
            : quoteData.quoteData.shippingQuote.economicPrice;
          value = price || 0;
        }
        // 3. Tentar quote_data.shippingQuote baseado na opção selecionada
        else if (quoteData?.shippingQuote) {
          const price = quoteData.deliveryDetails?.selectedOption === 'express' 
            ? quoteData.shippingQuote.expressPrice 
            : quoteData.shippingQuote.economicPrice;
          value = price || 0;
        }

        if (!periodRevenue.has(periodKey)) {
          periodRevenue.set(periodKey, {
            period: periodKey,
            total_value: 0,
            shipment_count: 0
          });
        }

        const current = periodRevenue.get(periodKey);
        current.total_value += value;
        current.shipment_count += 1;
      });

      const revenueByPeriod = Array.from(periodRevenue.values())
        .sort((a, b) => a.period.localeCompare(b.period));

      // Detalhes dos envios
      const shipmentDetails = filteredShipments.map(shipment => {
        const profile = shipment.profiles as any;
        const clientName = profile?.first_name && profile?.last_name 
          ? `${profile.first_name} ${profile.last_name}`
          : profile?.first_name || profile?.email || 'Cliente';
        const clientEmail = profile?.email || '';
        
        const quoteData = shipment.quote_data as any;
        let value = 0;
        
        // 1. Tentar quote_data.deliveryDetails.totalPrice
        if (quoteData?.deliveryDetails?.totalPrice) {
          value = quoteData.deliveryDetails.totalPrice;
        }
        // 2. Tentar quote_data.quoteData.shippingQuote baseado na opção selecionada
        else if (quoteData?.quoteData?.shippingQuote) {
          const price = quoteData.deliveryDetails?.selectedOption === 'express' 
            ? quoteData.quoteData.shippingQuote.expressPrice 
            : quoteData.quoteData.shippingQuote.economicPrice;
          value = price || 0;
        }
        // 3. Tentar quote_data.shippingQuote baseado na opção selecionada
        else if (quoteData?.shippingQuote) {
          const price = quoteData.deliveryDetails?.selectedOption === 'express' 
            ? quoteData.shippingQuote.expressPrice 
            : quoteData.shippingQuote.economicPrice;
          value = price || 0;
        }

        return {
          id: shipment.id,
          tracking_code: shipment.tracking_code,
          client_name: clientName,
          client_email: clientEmail,
          value: value,
          status: shipment.status,
          created_at: shipment.created_at,
          origin_city: shipment.sender_address?.city || 'N/A',
          origin_state: shipment.sender_address?.state || 'N/A',
          destination_city: shipment.recipient_address?.city || 'N/A',
          destination_state: shipment.recipient_address?.state || 'N/A'
        };
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setBillingData({
        totalRevenue,
        totalShipments,
        averageValue,
        revenueByClient,
        revenueByRegion,
        revenueByPeriod,
        shipmentDetails
      });

    } catch (error) {
      console.error('Error loading billing data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados de faturamento",
        variant: "destructive"
      });
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

  const exportToCSV = () => {
    if (!billingData) return;

    const csvContent = [
      ['ID', 'Código de Rastreamento', 'Cliente', 'Email', 'Valor', 'Status', 'Data', 'Origem', 'Destino'],
      ...billingData.shipmentDetails.map(shipment => [
        shipment.id,
        shipment.tracking_code || `ID${shipment.id.slice(0, 8).toUpperCase()}`,
        shipment.client_name,
        shipment.client_email,
        shipment.value.toFixed(2),
        shipment.status,
        formatDate(shipment.created_at),
        `${shipment.origin_city} - ${shipment.origin_state}`,
        `${shipment.destination_city} - ${shipment.destination_state}`
      ])
    ];

    const csvString = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `faturamento_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--muted))'];

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Carregando dados de faturamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <DollarSign className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Faturamento</h1>
        </div>
        <Button onClick={exportToCSV} disabled={!billingData?.shipmentDetails.length}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário (30 dias)</SelectItem>
                  <SelectItem value="monthly">Mensal (12 meses)</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === 'custom' && (
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

            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Clientes</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Região</Label>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Regiões</SelectItem>
                  {regions.map(region => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {billingData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-8 w-8 text-success" />
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(billingData.totalRevenue)}
                  </p>
                  <p className="text-sm text-muted-foreground">Faturamento Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Package className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {billingData.totalShipments.toLocaleString('pt-BR')}
                  </p>
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
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(billingData.averageValue)}
                  </p>
                  <p className="text-sm text-muted-foreground">Valor Médio</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {billingData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by Period */}
          <Card>
            <CardHeader>
              <CardTitle>Faturamento por Período</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={billingData.revenueByPeriod}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(Number(value)), 'Faturamento']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total_value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Clients */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={billingData.revenueByClient.slice(0, 5)}>
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
                    dataKey="total_value" 
                    fill="hsl(var(--primary))" 
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Regions */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Regiões</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={billingData.revenueByRegion.slice(0, 5)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ region, percent }) => `${region.split(' - ')[0]} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="total_value"
                  >
                    {billingData.revenueByRegion.slice(0, 5).map((entry, index) => (
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

          {/* Revenue by Client (Table) */}
          <Card>
            <CardHeader>
              <CardTitle>Faturamento por Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {billingData.revenueByClient.map((client, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">{client.client_name}</p>
                      <p className="text-sm text-muted-foreground">{client.client_email}</p>
                      <p className="text-xs text-muted-foreground">{client.shipment_count} envios</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">{formatCurrency(client.total_value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Shipments List */}
      {billingData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Detalhes dos Envios</span>
            </CardTitle>
            <CardDescription>
              Lista completa dos envios no período selecionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {billingData.shipmentDetails.map((shipment) => (
                <div key={shipment.id} className="p-4 border border-border/50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm font-medium">
                          {shipment.tracking_code || `ID${shipment.id.slice(0, 8).toUpperCase()}`}
                        </span>
                        <Badge variant="secondary">
                          {shipment.status}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        <p><strong>Cliente:</strong> {shipment.client_name} ({shipment.client_email})</p>
                        <p><strong>Data:</strong> {formatDate(shipment.created_at)}</p>
                        <p><strong>Rota:</strong> {shipment.origin_city}-{shipment.origin_state} → {shipment.destination_city}-{shipment.destination_state}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">
                        {formatCurrency(shipment.value)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminFaturamento;