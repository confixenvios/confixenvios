import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Package, ArrowRight, Printer, Download, AlertCircle, Tag } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import B2BLabelGenerator from "@/components/b2b/B2BLabelGenerator";

interface B2BVolume {
  id: string;
  eti_code: string;
  volume_number: number;
  weight: number;
  recipient_name: string;
  recipient_phone: string;
  recipient_document: string | null;
  recipient_cep: string;
  recipient_street: string;
  recipient_number: string;
  recipient_complement: string | null;
  recipient_neighborhood: string;
  recipient_city: string;
  recipient_state: string;
}

interface B2BShipment {
  id: string;
  tracking_code: string;
  delivery_date: string | null;
  total_volumes: number;
  total_weight: number;
  total_price: number;
  status: string;
  pickup_address?: {
    id: string;
    name: string;
    contact_name: string;
    contact_phone: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
  } | null;
}

interface B2BClient {
  id: string;
  company_name: string;
  cnpj: string | null;
  phone: string | null;
}

const B2BPixPaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [shipment, setShipment] = useState<B2BShipment | null>(null);
  const [volumes, setVolumes] = useState<B2BVolume[]>([]);
  const [client, setClient] = useState<B2BClient | null>(null);
  const [selectedVolumeIndex, setSelectedVolumeIndex] = useState(0);

  const { shipmentId, trackingCode, paymentId } = location.state || {};

  useEffect(() => {
    if (!shipmentId && !trackingCode) {
      // Tentar buscar o shipment mais recente do cliente
      loadLatestShipment();
    } else {
      loadShipmentData();
    }
  }, [shipmentId, trackingCode]);

  const loadLatestShipment = async () => {
    try {
      setIsLoading(true);
      
      const clientData = localStorage.getItem('b2b_client');
      if (!clientData) {
        navigate('/b2b-expresso/dashboard');
        return;
      }
      
      const parsedClient = JSON.parse(clientData);
      setClient(parsedClient);

      // Buscar último shipment do cliente
      const { data: latestShipment, error } = await supabase
        .from('b2b_shipments')
        .select(`
          *,
          pickup_address:b2b_pickup_addresses(*)
        `)
        .eq('b2b_client_id', parsedClient.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !latestShipment) {
        console.error('Erro ao buscar shipment:', error);
        navigate('/b2b-expresso/dashboard');
        return;
      }

      setShipment({
        ...latestShipment,
        pickup_address: latestShipment.pickup_address
      });

      // Buscar volumes
      const { data: volumesData } = await supabase
        .from('b2b_volumes')
        .select('*')
        .eq('b2b_shipment_id', latestShipment.id)
        .order('volume_number', { ascending: true });

      setVolumes(volumesData || []);
    } catch (error) {
      console.error('Erro:', error);
      navigate('/b2b-expresso/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const loadShipmentData = async () => {
    try {
      setIsLoading(true);
      
      const clientData = localStorage.getItem('b2b_client');
      if (clientData) {
        setClient(JSON.parse(clientData));
      }

      let query = supabase
        .from('b2b_shipments')
        .select(`
          *,
          pickup_address:b2b_pickup_addresses(*)
        `);

      if (shipmentId) {
        query = query.eq('id', shipmentId);
      } else if (trackingCode) {
        query = query.eq('tracking_code', trackingCode);
      }

      const { data: shipmentData, error } = await query.single();

      if (error || !shipmentData) {
        console.error('Erro ao buscar shipment:', error);
        navigate('/b2b-expresso/dashboard');
        return;
      }

      setShipment({
        ...shipmentData,
        pickup_address: shipmentData.pickup_address
      });

      // Buscar volumes
      const { data: volumesData } = await supabase
        .from('b2b_volumes')
        .select('*')
        .eq('b2b_shipment_id', shipmentData.id)
        .order('volume_number', { ascending: true });

      setVolumes(volumesData || []);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    navigate('/b2b-expresso/dashboard');
  };

  const handleNewShipment = () => {
    navigate('/b2b-expresso/nova-remessa');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background/80 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando informações do pedido...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background/80 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Pedido não encontrado</h2>
            <p className="text-muted-foreground mb-4">Não foi possível localizar as informações do pedido.</p>
            <Button onClick={handleGoToDashboard}>
              Ir para o Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Pedido Confirmado!
          </h1>
          <p className="text-muted-foreground">
            Seu pagamento foi processado com sucesso
          </p>
        </div>

        {/* Order Details */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Detalhes do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Código de Rastreio</p>
                <p className="font-mono font-bold text-primary">{shipment.tracking_code}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Total de Volumes</p>
                <p className="font-semibold">{shipment.total_volumes}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Peso Total</p>
                <p className="font-semibold">{shipment.total_weight?.toFixed(2)} kg</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Valor Pago</p>
                <p className="font-semibold text-green-600">R$ {shipment.total_price?.toFixed(2)}</p>
              </div>
            </div>

            {shipment.pickup_address && (
              <div className="p-3 bg-muted/30 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">Endereço de Coleta</p>
                <p className="text-sm font-medium">{shipment.pickup_address.name}</p>
                <p className="text-sm text-muted-foreground">
                  {shipment.pickup_address.street}, {shipment.pickup_address.number} - {shipment.pickup_address.neighborhood}
                </p>
                <p className="text-sm text-muted-foreground">
                  {shipment.pickup_address.city}/{shipment.pickup_address.state} - {shipment.pickup_address.cep}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Important Notice - Label Instructions */}
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Tag className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-orange-800 mb-2">
                  Importante: Cole as etiquetas nos volumes
                </h3>
                <p className="text-sm text-orange-700">
                  Para garantir a identificação e o rastreamento correto de cada volume, 
                  <strong> é obrigatório imprimir e colar as etiquetas correspondentes</strong> em cada pacote antes da coleta.
                  Cada etiqueta contém um código único (ETI) que permite o acompanhamento individual do volume.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Labels Section */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Etiquetas dos Volumes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {volumes.length > 0 ? (
              <div className="space-y-4">
                {/* Volume Selector */}
                {volumes.length > 1 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {volumes.map((vol, idx) => (
                      <Button
                        key={vol.id}
                        variant={selectedVolumeIndex === idx ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedVolumeIndex(idx)}
                      >
                        Volume {vol.volume_number} - {vol.eti_code}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Volume List */}
                <ScrollArea className="h-[400px] -mr-4 pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {volumes.map((volume) => (
                      <div key={volume.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="secondary">
                            Volume {volume.volume_number}
                          </Badge>
                          <span className="font-mono font-bold text-primary">{volume.eti_code}</span>
                        </div>
                        <div className="text-sm text-muted-foreground mb-3">
                          <p><strong>Destinatário:</strong> {volume.recipient_name}</p>
                          <p>{volume.recipient_city}/{volume.recipient_state}</p>
                        </div>
                        <B2BLabelGenerator
                          volume={volume}
                          shipment={shipment}
                          companyName={client?.company_name}
                          companyDocument={client?.cnpj}
                          companyPhone={client?.phone}
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum volume encontrado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={handleGoToDashboard} 
            variant="outline"
            className="flex-1"
          >
            Ver Meus Pedidos
          </Button>
          <Button 
            onClick={handleNewShipment}
            className="flex-1"
          >
            Nova Remessa
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default B2BPixPaymentSuccess;
