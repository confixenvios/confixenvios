import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Package, 
  Truck, 
  MapPin, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Info
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
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
}

const ClientRastreio = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [trackingCode, setTrackingCode] = useState("");
  const [shipmentInfo, setShipmentInfo] = useState<ShipmentInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [userShipments, setUserShipments] = useState<ShipmentInfo[]>([]);
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
        event_type: 'shipment_tracking_consulted',
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
        user_id: user?.id || null
      };

      const response = await fetch('https://n8n.grupoconfix.com/webhook-test/47827545-77ca-4e68-8b43-9c50467a3f55', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      });

      const data = await response.json();
      console.log('Resposta do webhook de rastreamento:', data);
      
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
    if (user) {
      loadUserShipments();
    }
  }, [user]);

  const loadUserShipments = async () => {
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
        .eq('user_id', user?.id)
        .not('tracking_code', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);

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
      
      setUserShipments(enrichedData || []);
    } catch (error) {
      console.error('Error loading user shipments:', error);
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
        isActive: index === 0 // Mark the most recent event as active
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
        <h1 className="text-3xl font-bold text-foreground">Rastreamento</h1>
        <p className="text-muted-foreground">
          Acompanhe suas remessas em tempo real
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
            Digite o código de rastreamento para acompanhar sua remessa
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

      {/* Quick Access - User's Shipments */}
      {userShipments.length > 0 && (
        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="w-5 h-5" />
              <span>Suas Remessas Recentes</span>
            </CardTitle>
            <CardDescription>
              Clique em qualquer remessa para rastrear
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {userShipments.map((shipment) => (
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
                    <p className="text-xs text-muted-foreground">
                      {(() => {
                        const senderCity = shipment.sender_address?.city && shipment.sender_address.city !== 'A definir' ? 
                          shipment.sender_address.city : 
                          shipment.quote_data?.senderData?.address?.city || 'Origem';
                        
                        const recipientCity = shipment.recipient_address?.city && shipment.recipient_address.city !== 'A definir' ? 
                          shipment.recipient_address.city : 
                          shipment.quote_data?.recipientData?.address?.city || 'Destino';
                        
                        return `${senderCity} → ${recipientCity}`;
                      })()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await sendTrackingWebhook(shipment);
                      }}
                    >
                      <Search className="w-3 h-3 mr-1" />
                      Consultar Remessa
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {new Date(shipment.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
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

      {/* Tracking Results */}
      {shipmentInfo && (
        <div className="space-y-6">
          {/* Shipment Info */}
          <Card className="border-border/50 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Package className="w-5 h-5" />
                  <span>Informações da Remessa</span>
                </span>
                {getStatusBadge(shipmentInfo.status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium text-muted-foreground">Código de Rastreamento</h4>
                  <p className="font-mono text-lg">{shipmentInfo.tracking_code}</p>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-muted-foreground">Origem</h4>
                  <div>
                    <p className="font-medium">
                      {(() => {
                        // Primeiro tenta o quote_data
                        if (shipmentInfo.quote_data?.senderData?.name) {
                          return shipmentInfo.quote_data.senderData.name;
                        }
                        // Depois tenta o address, mas verifica se não é um valor placeholder
                        if (shipmentInfo.sender_address?.name && 
                            shipmentInfo.sender_address.name !== 'A definir' && 
                            shipmentInfo.sender_address.name.trim() !== '') {
                          return shipmentInfo.sender_address.name;
                        }
                        return 'Nome não informado';
                      })()}
                    </p>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3 mr-1" />
                      {(() => {
                        // Primeiro tenta o quote_data
                        if (shipmentInfo.quote_data?.senderData?.address?.city) {
                          return `${shipmentInfo.quote_data.senderData.address.city} - ${shipmentInfo.quote_data.senderData.address.state}`;
                        }
                        // Depois tenta o address, mas verifica se não é um valor placeholder
                        if (shipmentInfo.sender_address?.city && 
                            shipmentInfo.sender_address.city !== 'A definir' && 
                            shipmentInfo.sender_address.city.trim() !== '') {
                          return `${shipmentInfo.sender_address.city} - ${shipmentInfo.sender_address.state}`;
                        }
                        return 'Cidade não informada';
                      })()}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-muted-foreground">Destino</h4>
                  <div>
                    <p className="font-medium">
                      {(() => {
                        // Primeiro tenta o quote_data
                        if (shipmentInfo.quote_data?.recipientData?.name) {
                          return shipmentInfo.quote_data.recipientData.name;
                        }
                        // Depois tenta o address, mas verifica se não é um valor placeholder
                        if (shipmentInfo.recipient_address?.name && 
                            shipmentInfo.recipient_address.name !== 'A definir' && 
                            shipmentInfo.recipient_address.name.trim() !== '') {
                          return shipmentInfo.recipient_address.name;
                        }
                        return 'Nome não informado';
                      })()}
                    </p>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3 mr-1" />
                      {(() => {
                        // Primeiro tenta o quote_data
                        if (shipmentInfo.quote_data?.recipientData?.address?.city) {
                          return `${shipmentInfo.quote_data.recipientData.address.city} - ${shipmentInfo.quote_data.recipientData.address.state}`;
                        }
                        // Depois tenta o address, mas verifica se não é um valor placeholder
                        if (shipmentInfo.recipient_address?.city && 
                            shipmentInfo.recipient_address.city !== 'A definir' && 
                            shipmentInfo.recipient_address.city.trim() !== '') {
                          return `${shipmentInfo.recipient_address.city} - ${shipmentInfo.recipient_address.state}`;
                        }
                        return 'Cidade não informada';
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tracking Timeline */}
          <Card className="border-border/50 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Histórico de Movimentação</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {trackingEvents.length > 0 ? (
                  trackingEvents.map((event, index) => (
                    <div key={event.id} className="relative flex items-start space-x-3 pb-8">
                      {/* Timeline line */}
                      {index < trackingEvents.length - 1 && (
                        <div className="absolute left-4 top-8 w-0.5 h-full bg-border" />
                      )}
                      
                      {/* Timeline dot */}
                      <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                        event.isActive 
                          ? 'bg-primary border-primary text-primary-foreground' 
                          : 'bg-muted border-border text-muted-foreground'
                      }`}>
                        {event.status === 'DELIVERED' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : event.status === 'IN_TRANSIT' || event.status === 'OUT_FOR_DELIVERY' ? (
                          <Truck className="w-4 h-4" />
                        ) : (
                          <Package className="w-4 h-4" />
                        )}
                      </div>
                      
                      {/* Event details */}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{event.description}</h4>
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {event.location}
                        </p>
                        {event.observacoes && (
                          <p className="text-xs text-muted-foreground mt-1 pl-4 italic">
                            Observações: {event.observacoes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum histórico de movimentação disponível</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ClientRastreio;