import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Plus, MapPin, Eye, Search, Download, RefreshCw, Phone, User, History, Tag, ChevronDown, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import NationalLabelGenerator from "@/components/NationalLabelGenerator";

interface Shipment {
  id: string;
  tracking_code: string;
  status: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  format: string;
  selected_option: string;
  pickup_option: string;
  created_at: string;
  label_pdf_url: string | null;
  cte_key: string | null;
  carrier_order_id: string | null;
  carrier_barcode: string | null;
  pricing_table_name: string | null;
  quote_data: any;
  payment_data: any;
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
  };
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
  };
}

interface CarrierTrackingEvent {
  data: string;
  status: string;
  unidade?: string;
  idOcorrencia?: number;
}

interface CarrierTrackingData {
  codigo: string;
  tracking: {
    codigo: string;
    shipmentId: string;
    dacte?: string;
    dtEmissao?: string;
    status: string;
    valor?: number;
    peso?: number;
    eventos: CarrierTrackingEvent[];
    volumes?: Array<{
      peso: number;
      altura: number;
      largura: number;
      comprimento: number;
    }>;
  };
  previsaoEntrega?: string;
}

const ClientRemessas = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [trackingShipment, setTrackingShipment] = useState<Shipment | null>(null);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [carrierTrackingData, setCarrierTrackingData] = useState<CarrierTrackingData | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [labelShipment, setLabelShipment] = useState<Shipment | null>(null);

  useEffect(() => {
    if (user) {
      loadShipments();
    }
  }, [user]);

  // Auto-refresh a cada 30 segundos
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      loadShipments();
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const loadShipments = async () => {
    try {
      const { data, error } = await supabase
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
          label_pdf_url,
          cte_key,
          carrier_order_id,
          carrier_barcode,
          pricing_table_name,
          quote_data,
          payment_data,
          sender_address:addresses!sender_address_id (
            name, street, number, neighborhood, city, state, cep, complement, reference
          ),
          recipient_address:addresses!recipient_address_id (
            name, street, number, neighborhood, city, state, cep, complement, reference
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShipments(data || []);
    } catch (error) {
      console.error('Error loading shipments:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar suas remessas.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'PENDING_LABEL': 'Pago',
      'PENDING_DOCUMENT': 'Aguardando Documento',
      'PENDING_PAYMENT': 'Aguardando Pagamento',
      'PAYMENT_CONFIRMED': 'Pago',
      'PAGO_AGUARDANDO_ETIQUETA': 'Pago',
      'LABEL_AVAILABLE': 'Etiqueta Disponível',
      'IN_TRANSIT': 'Em Trânsito',
      'DELIVERED': 'Entregue',
      'PAID': 'Pago',
      'COLETA_ACEITA': 'Coleta Aceita',
      'COLETA_FINALIZADA': 'Coleta Finalizada',
      'ENTREGA_FINALIZADA': 'Entregue',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'PENDING_PAYMENT': 'bg-red-50 text-red-700 border-red-200',
      'PENDING_DOCUMENT': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'PENDING_LABEL': 'bg-green-50 text-green-700 border-green-200',
      'PAYMENT_CONFIRMED': 'bg-green-50 text-green-700 border-green-200',
      'PAGO_AGUARDANDO_ETIQUETA': 'bg-green-50 text-green-700 border-green-200',
      'PAID': 'bg-green-50 text-green-700 border-green-200',
      'LABEL_AVAILABLE': 'bg-blue-50 text-blue-700 border-blue-200',
      'IN_TRANSIT': 'bg-blue-50 text-blue-700 border-blue-200',
      'COLETA_ACEITA': 'bg-amber-50 text-amber-700 border-amber-200',
      'COLETA_FINALIZADA': 'bg-blue-50 text-blue-700 border-blue-200',
      'DELIVERED': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'ENTREGA_FINALIZADA': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
    return colorMap[status] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  // Verifica se a etiqueta está travada (status NO_CD ou posterior)
  const isLabelLocked = (status: string) => {
    const lockedStatuses = ['NO_CD', 'EM_ROTA', 'ENTREGUE', 'CONCLUIDO', 'DELIVERED', 'ENTREGA_FINALIZADA', 'DEVOLUCAO', 'IN_TRANSIT'];
    return lockedStatuses.includes(status);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount / 100);
  };

  const getShipmentPrice = (shipment: Shipment) => {
    let amount = null;
    if (shipment.payment_data?.pixData?.amount) {
      amount = shipment.payment_data.pixData.amount;
    } else if (shipment.payment_data?.amount && shipment.payment_data?.method === 'pix') {
      amount = shipment.payment_data.amount * 100;
    } else if (shipment.payment_data?.amount) {
      amount = shipment.payment_data.amount;
    } else if (shipment.quote_data?.amount) {
      amount = shipment.quote_data.amount * 100;
    } else if (shipment.quote_data?.shippingQuote) {
      const price = shipment.selected_option === 'express' 
        ? shipment.quote_data.shippingQuote.expressPrice 
        : shipment.quote_data.shippingQuote.economicPrice;
      amount = price * 100;
    } else if (shipment.quote_data?.totalPrice) {
      amount = shipment.quote_data.totalPrice * 100;
    } else if (shipment.quote_data?.deliveryDetails?.totalPrice) {
      amount = shipment.quote_data.deliveryDetails.totalPrice * 100;
    }
    return amount;
  };

  const getRecipientName = (shipment: Shipment) => {
    return shipment.quote_data?.addressData?.recipient?.name || 
           shipment.recipient_address?.name || 
           shipment.quote_data?.recipientData?.name || 
           'Destinatário';
  };

  const getRecipientPhone = (shipment: Shipment) => {
    return shipment.quote_data?.addressData?.recipient?.phone || 
           shipment.quote_data?.recipientData?.phone || 
           '';
  };

  const getRecipientAddress = (shipment: Shipment) => {
    const addr = shipment.recipient_address;
    if (addr && addr.street && addr.street !== 'A definir') {
      return `${addr.street}, ${addr.number} - ${addr.neighborhood}, ${addr.city}/${addr.state}`;
    }
    const recipientData = shipment.quote_data?.recipientData || shipment.quote_data?.addressData?.recipient;
    if (recipientData) {
      return `${recipientData.street || ''}, ${recipientData.number || ''} - ${recipientData.neighborhood || ''}, ${recipientData.city || ''}/${recipientData.state || ''}`;
    }
    return 'Endereço não disponível';
  };

  const getDeliveryDate = (shipment: Shipment) => {
    const deliveryDays = shipment.quote_data?.shippingQuote?.economicDays || 
                         shipment.quote_data?.deliveryDetails?.deliveryDays || 
                         7;
    const createdDate = new Date(shipment.created_at);
    createdDate.setDate(createdDate.getDate() + deliveryDays);
    return createdDate;
  };

  const handleViewDetails = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setDetailsModalOpen(true);
  };

  const handleDownloadLabel = (shipment: Shipment) => {
    if (shipment.label_pdf_url) {
      window.open(shipment.label_pdf_url, '_blank');
    } else {
      toast({
        title: "Etiqueta não disponível",
        description: "A etiqueta ainda não foi gerada para esta remessa.",
        variant: "destructive"
      });
    }
  };

  const getCarrier = (shipment: Shipment): string => {
    return shipment.quote_data?.deliveryDetails?.selectedCarrier || 
           shipment.quote_data?.quoteData?.selectedCarrier ||
           'jadlog';
  };

  const handleShowTracking = async (shipment: Shipment) => {
    // Verificar se tem cte_key (código da transportadora)
    if (!shipment.cte_key) {
      toast({
        title: "Rastreio não disponível",
        description: "Esta remessa ainda não possui código de rastreio da transportadora.",
        variant: "destructive"
      });
      return;
    }

    setLoadingHistory(true);
    setTrackingShipment(shipment);
    setCarrierTrackingData(null);
    setTrackingModalOpen(true);

    try {
      const carrier = getCarrier(shipment);
      
      const response = await fetch('https://webhook.grupoconfix.com/webhook/47827545-77ca-4e68-8b43-9c50467a3f55', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          codigo: shipment.cte_key,
          transportadora: carrier
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao consultar rastreamento');
      }

      const data = await response.json();
      console.log('📦 Resposta do rastreio:', data);
      
      // Parse response - can be array with consulta or direct object
      if (Array.isArray(data) && data[0]?.consulta) {
        // Format: [{ consulta: [{ codigo, tracking, previsaoEntrega }] }]
        const trackingInfo = data[0].consulta[0];
        setCarrierTrackingData(trackingInfo);
        setStatusHistory(trackingInfo?.tracking?.eventos || []);
      } else if (data.consulta) {
        // Format: { consulta: [{ codigo, tracking, previsaoEntrega }] }
        const trackingInfo = data.consulta[0];
        setCarrierTrackingData(trackingInfo);
        setStatusHistory(trackingInfo?.tracking?.eventos || []);
      } else if (data.tracking?.eventos) {
        // Direct tracking format
        setCarrierTrackingData(data);
        setStatusHistory(data.tracking.eventos || []);
      } else if (Array.isArray(data)) {
        setStatusHistory(data);
      } else {
        setStatusHistory([]);
      }
      
    } catch (error) {
      console.error('Erro ao buscar rastreio:', error);
      toast({
        title: "Erro ao consultar rastreio",
        description: "Não foi possível consultar o rastreamento. Tente novamente.",
        variant: "destructive"
      });
      setStatusHistory([]);
      setCarrierTrackingData(null);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getCarrierStatusColor = (status: string) => {
    const statusUpper = status?.toUpperCase() || '';
    if (statusUpper.includes('ENTREGUE') || statusUpper.includes('DELIVERED')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (statusUpper.includes('ROTA') || statusUpper.includes('TRANSIT')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (statusUpper.includes('TRANSFERE') || statusUpper.includes('TRANSFERI')) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
    if (statusUpper.includes('ENTRADA')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (statusUpper.includes('COLETA') || statusUpper.includes('EMISSAO')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (statusUpper.includes('AUSENTE') || statusUpper.includes('OCORRENCIA')) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const filteredShipments = shipments
    .filter(shipment => {
      const matchesSearch = !searchTerm || 
        shipment.tracking_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getRecipientName(shipment).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Package className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <CardTitle className="text-xl">Envios Recentes</CardTitle>
              <CardDescription>Seus últimos envios nacionais</CardDescription>
            </div>
            <Button 
              onClick={() => navigate('/painel/convencional/cotacoes')}
              className="bg-gradient-to-r from-primary to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-primary/20"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Envio
            </Button>
          </div>
          
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou destinatário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] border border-border shadow-sm hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="PENDING_PAYMENT">Aguardando Pagamento</SelectItem>
                <SelectItem value="PAID">Pago</SelectItem>
                <SelectItem value="IN_TRANSIT">Em Trânsito</SelectItem>
                <SelectItem value="DELIVERED">Entregue</SelectItem>
                <SelectItem value="COLETA_ACEITA">Coleta Aceita</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {shipments.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">Nenhum envio cadastrado ainda</p>
              <Button onClick={() => navigate('/painel/convencional/cotacoes')}>
                <Plus className="mr-2 h-4 w-4" />
                Fazer Primeiro Envio
              </Button>
            </div>
          ) : filteredShipments.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">Nenhum envio encontrado com os filtros aplicados</p>
              <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
                Limpar Filtros
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredShipments.map((shipment) => {
                const price = getShipmentPrice(shipment);
                const deliveryDate = getDeliveryDate(shipment);
                return (
                  <div
                    key={shipment.id}
                    className="p-4 border-0 rounded-xl shadow-md hover:shadow-lg transition-all bg-white overflow-hidden"
                  >
                    {/* Status bar on top */}
                    <div className={`h-1 -mx-4 -mt-4 mb-4 ${
                      shipment.status === 'DELIVERED' || shipment.status === 'ENTREGA_FINALIZADA' 
                        ? 'bg-emerald-500' 
                        : shipment.status === 'PENDING_PAYMENT' 
                          ? 'bg-red-500' 
                          : 'bg-primary'
                    }`} />
                    
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm font-bold text-foreground">
                        {shipment.tracking_code || `ID${shipment.id.slice(0, 10).toUpperCase()}`}
                      </span>
                      <Badge className={`text-xs font-medium border ${getStatusColor(shipment.status)}`}>
                        {getStatusLabel(shipment.status)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <p className="font-medium flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {getRecipientName(shipment)}
                      </p>
                      {getRecipientPhone(shipment) && (
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {getRecipientPhone(shipment)}
                        </p>
                      )}
                      <p className="text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {getRecipientAddress(shipment)}
                      </p>
                      <p className="text-foreground font-medium">
                        Previsão: {format(deliveryDate, 'dd/MM/yyyy')}
                      </p>
                      {price && (
                        <p className="text-primary font-semibold">
                          Frete: {formatCurrency(price)}
                        </p>
                      )}
                    </div>

                    {/* Aviso de etiqueta - só mostra se não estiver travada */}
                    {!isLabelLocked(shipment.status) && (
                      <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-xs font-semibold text-orange-700 flex items-center gap-1">
                          ⚠️ Atenção: Por favor cole esta etiqueta no produto
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(shipment)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShowTracking(shipment)}
                        disabled={!shipment.cte_key}
                        className={!shipment.cte_key ? "opacity-50 cursor-not-allowed" : ""}
                      >
                        <History className="h-4 w-4 mr-1" />
                        Rastreio
                      </Button>
                      {shipment.label_pdf_url && !isLabelLocked(shipment.status) && (
                        (() => {
                          // Check if it's a Jadlog/Nacional shipment - use same logic as admin
                          const isNacionalLabel = shipment.pricing_table_name?.toLowerCase().includes('jadlog') ||
                            shipment.pricing_table_name?.toLowerCase().includes('nacional') ||
                            shipment.carrier_order_id ||
                            shipment.carrier_barcode;
                          
                          if (isNacionalLabel) {
                            return (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="bg-primary hover:bg-primary/90"
                                  >
                                    <Tag className="h-4 w-4 mr-1" />
                                    Etiqueta
                                    <ChevronDown className="h-3 w-3 ml-1" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-white z-50">
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setLabelShipment(shipment);
                                      setLabelModalOpen(true);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <Printer className="h-4 w-4 mr-2" />
                                    Imprimir Etiqueta
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setLabelShipment(shipment);
                                      setLabelModalOpen(true);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Baixar PDF
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            );
                          }
                          
                          // For other labels, use the original behavior
                          return (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="bg-primary hover:bg-primary/90"
                                >
                                  <Tag className="h-4 w-4 mr-1" />
                                  Etiqueta
                                  <ChevronDown className="h-3 w-3 ml-1" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-white z-50">
                                <DropdownMenuItem 
                                  onClick={() => window.print()}
                                  className="cursor-pointer"
                                >
                                  <Printer className="h-4 w-4 mr-2" />
                                  Imprimir Etiqueta
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDownloadLabel(shipment)}
                                  className="cursor-pointer"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Baixar PDF
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          );
                        })()
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>Detalhes do Envio</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[calc(85vh-100px)] px-6 py-4">
            {selectedShipment && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Código de Rastreio</p>
                    <p className="font-mono font-semibold">
                      {selectedShipment.tracking_code || `ID${selectedShipment.id.slice(0, 10).toUpperCase()}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={`text-xs font-medium border ${getStatusColor(selectedShipment.status)}`}>
                      {getStatusLabel(selectedShipment.status)}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Criado em</p>
                    <p className="font-semibold">
                      {format(new Date(selectedShipment.created_at), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Previsão de Entrega</p>
                    <p className="font-semibold">
                      {format(getDeliveryDate(selectedShipment), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Peso</p>
                    <p className="font-semibold">{selectedShipment.weight} kg</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor do Frete</p>
                    <p className="font-semibold text-primary">
                      {getShipmentPrice(selectedShipment) 
                        ? formatCurrency(getShipmentPrice(selectedShipment)!) 
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                <hr className="border-border" />
                
                <h4 className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Destinatário
                </h4>
                <div className="text-sm bg-muted/50 p-3 rounded">
                  <p className="font-medium">{getRecipientName(selectedShipment)}</p>
                  {getRecipientPhone(selectedShipment) && (
                    <p className="text-muted-foreground">{getRecipientPhone(selectedShipment)}</p>
                  )}
                  <p className="text-muted-foreground">{getRecipientAddress(selectedShipment)}</p>
                </div>

              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal de Rastreio */}
      <Dialog open={trackingModalOpen} onOpenChange={setTrackingModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Rastreio do Envio
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[calc(85vh-100px)] px-6 py-4">
            {trackingShipment && (
              <div className="space-y-4">
                {/* Informações gerais */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-muted-foreground">Código do Pedido</p>
                      <p className="font-mono font-bold text-base">
                        {trackingShipment.tracking_code}
                      </p>
                    </div>
                    {trackingShipment.cte_key && trackingShipment.cte_key !== trackingShipment.tracking_code && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Código Transportadora</p>
                        <p className="font-mono font-semibold text-sm">
                          {trackingShipment.cte_key}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {carrierTrackingData && (
                    <>
                      <hr className="border-border" />
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Status Atual</p>
                          <Badge className={`text-xs font-medium border ${getCarrierStatusColor(carrierTrackingData.tracking?.status)}`}>
                            {carrierTrackingData.tracking?.status || 'N/A'}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Previsão Entrega</p>
                          <p className="font-semibold">
                            {carrierTrackingData.previsaoEntrega 
                              ? format(new Date(carrierTrackingData.previsaoEntrega + 'T12:00:00'), 'dd/MM/yyyy')
                              : 'N/A'}
                          </p>
                        </div>
                        {carrierTrackingData.tracking?.dtEmissao && (
                          <div>
                            <p className="text-xs text-muted-foreground">Data Emissão</p>
                            <p className="font-medium">{carrierTrackingData.tracking.dtEmissao}</p>
                          </div>
                        )}
                        {carrierTrackingData.tracking?.peso && (
                          <div>
                            <p className="text-xs text-muted-foreground">Peso</p>
                            <p className="font-medium">{carrierTrackingData.tracking.peso} kg</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                
                <h4 className="font-semibold flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Histórico de Movimentações
                </h4>
                
                {loadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <Package className="h-8 w-8 animate-pulse text-primary" />
                    <p className="text-sm text-muted-foreground">Consultando transportadora...</p>
                  </div>
                ) : statusHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhum histórico disponível</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...statusHistory].reverse().map((event, index) => (
                      <div 
                        key={`${event.data}-${index}`} 
                        className="relative pl-6 pb-3 border-l-2 border-primary/30 last:border-l-0"
                      >
                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white ${
                          index === 0 ? 'bg-primary' : 'bg-muted-foreground/40'
                        }`} />
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <Badge className={`text-xs font-medium border ${getCarrierStatusColor(event.status)}`}>
                            {event.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-2">
                            {event.data}
                          </p>
                          {event.unidade && (
                            <p className="text-xs mt-1 text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.unidade}
                            </p>
                          )}
                          {event.idOcorrencia && (
                            <p className="text-xs mt-1 text-amber-600 font-medium">
                              Ocorrência #{event.idOcorrencia}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal de Etiqueta Nacional */}
      <Dialog open={labelModalOpen} onOpenChange={setLabelModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Etiqueta de Envio</DialogTitle>
          </DialogHeader>
          {labelShipment && (
            <NationalLabelGenerator
              shipment={{
                id: labelShipment.id,
                tracking_code: labelShipment.tracking_code,
                carrier_order_id: labelShipment.carrier_order_id || labelShipment.cte_key,
                carrier_barcode: labelShipment.carrier_barcode,
                weight: labelShipment.weight,
                width: labelShipment.width,
                height: labelShipment.height,
                length: labelShipment.length,
                format: labelShipment.format,
                quote_data: labelShipment.quote_data,
                sender_address: labelShipment.sender_address,
                recipient_address: labelShipment.recipient_address
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientRemessas;
