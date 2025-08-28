import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Package, MapPin, Clock, CheckCircle, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TrackingEvent {
  id: string;
  status: string;
  description: string;
  location: string;
  date: string;
  time: string;
  isCompleted: boolean;
}

interface ShipmentData {
  trackingCode: string;
  status: string;
  origin: string;
  destination: string;
  estimatedDelivery: string;
  events: TrackingEvent[];
}

const Tracking = () => {
  const { codigo } = useParams();
  const { toast } = useToast();
  const [trackingCode, setTrackingCode] = useState(codigo || "");
  const [shipmentData, setShipmentData] = useState<ShipmentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for demonstration
  const mockShipmentData: ShipmentData = {
    trackingCode: "TRK-2025ABC123",
    status: "EM_TRANSITO",
    origin: "São Paulo, SP",
    destination: "Rio de Janeiro, RJ", 
    estimatedDelivery: "27/12/2025",
    events: [
      {
        id: "1",
        status: "OBJETO_POSTADO",
        description: "Objeto postado após pagamento confirmado",
        location: "São Paulo, SP",
        date: "23/12/2025",
        time: "14:30",
        isCompleted: true
      },
      {
        id: "2", 
        status: "COLETADO",
        description: "Objeto coletado pela transportadora",
        location: "São Paulo, SP",
        date: "24/12/2025", 
        time: "09:15",
        isCompleted: true
      },
      {
        id: "3",
        status: "EM_TRANSITO",
        description: "Objeto em trânsito para o destino",
        location: "Centro de Distribuição SP",
        date: "25/12/2025",
        time: "16:45",
        isCompleted: true
      },
      {
        id: "4",
        status: "SAIU_PARA_ENTREGA",
        description: "Objeto saiu para entrega",
        location: "Rio de Janeiro, RJ",
        date: "27/12/2025",
        time: "08:00",
        isCompleted: false
      }
    ]
  };

  const handleTrack = async () => {
    if (!trackingCode.trim()) {
      toast({
        title: "Código obrigatório",
        description: "Digite um código de rastreio válido",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (trackingCode.toLowerCase().includes('trk')) {
      setShipmentData(mockShipmentData);
      toast({
        title: "Envio encontrado!",
        description: "Dados do rastreamento atualizados",
      });
    } else {
      toast({
        title: "Envio não encontrado",
        description: "Verifique o código e tente novamente",
        variant: "destructive"
      });
      setShipmentData(null);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    if (codigo) {
      handleTrack();
    }
  }, [codigo]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      OBJETO_POSTADO: { label: "Postado", variant: "secondary" as const },
      COLETADO: { label: "Coletado", variant: "secondary" as const },
      EM_TRANSITO: { label: "Em Trânsito", variant: "outline" as const },
      SAIU_PARA_ENTREGA: { label: "Saiu para Entrega", variant: "outline" as const },
      ENTREGUE: { label: "Entregue", variant: "default" as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return config ? (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    ) : null;
  };

  return (
    <div className="min-h-screen bg-gradient-light">
      <Header />
      
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-primary bg-clip-text text-transparent">Rastreio</span> de Envio
            </h1>
            <p className="text-muted-foreground text-lg">
              Acompanhe seu envio em tempo real
            </p>
          </div>

          {/* Search Form */}
          <Card className="mb-8 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5 text-primary" />
                <span>Consultar Rastreio</span>
              </CardTitle>
              <CardDescription>
                Digite o código de rastreio do seu envio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4">
                <Input
                  placeholder="TRK-2025ABC123"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  className="border-input-border focus:border-primary focus:ring-primary"
                  onKeyPress={(e) => e.key === 'Enter' && handleTrack()}
                />
                <Button 
                  onClick={handleTrack}
                  disabled={isLoading}
                  className="bg-gradient-primary hover:shadow-primary transition-all duration-300"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Shipment Info */}
          {shipmentData && (
            <div className="space-y-6">
              {/* Status Overview */}
              <Card className="shadow-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Package className="h-5 w-5 text-primary" />
                      <span>Envio {shipmentData.trackingCode}</span>
                    </CardTitle>
                    {getStatusBadge(shipmentData.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <div>
                        <div className="text-sm text-muted-foreground">Origem</div>
                        <div className="font-medium">{shipmentData.origin}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <div>
                        <div className="text-sm text-muted-foreground">Destino</div>
                        <div className="font-medium">{shipmentData.destination}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <div>
                        <div className="text-sm text-muted-foreground">Previsão</div>
                        <div className="font-medium">{shipmentData.estimatedDelivery}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tracking Timeline */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Histórico de Rastreamento</CardTitle>
                  <CardDescription>
                    Timeline completa dos eventos do seu envio
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {shipmentData.events.map((event, index) => (
                      <div key={event.id} className="flex items-start space-x-4">
                        <div className="flex flex-col items-center">
                          {event.isCompleted ? (
                            <CheckCircle className="h-6 w-6 text-primary" />
                          ) : (
                            <Circle className="h-6 w-6 text-muted-foreground" />
                          )}
                          {index < shipmentData.events.length - 1 && (
                            <div className="w-px h-12 bg-border mt-2" />
                          )}
                        </div>
                        
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{event.description}</h4>
                            {getStatusBadge(event.status)}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span>{event.location}</span>
                            </span>
                            <span>{event.date} às {event.time}</span>
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
      </div>
    </div>
  );
};

export default Tracking;