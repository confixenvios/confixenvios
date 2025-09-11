import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from 'xlsx';
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReportFilters {
  startDate: string;
  endDate: string;
  status?: string;
  period?: string;
}

const AdminRelatorios = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    period: 'current_month'
  });

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
      'PENDING_LABEL': 'Aguardando Etiqueta',
      'LABEL_GENERATED': 'Etiqueta Gerada',
      'IN_TRANSIT': 'Em Trânsito',
      'OUT_FOR_DELIVERY': 'Saiu para Entrega',
      'DELIVERED': 'Entregue',
      'DELIVERY_FAILED': 'Falha na Entrega',
      'RETURNED': 'Devolvido',
      'CANCELLED': 'Cancelado'
    };
    return statusMap[status] || status;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
            <p className="text-muted-foreground mt-1">
              Geração e exportação de relatórios gerenciais
            </p>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            <CardDescription>
              Configure o período e filtros para os relatórios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Período Predefinido */}
              <div className="space-y-2">
                <Label htmlFor="period">Período</Label>
                <Select
                  value={filters.period}
                  onValueChange={(value) => setPredefinedPeriod(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="yesterday">Ontem</SelectItem>
                    <SelectItem value="last_7_days">Últimos 7 dias</SelectItem>
                    <SelectItem value="last_30_days">Últimos 30 dias</SelectItem>
                    <SelectItem value="current_month">Mês atual</SelectItem>
                    <SelectItem value="last_month">Mês passado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Data Início */}
              <div className="space-y-2">
                <Label htmlFor="startDate">Data Início</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>

              {/* Data Fim */}
              <div className="space-y-2">
                <Label htmlFor="endDate">Data Fim</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>

              {/* Status (para relatório de remessas) */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === 'all' ? undefined : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="PENDING_PAYMENT">Aguardando Pagamento</SelectItem>
                    <SelectItem value="PAID">Pago</SelectItem>
                    <SelectItem value="IN_TRANSIT">Em Trânsito</SelectItem>
                    <SelectItem value="DELIVERED">Entregue</SelectItem>
                    <SelectItem value="CANCELLED">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botões de Exportação */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Relatório de Faturamento */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <FileText className="h-5 w-5" />
                Faturamento
              </CardTitle>
              <CardDescription>
                Relatório detalhado de receitas e pagamentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Inclui: valor do frete, método de pagamento, status de pagamento, dados do cliente
              </p>
              <Button 
                onClick={exportFaturamentoReport}
                disabled={loading}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </CardContent>
          </Card>

          {/* Relatório de Remessas */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <FileText className="h-5 w-5" />
                Remessas
              </CardTitle>
              <CardDescription>
                Relatório completo de todas as remessas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Inclui: dimensões, peso, motorista, status, dias em trânsito, tipo de serviço
              </p>
              <Button 
                onClick={exportRemessasReport}
                disabled={loading}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </CardContent>
          </Card>

          {/* Relatório de CT-e */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <FileText className="h-5 w-5" />
                CT-e
              </CardTitle>
              <CardDescription>
                Relatório de conhecimentos de transporte eletrônico
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Inclui: número CT-e, chave, status SEFAZ, EPEC, dados do cliente
              </p>
              <Button 
                onClick={exportCTEReport}
                disabled={loading}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminRelatorios;