import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from 'xlsx';
import { 
  FileText, 
  Download, 
  Calendar, 
  Package, 
  Users, 
  DollarSign, 
  Truck,
  BarChart3,
  Filter,
  RefreshCw
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

interface ReportFilters {
  startDate: string;
  endDate: string;
  status?: string;
  clientId?: string;
  motoristaId?: string;
}

const AdminRelatorios = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [clients, setClients] = useState<any[]>([]);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalShipments: 0,
    totalRevenue: 0,
    totalClients: 0,
    totalDrivers: 0,
    activeCTEs: 0
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

      // Carregar motoristas
      const { data: motoristasData } = await supabase
        .from('motoristas')
        .select('id, nome, email, status')
        .order('nome');
      
      if (motoristasData) setMotoristas(motoristasData);
    } catch (error) {
      console.error('Erro ao carregar dados básicos:', error);
    }
  };

  const loadStats = async () => {
    try {
      const startDate = filters.startDate;
      const endDate = filters.endDate + ' 23:59:59';

      // Total de remessas
      const { count: shipmentsCount } = await supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      // Total de clientes
      const { count: clientsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Total de motoristas
      const { count: driversCount } = await supabase
        .from('motoristas')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativo');

      // CTEs ativas
      const { count: ctesCount } = await supabase
        .from('cte_emissoes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'autorizado')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      setStats({
        totalShipments: shipmentsCount || 0,
        totalRevenue: 0, // Calcular depois com base nos dados de pagamento
        totalClients: clientsCount || 0,
        totalDrivers: driversCount || 0,
        activeCTEs: ctesCount || 0
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
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
          'Data Criação': format(new Date(shipment.created_at), 'dd/MM/yyyy HH:mm'),
          'Valor Frete': quoteData?.shippingQuote?.economicPrice || quoteData?.shippingQuote?.expressPrice || 0,
          'Método Pagamento': paymentData?.payment_method || 'N/A',
          'Status Pagamento': paymentData?.status || 'N/A'
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
          user_id
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.clientId && filters.clientId !== 'all') {
        query = query.eq('user_id', filters.clientId);
      }

      if (filters.motoristaId && filters.motoristaId !== 'all') {
        query = query.eq('motorista_id', filters.motoristaId);
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

        return {
          'Código de Rastreio': shipment.tracking_code,
          'Cliente': client ? `${client.first_name} ${client.last_name}` : 'N/A',
          'Email Cliente': client?.email || 'N/A',
          'Motorista': motorista?.nome || 'Não atribuído',
          'Status': shipment.status,
          'Peso (kg)': shipment.weight,
          'Dimensões (cm)': `${shipment.length}x${shipment.width}x${shipment.height}`,
          'Formato': shipment.format,
          'Tipo Serviço': shipment.selected_option === 'express' ? 'Expresso' : 'Econômico',
          'Tipo Coleta': shipment.pickup_option === 'pickup' ? 'Domiciliar' : 'Balcão',
          'Tabela Preço': shipment.pricing_table_name || 'Sistema Legado',
          'Data Criação': format(new Date(shipment.created_at), 'dd/MM/yyyy HH:mm'),
          'Última Atualização': format(new Date(shipment.updated_at), 'dd/MM/yyyy HH:mm')
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
          'Data Emissão': format(new Date(cte.created_at), 'dd/MM/yyyy HH:mm'),
          'Última Atualização': format(new Date(cte.updated_at), 'dd/MM/yyyy HH:mm')
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

  const exportClientesReport = async () => {
    setLoading(true);
    try {
      const { data: clientsData, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          document,
          inscricao_estadual,
          created_at,
          updated_at
        `)
        .order('first_name');

      if (error) throw error;

      // Buscar estatísticas de remessas por cliente
      const clientStats = await Promise.all(
        clientsData?.map(async (client) => {
          const { count: shipmentsCount } = await supabase
            .from('shipments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', client.id);

          const { data: lastShipment } = await supabase
            .from('shipments')
            .select('created_at')
            .eq('user_id', client.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            'Nome': `${client.first_name} ${client.last_name}`,
            'Email': client.email,
            'Telefone': client.phone || 'N/A',
            'CPF/CNPJ': client.document || 'N/A',
            'Inscrição Estadual': client.inscricao_estadual || 'N/A',
            'Total Remessas': shipmentsCount || 0,
            'Última Remessa': lastShipment ? 
              format(new Date(lastShipment.created_at), 'dd/MM/yyyy') : 'Nunca',
            'Data Cadastro': format(new Date(client.created_at), 'dd/MM/yyyy HH:mm'),
            'Última Atualização': format(new Date(client.updated_at), 'dd/MM/yyyy HH:mm')
          };
        }) || []
      );

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(clientStats);
      XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
      
      const fileName = `relatorio_clientes_${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Relatório exportado!",
        description: `Relatório de clientes salvo como ${fileName}`,
      });
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar relatório de clientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportMotoristasReport = async () => {
    setLoading(true);
    try {
      const { data: motoristasData, error } = await supabase
        .from('motoristas')
        .select(`
          id,
          nome,
          email,
          telefone,
          cpf,
          status,
          created_at,
          updated_at
        `)
        .order('nome');

      if (error) throw error;

      // Buscar estatísticas de remessas por motorista
      const motoristaStats = await Promise.all(
        motoristasData?.map(async (motorista) => {
          const { count: shipmentsCount } = await supabase
            .from('shipments')
            .select('*', { count: 'exact', head: true })
            .eq('motorista_id', motorista.id);

          const { data: lastShipment } = await supabase
            .from('shipments')
            .select('created_at')
            .eq('motorista_id', motorista.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            'Nome': motorista.nome,
            'Email': motorista.email,
            'Telefone': motorista.telefone,
            'CPF': motorista.cpf,
            'Status': motorista.status,
            'Total Remessas Atribuídas': shipmentsCount || 0,
            'Última Remessa': lastShipment ? 
              format(new Date(lastShipment.created_at), 'dd/MM/yyyy') : 'Nunca',
            'Data Cadastro': format(new Date(motorista.created_at), 'dd/MM/yyyy HH:mm'),
            'Última Atualização': format(new Date(motorista.updated_at), 'dd/MM/yyyy HH:mm')
          };
        }) || []
      );

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(motoristaStats);
      XLSX.utils.book_append_sheet(wb, ws, 'Motoristas');
      
      const fileName = `relatorio_motoristas_${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Relatório exportado!",
        description: `Relatório de motoristas salvo como ${fileName}`,
      });
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar relatório de motoristas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
    });
    loadStats();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">
            Gere e exporte relatórios completos do sistema
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Relatórios Gerenciais
        </Badge>
      </div>

      {/* Filtros Globais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Período
          </CardTitle>
          <CardDescription>
            Configure o período e filtros para os relatórios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <Label>Cliente</Label>
              <Select value={filters.clientId || 'all'} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, clientId: value === 'all' ? undefined : value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.first_name} {client.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          <div className="flex gap-2 mt-4">
            <Button onClick={applyFilters} variant="default">
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

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Remessas</p>
                <p className="text-2xl font-bold">{stats.totalShipments}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Clientes</p>
                <p className="text-2xl font-bold">{stats.totalClients}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Motoristas Ativos</p>
                <p className="text-2xl font-bold">{stats.totalDrivers}</p>
              </div>
              <Truck className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">CT-e Ativas</p>
                <p className="text-2xl font-bold">{stats.activeCTEs}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Faturamento</p>
                <p className="text-2xl font-bold">R$ {stats.totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Relatórios */}
      <Tabs defaultValue="faturamento" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="faturamento">Faturamento</TabsTrigger>
          <TabsTrigger value="remessas">Remessas</TabsTrigger>
          <TabsTrigger value="cte">CT-e</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="motoristas">Motoristas</TabsTrigger>
        </TabsList>

        <TabsContent value="faturamento">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Relatório de Faturamento
              </CardTitle>
              <CardDescription>
                Relatório detalhado com informações de pagamento e receita do período selecionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Este relatório inclui todas as remessas pagas no período, com detalhes de valor, 
                  método de pagamento e informações do cliente.
                </p>
                <Button onClick={exportFaturamentoReport} disabled={loading} className="w-full sm:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  {loading ? 'Exportando...' : 'Exportar Relatório de Faturamento'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="remessas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Relatório de Remessas
              </CardTitle>
              <CardDescription>
                Relatório completo de todas as remessas com detalhes operacionais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Relatório com informações detalhadas das remessas: dimensões, peso, status, 
                  motorista responsável e tabela de preços utilizada.
                </p>
                <Button onClick={exportRemessasReport} disabled={loading} className="w-full sm:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  {loading ? 'Exportando...' : 'Exportar Relatório de Remessas'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cte">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Relatório de CT-e
              </CardTitle>
              <CardDescription>
                Relatório de todos os Conhecimentos de Transporte Eletrônico emitidos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Relatório com informações fiscais das CT-e: número, chave de acesso, 
                  status de autorização e dados da remessa vinculada.
                </p>
                <Button onClick={exportCTEReport} disabled={loading} className="w-full sm:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  {loading ? 'Exportando...' : 'Exportar Relatório de CT-e'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clientes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Relatório de Clientes
              </CardTitle>
              <CardDescription>
                Relatório completo da base de clientes com estatísticas de uso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Relatório com dados dos clientes, total de remessas realizadas, 
                  data da última remessa e informações de contato.
                </p>
                <Button onClick={exportClientesReport} disabled={loading} className="w-full sm:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  {loading ? 'Exportando...' : 'Exportar Relatório de Clientes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="motoristas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Relatório de Motoristas
              </CardTitle>
              <CardDescription>
                Relatório da equipe de motoristas com estatísticas de desempenho
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Relatório com dados dos motoristas cadastrados, status, 
                  total de remessas atribuídas e última atividade.
                </p>
                <Button onClick={exportMotoristasReport} disabled={loading} className="w-full sm:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  {loading ? 'Exportando...' : 'Exportar Relatório de Motoristas'}
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