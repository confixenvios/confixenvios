import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Plus, MapPin, Eye, Search, Download, RefreshCw, Phone, User, History } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

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
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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

  const handleShowTracking = async (shipment: Shipment) => {
    setTrackingShipment(shipment);
    setTrackingModalOpen(true);
    setLoadingHistory(true);
    
    try {
      const { data, error } = await supabase
        .from('shipment_status_history')
        .select('*')
        .eq('shipment_id', shipment.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setStatusHistory(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      setStatusHistory([]);
    } finally {
      setLoadingHistory(false);
    }
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

                    {/* Aviso de etiqueta */}
                    <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-xs font-semibold text-orange-700 flex items-center gap-1">
                        ⚠️ Atenção: Por favor cole esta etiqueta no produto
                      </p>
                    </div>
                    
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
                      >
                        <History className="h-4 w-4 mr-1" />
                        Rastreio
                      </Button>
                      {shipment.label_pdf_url && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleDownloadLabel(shipment)}
                          className="bg-primary hover:bg-primary/90"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Baixar Etiqueta
                        </Button>
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

                {selectedShipment.label_pdf_url && (
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => handleDownloadLabel(selectedShipment)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Etiqueta
                  </Button>
                )}
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
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm text-muted-foreground">Código de Rastreio</p>
                  <p className="font-mono font-bold text-lg">
                    {trackingShipment.tracking_code || `ID${trackingShipment.id.slice(0, 10).toUpperCase()}`}
                  </p>
                </div>
                
                <h4 className="font-semibold flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Histórico de Status
                </h4>
                
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Package className="h-6 w-6 animate-pulse text-primary" />
                  </div>
                ) : statusHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhum histórico disponível</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {statusHistory.map((history, index) => (
                      <div 
                        key={history.id} 
                        className="relative pl-6 pb-4 border-l-2 border-primary/30 last:border-l-0"
                      >
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary border-2 border-white" />
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <Badge className={`text-xs font-medium border ${getStatusColor(history.status)}`}>
                            {getStatusLabel(history.status)}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(history.created_at), 'dd/MM/yyyy')} às {format(new Date(history.created_at), 'HH:mm')}
                          </p>
                          {history.status_description && (
                            <p className="text-sm mt-1 text-muted-foreground italic">
                              {history.status_description}
                            </p>
                          )}
                          {history.observacoes && (
                            <p className="text-sm mt-1 text-muted-foreground italic">
                              {history.observacoes}
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
    </div>
  );
};

export default ClientRemessas;
