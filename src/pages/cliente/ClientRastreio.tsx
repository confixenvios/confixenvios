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

interface TrackingEvent {
  id: string;
  status: string;
  description: string;
  location: string;
  timestamp: string;
  isActive?: boolean;
}

interface ShipmentInfo {
  id: string;
  tracking_code: string;
  status: string;
  created_at: string;
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
        .single();

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
      'PAYMENT_CONFIRMED': { variant: 'default', label: 'Pagamento Confirmado', icon: CheckCircle },
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

  const generateTrackingEvents = (shipment: ShipmentInfo): TrackingEvent[] => {
    const events: TrackingEvent[] = [
      {
        id: '1',
        status: 'CREATED',
        description: 'Remessa criada no sistema',
        location: `${shipment.sender_address.city} - ${shipment.sender_address.state}`,
        timestamp: shipment.created_at,
      }
    ];

    // Add events based on current status
    if (['PAYMENT_CONFIRMED', 'PAID', 'PAGO_AGUARDANDO_ETIQUETA', 'LABEL_AVAILABLE', 'IN_TRANSIT', 'DELIVERED'].includes(shipment.status)) {
      events.push({
        id: '2',
        status: 'PAYMENT_CONFIRMED',
        description: 'Pagamento confirmado',
        location: 'Sistema Confix Envios',
        timestamp: shipment.created_at,
      });
    }

    if (['PAID', 'PAGO_AGUARDANDO_ETIQUETA', 'LABEL_AVAILABLE', 'IN_TRANSIT', 'DELIVERED'].includes(shipment.status)) {
      events.push({
        id: '3',
        status: 'PROCESSING',
        description: 'Remessa em processamento',
        location: 'Centro de Distribuição',
        timestamp: shipment.created_at,
      });
    }

    if (['LABEL_AVAILABLE', 'IN_TRANSIT', 'DELIVERED'].includes(shipment.status)) {
      events.push({
        id: '4',
        status: 'LABEL_AVAILABLE',
        description: 'Etiqueta disponível - Pronta para coleta',
        location: `${shipment.sender_address.city} - ${shipment.sender_address.state}`,
        timestamp: shipment.created_at,
      });
    }

    if (['IN_TRANSIT', 'DELIVERED'].includes(shipment.status)) {
      events.push({
        id: '5',
        status: 'IN_TRANSIT',
        description: 'Objeto em trânsito',
        location: 'Em rota de entrega',
        timestamp: shipment.created_at,
      });
    }

    if (shipment.status === 'DELIVERED') {
      events.push({
        id: '6',
        status: 'DELIVERED',
        description: 'Objeto entregue ao destinatário',
        location: `${shipment.recipient_address.city} - ${shipment.recipient_address.state}`,
        timestamp: shipment.created_at,
      });
    }

    // Mark the last event as active
    if (events.length > 0) {
      events[events.length - 1].isActive = true;
    }

    return events.reverse(); // Show most recent first
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
                  onClick={() => {
                    setTrackingCode(shipment.tracking_code);
                    setShipmentInfo(shipment);
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
                  <div className="text-right text-xs text-muted-foreground">
                    {new Date(shipment.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                    <p className="font-medium">{shipmentInfo.sender_address.name}</p>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3 mr-1" />
                      {shipmentInfo.sender_address.city} - {shipmentInfo.sender_address.state}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-muted-foreground">Destino</h4>
                  <div>
                    <p className="font-medium">{shipmentInfo.recipient_address.name}</p>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3 mr-1" />
                      {shipmentInfo.recipient_address.city} - {shipmentInfo.recipient_address.state}
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
              <div className="space-y-4">
                {generateTrackingEvents(shipmentInfo).map((event, index) => (
                  <div key={event.id} className="flex items-start space-x-4">
                    <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-2 ${
                      event.isActive ? 'bg-primary' : 'bg-muted-foreground'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium ${
                          event.isActive ? 'text-primary' : 'text-foreground'
                        }`}>
                          {event.description}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <MapPin className="w-3 h-3 mr-1" />
                        {event.location}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ClientRastreio;