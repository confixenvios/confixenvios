import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from 'xlsx';
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter,
  Settings,
  CheckSquare
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReportFilters {
  startDate: string;
  endDate: string;
  status?: string;
  period?: string;
}

type ReportType = 'faturamento' | 'remessas' | 'cte';

interface FieldOption {
  key: string;
  label: string;
  description?: string;
}

const FIELD_OPTIONS: Record<ReportType, FieldOption[]> = {
  faturamento: [
    { key: 'tracking_code', label: 'Código de Rastreio', description: 'Código único da remessa' },
    { key: 'client_name', label: 'Nome do Cliente', description: 'Nome completo do cliente' },
    { key: 'client_email', label: 'Email do Cliente', description: 'Email de contato' },
    { key: 'status', label: 'Status', description: 'Status atual da remessa' },
    { key: 'status_detailed', label: 'Status Detalhado', description: 'Descrição completa do status' },
    { key: 'created_at', label: 'Data de Criação', description: 'Data e hora da criação' },
    { key: 'freight_value', label: 'Valor do Frete', description: 'Valor cobrado pelo frete' },
    { key: 'payment_method', label: 'Método de Pagamento', description: 'Forma de pagamento utilizada' },
    { key: 'payment_status', label: 'Status do Pagamento', description: 'Situação do pagamento' },
    { key: 'invoice_date', label: 'Data de Faturamento', description: 'Data do faturamento' },
    { key: 'commission', label: 'Comissão', description: 'Valor da comissão' }
  ],
  remessas: [
    { key: 'tracking_code', label: 'Código de Rastreio', description: 'Código único da remessa' },
    { key: 'client_name', label: 'Nome do Cliente', description: 'Nome completo do cliente' },
    { key: 'client_email', label: 'Email do Cliente', description: 'Email de contato' },
    { key: 'status', label: 'Status', description: 'Status atual da remessa' },
    { key: 'status_detailed', label: 'Status Detalhado', description: 'Descrição completa do status' },
    { key: 'weight', label: 'Peso (kg)', description: 'Peso do pacote em quilogramas' },
    { key: 'dimensions', label: 'Dimensões (LxAxC)', description: 'Dimensões em centímetros' },
    { key: 'volume', label: 'Volume (m³)', description: 'Volume calculado em metros cúbicos' },
    { key: 'format', label: 'Formato', description: 'Formato do pacote' },
    { key: 'service_type', label: 'Tipo de Serviço', description: 'Econômico ou Expresso' },
    { key: 'pickup_type', label: 'Tipo de Coleta', description: 'Domiciliar ou Balcão' },
    { key: 'estimated_value', label: 'Valor Estimado', description: 'Valor estimado do frete' },
    { key: 'pricing_table', label: 'Tabela de Preço', description: 'Tabela utilizada para cálculo' },
    { key: 'driver_name', label: 'Motorista', description: 'Nome do motorista responsável' },
    { key: 'driver_email', label: 'Email do Motorista', description: 'Email do motorista' },
    { key: 'created_at', label: 'Data de Criação', description: 'Data e hora da criação' },
    { key: 'updated_at', label: 'Última Atualização', description: 'Data da última atualização' },
    { key: 'days_in_transit', label: 'Dias em Trânsito', description: 'Número de dias desde a criação' },
    { key: 'sender_city', label: 'Cidade Origem', description: 'Cidade do remetente' },
    { key: 'sender_state', label: 'Estado Origem', description: 'Estado do remetente' },
    { key: 'recipient_city', label: 'Cidade Destino', description: 'Cidade do destinatário' },
    { key: 'recipient_state', label: 'Estado Destino', description: 'Estado do destinatário' }
  ],
  cte: [
    { key: 'cte_number', label: 'Número CT-e', description: 'Número do conhecimento de transporte' },
    { key: 'cte_key', label: 'Chave CT-e', description: 'Chave do CT-e' },
    { key: 'serie', label: 'Série', description: 'Série do documento' },
    { key: 'modelo', label: 'Modelo', description: 'Modelo do documento' },
    { key: 'status', label: 'Status', description: 'Status do CT-e' },
    { key: 'status_detailed', label: 'Status Detalhado', description: 'Descrição detalhada do status' },
    { key: 'reason', label: 'Motivo', description: 'Motivo da situação atual' },
    { key: 'epec', label: 'EPEC', description: 'Se possui EPEC' },
    { key: 'tracking_code', label: 'Código de Rastreio', description: 'Código da remessa associada' },
    { key: 'client_name', label: 'Nome do Cliente', description: 'Nome do cliente' },
    { key: 'client_email', label: 'Email do Cliente', description: 'Email do cliente' },
    { key: 'emission_date', label: 'Data de Emissão', description: 'Data de emissão do CT-e' },
    { key: 'updated_at', label: 'Última Atualização', description: 'Data da última atualização' },
    { key: 'authorization_date', label: 'Data de Autorização', description: 'Data de autorização pela SEFAZ' },
    { key: 'xml_url', label: 'URL do XML', description: 'Link para o arquivo XML' },
    { key: 'dacte_url', label: 'URL do DACTE', description: 'Link para o DACTE' }
  ]
};

