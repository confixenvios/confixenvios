import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Package, 
  Truck, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CarrierTrackingModal from "@/components/cliente/CarrierTrackingModal";

interface TrackingEvent {
  id: string;
  status: string;
  description: string;
  location: string;
  timestamp: string;
  isActive?: boolean;
  observacoes?: string;
}

interface ShipmentInfo {
  id: string;
  tracking_code: string;
  status: string;
  created_at: string;
  cte_key?: string;
  sender_address: {
    name: string;
    city: string;
    state: string;
  };
  recipient_address: {
    name: string;
    city: string;
    state: string;
  };
  weight: number;
  quote_data?: any;
  user_id?: string;
}

const AdminRastreio = () => {
  const { toast } = useToast();
  const [trackingCode, setTrackingCode] = useState("");
  const [shipmentInfo, setShipmentInfo] = useState<ShipmentInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [allShipments, setAllShipments] = useState<ShipmentInfo[]>([]);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  
  // Carrier tracking modal state
  const [carrierModalOpen, setCarrierModalOpen] = useState(false);
  const [carrierTrackingData, setCarrierTrackingData] = useState<any>(null);
  const [carrierLoading, setCarrierLoading] = useState(false);
  const [carrierError, setCarrierError] = useState<string | null>(null);
  const [selectedTrackingCode, setSelectedTrackingCode] = useState("");

  const sendTrackingWebhook = async (shipment: ShipmentInfo) => {
    try {
      setCarrierLoading(true);
      setCarrierError(null);
      setCarrierTrackingData(null);
      setSelectedTrackingCode(shipment.tracking_code);
      setCarrierModalOpen(true);

      const webhookPayload = {
        event_type: 'admin_shipment_tracking_consulted',
        shipment_id: shipment.id,
        tracking_code: shipment.tracking_code,
        cte_key: shipment.cte_key || null,
        status: shipment.status,
        created_at: shipment.created_at,
        weight: shipment.weight,
        sender: {
          name: shipment.sender_address?.name || shipment.quote_data?.senderData?.name || '',
          city: shipment.sender_address?.city || shipment.quote_data?.senderData?.address?.city || '',
          state: shipment.sender_address?.state || shipment.quote_data?.senderData?.address?.state || ''
        },
        recipient: {
          name: shipment.recipient_address?.name || shipment.quote_data?.recipientData?.name || '',
          city: shipment.recipient_address?.city || shipment.quote_data?.recipientData?.address?.city || '',
          state: shipment.recipient_address?.state || shipment.quote_data?.recipientData?.address?.state || ''
        },
        quote_data: shipment.quote_data,
        consulted_at: new Date().toISOString(),
        user_id: shipment.user_id || null
      };

      const response = await fetch('https://webhook.grupoconfix.com/webhook/47827545-77ca-4e68-8b43-9c50467a3f55', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      });

      const data = await response.json();
      console.log('Resposta do webhook de rastreamento (admin):', data);
      
      // Normalizar dados: se for array, pegar primeiro elemento
      let normalizedData = data;
      if (Array.isArray(data) && data.length > 0) {
        normalizedData = data[0];
      }
      
      setCarrierTrackingData(normalizedData);
      setCarrierLoading(false);
    } catch (error) {
      console.error('Erro ao enviar webhook de consulta:', error);
      setCarrierError('Não foi possível consultar a transportadora. Tente novamente.');
      setCarrierLoading(false);
    }
  };

  useEffect(() => {
    loadAllShipments();
  }, []);

  const loadAllShipments = async () => {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          id,
          tracking_code,
          status,
          created_at,
          weight,
          quote_data,
          cte_key,
          user_id,
          sender_address:addresses!sender_address_id (
            name,
            city,
            state,
            street,
            number,
            neighborhood,
            cep
          ),
          recipient_address:addresses!recipient_address_id (
            name,
            city,
            state,
            street,
            number,
            neighborhood,
            cep
          )
        `)
        .not('tracking_code', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Enrich with quote_data if address info is missing
      const enrichedData = data?.map(shipment => {
        const enrichedShipment = { ...shipment };
        
        if ((!shipment.sender_address?.name || shipment.sender_address.name === "A definir") && 
            shipment.quote_data) {
          const quoteData = shipment.quote_data as any;
          if (quoteData.senderData) {
            enrichedShipment.sender_address = {
              name: quoteData.senderData.name || "Nome não informado",
              city: quoteData.senderData.address?.city || "Cidade não informada",
              state: quoteData.senderData.address?.state || "Estado não informado",
              street: quoteData.senderData.address?.street || "",
              number: quoteData.senderData.address?.number || "",
              neighborhood: quoteData.senderData.address?.neighborhood || "",
              cep: quoteData.senderData.address?.cep || ""
            };
          }
        }
        
        if ((!shipment.recipient_address?.name || shipment.recipient_address.name === "A definir") && 
            shipment.quote_data) {
          const quoteData = shipment.quote_data as any;
          if (quoteData.recipientData) {
            enrichedShipment.recipient_address = {
              name: quoteData.recipientData.name || "Nome não informado",
              city: quoteData.recipientData.address?.city || "Cidade não informada",
              state: quoteData.recipientData.address?.state || "Estado não informado",
              street: quoteData.recipientData.address?.street || "",
              number: quoteData.recipientData.address?.number || "",
              neighborhood: quoteData.recipientData.address?.neighborhood || "",
              cep: quoteData.recipientData.address?.cep || ""
            };
          }
        }
        
        return enrichedShipment;
      });
      
      setAllShipments(enrichedData || []);
    } catch (error) {
      console.error('Error loading shipments:', error);
    }
  };

  const handleTrackingSearch = async () => {
    if (!trackingCode.trim()) {
      toast({
        title: "Código obrigatório",
        description: "Digite um código de rastreio válido",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          id,
          tracking_code,
          status,
          created_at,
          weight,
          quote_data,
          cte_key,
          user_id,
          sender_address:addresses!sender_address_id (
            name,
            city,
            state,
            street,
            number,
            neighborhood,
            cep
          ),
          recipient_address:addresses!recipient_address_id (
            name,
            city,
            state,
            street,
            number,
            neighborhood,
            cep
          )
        `)
        .eq('tracking_code', trackingCode.toUpperCase())
        .maybeSingle();

      if (error || !data) {
        toast({
          title: "Remessa não encontrada",
          description: "Verifique se o código de rastreio está correto",
          variant: "destructive"
        });
        setShipmentInfo(null);
        return;
      }

      // Enrich with quote_data if address info is missing
      let enrichedShipment = { ...data };
      
      if ((!data.sender_address?.name || data.sender_address.name === "A definir") && 
          data.quote_data) {
        const quoteData = data.quote_data as any;
        if (quoteData.senderData) {
          enrichedShipment.sender_address = {
            name: quoteData.senderData.name || "Nome não informado",
            city: quoteData.senderData.address?.city || "Cidade não informada",
            state: quoteData.senderData.address?.state || "Estado não informado",
            street: quoteData.senderData.address?.street || "",
            number: quoteData.senderData.address?.number || "",
            neighborhood: quoteData.senderData.address?.neighborhood || "",
            cep: quoteData.senderData.address?.cep || ""
          };
        }
      }
      
      if ((!data.recipient_address?.name || data.recipient_address.name === "A definir") && 
          data.quote_data) {
        const quoteData = data.quote_data as any;
        if (quoteData.recipientData) {
          enrichedShipment.recipient_address = {
            name: quoteData.recipientData.name || "Nome não informado",
            city: quoteData.recipientData.address?.city || "Cidade não informada",
            state: quoteData.recipientData.address?.state || "Estado não informado",
            street: quoteData.recipientData.address?.street || "",
            number: quoteData.recipientData.address?.number || "",
            neighborhood: quoteData.recipientData.address?.neighborhood || "",
            cep: quoteData.recipientData.address?.cep || ""
          };
        }
      }

      setShipmentInfo(enrichedShipment);
      
      // Load tracking events from shipment_status_history
      await loadTrackingEvents(data.id);
      
      toast({
        title: "Remessa encontrada!",
        description: "Informações da remessa carregadas com sucesso"
      });
    } catch (error) {
      console.error('Error tracking shipment:', error);
      toast({
        title: "Erro",
        description: "Não foi possível rastrear a remessa",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'PENDING_DOCUMENT': { variant: 'destructive', label: 'Aguardando Documento', icon: AlertCircle },
      'PENDING_PAYMENT': { variant: 'destructive', label: 'Aguardando Pagamento', icon: AlertCircle },
      'PAYMENT_CONFIRMED': { variant: 'success', label: 'Pagamento Confirmado', icon: CheckCircle },
      'PAID': { variant: 'success', label: 'Pago', icon: CheckCircle },
      'PAGO_AGUARDANDO_ETIQUETA': { variant: 'secondary', label: 'Aguardando Etiqueta', icon: Clock },
      'LABEL_AVAILABLE': { variant: 'success', label: 'Etiqueta Disponível', icon: CheckCircle },
      'IN_TRANSIT': { variant: 'default', label: 'Em Trânsito', icon: Truck },
      'DELIVERED': { variant: 'success', label: 'Entregue', icon: CheckCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { 
      variant: 'secondary', 
      label: status, 
      icon: Info 
    };
    
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <IconComponent className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const loadTrackingEvents = async (shipmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('shipment_status_history')
        .select(`
          id,
          status,
          created_at,
          observacoes,
          occurrence_data
        `)
        .eq('shipment_id', shipmentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const events: TrackingEvent[] = data?.map((event, index) => ({
        id: event.id,
        status: event.status,
        description: getStatusDescription(event.status),
        location: getLocationFromStatus(event.status, event.occurrence_data),
        timestamp: event.created_at,
        observacoes: event.observacoes || undefined,
        isActive: index === 0
      })) || [];

      setTrackingEvents(events);
    } catch (error) {
      console.error('Error loading tracking events:', error);
      setTrackingEvents([]);
    }
  };

  const getStatusDescription = (status: string): string => {
    const descriptions = {
      'PENDING_DOCUMENT': 'Aguardando documentação',
      'PENDING_PAYMENT': 'Aguardando pagamento',
      'PAYMENT_CONFIRMED': 'Pagamento confirmado',
      'PAID': 'Pagamento processado',
      'PAGO_AGUARDANDO_ETIQUETA': 'Aguardando geração de etiqueta',
      'LABEL_AVAILABLE': 'Etiqueta disponível - Pronta para coleta',
      'IN_TRANSIT': 'Objeto em trânsito',
      'OUT_FOR_DELIVERY': 'Objeto saiu para entrega',
      'DELIVERED': 'Objeto entregue ao destinatário',
      'RETURNED': 'Objeto retornado',
      'EXCEPTION': 'Ocorrência registrada'
    };
    
    return descriptions[status as keyof typeof descriptions] || status;
  };

  const getLocationFromStatus = (status: string, occurrenceData?: any): string => {
    if (occurrenceData && occurrenceData.location) {
      return occurrenceData.location;
    }
    
    const locations = {
      'PENDING_DOCUMENT': 'Sistema Confix Envios',
      'PENDING_PAYMENT': 'Sistema Confix Envios',
      'PAYMENT_CONFIRMED': 'Sistema Confix Envios',
      'PAID': 'Sistema Confix Envios',
      'PAGO_AGUARDANDO_ETIQUETA': 'Centro de Processamento',
      'LABEL_AVAILABLE': 'Centro de Distribuição',
      'IN_TRANSIT': 'Em rota de entrega',
      'OUT_FOR_DELIVERY': 'Veículo de entrega',
      'DELIVERED': 'Local de destino',
      'RETURNED': 'Centro de Distribuição',
      'EXCEPTION': 'Local da ocorrência'
    };
    
    return locations[status as keyof typeof locations] || 'Sistema Confix Envios';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Rastreamento (Admin)</h1>
        <p className="text-muted-foreground">
          Consulte o rastreio de todas as remessas do sistema
        </p>
      </div>

      {/* Search Section */}
      <Card className="border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>Consultar Rastreamento</span>
          </CardTitle>
          <CardDescription>
            Digite o código de rastreamento para consultar qualquer remessa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Ex: ID2025ABC123"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && handleTrackingSearch()}
            />
            <Button 
              onClick={handleTrackingSearch} 
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Rastrear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* All Shipments */}
      {allShipments.length > 0 && (
        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="w-5 h-5" />
              <span>Remessas Recentes (Todas)</span>
            </CardTitle>
            <CardDescription>
              Clique em qualquer remessa para rastrear
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {allShipments.map((shipment) => (
                <div
                  key={shipment.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={async () => {
                    setTrackingCode(shipment.tracking_code);
                    setShipmentInfo(shipment);
                    await loadTrackingEvents(shipment.id);
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <span className="font-medium text-sm">
                        {shipment.tracking_code}
                      </span>
                      {getStatusBadge(shipment.status)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {shipment.sender_address?.city}, {shipment.sender_address?.state} → {shipment.recipient_address?.city}, {shipment.recipient_address?.state}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      sendTrackingWebhook(shipment);
                    }}
                    className="ml-2"
                  >
                    <Search className="w-4 h-4 mr-1" />
                    Rastreio
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shipment Details */}
      {shipmentInfo && (
        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Package className="w-5 h-5" />
                <span>Detalhes da Remessa</span>
              </CardTitle>
              {getStatusBadge(shipmentInfo.status)}
            </div>
            <CardDescription>
              Código: {shipmentInfo.tracking_code}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Route Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Package className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">Origem</span>
                </div>
                <p className="text-sm font-medium">{shipmentInfo.sender_address?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {shipmentInfo.sender_address?.city}, {shipmentInfo.sender_address?.state}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Truck className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">Destino</span>
                </div>
                <p className="text-sm font-medium">{shipmentInfo.recipient_address?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {shipmentInfo.recipient_address?.city}, {shipmentInfo.recipient_address?.state}
                </p>
              </div>
            </div>

            {/* Consult Button */}
            <div className="flex justify-center">
              <Button
                onClick={() => sendTrackingWebhook(shipmentInfo)}
                className="gap-2"
              >
                <Search className="w-4 h-4" />
                Consultar Transportadora
              </Button>
            </div>

            {/* Tracking Timeline */}
            {trackingEvents.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium text-sm">Histórico de Eventos</h3>
                <div className="space-y-4">
                  {trackingEvents.map((event, index) => (
                    <div 
                      key={event.id}
                      className={`relative pl-6 pb-4 ${
                        index !== trackingEvents.length - 1 ? 'border-l-2 border-border' : ''
                      }`}
                    >
                      <div 
                        className={`absolute left-0 top-0 -translate-x-1/2 w-3 h-3 rounded-full ${
                          event.isActive ? 'bg-primary' : 'bg-muted-foreground/30'
                        }`}
                      />
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${
                            event.isActive ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {event.description}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {event.location}
                        </p>
                        {event.observacoes && (
                          <p className="text-xs text-muted-foreground italic">
                            Obs: {event.observacoes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Carrier Tracking Modal */}
      <CarrierTrackingModal
        isOpen={carrierModalOpen}
        onClose={() => setCarrierModalOpen(false)}
        trackingData={carrierTrackingData}
        loading={carrierLoading}
        error={carrierError}
        trackingCode={selectedTrackingCode}
      />
    </div>
  );
};

export default AdminRastreio;
