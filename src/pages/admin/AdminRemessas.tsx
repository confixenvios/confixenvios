import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Package, Eye, Download, Filter, UserPlus, Truck, Calendar as CalendarIcon, MapPin, Clock, FileText, Send, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAdminShipments, type AdminShipment } from '@/services/shipmentsService';
import { cn } from "@/lib/utils";

import { ShipmentOccurrencesModal } from '@/components/admin/ShipmentOccurrencesModal';

interface Shipment {
  id: string;
  tracking_code: string | null;
  client_name: string;
  user_id?: string;
  pricing_table_name?: string;
  sender_address: {
    name: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
    complement?: string;
    reference?: string;
    phone?: string;
  } | null;
  recipient_address: {
    name: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
    complement?: string;
    reference?: string;
    phone?: string;
  } | null;
  weight: number;
  length: number;
  width: number;
  height: number;
  format: string;
  selected_option: string;
  pickup_option: string;
  quote_data: any;
  payment_data: any;
  status: string;
  created_at: string;
  label_pdf_url: string | null;
  cte_key: string | null;
  motoristas?: {
    nome: string;
    telefone: string;
    email: string;
  };
}

interface Motorista {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  status: string;
}

const AdminRemessas = () => {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [shipments, setShipments] = useState<AdminShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [selectedShipmentDetails, setSelectedShipmentDetails] = useState<AdminShipment | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [occurrencesModalOpen, setOccurrencesModalOpen] = useState(false);
  const [selectedShipmentOccurrences, setSelectedShipmentOccurrences] = useState<AdminShipment | null>(null);
  const [cteData, setCteData] = useState<any>(null);
  const [webhookStatuses, setWebhookStatuses] = useState<Record<string, 'sent' | 'pending' | 'error'>>({});
  const [sendingWebhook, setSendingWebhook] = useState<Record<string, boolean>>({});
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  // Função para verificar status dos webhooks das remessas
  const checkWebhookStatuses = async (remessas: AdminShipment[]) => {
    try {
      const statuses: Record<string, 'sent' | 'pending' | 'error'> = {};
      
      for (const remessa of remessas) {
        const { data: logs, error } = await supabase
          .from('webhook_logs')
          .select('event_type, response_status, created_at')
          .eq('shipment_id', remessa.id)
          .in('event_type', ['shipment_created_webhook_triggered', 'edge_function_called_success', 'shipment_webhook_dispatched'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.warn(`⚠️ [ADMIN REMESSAS] Erro ao consultar webhook logs para remessa ${remessa.id}:`, error);
          statuses[remessa.id] = 'error';
          continue;
        }

        if (logs && logs.length > 0) {
          const log = logs[0];
          if (log.response_status === 200) {
            statuses[remessa.id] = 'sent';
          } else {
            statuses[remessa.id] = 'error';
          }
        } else {
          statuses[remessa.id] = 'pending';
        }
      }
      
      setWebhookStatuses(statuses);
    } catch (error) {
      console.error('❌ [ADMIN REMESSAS] Erro ao verificar status dos webhooks:', error);
    }
  };

  const loadShipments = async () => {
    if (authLoading || !user || !isAdmin) {
      console.log('🚫 [ADMIN REMESSAS] Carregamento bloqueado - Auth loading, usuário não autenticado ou não é admin');
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 [ADMIN REMESSAS] Carregando remessas...');
      const adminShipments = await getAdminShipments();
      console.log(`✅ [ADMIN REMESSAS] ${adminShipments.length} remessas carregadas`);
      
      setShipments(adminShipments);
      
      // Verificar status dos webhooks para cada remessa
      await checkWebhookStatuses(adminShipments);
    } catch (error) {
      console.error('❌ [ADMIN REMESSAS] Erro ao carregar remessas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar remessas. Tentando novamente...",
        variant: "destructive"
      });
      
      // Tentar novamente após 2 segundos
      setTimeout(() => {
        if (!authLoading && user && isAdmin) {
          loadShipments();
        }
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  // Verificar autenticação e permissões diretamente
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          console.log('❌ [ADMIN REMESSAS] Usuário não autenticado');
          setAuthLoading(false);
          return;
        }

        setUser(session.user);

        // Verificar se é admin
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id);

        if (roleError) {
          console.error('❌ [ADMIN REMESSAS] Erro ao verificar role:', roleError);
          setAuthLoading(false);
          return;
        }

        const hasAdminRole = roleData?.some(r => r.role === 'admin') || false;
        setIsAdmin(hasAdminRole);
        
        console.log(`✅ [ADMIN REMESSAS] Usuário autenticado. Admin: ${hasAdminRole}`);
        
        if (!hasAdminRole) {
          toast({
            title: "Acesso Negado",
            description: "Você não tem permissão para acessar esta página",
            variant: "destructive"
          });
        }
        
        setAuthLoading(false);
      } catch (error) {
        console.error('❌ [ADMIN REMESSAS] Erro na verificação de auth:', error);
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      loadShipments();
    }
  }, [authLoading, user, isAdmin]);

  // Adicionar auto-refresh a cada 30 segundos
  useEffect(() => {
    if (!authLoading && !user || !isAdmin) return;
    
    const interval = setInterval(() => {
      loadShipments();
    }, 30000);

    return () => clearInterval(interval);
  }, [authLoading, user, isAdmin]);

  // Função para enviar webhook manualmente
  const handleSendWebhook = async (shipment: AdminShipment) => {
    setSendingWebhook(prev => ({ ...prev, [shipment.id]: true }));
    
    try {
      console.log('🔄 [WEBHOOK MANUAL] Enviando webhook para remessa:', shipment.tracking_code);
      
      // Buscar dados da tabela de preços se existir o nome da tabela
      let pricingTableData = null;
      if (shipment.pricing_table_name) {
        const { data, error } = await supabase
          .from('pricing_tables')
          .select('*')
          .eq('name', shipment.pricing_table_name)
          .single();
        
        if (!error && data) {
          pricingTableData = data;
        }
      }
      
      const { data, error } = await supabase.functions.invoke('shipment-webhook-dispatch', {
        body: {
          shipmentId: shipment.id,
          shipmentData: {
            tracking_code: shipment.tracking_code,
            status: shipment.status,
            created_at: shipment.created_at,
            // Incluir dados completos da tabela de preços
            pricing_table_name: shipment.pricing_table_name,
            pricing_table_data: pricingTableData,
            // Incluir todos os dados da remessa
            ...shipment
          }
        }
      });

      if (error) {
        throw error;
      }

      console.log('✅ [WEBHOOK MANUAL] Webhook enviado com sucesso:', data);
      
      // Atualizar status do webhook
      setWebhookStatuses(prev => ({ 
        ...prev, 
        [shipment.id]: 'sent' 
      }));

      toast({
        title: "Webhook Enviado",
        description: `Webhook enviado com sucesso para ${shipment.tracking_code}`,
        variant: "default"
      });

    } catch (error) {
      console.error('❌ [WEBHOOK MANUAL] Erro ao enviar webhook:', error);
      
      setWebhookStatuses(prev => ({ 
        ...prev, 
        [shipment.id]: 'error' 
      }));

      toast({
        title: "Erro ao Enviar Webhook",
        description: `Erro ao enviar webhook para ${shipment.tracking_code}: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setSendingWebhook(prev => ({ ...prev, [shipment.id]: false }));
    }
  };

  // Função para obter badge do status do webhook
  const getWebhookStatusBadge = (shipment: AdminShipment) => {
    const status = webhookStatuses[shipment.id];
    
    switch (status) {
      case 'sent':
        return (
          <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Webhook Enviado
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Erro no Webhook
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Webhook Pendente
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'PENDING_LABEL': { label: 'Pendente', variant: 'secondary' as const },
      'PENDING_DOCUMENT': { label: 'Aguardando Documento', variant: 'destructive' as const },
      'PENDING_PAYMENT': { label: 'Aguardando Pagamento', variant: 'destructive' as const },
      'PAYMENT_CONFIRMED': { label: 'Pagamento Confirmado', variant: 'default' as const },
      'PAID': { label: 'Pago', variant: 'default' as const },
      'PAGO_AGUARDANDO_ETIQUETA': { label: 'Aguardando Etiqueta', variant: 'secondary' as const },
      'COLETA_ACEITA': { label: 'Coleta Aceita', variant: 'default' as const },
      'COLETA_FINALIZADA': { label: 'Coleta Finalizada', variant: 'default' as const },
      'LABEL_AVAILABLE': { label: 'Etiqueta Disponível', variant: 'default' as const },
      'IN_TRANSIT': { label: 'Em Trânsito', variant: 'default' as const },
      'ENTREGA_FINALIZADA': { label: 'Entrega Finalizada', variant: 'default' as const },
      'DELIVERED': { label: 'Entregue', variant: 'default' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'outline' as const };
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const handleViewShipment = async (shipment: AdminShipment) => {
    setSelectedShipmentDetails(shipment);
    setDetailsModalOpen(true);
    
    // Buscar dados do CTE se existir
    if (shipment.id) {
      console.log('Buscando CTE para shipment:', shipment.id);
      try {
        const { data: cte, error } = await supabase
          .from('cte_emissoes')
          .select('*')
          .eq('shipment_id', shipment.id)
          .single();
        
        if (error) {
          console.log('Erro ao buscar CTE:', error);
          setCteData(null);
        } else {
          console.log('CTE encontrado:', cte);
          setCteData(cte);
        }
      } catch (error) {
        console.log('Nenhum CTE encontrado para esta remessa');
        setCteData(null);
      }
    }
  };

  const handleViewOccurrences = (shipment: AdminShipment) => {
    setSelectedShipmentOccurrences(shipment);
    setOccurrencesModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount / 100);
  };

  const getQuoteValue = (shipment: AdminShipment) => {
    const paymentData = shipment.payment_data as any;
    const quoteData = shipment.quote_data as any;
    
    // 1. Tentar payment_data.pix_details.amount (PIX)
    if (paymentData?.pix_details?.amount) {
      return paymentData.pix_details.amount;
    }
    
    // 2. Tentar payment_data.amount (PIX novo formato - em reais)
    if (paymentData?.amount && paymentData?.method === 'pix') {
      return paymentData.amount;
    }
    
    // 3. Tentar payment_data.amount (Stripe/Cartão - em centavos)
    if (paymentData?.amount) {
      return paymentData.amount / 100;
    }
    
    // 4. Tentar quote_data.amount
    if (quoteData?.amount) {
      return quoteData.amount;
    }
    
    // 5. Tentar quote_data.deliveryDetails.totalPrice
    if (quoteData?.deliveryDetails?.totalPrice) {
      return quoteData.deliveryDetails.totalPrice;
    }
    
    // 6. Tentar quote_data.shippingQuote baseado na opção selecionada
    if (quoteData?.shippingQuote) {
      const price = shipment.selected_option === 'express' 
        ? quoteData.shippingQuote.expressPrice 
        : quoteData.shippingQuote.economicPrice;
      if (price) return price;
    }
    
    // 7. Tentar quote_data.quoteData.shippingQuote baseado na opção selecionada
    if (quoteData?.quoteData?.shippingQuote) {
      const price = shipment.selected_option === 'express' 
        ? quoteData.quoteData.shippingQuote.expressPrice 
        : quoteData.quoteData.shippingQuote.economicPrice;
      if (price) return price;
    }
    
    return 0;
  };

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = (shipment.tracking_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          shipment.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ?? false;
    const matchesStatus = statusFilter === "all" || shipment.status === statusFilter;
    
    // Filtro por período
    let matchesPeriod = true;
    if (dateFrom || dateTo) {
      const shipmentDate = new Date(shipment.created_at);
      const fromDate = dateFrom ? new Date(dateFrom.getFullYear(), dateFrom.getMonth(), dateFrom.getDate()) : null;
      const toDate = dateTo ? new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate(), 23, 59, 59) : null;
      
      if (fromDate && shipmentDate < fromDate) {
        matchesPeriod = false;
      }
      if (toDate && shipmentDate > toDate) {
        matchesPeriod = false;
      }
    }
    
    return matchesSearch && matchesStatus && matchesPeriod;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Remessas</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie todas as remessas do sistema
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-primary">
            {filteredShipments.length} remessas
          </Badge>
        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Código ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="PENDING_LABEL">Aguardando Etiqueta</SelectItem>
                  <SelectItem value="PENDING_DOCUMENT">Aguardando Documento</SelectItem>
                  <SelectItem value="PAID">Pago</SelectItem>
                  <SelectItem value="COLETA_ACEITA">Coleta Aceita</SelectItem>
                  <SelectItem value="COLETA_FINALIZADA">Coleta Finalizada</SelectItem>
                  <SelectItem value="IN_TRANSIT">Em Trânsito</SelectItem>
                  <SelectItem value="ENTREGA_FINALIZADA">Entrega Finalizada</SelectItem>
                  <SelectItem value="DELIVERED">Entregue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data Inicial</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    disabled={(date) => date > new Date() || (dateTo && date > dateTo)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data Final</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "dd/MM/yyyy") : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    disabled={(date) => date > new Date() || (dateFrom && date < dateFrom)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setDateFrom(undefined);
                  setDateTo(undefined);
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Lista de Remessas</span>
          </CardTitle>
          <CardDescription>
            Todas as remessas registradas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Carregando remessas...</p>
            </div>
          ) : filteredShipments.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma remessa encontrada</p>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredShipments.map((shipment) => (
                <Card key={shipment.id} className="border-border/50 hover:shadow-lg hover:border-primary/20 transition-all duration-300">
                  <CardContent className="p-0">
                    {/* Header com código e ações */}
                    <div className="flex items-center justify-between p-4 pb-2 border-b border-border/30">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base">
                            {shipment.tracking_code || `ID${shipment.id.slice(0, 8).toUpperCase()}`}
                          </h3>
                          <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <CalendarIcon className="w-3 h-3 mr-1" />
                            {format(new Date(shipment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(shipment.status)}
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewShipment(shipment)}
                            className="h-8 w-8 p-0 hover:bg-primary/10"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewOccurrences(shipment)}
                            className="h-8 w-8 p-0 hover:bg-primary/10"
                            title="Ver ocorrências do motorista"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Conteúdo principal em grid */}
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Cliente */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cliente</span>
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{shipment.client_name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {shipment.user_id ? 'Cadastrado' : 'Anônimo'}
                            </p>
                          </div>
                        </div>

                        {/* Origem → Destino */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rota</span>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2 text-xs">
                              <span className="font-medium">
                                {shipment.sender_address?.city || 'Goiânia'} - {shipment.sender_address?.state || 'GO'}
                              </span>
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              <span className="font-medium">
                                {shipment.recipient_address?.city || 'N/A'} - {shipment.recipient_address?.state || 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                              <span>{shipment.sender_address?.cep || 'N/A'} → {shipment.recipient_address?.cep || 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Motorista */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Motorista</span>
                          </div>
                          <div>
                            {shipment.motoristas ? (
                              <div>
                                <p className="font-semibold text-sm">{shipment.motoristas.nome}</p>
                                <p className="text-xs text-muted-foreground">{shipment.motoristas.telefone}</p>
                                <Badge variant="default" className="text-xs mt-1 bg-green-100 text-green-700">
                                  Aceita pelo motorista
                                </Badge>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-xs">Aguardando aceite</Badge>
                            )}
                          </div>
                        </div>

                        {/* Valor e Informações */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor</span>
                          </div>
                           <div>
                              <p className="font-bold text-lg text-primary">
                                R$ {getQuoteValue(shipment).toFixed(2).replace('.', ',')}
                              </p>
                             <div className="flex items-center text-xs text-muted-foreground mt-1">
                               <Package className="w-3 h-3 mr-1" />
                               {shipment.weight}kg • {shipment.format}
                             </div>
                              {shipment.pricing_table_name && (
                                <div className="flex items-center text-xs text-muted-foreground mt-1">
                                  <FileText className="w-3 h-3 mr-1" />
                                  Tabela: {shipment.pricing_table_name}
                                </div>
                              )}
                               <div className="flex items-center gap-2 text-xs mt-1">
                                 {shipment.label_pdf_url ? (
                                   <>
                                     <Badge variant="default" className="text-xs bg-green-100 text-green-700">
                                       Etiqueta Emitida
                                     </Badge>
                                     <Button
                                       variant="ghost"
                                       size="sm"
                                       onClick={() => window.open(shipment.label_pdf_url!, '_blank')}
                                       className="h-6 px-2 text-xs hover:bg-primary/10"
                                     >
                                       <Download className="w-3 h-3 mr-1" />
                                       PDF
                                     </Button>
                                   </>
                                 ) : (
                                   <Badge variant="outline" className="text-xs">
                                     Aguardando Etiqueta
                                   </Badge>
                                 )}
                               </div>
                               
                               {/* Status do Webhook e Botão Manual */}
                               <div className="flex items-center gap-2 text-xs mt-2">
                                 {getWebhookStatusBadge(shipment)}
                                 {webhookStatuses[shipment.id] !== 'sent' && (
                                   <Button
                                     variant="outline"
                                     size="sm"
                                     onClick={() => handleSendWebhook(shipment)}
                                     disabled={sendingWebhook[shipment.id]}
                                     className="h-6 px-2 text-xs hover:bg-primary/10"
                                   >
                                     {sendingWebhook[shipment.id] ? (
                                       <>
                                         <div className="w-3 h-3 mr-1 animate-spin rounded-full border border-primary border-t-transparent" />
                                         Enviando...
                                       </>
                                     ) : (
                                       <>
                                         <Send className="w-3 h-3 mr-1" />
                                         Enviar Webhook
                                       </>
                                     )}
                                   </Button>
                                 )}
                               </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes da Remessa */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              Detalhes da Remessa - {selectedShipmentDetails?.tracking_code || `ID${selectedShipmentDetails?.id.slice(0, 8).toUpperCase()}`}
            </DialogTitle>
          </DialogHeader>
          
          {selectedShipmentDetails && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Coluna 1: Informações Gerais */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Informações Gerais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Código de Rastreio</label>
                      <p className="text-sm font-mono">{selectedShipmentDetails.tracking_code || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <div className="mt-1">{getStatusBadge(selectedShipmentDetails.status)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Data de Criação</label>
                      <p className="text-sm">{format(new Date(selectedShipmentDetails.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Valor Total</label>
                      <p className="text-lg font-bold text-primary">
                        R$ {getQuoteValue(selectedShipmentDetails).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                    {selectedShipmentDetails.pricing_table_name && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Tabela de Preços</label>
                        <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-blue-800">{selectedShipmentDetails.pricing_table_name}</span>
                          </div>
                          <p className="text-xs text-blue-600">
                            Esta remessa foi cotada utilizando a tabela de preços personalizada acima. 
                            Os valores e prazos foram calculados com base nesta configuração específica.
                          </p>
                          <div className="mt-2 text-xs text-muted-foreground">
                            ℹ️ Tabela aplicada automaticamente durante a cotação
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Cliente */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Cliente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nome</label>
                      <p className="text-sm">{selectedShipmentDetails.client_name}</p>
                    </div>
                    <div className="mt-2">
                      <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                      <p className="text-sm">{selectedShipmentDetails.user_id ? 'Cliente Cadastrado' : 'Cliente Anônimo'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Dimensões e Peso */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Dimensões e Peso</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Peso</label>
                        <p className="text-sm">{selectedShipmentDetails.weight} kg</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Formato</label>
                        <p className="text-sm">{selectedShipmentDetails.format}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Comprimento</label>
                        <p className="text-sm">{selectedShipmentDetails.length} cm</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Largura</label>
                        <p className="text-sm">{selectedShipmentDetails.width} cm</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Altura</label>
                        <p className="text-sm">{selectedShipmentDetails.height} cm</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Coluna 2: Endereços */}
              <div className="space-y-4">
                {/* Remetente */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center">
                      <Badge className="bg-green-100 text-green-700 mr-2">Dados Originais do Formulário</Badge>
                      Remetente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nome</label>
                      <p className="text-sm">{selectedShipmentDetails.sender_address?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Endereço</label>
                      <p className="text-sm">
                        {selectedShipmentDetails.sender_address?.street || 'N/A'}, {selectedShipmentDetails.sender_address?.number || 'N/A'}
                        {selectedShipmentDetails.sender_address?.complement && `, ${selectedShipmentDetails.sender_address.complement}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedShipmentDetails.sender_address?.neighborhood || 'N/A'} - {selectedShipmentDetails.sender_address?.city || 'N/A'}/{selectedShipmentDetails.sender_address?.state || 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground">CEP: {selectedShipmentDetails.sender_address?.cep || 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Destinatário */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center">
                      <Badge className="bg-green-100 text-green-700 mr-2">Dados Originais do Formulário</Badge>
                      Destinatário
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nome</label>
                      <p className="text-sm">{selectedShipmentDetails.recipient_address?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Endereço</label>
                      <p className="text-sm">
                        {selectedShipmentDetails.recipient_address?.street || 'N/A'}, {selectedShipmentDetails.recipient_address?.number || 'N/A'}
                        {selectedShipmentDetails.recipient_address?.complement && `, ${selectedShipmentDetails.recipient_address.complement}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedShipmentDetails.recipient_address?.neighborhood || 'N/A'} - {selectedShipmentDetails.recipient_address?.city || 'N/A'}/{selectedShipmentDetails.recipient_address?.state || 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground">CEP: {selectedShipmentDetails.recipient_address?.cep || 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Opções de Envio */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Opções de Envio</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Modalidade</label>
                      <p className="text-sm">{selectedShipmentDetails.selected_option === 'express' ? 'Expresso' : 'Econômico'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Coleta</label>
                      <p className="text-sm">{selectedShipmentDetails.pickup_option === 'pickup' ? 'Coleta Domiciliar' : 'Envio em Balcão'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Motorista */}
                {selectedShipmentDetails.motoristas && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Motorista Responsável</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Nome</label>
                        <p className="text-sm">{selectedShipmentDetails.motoristas.nome}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                        <p className="text-sm">{selectedShipmentDetails.motoristas.telefone}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="text-sm">{selectedShipmentDetails.motoristas.email}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Etiqueta e Documentos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Documentos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Etiqueta</label>
                      {selectedShipmentDetails.label_pdf_url ? (
                        <div className="mt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(selectedShipmentDetails.label_pdf_url!, '_blank')}
                            className="h-8"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Baixar Etiqueta PDF
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Etiqueta não disponível</p>
                      )}
                    </div>
                    
                    {selectedShipmentDetails.cte_key && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Chave do CT-e</label>
                        <p className="text-sm font-mono text-xs break-all">{selectedShipmentDetails.cte_key}</p>
                      </div>
                    )}
                    
                    {cteData && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">CT-e</label>
                        <div className="mt-1 p-2 bg-muted rounded text-xs">
                          <p><strong>Número:</strong> {cteData.numero_cte}</p>
                          <p><strong>Status:</strong> {cteData.status}</p>
                          <p><strong>Série:</strong> {cteData.serie}</p>
                          <p><strong>Modelo:</strong> {cteData.modelo}</p>
                          {cteData.dacte_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(cteData.dacte_url, '_blank')}
                              className="h-6 mt-2"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              DACTE
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Ocorrências */}
      <ShipmentOccurrencesModal
        isOpen={occurrencesModalOpen}
        onClose={() => setOccurrencesModalOpen(false)}
        shipment={selectedShipmentOccurrences}
      />
    </div>
  );
};

export default AdminRemessas;