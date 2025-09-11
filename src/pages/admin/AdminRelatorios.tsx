import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from 'xlsx';
import { 
  FileText, 
  Download, 
  Calendar, 
  Package, 
  DollarSign,
  BarChart3,
  Filter,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  MapPin,
  FileCheck,
  AlertCircle
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReportFilters {
  startDate: string;
  endDate: string;
  status?: string;
  period?: string;
}

interface DetailedStats {
  totalShipments: number;
  totalRevenue: number;
  activeCTEs: number;
  paidShipments: number;
  pendingShipments: number;
  deliveredShipments: number;
  avgDeliveryDays: number;
  topStates: Array<{ state: string; count: number }>;
  monthlyGrowth: number;
  revenueGrowth: number;
}

const AdminRelatorios = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    period: 'current_month'
  });
  const [clients, setClients] = useState<any[]>([]);
  const [stats, setStats] = useState<DetailedStats>({
    totalShipments: 0,
    totalRevenue: 0,
    activeCTEs: 0,
    paidShipments: 0,
    pendingShipments: 0,
    deliveredShipments: 0,
    avgDeliveryDays: 0,
    topStates: [],
    monthlyGrowth: 0,
    revenueGrowth: 0
  });

  useEffect(() => {
    loadBasicData();
    loadStats();
  }, []);

  const loadBasicData = async () => {
    try {
      // Carregar clientes
      const { data: clientsData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .order('first_name');
      
      if (clientsData) setClients(clientsData);
    } catch (error) {
      console.error('Erro ao carregar dados básicos:', error);
    }
  };

  const loadStats = async () => {
    try {
      const startDate = filters.startDate;
      const endDate = filters.endDate + ' 23:59:59';

      // Stats atuais
      const [
        { count: totalShipments },
        { count: paidShipments },
        { count: pendingShipments },
        { count: deliveredShipments },
        { count: activeCTEs }
      ] = await Promise.all([
        supabase.from('shipments').select('*', { count: 'exact', head: true })
          .gte('created_at', startDate).lte('created_at', endDate),
        supabase.from('shipments').select('*', { count: 'exact', head: true })
          .gte('created_at', startDate).lte('created_at', endDate)
          .in('status', ['PAID', 'PAYMENT_CONFIRMED']),
        supabase.from('shipments').select('*', { count: 'exact', head: true })
          .gte('created_at', startDate).lte('created_at', endDate)
          .in('status', ['PENDING_PAYMENT', 'PENDING_LABEL']),
        supabase.from('shipments').select('*', { count: 'exact', head: true })
          .gte('created_at', startDate).lte('created_at', endDate)
          .eq('status', 'DELIVERED'),
        supabase.from('cte_emissoes').select('*', { count: 'exact', head: true })
          .gte('created_at', startDate).lte('created_at', endDate)
          .eq('status', 'autorizado')
      ]);

      // Calcular receita total
      const { data: revenueData } = await supabase
        .from('shipments')
        .select('quote_data')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .in('status', ['PAID', 'PAYMENT_CONFIRMED', 'DELIVERED']);

      const totalRevenue = revenueData?.reduce((sum, shipment) => {
        const quoteData = shipment.quote_data as any;
        const price = quoteData?.shippingQuote?.economicPrice || 
                     quoteData?.shippingQuote?.expressPrice || 0;
        return sum + Number(price);
      }, 0) || 0;

      // Top estados
      const { data: statesData } = await supabase
        .from('shipments')
        .select(`
          addresses!shipments_recipient_address_id_fkey(state)
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      const statesCounts = statesData?.reduce((acc: any, item) => {
        const state = item.addresses?.state;
        if (state) {
          acc[state] = (acc[state] || 0) + 1;
        }
        return acc;
      }, {}) || {};

      const topStates = Object.entries(statesCounts)
        .map(([state, count]) => ({ state, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Crescimento mensal (comparar com mês anterior)
      const lastMonthStart = format(subDays(parseISO(startDate), 30), 'yyyy-MM-dd');
      const lastMonthEnd = format(subDays(parseISO(startDate), 1), 'yyyy-MM-dd HH:mm:ss');

      const { count: lastMonthShipments } = await supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', lastMonthStart)
        .lte('created_at', lastMonthEnd);

      const monthlyGrowth = lastMonthShipments && lastMonthShipments > 0 
        ? ((totalShipments || 0) - lastMonthShipments) / lastMonthShipments * 100
        : 0;

      setStats({
        totalShipments: totalShipments || 0,
        totalRevenue,
        activeCTEs: activeCTEs || 0,
        paidShipments: paidShipments || 0,
        pendingShipments: pendingShipments || 0,
        deliveredShipments: deliveredShipments || 0,
        avgDeliveryDays: 5, // Calcular depois
        topStates,
        monthlyGrowth,
        revenueGrowth: 0 // Calcular depois
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const setPredefinedPeriod = (period: string) => {
    const today = new Date();
    let startDate: string;
    let endDate: string;

    switch (period) {
      case 'today':
        startDate = endDate = format(today, 'yyyy-MM-dd');
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        startDate = endDate = format(yesterday, 'yyyy-MM-dd');
        break;
      case 'last_7_days':
        startDate = format(subDays(today, 7), 'yyyy-MM-dd');
        endDate = format(today, 'yyyy-MM-dd');
        break;
      case 'last_30_days':
        startDate = format(subDays(today, 30), 'yyyy-MM-dd');
        endDate = format(today, 'yyyy-MM-dd');
        break;
      case 'current_month':
        startDate = format(startOfMonth(today), 'yyyy-MM-dd');
        endDate = format(endOfMonth(today), 'yyyy-MM-dd');
        break;
      case 'last_month':
        const lastMonth = subDays(startOfMonth(today), 1);
        startDate = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
        endDate = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
        break;
      default:
        return;
    }

    setFilters(prev => ({
      ...prev,
      startDate,
      endDate,
      period
    }));
  };

  const exportFaturamentoReport = async () => {
    setLoading(true);
    try {
      const startDate = filters.startDate;
      const endDate = filters.endDate + ' 23:59:59';

      const { data: shipments, error } = await supabase
        .from('shipments')
        .select(`
          id,
          tracking_code,
          status,
          created_at,
          quote_data,
          payment_data,
          user_id
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .in('status', ['PAID', 'PAYMENT_CONFIRMED', 'DELIVERED'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar dados dos clientes separadamente
      const clientIds = [...new Set(shipments?.map(s => s.user_id).filter(Boolean))];
      const { data: clientsData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', clientIds);

      const clientsMap = new Map(clientsData?.map(c => [c.id, c]) || []);

      const reportData = shipments?.map(shipment => {
        const client = clientsMap.get(shipment.user_id);
        const quoteData = shipment.quote_data as any;
        const paymentData = shipment.payment_data as any;

        return {
          'Código de Rastreio': shipment.tracking_code,
          'Cliente': client ? `${client.first_name} ${client.last_name}` : 'N/A',
          'Email Cliente': client?.email || 'N/A',
          'Status': shipment.status,
          'Data Criação': format(new Date(shipment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          'Valor Frete': quoteData?.shippingQuote?.economicPrice || quoteData?.shippingQuote?.expressPrice || 0,
          'Método Pagamento': paymentData?.payment_method || 'N/A',
          'Status Pagamento': paymentData?.status || 'N/A',
          'Status Detalhado': getStatusDescription(shipment.status)
        };
      }) || [];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(reportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Faturamento');
      
      const fileName = `relatorio_faturamento_${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Relatório exportado!",
        description: `Relatório de faturamento salvo como ${fileName}`,
      });
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar relatório de faturamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportRemessasReport = async () => {
    setLoading(true);
    try {
      const startDate = filters.startDate;
      const endDate = filters.endDate + ' 23:59:59';

      let query = supabase
        .from('shipments')
        .select(`
          id,
          tracking_code,
          status,
          weight,
          length,
          width,
          height,
          format,
          selected_option,
          pickup_option,
          created_at,
          updated_at,
          pricing_table_name,
          motorista_id,
          user_id,
          quote_data
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data: shipments, error } = await query;
      if (error) throw error;

      // Buscar dados dos clientes e motoristas separadamente
      const clientIds = [...new Set(shipments?.map(s => s.user_id).filter(Boolean))];
      const motoristaIds = [...new Set(shipments?.map(s => s.motorista_id).filter(Boolean))];

      const [clientsData, motoristasData] = await Promise.all([
        supabase.from('profiles').select('id, first_name, last_name, email').in('id', clientIds),
        supabase.from('motoristas').select('id, nome, email').in('id', motoristaIds)
      ]);

      const clientsMap = new Map(clientsData.data?.map(c => [c.id, c]) || []);
      const motoristasMap = new Map(motoristasData.data?.map(m => [m.id, m]) || []);

      const reportData = shipments?.map(shipment => {
        const client = clientsMap.get(shipment.user_id);
        const motorista = motoristasMap.get(shipment.motorista_id);
        const quoteData = shipment.quote_data as any;

        return {
          'Código de Rastreio': shipment.tracking_code,
          'Cliente': client ? `${client.first_name} ${client.last_name}` : 'N/A',
          'Email Cliente': client?.email || 'N/A',
          'Status': shipment.status,
          'Peso (kg)': Number(shipment.weight).toFixed(2),
          'Dimensões (LxAxC cm)': `${shipment.length}×${shipment.width}×${shipment.height}`,
          'Volume (m³)': ((Number(shipment.length) * Number(shipment.width) * Number(shipment.height)) / 1000000).toFixed(4),
          'Formato': shipment.format,
          'Tipo Serviço': shipment.selected_option === 'express' ? 'Expresso' : 'Econômico',
          'Tipo Coleta': shipment.pickup_option === 'pickup' ? 'Domiciliar' : 'Balcão',
          'Valor Estimado': quoteData?.shippingQuote?.economicPrice || quoteData?.shippingQuote?.expressPrice || 0,
          'Tabela Preço': shipment.pricing_table_name || 'Sistema Legado',
          'Motorista': motorista?.nome || 'Não atribuído',
          'Email Motorista': motorista?.email || 'N/A',
          'Data Criação': format(new Date(shipment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          'Última Atualização': format(new Date(shipment.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          'Dias em Trânsito': Math.floor((new Date().getTime() - new Date(shipment.created_at).getTime()) / (1000 * 3600 * 24)),
          'Status Detalhado': getStatusDescription(shipment.status)
        };
      }) || [];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(reportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Remessas');
      
      const fileName = `relatorio_remessas_${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Relatório exportado!",
        description: `Relatório de remessas salvo como ${fileName}`,
      });
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar relatório de remessas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportCTEReport = async () => {
    setLoading(true);
    try {
      const startDate = filters.startDate;
      const endDate = filters.endDate + ' 23:59:59';

      const { data: ctes, error } = await supabase
        .from('cte_emissoes')
        .select(`
          id,
          numero_cte,
          chave_cte,
          serie,
          modelo,
          status,
          motivo,
          epec,
          created_at,
          updated_at,
          remessa_id,
          shipment_id
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar dados das remessas e clientes separadamente
      const shipmentIds = [...new Set(ctes?.map(c => c.shipment_id).filter(Boolean))];
      const { data: shipmentsData } = await supabase
        .from('shipments')
        .select('id, tracking_code, user_id')
        .in('id', shipmentIds);

      const clientIds = [...new Set(shipmentsData?.map(s => s.user_id).filter(Boolean))];
      const { data: clientsData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', clientIds);

      const shipmentsMap = new Map(shipmentsData?.map(s => [s.id, s]) || []);
      const clientsMap = new Map(clientsData?.map(c => [c.id, c]) || []);

      const reportData = ctes?.map(cte => {
        const shipment = shipmentsMap.get(cte.shipment_id);
        const client = shipment ? clientsMap.get(shipment.user_id) : null;

        return {
          'Número CT-e': cte.numero_cte,
          'Chave CT-e': cte.chave_cte,
          'Série': cte.serie,
          'Modelo': cte.modelo,
          'Status': cte.status,
          'Motivo': cte.motivo || 'N/A',
          'EPEC': cte.epec ? 'Sim' : 'Não',
          'Código Rastreio': shipment?.tracking_code || 'N/A',
          'Cliente': client ? `${client.first_name} ${client.last_name}` : 'N/A',
          'Email Cliente': client?.email || 'N/A',
          'Data Emissão': format(new Date(cte.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          'Última Atualização': format(new Date(cte.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          'Status Detalhado': cte.status === 'autorizado' ? 'Autorizada pela SEFAZ' : 'Pendente de Autorização'
        };
      }) || [];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(reportData);
      XLSX.utils.book_append_sheet(wb, ws, 'CT-e');
      
      const fileName = `relatorio_cte_${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Relatório exportado!",
        description: `Relatório de CT-e salvo como ${fileName}`,
      });
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar relatório de CT-e",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusDescription = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'PENDING_PAYMENT': 'Aguardando Pagamento',
      'PAID': 'Pago - Processando',
      'PAYMENT_CONFIRMED': 'Pagamento Confirmado',
      'LABEL_GENERATED': 'Etiqueta Gerada',
      'PICKUP_SCHEDULED': 'Coleta Agendada',
      'IN_TRANSIT': 'Em Trânsito',
      'OUT_FOR_DELIVERY': 'Saiu para Entrega',
      'DELIVERED': 'Entregue',
      'FAILED_DELIVERY': 'Falha na Entrega',
      'RETURNED': 'Devolvido',
      'CANCELLED': 'Cancelado'
    };
    return statusMap[status] || status;
  };

  const applyFilters = () => {
    loadStats();
    toast({
      title: "Filtros aplicados",
      description: "Estatísticas atualizadas com os novos filtros",
    });
  };

  const resetFilters = () => {
    setFilters({
      startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
      period: 'current_month'
    });
    loadStats();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Relatórios Gerenciais
          </h1>
          <p className="text-muted-foreground mt-2">
            Análise completa e exportação de dados do sistema de transportes
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2">
          <BarChart3 className="h-4 w-4" />
          Dashboard Executivo
        </Badge>
      </div>

      {/* Filtros Melhorados */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros Avançados de Período
          </CardTitle>
          <CardDescription>
            Configure períodos personalizados e filtros detalhados para análise precisa dos dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status || 'all'} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, status: value === 'all' ? undefined : value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="PENDING_PAYMENT">Pendente Pagamento</SelectItem>
                  <SelectItem value="PAID">Pago</SelectItem>
                  <SelectItem value="PAYMENT_CONFIRMED">Pagamento Confirmado</SelectItem>
                  <SelectItem value="LABEL_GENERATED">Etiqueta Gerada</SelectItem>
                  <SelectItem value="IN_TRANSIT">Em Trânsito</SelectItem>
                  <SelectItem value="DELIVERED">Entregue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mb-4">
            <Label className="text-sm font-medium">Períodos Predefinidos</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                { key: 'today', label: 'Hoje' },
                { key: 'yesterday', label: 'Ontem' },
                { key: 'last_7_days', label: 'Últimos 7 dias' },
                { key: 'last_30_days', label: 'Últimos 30 dias' },
                { key: 'current_month', label: 'Este mês' },
                { key: 'last_month', label: 'Mês passado' }
              ].map(period => (
                <Button
                  key={period.key}
                  variant={filters.period === period.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPredefinedPeriod(period.key)}
                >
                  {period.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={applyFilters} variant="default" className="flex-1 sm:flex-none">
              <Filter className="h-4 w-4 mr-2" />
              Aplicar Filtros
            </Button>
            <Button onClick={resetFilters} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Resetar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas Detalhadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Remessas</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totalShipments}</p>
                <div className="flex items-center mt-2">
                  {stats.monthlyGrowth > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm ${stats.monthlyGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {Math.abs(stats.monthlyGrowth).toFixed(1)}%
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">vs mês anterior</span>
                </div>
              </div>
              <Package className="h-12 w-12 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Faturamento Total</p>
                <p className="text-3xl font-bold text-emerald-600">
                  R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {stats.paidShipments} remessas pagas
                  </Badge>
                </div>
              </div>
              <DollarSign className="h-12 w-12 text-emerald-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status das Remessas</p>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Entregues:</span>
                    <span className="font-medium">{stats.deliveredShipments}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-600">Pendentes:</span>
                    <span className="font-medium">{stats.pendingShipments}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-600">Pagas:</span>
                    <span className="font-medium">{stats.paidShipments}</span>
                  </div>
                </div>
              </div>
              <BarChart3 className="h-12 w-12 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">CT-e e Documentos</p>
                <p className="text-3xl font-bold text-purple-600">{stats.activeCTEs}</p>
                <div className="flex items-center mt-2">
                  <FileCheck className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-500">Autorizadas</span>
                </div>
              </div>
              <FileText className="h-12 w-12 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights Adicionais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Top Estados de Destino
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topStates.length > 0 ? (
              <div className="space-y-3">
                {stats.topStates.map((state, index) => (
                  <div key={state.state} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <span className="font-medium">{state.state}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {state.count} remessas
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Nenhum dado disponível para o período selecionado
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Métricas de Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tempo Médio de Entrega</span>
                <Badge variant="secondary">{stats.avgDeliveryDays} dias</Badge>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Taxa de Entrega</span>
                <Badge variant="secondary">
                  {stats.totalShipments > 0 
                    ? ((stats.deliveredShipments / stats.totalShipments) * 100).toFixed(1) 
                    : 0}%
                </Badge>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Crescimento Mensal</span>
                <Badge variant={stats.monthlyGrowth > 0 ? "default" : "destructive"}>
                  {stats.monthlyGrowth > 0 ? '+' : ''}{stats.monthlyGrowth.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Relatórios */}
      <Tabs defaultValue="faturamento" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="faturamento">💰 Faturamento</TabsTrigger>
          <TabsTrigger value="remessas">📦 Remessas</TabsTrigger>
          <TabsTrigger value="cte">📄 CT-e</TabsTrigger>
        </TabsList>

        <TabsContent value="faturamento">
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Relatório Completo de Faturamento
              </CardTitle>
              <CardDescription>
                Análise detalhada de receitas, métodos de pagamento e status financeiro das remessas
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    📊 <strong>Este relatório inclui:</strong>
                  </p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Todas as remessas pagas no período selecionado</li>
                    <li>• Detalhes completos de valores e métodos de pagamento</li>
                    <li>• Informações dos clientes e status detalhados</li>
                    <li>• Dados para análise de performance financeira</li>
                  </ul>
                </div>
                <Button onClick={exportFaturamentoReport} disabled={loading} className="w-full sm:w-auto" size="lg">
                  <Download className="h-4 w-4 mr-2" />
                  {loading ? 'Exportando Relatório...' : 'Exportar Relatório de Faturamento'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="remessas">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Relatório Detalhado de Remessas
              </CardTitle>
              <CardDescription>
                Dados operacionais completos com informações de logística e performance
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    📦 <strong>Informações detalhadas incluídas:</strong>
                  </p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Dimensões, peso e volume calculado de cada remessa</li>
                    <li>• Status detalhado e tempo em trânsito</li>
                    <li>• Motorista responsável e tabela de preços utilizada</li>
                    <li>• Tipo de serviço (Econômico/Expresso) e modalidade de coleta</li>
                    <li>• Dados completos de clientes e rastreamento</li>
                  </ul>
                </div>
                <Button onClick={exportRemessasReport} disabled={loading} className="w-full sm:w-auto" size="lg">
                  <Download className="h-4 w-4 mr-2" />
                  {loading ? 'Exportando Relatório...' : 'Exportar Relatório de Remessas'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cte">
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Relatório de CT-e (Conhecimento de Transporte Eletrônico)
              </CardTitle>
              <CardDescription>
                Documentos fiscais com informações para conformidade e auditoria
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    📄 <strong>Dados fiscais e regulatórios:</strong>
                  </p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Números, chaves de acesso e série dos CT-e</li>
                    <li>• Status de autorização pela SEFAZ</li>
                    <li>• Vinculação com remessas e dados de clientes</li>
                    <li>• Informações de EPEC e motivos de rejeição</li>
                    <li>• Datas de emissão e última atualização</li>
                  </ul>
                </div>
                <Button onClick={exportCTEReport} disabled={loading} className="w-full sm:w-auto" size="lg">
                  <Download className="h-4 w-4 mr-2" />
                  {loading ? 'Exportando Relatório...' : 'Exportar Relatório de CT-e'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminRelatorios;