import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  BarChart3, 
  Search, 
  CalendarIcon,
  Package,
  Clock,
  ArrowUpDown,
  Filter,
  FileText,
  CreditCard,
  Truck,
  Plus,
  Download,
  FileSpreadsheet,
  MapPin
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from 'xlsx';
import { cn } from "@/lib/utils";

interface ShipmentReport {
  id: string;
  tracking_code: string;
  status: string;
  created_at: string;
  weight: number;
  height: number;
  width: number;
  length: number;
  format: string;
  pickup_option: string;
  selected_option: string;
  quote_data: any;
  payment_data: any;
  label_pdf_url: string | null;
  sender_address: {
    name: string;
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    reference?: string;
  } | null;
  recipient_address: {
    name: string;
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    reference?: string;
  } | null;
  price: number;
  delivery_days: number;
}

interface ShipmentData {
  id: string;
  tracking_code: string;
  status: string;
  created_at: string;
  weight: number;
  quote_data: any;
  payment_data: any;
  label_pdf_url: string | null;
  sender_address: {
    name: string;
    city: string;
    state: string;
  } | null;
  recipient_address: {
    name: string;
    city: string;
    state: string;
  } | null;
}

const ClientHistorico = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [shipmentReports, setShipmentReports] = useState<ShipmentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (user) {
      loadShipmentReports();
    }
  }, [user, dateFrom, dateTo]);

  const loadShipmentReports = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('shipments')
        .select(`
          id,
          tracking_code,
          status,
          created_at,
          weight,
          height,
          width,
          length,
          format,
          pickup_option,
          selected_option,
          quote_data,
          payment_data,
          label_pdf_url,
          sender_address:addresses!sender_address_id(name, cep, street, number, complement, neighborhood, city, state, reference),
          recipient_address:addresses!recipient_address_id(name, cep, street, number, complement, neighborhood, city, state, reference)
        `)
        .eq('user_id', user.id);

      // Apply date filters
      if (dateFrom) {
        query = query.gte('created_at', startOfDay(dateFrom).toISOString());
      }
      if (dateTo) {
        query = query.lte('created_at', endOfDay(dateTo).toISOString());
      }

      const { data: shipmentsData, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading shipments:', error);
        toast({
          title: "Erro ao carregar relatórios",
          description: "Não foi possível carregar os dados das remessas.",
          variant: "destructive"
        });
        return;
      }

      // Transform shipments data into report format
      const reports: ShipmentReport[] = shipmentsData?.map((shipment: any) => ({
        id: shipment.id,
        tracking_code: shipment.tracking_code,
        status: shipment.status,
        created_at: shipment.created_at,
        weight: shipment.weight,
        height: shipment.height,
        width: shipment.width,
        length: shipment.length,
        format: shipment.format,
        pickup_option: shipment.pickup_option,
        selected_option: shipment.selected_option,
        quote_data: shipment.quote_data,
        payment_data: shipment.payment_data,
        label_pdf_url: shipment.label_pdf_url,
        sender_address: shipment.sender_address,
        recipient_address: shipment.recipient_address,
        price: shipment.quote_data?.price || shipment.quote_data?.amount || 0,
        delivery_days: shipment.quote_data?.delivery_days || 0
      })) || [];
      
      setShipmentReports(reports);
    } catch (error) {
      console.error('Error loading shipment reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DELIVERED': return <Truck className="w-4 h-4" />;
      case 'IN_TRANSIT': return <Package className="w-4 h-4" />;
      case 'OUT_FOR_DELIVERY': return <FileText className="w-4 h-4" />;
      case 'PAID': return <CreditCard className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <Badge className="bg-success text-success-foreground">Entregue</Badge>;
      case 'IN_TRANSIT':
        return <Badge className="bg-info text-info-foreground">Em Trânsito</Badge>;
      case 'OUT_FOR_DELIVERY':
        return <Badge className="bg-warning text-warning-foreground">Saiu para Entrega</Badge>;
      case 'PAID':
        return <Badge className="bg-success text-success-foreground">Pago</Badge>;
      case 'PENDING_PAYMENT':
        return <Badge variant="destructive">Pendente Pagamento</Badge>;
      case 'PENDING_LABEL':
        return <Badge className="bg-warning text-warning-foreground">Aguardando Etiqueta</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredItems = shipmentReports.filter(item => {
    const matchesSearch = !searchTerm || 
      item.tracking_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sender_address?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.recipient_address?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.recipient_address?.city?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      // Prepare comprehensive data for Excel
      const excelData = filteredItems.map(item => ({
        'Data/Hora Criação': format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        'Código de Rastreamento': item.tracking_code || '-',
        'Status': item.status,
        'Valor (R$)': item.price.toFixed(2),
        'Prazo de Entrega (dias)': item.delivery_days,
        'Peso (kg)': item.weight,
        'Altura (cm)': item.height,
        'Largura (cm)': item.width,
        'Comprimento (cm)': item.length,
        'Formato': item.format,
        'Opção de Coleta': item.pickup_option,
        'Serviço Selecionado': item.selected_option,
        
        // Dados do Remetente
        'Remetente - Nome': item.sender_address?.name || '-',
        'Remetente - CEP': item.sender_address?.cep || '-',
        'Remetente - Endereço': item.sender_address ? 
          `${item.sender_address.street}, ${item.sender_address.number}${item.sender_address.complement ? `, ${item.sender_address.complement}` : ''}` : '-',
        'Remetente - Bairro': item.sender_address?.neighborhood || '-',
        'Remetente - Cidade': item.sender_address?.city || '-',
        'Remetente - Estado': item.sender_address?.state || '-',
        'Remetente - Referência': item.sender_address?.reference || '-',
        
        // Dados do Destinatário
        'Destinatário - Nome': item.recipient_address?.name || '-',
        'Destinatário - CEP': item.recipient_address?.cep || '-',
        'Destinatário - Endereço': item.recipient_address ? 
          `${item.recipient_address.street}, ${item.recipient_address.number}${item.recipient_address.complement ? `, ${item.recipient_address.complement}` : ''}` : '-',
        'Destinatário - Bairro': item.recipient_address?.neighborhood || '-',
        'Destinatário - Cidade': item.recipient_address?.city || '-',
        'Destinatário - Estado': item.recipient_address?.state || '-',
        'Destinatário - Referência': item.recipient_address?.reference || '-',
        
        // Dados de Pagamento
        'Método de Pagamento': item.payment_data?.method || '-',
        'Status Pagamento': item.payment_data?.status || '-',
        
        // Etiqueta
        'Etiqueta Gerada': item.label_pdf_url ? 'Sim' : 'Não'
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Set column widths for better readability
      const colWidths = [
        { wch: 18 }, // Data/Hora
        { wch: 20 }, // Código
        { wch: 15 }, // Status
        { wch: 12 }, // Valor
        { wch: 12 }, // Prazo
        { wch: 10 }, // Peso
        { wch: 10 }, // Altura
        { wch: 10 }, // Largura
        { wch: 15 }, // Comprimento
        { wch: 12 }, // Formato
        { wch: 15 }, // Coleta
        { wch: 20 }, // Serviço
        { wch: 25 }, // Nome Remetente
        { wch: 12 }, // CEP Remetente
        { wch: 40 }, // Endereço Remetente
        { wch: 20 }, // Bairro Remetente
        { wch: 20 }, // Cidade Remetente
        { wch: 8 },  // Estado Remetente
        { wch: 25 }, // Referência Remetente
        { wch: 25 }, // Nome Destinatário
        { wch: 12 }, // CEP Destinatário
        { wch: 40 }, // Endereço Destinatário
        { wch: 20 }, // Bairro Destinatário
        { wch: 20 }, // Cidade Destinatário
        { wch: 8 },  // Estado Destinatário
        { wch: 25 }, // Referência Destinatário
        { wch: 15 }, // Método Pagamento
        { wch: 15 }, // Status Pagamento
        { wch: 12 }  // Etiqueta
      ];
      worksheet['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório de Remessas');

      // Generate filename
      const fromDate = dateFrom ? format(dateFrom, "dd-MM-yyyy") : '';
      const toDate = dateTo ? format(dateTo, "dd-MM-yyyy") : '';
      const filename = `relatorio-remessas-${fromDate}-a-${toDate}.xlsx`;

      // Save file
      XLSX.writeFile(workbook, filename);

      toast({
        title: "Relatório exportado com sucesso",
        description: `Arquivo ${filename} foi baixado com todos os dados das remessas`
      });

    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível gerar o arquivo Excel",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const statusStats = {
    total: shipmentReports.length,
    paid: shipmentReports.filter(i => i.status === 'PAID').length,
    delivered: shipmentReports.filter(i => i.status === 'DELIVERED').length,
    in_transit: shipmentReports.filter(i => i.status === 'IN_TRANSIT').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95">
      <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <BarChart3 className="w-8 h-8 text-primary" />
                </div>
                Relatórios
              </h1>
              <p className="text-muted-foreground mt-2 text-base lg:text-lg">
                Gere relatórios detalhados das suas remessas e atividades
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-8 border-border/50 shadow-lg bg-gradient-to-br from-card to-card/80">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Filter className="w-5 h-5 text-primary" />
              Filtros e Período
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Data Inicial</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-11",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50 bg-popover border border-border shadow-xl" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Data Final</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-11",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50 bg-popover border border-border shadow-xl" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Períodos Rápidos</label>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setDateFrom(subDays(new Date(), 7));
                      setDateTo(new Date());
                    }}
                    className="h-9"
                  >
                    7 dias
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setDateFrom(subDays(new Date(), 30));
                      setDateTo(new Date());
                    }}
                    className="h-9"
                  >
                    30 dias
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setDateFrom(subDays(new Date(), 90));
                      setDateTo(new Date());
                    }}
                    className="h-9"
                  >
                    90 dias
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Search and Type Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <label className="text-sm font-medium text-foreground mb-2 block">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar no relatório..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-11 border border-border shadow-sm hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
                    <SelectValue placeholder="Status da remessa" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover border border-border shadow-xl">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="PENDING_PAYMENT">Pendente Pagamento</SelectItem>
                    <SelectItem value="PAID">Pago</SelectItem>
                    <SelectItem value="IN_TRANSIT">Em Trânsito</SelectItem>
                    <SelectItem value="DELIVERED">Entregue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="flex items-center gap-2"
              >
                <ArrowUpDown className="w-4 h-4" />
                {sortOrder === 'desc' ? 'Mais recente' : 'Mais antigo'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="border-border/50 shadow-lg bg-gradient-to-br from-card to-card/80">
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-xl">Resultados do Relatório</CardTitle>
                <CardDescription className="text-base mt-1">
                  {loading ? "Carregando..." :
                   filteredItems.length === 0 ? "Nenhuma atividade encontrada no período" :
                   `${filteredItems.length} atividade(s) encontrada(s) ${dateFrom ? `de ${format(dateFrom, "dd/MM/yyyy")}` : ''} ${dateTo ? `até ${format(dateTo, "dd/MM/yyyy")}` : ''}`
                  }
                </CardDescription>
              </div>
              {filteredItems.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={exportToExcel} 
                  disabled={isExporting}
                  className="flex items-center gap-2 h-10"
                >
                  <Download className="w-4 h-4" />
                  Baixar Excel
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg animate-pulse">
                    <div className="w-12 h-12 bg-muted rounded-full" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                      <div className="h-3 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 bg-muted/30 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Nenhum resultado encontrado</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {searchTerm || statusFilter !== 'all' 
                    ? "Tente ajustar os filtros de pesquisa ou o período selecionado"
                    : `Não há remessas no período selecionado ${dateFrom ? `(${format(dateFrom, "dd/MM/yyyy")} - ${dateTo ? format(dateTo, "dd/MM/yyyy") : 'hoje'})` : ''}`
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setDateFrom(subDays(new Date(), 90));
                      setDateTo(new Date());
                      setSearchTerm('');
                      setStatusFilter('all');
                    }}
                  >
                    Expandir para 90 dias
                  </Button>
                  <Button asChild>
                    <Link to="/cliente/cotacoes">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Cotação
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredItems.map((item) => (
                  <Card key={item.id} className="border-border/30 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-lg">
                              {item.tracking_code || `ID${item.id.slice(0, 8).toUpperCase()}`}
                            </h3>
                            {getStatusBadge(item.status)}
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            <span className="font-medium">Criado em:</span>
                            <span className="ml-1">{new Date(item.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="space-y-1">
                          <p className="font-medium text-muted-foreground">Remetente</p>
                          <p className="font-medium">
                            {(() => {
                              // Primeiro tenta os dados do quote_data
                              if (item.quote_data?.senderData?.name) {
                                return item.quote_data.senderData.name;
                              }
                              // Depois tenta o address, mas verifica se não é um valor placeholder
                              if (item.sender_address?.name && 
                                  item.sender_address.name !== 'A definir' && 
                                  item.sender_address.name.trim() !== '') {
                                return item.sender_address.name;
                              }
                              return 'Nome não informado';
                            })()}
                          </p>
                          <div className="flex items-center text-muted-foreground">
                            <MapPin className="w-3 h-3 mr-1" />
                            {(() => {
                              // Primeiro tenta os dados do quote_data
                              if (item.quote_data?.senderData?.address?.city) {
                                return `${item.quote_data.senderData.address.city} - ${item.quote_data.senderData.address.state}`;
                              }
                              // Depois tenta o address, mas verifica se não é um valor placeholder
                              if (item.sender_address?.city && 
                                  item.sender_address.city !== 'A definir' && 
                                  item.sender_address.city.trim() !== '') {
                                return `${item.sender_address.city} - ${item.sender_address.state}`;
                              }
                              return 'Cidade não informada';
                            })()}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="font-medium text-muted-foreground">Destinatário</p>
                          <p className="font-medium">
                            {(() => {
                              // Primeiro tenta os dados do quote_data
                              if (item.quote_data?.recipientData?.name) {
                                return item.quote_data.recipientData.name;
                              }
                              // Depois tenta o address, mas verifica se não é um valor placeholder
                              if (item.recipient_address?.name && 
                                  item.recipient_address.name !== 'A definir' && 
                                  item.recipient_address.name.trim() !== '') {
                                return item.recipient_address.name;
                              }
                              return 'Nome não informado';
                            })()}
                          </p>
                          <div className="flex items-center text-muted-foreground">
                            <MapPin className="w-3 h-3 mr-1" />
                            {(() => {
                              // Primeiro tenta os dados do quote_data
                              if (item.quote_data?.recipientData?.address?.city) {
                                return `${item.quote_data.recipientData.address.city} - ${item.quote_data.recipientData.address.state}`;
                              }
                              // Depois tenta o address, mas verifica se não é um valor placeholder
                              if (item.recipient_address?.city && 
                                  item.recipient_address.city !== 'A definir' && 
                                  item.recipient_address.city.trim() !== '') {
                                return `${item.recipient_address.city} - ${item.recipient_address.state}`;
                              }
                              return 'Cidade não informada';
                            })()}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="font-medium text-muted-foreground">Valor do Frete</p>
                          {(() => {
                            // Tentar obter o valor do frete de várias fontes
                            let amount = null;
                            
                            // 1. Tentar payment_data.pixData.amount (PIX - já vem em centavos)
                            if (item.payment_data?.pixData?.amount) {
                              amount = item.payment_data.pixData.amount; // já está em centavos
                            }
                            // 2. Tentar payment_data.amount (PIX novo formato - vem em reais, precisa converter)
                            else if (item.payment_data?.amount && item.payment_data?.method === 'pix') {
                              amount = item.payment_data.amount * 100; // converter de reais para centavos
                            }
                            // 3. Tentar payment_data.amount (Stripe/Cartão - já em centavos)
                            else if (item.payment_data?.amount) {
                              amount = item.payment_data.amount;
                            }
                            // 4. Tentar quote_data.amount (valor já pago)
                            else if (item.quote_data?.amount) {
                              amount = item.quote_data.amount * 100; // converter de reais para centavos
                            }
                            // 5. Tentar quote_data.shippingQuote.economicPrice ou expressPrice
                            else if (item.quote_data?.shippingQuote) {
                              const price = item.selected_option === 'express' 
                                ? item.quote_data.shippingQuote.expressPrice 
                                : item.quote_data.shippingQuote.economicPrice;
                              amount = price * 100; // converter de reais para centavos
                            }
                            // 6. Tentar quote_data.totalPrice
                            else if (item.quote_data?.totalPrice) {
                              amount = item.quote_data.totalPrice * 100; // converter de reais para centavos
                            }
                            // 7. Tentar deliveryDetails.totalPrice
                            else if (item.quote_data?.deliveryDetails?.totalPrice) {
                              amount = item.quote_data.deliveryDetails.totalPrice * 100;
                            }
                            // 8. Usar o campo price que já vem formatado
                            else if (item.price) {
                              amount = item.price * 100;
                            }

                            return amount ? (
                              <p className="font-medium text-success">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                }).format(amount / 100)}
                              </p>
                            ) : (
                              <p className="font-medium text-muted-foreground">Valor não disponível</p>
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
      </div>
    </div>
  );
};

export default ClientHistorico;