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

      // Carregar lista de regiões
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

  // Função para calcular valor de um shipment
  const calculateShipmentValue = (shipment: any) => {
    const paymentData = shipment.payment_data as any;
    const quoteData = shipment.quote_data as any;
    
    // 1. PIX com pix_details.amount
    if (paymentData?.pix_details?.amount) {
      console.log('✅ Valor PIX encontrado:', paymentData.pix_details.amount);
      return paymentData.pix_details.amount;
    }
    // 2. PIX com amount direto
    if (paymentData?.amount && paymentData?.method === 'pix') {
      console.log('✅ Valor PIX amount encontrado:', paymentData.amount);
      return paymentData.amount;
    }
    // 3. Stripe/cartão (em centavos)
    if (paymentData?.amount) {
      const value = paymentData.amount / 100;
      console.log('✅ Valor Stripe encontrado:', value);
      return value;
    }
    // 4. Quote delivery details
    if (quoteData?.deliveryDetails?.totalPrice) {
      console.log('✅ Valor deliveryDetails encontrado:', quoteData.deliveryDetails.totalPrice);
      return quoteData.deliveryDetails.totalPrice;
    }
    // 5. Quote data shipping quote
    if (quoteData?.quoteData?.shippingQuote) {
      const price = shipment.selected_option === 'express' 
        ? quoteData.quoteData.shippingQuote.expressPrice 
        : quoteData.quoteData.shippingQuote.economicPrice;
      console.log('✅ Valor quoteData.shippingQuote encontrado:', price);
      return price || 0;
    }
    // 6. Shipping quote direto
    if (quoteData?.shippingQuote) {
      const price = shipment.selected_option === 'express' 
        ? quoteData.shippingQuote.expressPrice 
        : quoteData.shippingQuote.economicPrice;
      console.log('✅ Valor shippingQuote encontrado:', price);
      return price || 0;
    }
    
    return 0;
  };

  const loadBillingData = async () => {
    try {
      console.log('🔄 FATURAMENTO: Iniciando carregamento...');
      setLoading(true);
      const { startDateFilter, endDateFilter } = getDateRangeFilter();

      console.log('📅 Período:', { startDateFilter, endDateFilter });

      // Buscar shipments convencionais
      let conventionalQuery = supabase
        .from('shipments')
        .select(`
          id,
          tracking_code,
          status,
          created_at,
          quote_data,
          payment_data,
          selected_option,
          user_id,
          sender_address:addresses!shipments_sender_address_id_fkey(city, state),
          recipient_address:addresses!shipments_recipient_address_id_fkey(city, state)
        `)
        .gte('created_at', startDateFilter.toISOString())
        .lte('created_at', endDateFilter.toISOString())
        .or('payment_data.not.is.null,quote_data.not.is.null');

      if (selectedClient !== 'all') {
        conventionalQuery = conventionalQuery.eq('user_id', selectedClient);
      }

      const { data: conventionalShipments, error: convError } = await conventionalQuery;
      if (convError) throw convError;

      // Buscar shipments B2B
      let b2bQuery = supabase
        .from('b2b_shipments')
        .select(`
          id,
          tracking_code,
          status,
          created_at,
          total_price,
          payment_data,
          b2b_client_id
        `)
        .gte('created_at', startDateFilter.toISOString())
        .lte('created_at', endDateFilter.toISOString());

      const { data: b2bShipments, error: b2bError } = await b2bQuery;
      if (b2bError) throw b2bError;

      console.log('📦 Shipments convencionais:', conventionalShipments?.length);
      console.log('📦 Shipments B2B:', b2bShipments?.length);

      // Buscar profiles dos usuários convencionais
      const userIds = [...new Set(conventionalShipments?.map(s => s.user_id).filter(Boolean) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']);

      // Buscar dados dos clientes B2B
      const b2bClientIds = [...new Set(b2bShipments?.map(s => s.b2b_client_id).filter(Boolean) || [])];
      const { data: b2bClients } = await supabase
        .from('b2b_clients')
        .select('id, company_name, email, user_id')
        .in('id', b2bClientIds.length > 0 ? b2bClientIds : ['00000000-0000-0000-0000-000000000000']);

      // Filtrar B2B por cliente se necessário
      let filteredB2B = b2bShipments || [];
      if (selectedClient !== 'all') {
        const b2bClientForUser = b2bClients?.find(c => c.user_id === selectedClient);
        if (b2bClientForUser) {
          filteredB2B = filteredB2B.filter(s => s.b2b_client_id === b2bClientForUser.id);
        } else {
          filteredB2B = [];
        }
      }

      // Filtrar convencionais por região
      let filteredConventional = conventionalShipments || [];
      if (selectedRegion !== 'all') {
        const [cityFilter, stateFilter] = selectedRegion.split(' - ');
        filteredConventional = filteredConventional.filter(shipment => {
          const senderMatch = shipment.sender_address?.city === cityFilter && 
                             shipment.sender_address?.state === stateFilter;
          const recipientMatch = shipment.recipient_address?.city === cityFilter && 
                               shipment.recipient_address?.state === stateFilter;
          return senderMatch || recipientMatch;
        });
      }

      // Calcular receita total
      let totalRevenue = 0;

      // Receita convencional
      filteredConventional.forEach(shipment => {
        const value = calculateShipmentValue(shipment);
        if (value > 0) totalRevenue += value;
      });

      // Receita B2B
      filteredB2B.forEach(shipment => {
        if (shipment.total_price && shipment.total_price > 0) {
          totalRevenue += Number(shipment.total_price);
        }
      });

      const totalShipments = filteredConventional.length + filteredB2B.length;
      const averageValue = totalShipments > 0 ? totalRevenue / totalShipments : 0;

      console.log('💰 Receita total:', totalRevenue);

      // Processar dados por cliente (convencional + B2B)
      const clientRevenue = new Map();
      
      filteredConventional.forEach(shipment => {
        const profile = profiles?.find(p => p.id === shipment.user_id);
        const clientKey = shipment.user_id;
        const clientName = profile?.first_name && profile?.last_name 
          ? `${profile.first_name} ${profile.last_name}`
          : profile?.first_name || profile?.email || 'Cliente';
        const clientEmail = profile?.email || '';
        const value = calculateShipmentValue(shipment);

        if (!clientRevenue.has(clientKey)) {
          clientRevenue.set(clientKey, { client_name: clientName, client_email: clientEmail, total_value: 0, shipment_count: 0 });
        }
        const current = clientRevenue.get(clientKey);
        current.total_value += value;
        current.shipment_count += 1;
      });

      filteredB2B.forEach(shipment => {
        const client = b2bClients?.find(c => c.id === shipment.b2b_client_id);
        const clientKey = `b2b_${shipment.b2b_client_id}`;
        const clientName = client?.company_name || 'Cliente B2B';
        const clientEmail = client?.email || '';
        const value = Number(shipment.total_price) || 0;

        if (!clientRevenue.has(clientKey)) {
          clientRevenue.set(clientKey, { client_name: `${clientName} (B2B)`, client_email: clientEmail, total_value: 0, shipment_count: 0 });
        }
        const current = clientRevenue.get(clientKey);
        current.total_value += value;
        current.shipment_count += 1;
      });

      const revenueByClient = Array.from(clientRevenue.values())
        .sort((a, b) => b.total_value - a.total_value)
        .slice(0, 10);

      // Processar dados por região (só convencional tem endereço)
      const regionRevenue = new Map();
      filteredConventional.forEach(shipment => {
        const regions = new Set<string>();
        if (shipment.sender_address?.city && shipment.sender_address?.state) {
          regions.add(`${shipment.sender_address.city} - ${shipment.sender_address.state}`);
        }
        if (shipment.recipient_address?.city && shipment.recipient_address?.state) {
          regions.add(`${shipment.recipient_address.city} - ${shipment.recipient_address.state}`);
        }
        const value = calculateShipmentValue(shipment);
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

      // Processar dados por período (convencional + B2B)
      const periodRevenue = new Map();
      const processForPeriod = (date: Date, value: number) => {
        let periodKey: string;
        switch (dateRange) {
          case 'daily': periodKey = date.toISOString().split('T')[0]; break;
          case 'monthly': periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; break;
          case 'quarterly': periodKey = `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`; break;
          case 'yearly': periodKey = date.getFullYear().toString(); break;
          default: periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        if (!periodRevenue.has(periodKey)) {
          periodRevenue.set(periodKey, { period: periodKey, total_value: 0, shipment_count: 0 });
        }
        const current = periodRevenue.get(periodKey);
        current.total_value += value;
        current.shipment_count += 1;
      };

      filteredConventional.forEach(s => processForPeriod(new Date(s.created_at), calculateShipmentValue(s)));
      filteredB2B.forEach(s => processForPeriod(new Date(s.created_at), Number(s.total_price) || 0));

      const revenueByPeriod = Array.from(periodRevenue.values())
        .sort((a, b) => a.period.localeCompare(b.period));

      // Detalhes dos envios (convencional + B2B)
      const conventionalDetails = filteredConventional.map(shipment => {
        const profile = profiles?.find(p => p.id === shipment.user_id);
        return {
          id: shipment.id,
          tracking_code: shipment.tracking_code,
          client_name: profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : profile?.email || 'Cliente',
          client_email: profile?.email || '',
          value: calculateShipmentValue(shipment),
          status: shipment.status,
          created_at: shipment.created_at,
          origin_city: shipment.sender_address?.city || 'N/A',
          origin_state: shipment.sender_address?.state || 'N/A',
          destination_city: shipment.recipient_address?.city || 'N/A',
          destination_state: shipment.recipient_address?.state || 'N/A'
        };
      });

      const b2bDetails = filteredB2B.map(shipment => {
        const client = b2bClients?.find(c => c.id === shipment.b2b_client_id);
        return {
          id: shipment.id,
          tracking_code: shipment.tracking_code,
          client_name: `${client?.company_name || 'Cliente B2B'} (B2B)`,
          client_email: client?.email || '',
          value: Number(shipment.total_price) || 0,
          status: shipment.status,
          created_at: shipment.created_at,
          origin_city: 'B2B',
          origin_state: '-',
          destination_city: 'B2B',
          destination_state: '-'
        };
      });

      const shipmentDetails = [...conventionalDetails, ...b2bDetails]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setBillingData({
        totalRevenue,
        totalShipments,
        averageValue,
        revenueByClient,
        revenueByRegion,
        revenueByPeriod,
        shipmentDetails
      });

      console.log('✅ Dados finais definidos no state!');

    } catch (error) {
      console.error('❌ Erro ao carregar dados de faturamento:', error);
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

    const csv = csvContent.map(row => row.join(',')).join('\\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `faturamento_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando dados de faturamento...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Faturamento</h1>
          <p className="text-muted-foreground">
            Análise financeira e relatórios de receita
          </p>
        </div>
        <Button onClick={exportToCSV} className="w-fit">
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <Card className="border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period">Período</Label>
              <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
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

            <div className="space-y-2">
              <Label htmlFor="client">Cliente</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os Clientes" />
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
              <Label htmlFor="region">Região</Label>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as Regiões" />
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

          {dateRange === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data Inicial</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Data Final</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/50 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Faturamento Total</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(billingData?.totalRevenue || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total de Envios</p>
                <p className="text-2xl font-bold text-foreground">
                  {billingData?.totalShipments || 0}
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
                <p className="text-sm font-medium text-muted-foreground mb-1">Valor Médio</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(billingData?.averageValue || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Faturamento por Período */}
        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <CardTitle>Faturamento por Período</CardTitle>
          </CardHeader>
          <CardContent>
            {billingData?.revenueByPeriod && billingData.revenueByPeriod.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={billingData.revenueByPeriod}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Faturamento']} />
                  <Line type="monotone" dataKey="total_value" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 10 Clientes */}
        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <CardTitle>Top 10 Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            {billingData?.revenueByClient && billingData.revenueByClient.length > 0 ? (
              <div className="space-y-4">
                {billingData.revenueByClient.map((client, index) => (
                  <div key={client.client_email} className="flex items-center justify-between p-3 bg-card rounded-lg border">
                    <div>
                      <p className="font-medium">{client.client_name}</p>
                      <p className="text-sm text-muted-foreground">{client.client_email}</p>
                      <p className="text-xs text-muted-foreground">{client.shipment_count} envios</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-success">{formatCurrency(client.total_value)}</p>
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum cliente encontrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Detalhes */}
      <Card className="border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Detalhes dos Envios</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {billingData?.shipmentDetails && billingData.shipmentDetails.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Código</th>
                    <th className="text-left p-2">Cliente</th>
                    <th className="text-left p-2">Valor</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Data</th>
                    <th className="text-left p-2">Rota</th>
                  </tr>
                </thead>
                <tbody>
                  {billingData.shipmentDetails.slice(0, 20).map((shipment) => (
                    <tr key={shipment.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-mono text-sm">
                        {shipment.tracking_code || `ID${shipment.id.slice(0, 8).toUpperCase()}`}
                      </td>
                      <td className="p-2">
                        <div>
                          <p className="font-medium">{shipment.client_name}</p>
                          <p className="text-xs text-muted-foreground">{shipment.client_email}</p>
                        </div>
                      </td>
                      <td className="p-2 font-bold text-success">
                        {formatCurrency(shipment.value)}
                      </td>
                      <td className="p-2">
                        <Badge variant={shipment.status === 'DELIVERED' ? 'default' : 'secondary'}>
                          {shipment.status}
                        </Badge>
                      </td>
                      <td className="p-2 text-sm">
                        {formatDate(shipment.created_at)}
                      </td>
                      <td className="p-2 text-sm">
                        {shipment.origin_city} → {shipment.destination_city}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {billingData.shipmentDetails.length > 20 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Mostrando 20 de {billingData.shipmentDetails.length} envios. Exporte o CSV para ver todos.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum envio encontrado para o período selecionado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFaturamento;