import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Plus, Calendar, MapPin, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

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
  const { user } = useAuth();
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadShipments();
    }
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
            name,
            street,
            number,
            neighborhood,
            city,
            state,
            cep,
            complement,
            reference
          ),
          recipient_address:addresses!recipient_address_id (
            name,
            street,
            number,
            neighborhood,
            city,
            state,
            cep,
            complement,
            reference
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'PENDING_LABEL': { variant: 'secondary', label: 'Pendente' },
      'PAYMENT_CONFIRMED': { variant: 'default', label: 'Pagamento Confirmado' },
      'PAGO_AGUARDANDO_ETIQUETA': { variant: 'default', label: 'Aguardando Etiqueta' },
      'LABEL_AVAILABLE': { variant: 'success', label: 'Etiqueta Disponível' },
      'IN_TRANSIT': { variant: 'default', label: 'Em Trânsito' },
      'DELIVERED': { variant: 'success', label: 'Entregue' },
      'PAID': { variant: 'success', label: 'PAGO' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const handleViewDetails = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setDetailsModalOpen(true);
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

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex flex-col space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-80" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Minhas Remessas</h1>
        <p className="text-muted-foreground">
          Gerencie todas as suas remessas em um só lugar
        </p>
      </div>

      <Card className="border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="w-5 h-5" />
            <span>Suas Remessas</span>
          </CardTitle>
          <CardDescription>
            {shipments.length > 0 
              ? `${shipments.length} remessa${shipments.length > 1 ? 's' : ''} encontrada${shipments.length > 1 ? 's' : ''}`
              : "Nenhuma remessa encontrada"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shipments.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-muted-foreground mb-6" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma remessa encontrada</h3>
              <p className="text-muted-foreground mb-6">
                Você ainda não criou nenhuma remessa. Comece fazendo uma cotação.
              </p>
              <Button asChild>
                <Link to="/cliente/cotacoes">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Cotação
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {shipments.map((shipment) => (
                <Card key={shipment.id} className="border-border/30">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-lg">
                            {shipment.tracking_code || `ID${shipment.id.slice(0, 8).toUpperCase()}`}
                          </h3>
                          {getStatusBadge(shipment.status)}
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(shipment.created_at)}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(shipment)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="font-medium text-muted-foreground">Remetente</p>
                        <p className="font-medium">{shipment.sender_address?.name}</p>
                        <div className="flex items-center text-muted-foreground">
                          <MapPin className="w-3 h-3 mr-1" />
                          {shipment.sender_address?.city} - {shipment.sender_address?.state}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="font-medium text-muted-foreground">Destinatário</p>
                        <p className="font-medium">{shipment.recipient_address?.name}</p>
                        <div className="flex items-center text-muted-foreground">
                          <MapPin className="w-3 h-3 mr-1" />
                          {shipment.recipient_address?.city} - {shipment.recipient_address?.state}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="font-medium text-muted-foreground">Valor do Frete</p>
                        {shipment.payment_data?.amount ? (
                          <p className="font-medium">
                            {formatCurrency(shipment.payment_data.amount)}
                          </p>
                        ) : (
                          <p className="font-medium">N/A</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Detalhes da Remessa - {selectedShipment?.tracking_code || `ID${selectedShipment?.id.slice(0, 8).toUpperCase()}`}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            {selectedShipment && (
              <div className="space-y-6">
                {/* Informações Gerais */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Informações Gerais</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Código de Rastreamento</p>
                      <p className="font-medium">{selectedShipment.tracking_code || `ID${selectedShipment.id.slice(0, 8).toUpperCase()}`}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <div className="mt-1">{getStatusBadge(selectedShipment.status)}</div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Data de Criação</p>
                      <p className="font-medium">{formatDate(selectedShipment.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tipo de Serviço</p>
                      <p className="font-medium">{selectedShipment.selected_option === 'standard' ? 'Econômico' : 'Expresso'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Opção de Coleta</p>
                      <p className="font-medium">{selectedShipment.pickup_option === 'dropoff' ? 'Entrega no Hub' : 'Coleta no Local'}</p>
                    </div>
                    {selectedShipment.cte_key && (
                      <div>
                        <p className="text-muted-foreground">Chave CTE</p>
                        <p className="font-medium font-mono text-xs">{selectedShipment.cte_key}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Dados do Remetente */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Dados do Remetente</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Nome</p>
                      <p className="font-medium">{selectedShipment.sender_address?.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">CEP</p>
                      <p className="font-medium">{selectedShipment.sender_address?.cep}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Endereço</p>
                      <p className="font-medium">
                        {selectedShipment.sender_address?.street}, {selectedShipment.sender_address?.number}
                        {selectedShipment.sender_address?.complement && `, ${selectedShipment.sender_address.complement}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Bairro</p>
                      <p className="font-medium">{selectedShipment.sender_address?.neighborhood}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cidade/Estado</p>
                      <p className="font-medium">{selectedShipment.sender_address?.city} - {selectedShipment.sender_address?.state}</p>
                    </div>
                    {selectedShipment.sender_address?.reference && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Referência</p>
                        <p className="font-medium">{selectedShipment.sender_address.reference}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Dados do Destinatário */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Dados do Destinatário</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Nome</p>
                      <p className="font-medium">{selectedShipment.recipient_address?.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">CEP</p>
                      <p className="font-medium">{selectedShipment.recipient_address?.cep}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Endereço</p>
                      <p className="font-medium">
                        {selectedShipment.recipient_address?.street}, {selectedShipment.recipient_address?.number}
                        {selectedShipment.recipient_address?.complement && `, ${selectedShipment.recipient_address.complement}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Bairro</p>
                      <p className="font-medium">{selectedShipment.recipient_address?.neighborhood}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cidade/Estado</p>
                      <p className="font-medium">{selectedShipment.recipient_address?.city} - {selectedShipment.recipient_address?.state}</p>
                    </div>
                    {selectedShipment.recipient_address?.reference && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Referência</p>
                        <p className="font-medium">{selectedShipment.recipient_address.reference}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Dados do Pacote */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Dados do Pacote</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Peso</p>
                      <p className="font-medium">{selectedShipment.weight}kg</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Comprimento</p>
                      <p className="font-medium">{selectedShipment.length}cm</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Largura</p>
                      <p className="font-medium">{selectedShipment.width}cm</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Altura</p>
                      <p className="font-medium">{selectedShipment.height}cm</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Formato</p>
                      <p className="font-medium capitalize">{selectedShipment.format}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Dados de Pagamento */}
                {selectedShipment.payment_data && (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Dados de Pagamento</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Método de Pagamento</p>
                          <p className="font-medium">{selectedShipment.payment_data.method?.toUpperCase()}</p>
                        </div>
                        {selectedShipment.payment_data.amount && (
                          <div>
                            <p className="text-muted-foreground">Valor Pago</p>
                            <p className="font-medium">{formatCurrency(selectedShipment.payment_data.amount)}</p>
                          </div>
                        )}
                        {selectedShipment.payment_data.paidAt && (
                          <div>
                            <p className="text-muted-foreground">Data do Pagamento</p>
                            <p className="font-medium">{formatDate(selectedShipment.payment_data.paidAt)}</p>
                          </div>
                        )}
                        {selectedShipment.payment_data.status && (
                          <div>
                            <p className="text-muted-foreground">Status do Pagamento</p>
                            <p className="font-medium">{selectedShipment.payment_data.status === 'paid' ? 'PAGO' : selectedShipment.payment_data.status}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Dados da Cotação */}
                {selectedShipment.quote_data && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Dados da Cotação</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedShipment.quote_data.shippingQuote && (
                        <>
                          <div>
                            <p className="text-muted-foreground">Zona de Entrega</p>
                            <p className="font-medium">{selectedShipment.quote_data.shippingQuote.zoneName} ({selectedShipment.quote_data.shippingQuote.zone})</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Prazo Econômico</p>
                            <p className="font-medium">{selectedShipment.quote_data.shippingQuote.economicDays} dias</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Prazo Expresso</p>
                            <p className="font-medium">{selectedShipment.quote_data.shippingQuote.expressDays} dias</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Preço Original</p>
                            <p className="font-medium">R$ {selectedShipment.quote_data.shippingQuote.economicPrice.toFixed(2).replace('.', ',')}</p>
                          </div>
                        </>
                      )}
                      {selectedShipment.quote_data.totalMerchandiseValue && (
                        <div>
                          <p className="text-muted-foreground">Valor da Mercadoria</p>
                          <p className="font-medium">R$ {selectedShipment.quote_data.totalMerchandiseValue.toFixed(2).replace('.', ',')}</p>
                        </div>
                      )}
                    </div>
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