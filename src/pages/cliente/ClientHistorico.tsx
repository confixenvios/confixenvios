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
  FileSpreadsheet
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

interface HistoryItem {
  id: string;
  type: 'shipment' | 'payment' | 'label' | 'tracking';
  title: string;
  description: string;
  status: string;
  date: string;
  value?: number;
  tracking_code?: string;
  metadata?: any;
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
  
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user, dateFrom, dateTo]);

  const loadHistory = async () => {
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
          quote_data,
          payment_data,
          label_pdf_url,
          sender_address:addresses!sender_address_id(name, city, state),
          recipient_address:addresses!recipient_address_id(name, city, state)
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
        console.error('Error loading history:', error);
        toast({
          title: "Erro ao carregar histórico",
          description: "Não foi possível carregar o histórico.",
          variant: "destructive"
        });
        return;
      }

      // Transform shipments data into history items
      const items: HistoryItem[] = [];
      
      shipmentsData?.forEach((shipment: ShipmentData) => {
        // Shipment creation
        items.push({
          id: `${shipment.id}-created`,
          type: 'shipment',
          title: 'Remessa criada',
          description: `Remessa para ${shipment.recipient_address?.name || 'destinatário'} em ${shipment.recipient_address?.city || 'cidade não informada'}`,
          status: 'CREATED',
          date: shipment.created_at,
          tracking_code: shipment.tracking_code,
          value: shipment.quote_data?.price,
          metadata: { weight: shipment.weight }
        });

        // Payment related events
        if (shipment.payment_data || shipment.status === 'PAID') {
          const paymentValue = shipment.payment_data?.pixData?.amount ? 
            (shipment.payment_data.pixData.amount / 100) : 
            (shipment.quote_data?.amount || shipment.quote_data?.price || 0);
          
          items.push({
            id: `${shipment.id}-payment`,
            type: 'payment',
            title: 'Pagamento processado',
            description: `Pagamento de R$ ${paymentValue.toFixed(2)} processado`,
            status: 'CONFIRMED',
            date: shipment.created_at,
            tracking_code: shipment.tracking_code,
            value: paymentValue
          });
        }

        // Label generation
        if (shipment.label_pdf_url) {
          items.push({
            id: `${shipment.id}-label`,
            type: 'label',
            title: 'Etiqueta gerada',
            description: `Etiqueta disponível para impressão`,
            status: 'AVAILABLE',
            date: shipment.created_at,
            tracking_code: shipment.tracking_code,
            metadata: { pdf_url: shipment.label_pdf_url }
          });
        }

        // Status updates (simulated based on current status)
        if (['DELIVERED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(shipment.status)) {
          items.push({
            id: `${shipment.id}-tracking`,
            type: 'tracking',
            title: getTrackingTitle(shipment.status),
            description: getTrackingDescription(shipment.status),
            status: shipment.status,
            date: shipment.created_at,
            tracking_code: shipment.tracking_code
          });
        }
      });

      // Sort items by date
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setHistoryItems(items);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrackingTitle = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'Remessa entregue';
      case 'IN_TRANSIT': return 'Remessa em trânsito';
      case 'OUT_FOR_DELIVERY': return 'Saiu para entrega';
      default: return 'Atualização de status';
    }
  };

  const getTrackingDescription = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'Remessa foi entregue com sucesso';
      case 'IN_TRANSIT': return 'Remessa está em trânsito para o destino';
      case 'OUT_FOR_DELIVERY': return 'Remessa saiu para entrega';
      default: return 'Status da remessa foi atualizado';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'shipment': return <Package className="w-4 h-4" />;
      case 'payment': return <CreditCard className="w-4 h-4" />;
      case 'label': return <FileText className="w-4 h-4" />;
      case 'tracking': return <Truck className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (type: string, status: string) => {
    if (type === 'payment') {
      return status === 'CONFIRMED' 
        ? <Badge className="bg-success text-success-foreground">Pago</Badge>
        : <Badge variant="destructive">Pendente</Badge>;
    }
    
    if (type === 'tracking') {
      switch (status) {
        case 'DELIVERED':
          return <Badge className="bg-success text-success-foreground">Entregue</Badge>;
        case 'IN_TRANSIT':
          return <Badge className="bg-info text-info-foreground">Em Trânsito</Badge>;
        case 'OUT_FOR_DELIVERY':
          return <Badge className="bg-warning text-warning-foreground">Saiu para Entrega</Badge>;
        default:
          return <Badge variant="secondary">{status}</Badge>;
      }
    }
    
    if (type === 'label') {
      return <Badge className="bg-success text-success-foreground">Disponível</Badge>;
    }
    
    return <Badge variant="secondary">Criado</Badge>;
  };

  const filteredItems = historyItems.filter(item => {
    const matchesSearch = !searchTerm || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tracking_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    
    return matchesSearch && matchesType;
  }).sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      // Prepare data for Excel
      const excelData = filteredItems.map(item => ({
        'Data/Hora': format(new Date(item.date), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        'Tipo': item.type === 'shipment' ? 'Remessa' : 
               item.type === 'payment' ? 'Pagamento' :
               item.type === 'label' ? 'Etiqueta' : 'Rastreamento',
        'Título': item.title,
        'Descrição': item.description,
        'Status': item.status,
        'Código de Rastreamento': item.tracking_code || '-',
        'Valor (R$)': item.value ? item.value.toFixed(2) : '-'
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Set column widths
      const colWidths = [
        { wch: 16 }, // Data/Hora
        { wch: 12 }, // Tipo
        { wch: 20 }, // Título
        { wch: 40 }, // Descrição
        { wch: 15 }, // Status
        { wch: 20 }, // Código
        { wch: 12 }  // Valor
      ];
      worksheet['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');

      // Generate filename
      const fromDate = dateFrom ? format(dateFrom, "dd-MM-yyyy") : '';
      const toDate = dateTo ? format(dateTo, "dd-MM-yyyy") : '';
      const filename = `relatorio-${fromDate}-a-${toDate}.xlsx`;

      // Save file
      XLSX.writeFile(workbook, filename);

      toast({
        title: "Excel exportado com sucesso",
        description: `Arquivo ${filename} foi baixado`
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

  const typeStats = {
    shipment: historyItems.filter(i => i.type === 'shipment').length,
    payment: historyItems.filter(i => i.type === 'payment').length,
    label: historyItems.filter(i => i.type === 'label').length,
    tracking: historyItems.filter(i => i.type === 'tracking').length,
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
            <Button 
              onClick={exportToExcel} 
              disabled={isExporting || filteredItems.length === 0}
              className="flex items-center gap-2 h-11 px-6"
              size="lg"
            >
              {isExporting ? (
                <Clock className="w-5 h-5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-5 h-5" />
              )}
              {isExporting ? 'Exportando...' : 'Baixar Excel'}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          <Card className="group hover:shadow-lg transition-all duration-200 border-border/50 bg-gradient-to-br from-card to-card/80">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Remessas</p>
                  <p className="text-2xl lg:text-3xl font-bold text-foreground">
                    {loading ? (
                      <div className="w-8 h-8 bg-muted animate-pulse rounded" />
                    ) : (
                      typeStats.shipment
                    )}
                  </p>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                  <Package className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-200 border-border/50 bg-gradient-to-br from-card to-card/80">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Pagamentos</p>
                  <p className="text-2xl lg:text-3xl font-bold text-foreground">
                    {loading ? (
                      <div className="w-8 h-8 bg-muted animate-pulse rounded" />
                    ) : (
                      typeStats.payment
                    )}
                  </p>
                </div>
                <div className="p-3 bg-success/10 rounded-xl group-hover:bg-success/20 transition-colors">
                  <CreditCard className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-200 border-border/50 bg-gradient-to-br from-card to-card/80">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Etiquetas</p>
                  <p className="text-2xl lg:text-3xl font-bold text-foreground">
                    {loading ? (
                      <div className="w-8 h-8 bg-muted animate-pulse rounded" />
                    ) : (
                      typeStats.label
                    )}
                  </p>
                </div>
                <div className="p-3 bg-info/10 rounded-xl group-hover:bg-info/20 transition-colors">
                  <FileText className="w-6 h-6 text-info" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-200 border-border/50 bg-gradient-to-br from-card to-card/80">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Rastreamentos</p>
                  <p className="text-2xl lg:text-3xl font-bold text-foreground">
                    {loading ? (
                      <div className="w-8 h-8 bg-muted animate-pulse rounded" />
                    ) : (
                      typeStats.tracking
                    )}
                  </p>
                </div>
                <div className="p-3 bg-warning/10 rounded-xl group-hover:bg-warning/20 transition-colors">
                  <Truck className="w-6 h-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
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
                <label className="text-sm font-medium text-foreground mb-2 block">Tipo</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Tipo de atividade" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover border border-border shadow-xl">
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="shipment">Remessas</SelectItem>
                    <SelectItem value="payment">Pagamentos</SelectItem>
                    <SelectItem value="label">Etiquetas</SelectItem>
                    <SelectItem value="tracking">Rastreamento</SelectItem>
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
                  {searchTerm || typeFilter !== 'all' 
                    ? "Tente ajustar os filtros de pesquisa ou o período selecionado"
                    : `Não há atividades no período selecionado ${dateFrom ? `(${format(dateFrom, "dd/MM/yyyy")} - ${dateTo ? format(dateTo, "dd/MM/yyyy") : 'hoje'})` : ''}`
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setDateFrom(subDays(new Date(), 90));
                      setDateTo(new Date());
                      setSearchTerm('');
                      setTypeFilter('all');
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
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <div key={item.id} className="p-4 bg-muted/20 hover:bg-muted/30 rounded-lg border border-border/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-accent/50 rounded-full flex items-center justify-center">
                        {getTypeIcon(item.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold text-foreground">{item.title}</h4>
                            {getStatusBadge(item.type, item.status)}
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            {new Date(item.date).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                          {item.description}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          {item.tracking_code && (
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-muted-foreground" />
                              <span className="font-mono text-foreground">#{item.tracking_code}</span>
                            </div>
                          )}
                          {item.value && (
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-success" />
                              <span className="font-semibold text-success">R$ {item.value.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
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