const AdminRelatorios = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('faturamento');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
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

  const handleReportTypeChange = (type: ReportType) => {
    setReportType(type);
    setSelectedFields([]); // Reset selected fields when changing report type
  };

  const handleFieldToggle = (fieldKey: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldKey) 
        ? prev.filter(f => f !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  const selectAllFields = () => {
    setSelectedFields(FIELD_OPTIONS[reportType].map(field => field.key));
  };

  const clearAllFields = () => {
    setSelectedFields([]);
  };

  const exportCustomReport = async () => {
    if (selectedFields.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um campo para exportar",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const startDate = filters.startDate;
      const endDate = filters.endDate + ' 23:59:59';

      let reportData: any[] = [];

      if (reportType === 'faturamento') {
        reportData = await fetchFaturamentoData(startDate, endDate);
      } else if (reportType === 'remessas') {
        reportData = await fetchRemessasData(startDate, endDate);
      } else if (reportType === 'cte') {
        reportData = await fetchCTEData(startDate, endDate);
      }

      // Filter data to include only selected fields
      const filteredData = reportData.map(row => {
        const filteredRow: any = {};
        selectedFields.forEach(fieldKey => {
          const field = FIELD_OPTIONS[reportType].find(f => f.key === fieldKey);
          if (field && row[fieldKey] !== undefined) {
            filteredRow[field.label] = row[fieldKey];
          }
        });
        return filteredRow;
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(filteredData);
      XLSX.utils.book_append_sheet(wb, ws, getReportSheetName(reportType));
      
      const fileName = `relatorio_${reportType}_personalizado_${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Relatório exportado!",
        description: `Relatório personalizado salvo como ${fileName}`,
      });
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar relatório personalizado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFaturamentoData = async (startDate: string, endDate: string) => {
    // Buscar shipments convencionais
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

    // Buscar shipments B2B
    const { data: b2bShipments, error: b2bError } = await supabase
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
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (b2bError) throw b2bError;

    // Buscar dados dos clientes convencionais
    const clientIds = [...new Set(shipments?.map(s => s.user_id).filter(Boolean) || [])];
    const { data: clientsData } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', clientIds.length > 0 ? clientIds : ['00000000-0000-0000-0000-000000000000']);

    // Buscar dados dos clientes B2B
    const b2bClientIds = [...new Set(b2bShipments?.map(s => s.b2b_client_id).filter(Boolean) || [])];
    const { data: b2bClientsData } = await supabase
      .from('b2b_clients')
      .select('id, company_name, email')
      .in('id', b2bClientIds.length > 0 ? b2bClientIds : ['00000000-0000-0000-0000-000000000000']);

    const clientsMap = new Map(clientsData?.map(c => [c.id, c]) || []);
    const b2bClientsMap = new Map(b2bClientsData?.map(c => [c.id, c]) || []);

    // Processar convencionais
    const conventionalData = shipments?.map(shipment => {
      const client = clientsMap.get(shipment.user_id);
      const quoteData = shipment.quote_data as any;
      const paymentData = shipment.payment_data as any;

      return {
        tracking_code: shipment.tracking_code,
        client_name: client ? `${client.first_name} ${client.last_name}` : 'N/A',
        client_email: client?.email || 'N/A',
        status: shipment.status,
        status_detailed: getStatusDescription(shipment.status),
        created_at: format(new Date(shipment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        freight_value: quoteData?.shippingQuote?.economicPrice || quoteData?.shippingQuote?.expressPrice || paymentData?.pix_details?.amount || 0,
        payment_method: paymentData?.payment_method || paymentData?.method || 'N/A',
        payment_status: paymentData?.status || 'N/A',
        invoice_date: format(new Date(shipment.created_at), 'dd/MM/yyyy', { locale: ptBR }),
        commission: 0
      };
    }) || [];

    // Processar B2B
    const b2bData = b2bShipments?.map(shipment => {
      const client = b2bClientsMap.get(shipment.b2b_client_id);

      return {
        tracking_code: shipment.tracking_code,
        client_name: `${client?.company_name || 'Cliente B2B'} (B2B)`,
        client_email: client?.email || 'N/A',
        status: shipment.status,
        status_detailed: getStatusDescription(shipment.status),
        created_at: format(new Date(shipment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        freight_value: Number(shipment.total_price) || 0,
        payment_method: 'PIX',
        payment_status: shipment.status === 'ENTREGUE' ? 'Confirmado' : 'Pendente',
        invoice_date: format(new Date(shipment.created_at), 'dd/MM/yyyy', { locale: ptBR }),
        commission: 0
      };
    }) || [];

    return [...conventionalData, ...b2bData].sort((a, b) => 
      new Date(b.created_at.split(' ')[0].split('/').reverse().join('-')).getTime() - 
      new Date(a.created_at.split(' ')[0].split('/').reverse().join('-')).getTime()
    );
  };

  const fetchRemessasData = async (startDate: string, endDate: string) => {
    // Buscar shipments convencionais
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
        quote_data,
        sender_address_id,
        recipient_address_id
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    const { data: shipments, error } = await query;
    if (error) throw error;

    // Buscar shipments B2B
    let b2bQuery = supabase
      .from('b2b_shipments')
      .select(`
        id,
        tracking_code,
        status,
        total_weight,
        total_volumes,
        created_at,
        updated_at,
        b2b_client_id
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    const { data: b2bShipments, error: b2bError } = await b2bQuery;
    if (b2bError) throw b2bError;

    // Buscar dados relacionados convencionais
    const clientIds = [...new Set(shipments?.map(s => s.user_id).filter(Boolean) || [])];
    const motoristaIds = [...new Set(shipments?.map(s => s.motorista_id).filter(Boolean) || [])];
    const addressIds = [...new Set([
      ...shipments?.map(s => s.sender_address_id) || [],
      ...shipments?.map(s => s.recipient_address_id) || []
    ].filter(Boolean))];

    // Buscar dados B2B
    const b2bClientIds = [...new Set(b2bShipments?.map(s => s.b2b_client_id).filter(Boolean) || [])];

    const [clientsData, motoristasData, addressesData, b2bClientsData] = await Promise.all([
      supabase.from('profiles').select('id, first_name, last_name, email').in('id', clientIds.length > 0 ? clientIds : ['00000000-0000-0000-0000-000000000000']),
      supabase.from('motoristas').select('id, nome, username').in('id', motoristaIds.length > 0 ? motoristaIds : ['00000000-0000-0000-0000-000000000000']),
      supabase.from('addresses').select('id, city, state').in('id', addressIds.length > 0 ? addressIds : ['00000000-0000-0000-0000-000000000000']),
      supabase.from('b2b_clients').select('id, company_name, email').in('id', b2bClientIds.length > 0 ? b2bClientIds : ['00000000-0000-0000-0000-000000000000'])
    ]);

    const clientsMap = new Map((clientsData.data as any[] || []).map(c => [c.id, c]));
    const motoristasMap = new Map((motoristasData.data as any[] || []).map(m => [m.id, m]));
    const addressesMap = new Map((addressesData.data as any[] || []).map(a => [a.id, a]));
    const b2bClientsMap = new Map((b2bClientsData.data as any[] || []).map(c => [c.id, c]));

    // Processar convencionais
    const conventionalData = shipments?.map(shipment => {
      const client = clientsMap.get(shipment.user_id);
      const motorista = motoristasMap.get(shipment.motorista_id);
      const senderAddress = addressesMap.get(shipment.sender_address_id);
      const recipientAddress = addressesMap.get(shipment.recipient_address_id);
      const quoteData = shipment.quote_data as any;

      return {
        tracking_code: shipment.tracking_code,
        client_name: client ? `${client.first_name} ${client.last_name}` : 'N/A',
        client_email: client?.email || 'N/A',
        status: shipment.status,
        status_detailed: getStatusDescription(shipment.status),
        weight: Number(shipment.weight).toFixed(2),
        dimensions: `${shipment.length}×${shipment.width}×${shipment.height}`,
        volume: ((Number(shipment.length) * Number(shipment.width) * Number(shipment.height)) / 1000000).toFixed(4),
        format: shipment.format,
        service_type: shipment.selected_option === 'express' ? 'Expresso' : 'Econômico',
        pickup_type: shipment.pickup_option === 'pickup' ? 'Domiciliar' : 'Balcão',
        estimated_value: quoteData?.shippingQuote?.economicPrice || quoteData?.shippingQuote?.expressPrice || 0,
        pricing_table: shipment.pricing_table_name || 'Sistema Legado',
        driver_name: (motorista as any)?.nome || 'Não atribuído',
        driver_username: (motorista as any)?.username || 'N/A',
        created_at: format(new Date(shipment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        updated_at: format(new Date(shipment.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        days_in_transit: Math.floor((new Date().getTime() - new Date(shipment.created_at).getTime()) / (1000 * 3600 * 24)),
        sender_city: senderAddress?.city || 'N/A',
        sender_state: senderAddress?.state || 'N/A',
        recipient_city: recipientAddress?.city || 'N/A',
        recipient_state: recipientAddress?.state || 'N/A'
      };
    }) || [];

    // Processar B2B
    const b2bData = b2bShipments?.map(shipment => {
      const client = b2bClientsMap.get(shipment.b2b_client_id);

      return {
        tracking_code: shipment.tracking_code,
        client_name: `${client?.company_name || 'Cliente B2B'} (B2B)`,
        client_email: client?.email || 'N/A',
        status: shipment.status,
        status_detailed: getStatusDescription(shipment.status),
        weight: Number(shipment.total_weight).toFixed(2),
        dimensions: 'B2B Express',
        volume: '-',
        format: 'B2B',
        service_type: 'B2B Express',
        pickup_type: 'Coleta',
        estimated_value: 0,
        pricing_table: 'B2B Express',
        driver_name: 'N/A',
        driver_username: 'N/A',
        created_at: format(new Date(shipment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        updated_at: format(new Date(shipment.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        days_in_transit: Math.floor((new Date().getTime() - new Date(shipment.created_at).getTime()) / (1000 * 3600 * 24)),
        sender_city: 'B2B',
        sender_state: '-',
        recipient_city: 'B2B',
        recipient_state: '-'
      };
    }) || [];

    return [...conventionalData, ...b2bData];
  };

  const fetchCTEData = async (startDate: string, endDate: string) => {
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
        xml_url,
        dacte_url,
        shipment_id
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Buscar dados das remessas e clientes
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

    return ctes?.map(cte => {
      const shipment = shipmentsMap.get(cte.shipment_id);
      const client = shipment ? clientsMap.get(shipment.user_id) : null;

      return {
        cte_number: cte.numero_cte,
        cte_key: cte.chave_cte,
        serie: cte.serie,
        modelo: cte.modelo,
        status: cte.status,
        status_detailed: cte.status === 'autorizado' ? 'Autorizada pela SEFAZ' : 'Pendente de Autorização',
        reason: cte.motivo || 'N/A',
        epec: cte.epec ? 'Sim' : 'Não',
        tracking_code: shipment?.tracking_code || 'N/A',
        client_name: client ? `${client.first_name} ${client.last_name}` : 'N/A',
        client_email: client?.email || 'N/A',
        emission_date: format(new Date(cte.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        updated_at: format(new Date(cte.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        authorization_date: cte.status === 'autorizado' ? format(new Date(cte.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'N/A',
        xml_url: cte.xml_url || 'N/A',
        dacte_url: cte.dacte_url || 'N/A'
      };
    }) || [];
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

  const getReportSheetName = (type: ReportType): string => {
    switch (type) {
      case 'faturamento': return 'Faturamento';
      case 'remessas': return 'Remessas';
      case 'cte': return 'CT-e';
      default: return 'Relatório';
    }
  };

  const getReportTypeLabel = (type: ReportType): string => {
    switch (type) {
      case 'faturamento': return 'Relatório Financeiro';
      case 'remessas': return 'Relatório de Remessas';
      case 'cte': return 'Relatório de CT-e';
      default: return 'Relatório';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Relatórios Personalizados</h1>
            <p className="text-muted-foreground mt-1">
              Configure e exporte relatórios customizados com os campos desejados
            </p>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Configurações do Relatório
            </CardTitle>
            <CardDescription>
              Configure o tipo de relatório, período e filtros
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Tipo de Relatório */}
              <div className="space-y-2">
                <Label htmlFor="reportType">Tipo de Relatório</Label>
                <Select
                  value={reportType}
                  onValueChange={(value) => handleReportTypeChange(value as ReportType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="faturamento">Financeiro</SelectItem>
                    <SelectItem value="remessas">Remessas</SelectItem>
                    <SelectItem value="cte">CT-e</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
            </div>

            {/* Status (para relatório de remessas) */}
            {reportType === 'remessas' && (
              <div className="mt-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status das Remessas</Label>
                  <Select
                    value={filters.status || 'all'}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === 'all' ? undefined : value }))}
                  >
                    <SelectTrigger className="w-full md:w-1/4">
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
            )}
          </CardContent>
        </Card>

        {/* Seleção de Campos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Campos do {getReportTypeLabel(reportType)}
            </CardTitle>
            <CardDescription>
              Selecione os campos que deseja incluir no relatório
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Botões de Ação */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllFields}>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Selecionar Todos
                </Button>
                <Button variant="outline" size="sm" onClick={clearAllFields}>
                  Limpar Seleção
                </Button>
                <div className="ml-auto text-sm text-muted-foreground">
                  {selectedFields.length} de {FIELD_OPTIONS[reportType].length} campos selecionados
                </div>
              </div>

              <Separator />

              {/* Lista de Campos */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {FIELD_OPTIONS[reportType].map((field) => (
                  <div key={field.key} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                    <Checkbox
                      id={field.key}
                      checked={selectedFields.includes(field.key)}
                      onCheckedChange={() => handleFieldToggle(field.key)}
                    />
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={field.key}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {field.label}
                      </label>
                      {field.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {field.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botão de Exportação */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold">{getReportTypeLabel(reportType)}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedFields.length > 0 
                    ? `${selectedFields.length} campos selecionados para exportação`
                    : 'Nenhum campo selecionado'
                  }
                </p>
              </div>
              <Button 
                onClick={exportCustomReport}
                disabled={loading || selectedFields.length === 0}
                size="lg"
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                {loading ? 'Exportando...' : 'Exportar Excel Personalizado'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminRelatorios;