import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Plus, Calendar, MapPin, Eye, Search, Filter, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
      'PENDING_LABEL': { variant: 'success', label: 'Pago' }, // Remessas criadas são consideradas pagas
      'PENDING_DOCUMENT': { variant: 'destructive', label: 'Aguardando Documento' },
      'PENDING_PAYMENT': { variant: 'destructive', label: 'Aguardando Pagamento' },
      'PAYMENT_CONFIRMED': { variant: 'success', label: 'Pago' },
      'PAGO_AGUARDANDO_ETIQUETA': { variant: 'success', label: 'Pago' },
      'LABEL_AVAILABLE': { variant: 'success', label: 'Etiqueta Disponível' },
      'IN_TRANSIT': { variant: 'default', label: 'Em Trânsito' },
      'DELIVERED': { variant: 'success', label: 'Entregue' },
      'PAID': { variant: 'success', label: 'Pago' },
      'COLETA_ACEITA': { variant: 'default', label: 'Coleta Aceita' },
      'COLETA_FINALIZADA': { variant: 'default', label: 'Coleta Finalizada' },
      'ENTREGA_FINALIZADA': { variant: 'success', label: 'Entrega Finalizada' }
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter and sort shipments
  const filteredShipments = shipments
    .filter(shipment => {
      const matchesSearch = !searchTerm || 
        shipment.tracking_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.sender_address?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.recipient_address?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.recipient_address?.city?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95">
      <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Package className="w-8 h-8 text-primary" />
            </div>
            Minhas Remessas
          </h1>
          <p className="text-muted-foreground mt-2 text-base lg:text-lg">
            Gerencie todas as suas remessas em um só lugar
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8 border-border/50 shadow-lg bg-gradient-to-br from-card to-card/80">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Filter className="w-5 h-5 text-primary" />
              Filtros e Busca
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="text-sm font-medium text-foreground mb-2 block">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por código, remetente, destinatário..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="PENDING_PAYMENT">Aguardando Pagamento</SelectItem>
                    <SelectItem value="PAID">Pago</SelectItem>
                    <SelectItem value="IN_TRANSIT">Em Trânsito</SelectItem>
                    <SelectItem value="DELIVERED">Entregue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Ordenar</label>
                <Button
                  variant="outline"
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  className="w-full h-11 justify-start"
                >
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  {sortOrder === 'desc' ? 'Mais recente' : 'Mais antigo'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="border-border/50 shadow-lg bg-gradient-to-br from-card to-card/80">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="w-5 h-5" />
              <span>Suas Remessas</span>
            </CardTitle>
            <CardDescription>
              {filteredShipments.length > 0 
                ? `${filteredShipments.length} remessa${filteredShipments.length > 1 ? 's' : ''} encontrada${filteredShipments.length > 1 ? 's' : ''}`
                : shipments.length === 0 
                  ? "Nenhuma remessa encontrada"
                  : "Nenhuma remessa corresponde aos filtros selecionados"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredShipments.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 bg-muted/30 rounded-full flex items-center justify-center">
                  <Package className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {shipments.length === 0 ? 'Nenhuma remessa encontrada' : 'Nenhum resultado para os filtros'}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {shipments.length === 0 
                    ? 'Você ainda não criou nenhuma remessa. Comece fazendo uma cotação.'
                    : 'Tente ajustar os filtros de busca para encontrar suas remessas.'
                  }
                </p>
                <div className="flex gap-3 justify-center">
                  {shipments.length > 0 && (
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                      }}
                    >
                      Limpar Filtros
                    </Button>
                  )}
                  <Button asChild>
                    <Link to="/cliente/cotacoes">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Cotação
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredShipments.map((shipment) => (
                  <Card key={shipment.id} className="border-border/30 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-lg">
                              {shipment.tracking_code || `ID${shipment.id.slice(0, 8).toUpperCase()}`}
                            </h3>
                            {getStatusBadge(shipment.status)}
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4 mr-2" />
                            <span className="font-medium">Criado em:</span>
                            <span className="ml-1">{formatDateTime(shipment.created_at)}</span>
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
                            <p className="font-medium">
                              {shipment.quote_data?.addressData?.sender?.name || 
                               shipment.sender_address?.name || 
                               shipment.quote_data?.senderData?.name || 
                               'N/A'
                              }
                            </p>
                            <div className="flex items-center text-muted-foreground">
                              <MapPin className="w-3 h-3 mr-1" />
                              {shipment.sender_address?.city && shipment.sender_address?.city !== 'A definir' ? 
                                `${shipment.sender_address.city} - ${shipment.sender_address.state}` : 
                                shipment.quote_data?.senderData?.city ? 
                                  `${shipment.quote_data.senderData.city} - ${shipment.quote_data.senderData.state}` :
                                  'Goiânia - GO'
                              }
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="font-medium text-muted-foreground">Destinatário</p>
                            <p className="font-medium">
                              {shipment.quote_data?.addressData?.recipient?.name || 
                               shipment.recipient_address?.name || 
                               shipment.quote_data?.recipientData?.name || 
                               'N/A'
                              }
                            </p>
                            <div className="flex items-center text-muted-foreground">
                              <MapPin className="w-3 h-3 mr-1" />
                              {shipment.recipient_address?.city && shipment.recipient_address?.city !== 'A definir' ? 
                                `${shipment.recipient_address.city} - ${shipment.recipient_address.state}` : 
                                shipment.quote_data?.recipientData?.city ? 
                                  `${shipment.quote_data.recipientData.city} - ${shipment.quote_data.recipientData.state}` :
                                  shipment.quote_data?.shippingQuote?.zoneName || 'N/A'
                              }
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="font-medium text-muted-foreground">Valor do Frete</p>
                            {(() => {
                               // Tentar obter o valor do frete de várias fontes
                               let amount = null;
                               
                               // 1. Tentar payment_data.pixData.amount (PIX - já vem em centavos)
                               if (shipment.payment_data?.pixData?.amount) {
                                 amount = shipment.payment_data.pixData.amount; // já está em centavos
                               }
                               // 2. Tentar payment_data.amount (PIX novo formato - vem em reais, precisa converter)
                               else if (shipment.payment_data?.amount && shipment.payment_data?.method === 'pix') {
                                 amount = shipment.payment_data.amount * 100; // converter de reais para centavos
                               }
                               // 3. Tentar payment_data.amount (Stripe/Cartão - já em centavos)
                               else if (shipment.payment_data?.amount) {
                                 amount = shipment.payment_data.amount;
                               }
                               // 4. Tentar quote_data.amount (valor já pago)
                               else if (shipment.quote_data?.amount) {
                                 amount = shipment.quote_data.amount * 100; // converter de reais para centavos
                               }
                               // 5. Tentar quote_data.shippingQuote.economicPrice ou expressPrice
                               else if (shipment.quote_data?.shippingQuote) {
                                 const price = shipment.selected_option === 'express' 
                                   ? shipment.quote_data.shippingQuote.expressPrice 
                                   : shipment.quote_data.shippingQuote.economicPrice;
                                 amount = price * 100; // converter de reais para centavos
                               }
                               // 6. Tentar quote_data.totalPrice
                               else if (shipment.quote_data?.totalPrice) {
                                 amount = shipment.quote_data.totalPrice * 100; // converter de reais para centavos
                               }
                               // 7. Tentar deliveryDetails.totalPrice
                               else if (shipment.quote_data?.deliveryDetails?.totalPrice) {
                                 amount = shipment.quote_data.deliveryDetails.totalPrice * 100;
                               }

                               return amount ? (
                                 <p className="font-medium text-success">
                                   {formatCurrency(amount)}
                                 </p>
                               ) : (
                                 <p className="font-medium text-muted-foreground">Valor não disponível</p>
                               );
                            })()}
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
                      <p className="text-muted-foreground">Data e Hora de Criação</p>
                      <p className="font-medium">{formatDateTime(selectedShipment.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tipo de Serviço</p>
                      <p className="font-medium">{selectedShipment.selected_option === 'standard' ? 'Econômico' : 'Expresso'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">CEP de Origem</p>
                      <p className="font-medium">
                        {selectedShipment.quote_data?.originCep || 
                         selectedShipment.quote_data?.originalFormData?.originCep || 
                         selectedShipment.quote_data?.quoteData?.originCep ||
                         '74900-000'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">CEP de Destino</p>
                      <p className="font-medium">
                        {selectedShipment.quote_data?.destinyCep || 
                         selectedShipment.quote_data?.originalFormData?.destinyCep || 
                         selectedShipment.quote_data?.quoteData?.destinyCep ||
                         'N/A'}
                      </p>
                    </div>
                     <div>
                       <p className="text-muted-foreground">Opção de Coleta</p>
                       <p className="font-medium">
                         {(() => {
                           const pickupOption = selectedShipment.quote_data?.deliveryDetails?.pickupOption || selectedShipment.pickup_option;
                           return pickupOption === 'pickup' ? 'Coleta no Local' : 'Entrega no Hub';
                         })()}
                       </p>
                     </div>
                    {selectedShipment.pickup_option === 'pickup' && (
                      <div>
                        <p className="text-muted-foreground">Taxa de Coleta</p>
                        <p className="font-medium">R$ 10,00</p>
                      </div>
                    )}
                    {selectedShipment.cte_key && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Chave CTE</p>
                        <p className="font-medium font-mono text-xs break-all">{selectedShipment.cte_key}</p>
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
                       <p className="font-medium">
                         {selectedShipment.quote_data?.addressData?.sender?.name || 
                          selectedShipment.sender_address?.name || 
                          selectedShipment.quote_data?.senderData?.name || 
                          'Nome não informado'
                         }
                       </p>
                     </div>
                    <div>
                      <p className="text-muted-foreground">CEP</p>
                      <p className="font-medium">
                        {selectedShipment.sender_address?.cep && selectedShipment.sender_address?.cep !== '00000000' ? 
                          selectedShipment.sender_address.cep : 
                          selectedShipment.quote_data?.senderData?.address?.cep || 'N/A'
                        }
                      </p>
                    </div>
                    {selectedShipment.quote_data?.senderData?.document && (
                      <div>
                        <p className="text-muted-foreground">Documento</p>
                        <p className="font-medium">{selectedShipment.quote_data.senderData.document}</p>
                      </div>
                    )}
                    {selectedShipment.quote_data?.senderData?.phone && (
                      <div>
                        <p className="text-muted-foreground">Telefone</p>
                        <p className="font-medium">{selectedShipment.quote_data.senderData.phone}</p>
                      </div>
                    )}
                    {selectedShipment.quote_data?.senderData?.email && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">E-mail</p>
                        <p className="font-medium">{selectedShipment.quote_data.senderData.email}</p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Endereço</p>
                      <p className="font-medium">
                        {selectedShipment.sender_address?.street && selectedShipment.sender_address?.street !== 'Endereço a ser definido' ? 
                          `${selectedShipment.sender_address.street}, ${selectedShipment.sender_address.number}${selectedShipment.sender_address?.complement ? `, ${selectedShipment.sender_address.complement}` : ''}` :
                          selectedShipment.quote_data?.senderData?.address ? 
                            `${selectedShipment.quote_data.senderData.address.street}, ${selectedShipment.quote_data.senderData.address.number}${selectedShipment.quote_data.senderData.address?.complement ? `, ${selectedShipment.quote_data.senderData.address.complement}` : ''}` :
                            'Endereço não informado'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Bairro</p>
                      <p className="font-medium">
                        {selectedShipment.sender_address?.neighborhood && selectedShipment.sender_address?.neighborhood !== 'Centro' ? 
                          selectedShipment.sender_address.neighborhood : 
                          selectedShipment.quote_data?.senderData?.address?.neighborhood || 'N/A'
                        }
                      </p>
                    </div>
                     <div>
                       <p className="text-muted-foreground">Cidade/Estado</p>
                       <p className="font-medium">
                         {selectedShipment.sender_address?.city && selectedShipment.sender_address?.city !== 'A definir' ? 
                           `${selectedShipment.sender_address.city} - ${selectedShipment.sender_address.state}` : 
                           selectedShipment.quote_data?.senderData?.address?.city ? 
                             `${selectedShipment.quote_data.senderData.address.city} - ${selectedShipment.quote_data.senderData.address.state}` :
                             'Goiânia - GO'
                         }
                       </p>
                     </div>
                    {(selectedShipment.sender_address?.reference || selectedShipment.quote_data?.senderData?.address?.reference) && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Referência</p>
                        <p className="font-medium">
                          {selectedShipment.sender_address?.reference || selectedShipment.quote_data?.senderData?.address?.reference}
                        </p>
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
                       <p className="font-medium">
                         {selectedShipment.quote_data?.addressData?.recipient?.name || 
                          selectedShipment.recipient_address?.name || 
                          selectedShipment.quote_data?.recipientData?.name || 
                          'Nome não informado'
                         }
                       </p>
                     </div>
                    <div>
                      <p className="text-muted-foreground">CEP</p>
                      <p className="font-medium">
                        {selectedShipment.recipient_address?.cep && selectedShipment.recipient_address?.cep !== '00000000' ? 
                          selectedShipment.recipient_address.cep : 
                          selectedShipment.quote_data?.recipientData?.address?.cep || 'N/A'
                        }
                      </p>
                    </div>
                    {selectedShipment.quote_data?.recipientData?.document && (
                      <div>
                        <p className="text-muted-foreground">Documento</p>
                        <p className="font-medium">{selectedShipment.quote_data.recipientData.document}</p>
                      </div>
                    )}
                    {selectedShipment.quote_data?.recipientData?.phone && (
                      <div>
                        <p className="text-muted-foreground">Telefone</p>
                        <p className="font-medium">{selectedShipment.quote_data.recipientData.phone}</p>
                      </div>
                    )}
                    {selectedShipment.quote_data?.recipientData?.email && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">E-mail</p>
                        <p className="font-medium">{selectedShipment.quote_data.recipientData.email}</p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Endereço</p>
                      <p className="font-medium">
                        {selectedShipment.recipient_address?.street && selectedShipment.recipient_address?.street !== 'Endereço a ser definido' ? 
                          `${selectedShipment.recipient_address.street}, ${selectedShipment.recipient_address.number}${selectedShipment.recipient_address?.complement ? `, ${selectedShipment.recipient_address.complement}` : ''}` :
                          selectedShipment.quote_data?.recipientData?.address ? 
                            `${selectedShipment.quote_data.recipientData.address.street}, ${selectedShipment.quote_data.recipientData.address.number}${selectedShipment.quote_data.recipientData.address?.complement ? `, ${selectedShipment.quote_data.recipientData.address.complement}` : ''}` :
                            'Endereço não informado'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Bairro</p>
                      <p className="font-medium">
                        {selectedShipment.recipient_address?.neighborhood && selectedShipment.recipient_address?.neighborhood !== 'Centro' ? 
                          selectedShipment.recipient_address.neighborhood : 
                          selectedShipment.quote_data?.recipientData?.address?.neighborhood || 'N/A'
                        }
                      </p>
                    </div>
                     <div>
                       <p className="text-muted-foreground">Cidade/Estado</p>
                       <p className="font-medium">
                         {selectedShipment.recipient_address?.city && selectedShipment.recipient_address?.city !== 'A definir' ? 
                           `${selectedShipment.recipient_address.city} - ${selectedShipment.recipient_address.state}` : 
                           selectedShipment.quote_data?.recipientData?.address?.city ? 
                             `${selectedShipment.quote_data.recipientData.address.city} - ${selectedShipment.quote_data.recipientData.address.state}` :
                             selectedShipment.quote_data?.shippingQuote?.zoneName || 'N/A'
                         }
                       </p>
                     </div>
                    {(selectedShipment.recipient_address?.reference || selectedShipment.quote_data?.recipientData?.address?.reference) && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Referência</p>
                        <p className="font-medium">
                          {selectedShipment.recipient_address?.reference || selectedShipment.quote_data?.recipientData?.address?.reference}
                        </p>
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
                      <p className="text-muted-foreground">Quantidade</p>
                      <p className="font-medium">
                        {selectedShipment.quote_data?.quantity || 
                         selectedShipment.quote_data?.originalFormData?.quantity || 
                         selectedShipment.quote_data?.merchandiseDetails?.quantity || '1'} volumes
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Formato</p>
                      <p className="font-medium capitalize">{selectedShipment.format}</p>
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
                    {/* Valor Unitário */}
                    {(selectedShipment.quote_data?.unitValue || 
                      selectedShipment.quote_data?.originalFormData?.unitValue ||
                      selectedShipment.quote_data?.merchandiseDetails?.unitValue) && (
                      <div>
                        <p className="text-muted-foreground">Valor Unitário</p>
                        <p className="font-medium">
                          R$ {parseFloat(
                            selectedShipment.quote_data?.unitValue || 
                            selectedShipment.quote_data?.originalFormData?.unitValue ||
                            selectedShipment.quote_data?.merchandiseDetails?.unitValue || '0'
                          ).toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                    )}
                    {/* Valor Total da Mercadoria */}
                    {(selectedShipment.quote_data?.totalMerchandiseValue || 
                      selectedShipment.quote_data?.originalFormData?.totalMerchandiseValue ||
                      selectedShipment.quote_data?.merchandiseDetails?.totalValue) && (
                      <div>
                        <p className="text-muted-foreground">Valor Total</p>
                        <p className="font-medium">
                          R$ {parseFloat(
                            selectedShipment.quote_data?.totalMerchandiseValue || 
                            selectedShipment.quote_data?.originalFormData?.totalMerchandiseValue ||
                            selectedShipment.quote_data?.merchandiseDetails?.totalValue || '0'
                          ).toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                    )}
                    {/* Peso Cúbico se disponível */}
                    {selectedShipment.quote_data?.technicalData?.cubicWeight && (
                      <div>
                        <p className="text-muted-foreground">Peso Cúbico</p>
                        <p className="font-medium">{selectedShipment.quote_data.technicalData.cubicWeight.toFixed(3)}kg</p>
                      </div>
                    )}
                  </div>

                  {/* Volumes Individuais */}
                  {(() => {
                    const volumes = selectedShipment.quote_data?.volumes || selectedShipment.quote_data?.quoteData?.volumes;
                    if (Array.isArray(volumes) && volumes.length > 0) {
                      return (
                        <div className="mt-6">
                          <h4 className="text-base font-semibold mb-3 text-primary">Volumes Individuais</h4>
                          <div className="space-y-3">
                            {volumes.map((volume: any, index: number) => (
                              <div key={index} className="p-4 border border-border/50 rounded-lg bg-muted/30">
                                <div className="flex items-center mb-2">
                                  <Package className="w-4 h-4 mr-2 text-primary" />
                                  <span className="font-medium">Volume {index + 1}</span>
                                </div>
                                <div className="grid grid-cols-4 gap-3 text-sm">
                                  <div>
                                    <p className="text-muted-foreground text-xs">Peso</p>
                                    <p className="font-medium">{volume.weight}kg</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground text-xs">Comprimento</p>
                                    <p className="font-medium">{volume.length}cm</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground text-xs">Largura</p>
                                    <p className="font-medium">{volume.width}cm</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground text-xs">Altura</p>
                                    <p className="font-medium">{volume.height}cm</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                <Separator />

                {/* Dados do Documento */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Dados do Documento</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Tipo de Documento</p>
                      <p className="font-medium">
                        {selectedShipment.quote_data?.documentType === 'nota_fiscal' ? 'Nota Fiscal' : 
                         selectedShipment.quote_data?.documentType === 'declaration' ? 'Declaração de Conteúdo' :
                         'Declaração de Conteúdo'}
                      </p>
                    </div>
                    {(selectedShipment.quote_data?.nfeKey || selectedShipment.quote_data?.nfeChave) && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Chave da Nota Fiscal</p>
                        <p className="font-medium font-mono text-xs break-all">
                          {selectedShipment.quote_data.nfeKey || selectedShipment.quote_data.nfeChave}
                        </p>
                      </div>
                    )}
                    {(selectedShipment.quote_data?.merchandiseDescription || selectedShipment.quote_data?.descricaoMercadoria) && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Descrição da Mercadoria</p>
                        <p className="font-medium">
                          {selectedShipment.quote_data.merchandiseDescription || selectedShipment.quote_data.descricaoMercadoria}
                        </p>
                      </div>
                    )}
                    {selectedShipment.quote_data?.merchandiseValue && (
                      <div>
                        <p className="text-muted-foreground">Valor da Mercadoria</p>
                        <p className="font-medium">R$ {selectedShipment.quote_data.merchandiseValue.toFixed(2).replace('.', ',')}</p>
                      </div>
                    )}
                    {selectedShipment.quote_data?.totalMerchandiseValue && !selectedShipment.quote_data?.merchandiseValue && (
                      <div>
                        <p className="text-muted-foreground">Valor Total da Mercadoria</p>
                        <p className="font-medium">R$ {selectedShipment.quote_data.totalMerchandiseValue.toFixed(2).replace('.', ',')}</p>
                      </div>
                    )}
                    {selectedShipment.quote_data?.quantity && (
                      <div>
                        <p className="text-muted-foreground">Quantidade de Volumes</p>
                        <p className="font-medium">{selectedShipment.quote_data.quantity}</p>
                      </div>
                    )}
                    {/* Mostrar informações adicionais se não houver dados específicos */}
                    {!selectedShipment.quote_data?.merchandiseDescription && 
                     !selectedShipment.quote_data?.descricaoMercadoria && 
                     !selectedShipment.quote_data?.nfeKey && 
                     !selectedShipment.quote_data?.nfeChave && (
                      <div className="col-span-2 text-center py-4 text-muted-foreground">
                        <p>Informações do documento não disponíveis</p>
                        <p className="text-xs mt-1">Dados podem não ter sido preenchidos durante a cotação</p>
                      </div>
                    )}
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
                          {(() => {
                            // Prioridade: Obter valor da cotação aprovada (mais confiável)
                            let amount = null;
                            
                            // 1. PRIORIDADE: Valor da cotação aprovada (shippingQuote)
                            if (selectedShipment.quote_data?.shippingQuote) {
                              const price = selectedShipment.selected_option === 'express' 
                                ? (selectedShipment.quote_data.shippingQuote.expressPrice || selectedShipment.quote_data.quoteData?.shippingQuote?.expressPrice)
                                : (selectedShipment.quote_data.shippingQuote.economicPrice || selectedShipment.quote_data.quoteData?.shippingQuote?.economicPrice);
                              if (price) {
                                amount = price * 100; // converter de reais para centavos
                              }
                            }
                            // 2. Fallback: payment_data.pixData.amount (PIX - já vem em centavos)
                            if (!amount && selectedShipment.payment_data?.pixData?.amount) {
                              amount = selectedShipment.payment_data.pixData.amount;
                            }
                            // 3. Fallback: payment_data.amount (PIX novo formato - vem em reais)
                            else if (!amount && selectedShipment.payment_data?.amount && selectedShipment.payment_data?.method === 'pix') {
                              amount = selectedShipment.payment_data.amount * 100;
                            }
                            // 4. Fallback: payment_data.amount (Stripe/Cartão - já em centavos)
                            else if (!amount && selectedShipment.payment_data?.amount) {
                              amount = selectedShipment.payment_data.amount;
                            }
                            // 5. Fallback: quote_data.totalPrice
                            else if (!amount && selectedShipment.quote_data?.totalPrice) {
                              amount = selectedShipment.quote_data.totalPrice * 100;
                            }
                            // 6. Fallback: deliveryDetails.totalPrice
                            else if (!amount && selectedShipment.quote_data?.deliveryDetails?.totalPrice) {
                              amount = selectedShipment.quote_data.deliveryDetails.totalPrice * 100;
                            }

                            return amount ? (
                              <div>
                                <p className="text-muted-foreground">Valor do Frete</p>
                                <p className="font-medium">{formatCurrency(amount)}</p>
                              </div>
                            ) : null;
                          })()}
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

                {/* Dados da Cotação Completos */}
                {selectedShipment.quote_data && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Dados da Cotação</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {/* CEPs */}
                        {selectedShipment.quote_data.originalFormData && (
                          <>
                            <div>
                              <p className="text-muted-foreground">CEP de Origem</p>
                              <p className="font-medium">{selectedShipment.quote_data.originalFormData.originCep}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">CEP de Destino</p>
                              <p className="font-medium">{selectedShipment.quote_data.originalFormData.destinyCep}</p>
                            </div>
                          </>
                        )}
                        
                        {/* Zona e Prazos */}
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
                          </>
                        )}
                        
                        {/* Dados da Encomenda */}
                        {selectedShipment.quote_data.originalFormData && (
                          <>
                            <div>
                              <p className="text-muted-foreground">Peso Informado</p>
                              <p className="font-medium">{selectedShipment.quote_data.originalFormData.weight}kg</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Quantidade</p>
                              <p className="font-medium">{selectedShipment.quote_data.originalFormData.quantity} volumes</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Dimensões (CxLxA)</p>
                              <p className="font-medium">
                                {selectedShipment.quote_data.originalFormData.length} x{' '}
                                {selectedShipment.quote_data.originalFormData.width} x{' '}
                                {selectedShipment.quote_data.originalFormData.height} cm
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Formato</p>
                              <p className="font-medium capitalize">{selectedShipment.quote_data.originalFormData.format}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Valor Unitário</p>
                              <p className="font-medium">
                                R$ {parseFloat(selectedShipment.quote_data.originalFormData.unitValue).toFixed(2).replace('.', ',')}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Valor Total da Mercadoria</p>
                              <p className="font-medium">
                                R$ {selectedShipment.quote_data.originalFormData.totalMerchandiseValue.toFixed(2).replace('.', ',')}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ClientRemessas;