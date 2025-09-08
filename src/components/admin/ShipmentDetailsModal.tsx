import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Package, 
  MapPin, 
  Phone, 
  User, 
  Calendar, 
  Camera,
  PenTool,
  FileText,
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface ShipmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: any;
}

interface StatusHistory {
  id: string;
  status: string;
  created_at: string;
  observacoes: string | null;
  occurrence_data: any;
  motorista_id: string | null;
  status_description: string | null;
}

interface ShipmentOccurrence {
  id: string;
  occurrence_type: string;
  file_url: string;
  description: string | null;
  created_at: string;
  motorista_id: string | null;
}

export const ShipmentDetailsModal = ({ 
  isOpen, 
  onClose, 
  shipment 
}: ShipmentDetailsModalProps) => {
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [occurrences, setOccurrences] = useState<ShipmentOccurrence[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && shipment?.id) {
      loadData();
    }
  }, [isOpen, shipment?.id]);

  const loadData = async () => {
    if (!shipment?.id) return;
    
    try {
      setLoading(true);
      
      // Carregar histórico de status
      const { data: statusData, error: statusError } = await supabase
        .from('shipment_status_history')
        .select('*')
        .eq('shipment_id', shipment.id)
        .order('created_at', { ascending: false });

      if (statusError) throw statusError;

      // Carregar ocorrências (fotos e áudios)
      const { data: occurrenceData, error: occurrenceError } = await supabase
        .from('shipment_occurrences')
        .select('*')
        .eq('shipment_id', shipment.id)
        .order('created_at', { ascending: false });

      if (occurrenceError) throw occurrenceError;

      setStatusHistory(statusData || []);
      setOccurrences(occurrenceData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!shipment) return null;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'PENDING_LABEL': { label: 'Aguardando Etiqueta', variant: 'secondary' as const },
      'LABEL_GENERATED': { label: 'Etiqueta Gerada', variant: 'default' as const },
      'PAYMENT_CONFIRMED': { label: 'Pagamento Confirmado', variant: 'default' as const },
      'PAID': { label: 'Pago', variant: 'success' as const },
      'COLETA_ACEITA': { label: 'Coleta Aceita', variant: 'default' as const },
      'COLETA_FINALIZADA': { label: 'Coleta Realizada', variant: 'success' as const },
      'EM_TRANSITO': { label: 'Em Trânsito', variant: 'default' as const },
      'TENTATIVA_ENTREGA': { label: 'Insucesso na Entrega', variant: 'destructive' as const },
      'ENTREGA_FINALIZADA': { label: 'Entregue ao Destinatário com Sucesso', variant: 'success' as const },
      'AGUARDANDO_DESTINATARIO': { label: 'Aguardando Destinatário', variant: 'secondary' as const },
      'ENDERECO_INCORRETO': { label: 'Endereço Incorreto', variant: 'destructive' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                   { label: status, variant: 'outline' as const };
    
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ENTREGA_FINALIZADA':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'TENTATIVA_ENTREGA':
      case 'ENDERECO_INCORRETO':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'COLETA_FINALIZADA':
      case 'COLETA_ACEITA':
        return <Package className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Data não informada';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Data inválida';
    
    return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount / 100);
  };

  const getFreightValue = () => {
    if (shipment.payment_data?.pix_details?.amount) {
      return shipment.payment_data.pix_details.amount;
    }
    if (shipment.payment_data?.pixData?.amount) {
      return shipment.payment_data.pixData.amount;
    }
    if (shipment.payment_data?.amount) {
      return shipment.payment_data.amount;
    }
    if (shipment.quote_data?.deliveryDetails?.totalPrice) {
      return shipment.quote_data.deliveryDetails.totalPrice * 100;
    }
    if (shipment.quote_data?.deliveryDetails?.shippingPrice) {
      return shipment.quote_data.deliveryDetails.shippingPrice * 100;
    }
    if (shipment.quote_data?.amount) {
      return shipment.quote_data.amount * 100;
    }
    return 0;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full mx-4 max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" />
            Detalhes da Remessa - {shipment.tracking_code || `ID${shipment.id.slice(0, 8).toUpperCase()}`}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-1">
            {/* Informações da Remessa */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Status Atual</CardTitle>
                    {getStatusBadge(shipment.status)}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-2" />
                    Criado em: {formatDate(shipment.created_at)}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-2" />
                    Atualizado: {formatDate(shipment.updated_at)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Informações da Mercadoria</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Peso</p>
                      <p className="font-medium">{shipment.weight}kg</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Formato</p>
                      <p className="font-medium capitalize">{shipment.format}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Serviço</p>
                      <p className="font-medium">
                        {shipment.selected_option === 'express' ? 'Expresso' : 'Econômico'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Valor do Frete</p>
                      <p className="font-medium text-success">
                        {formatCurrency(getFreightValue())}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Remetente */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Remetente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <p className="font-medium">{shipment.sender_address?.name}</p>
                    {shipment.sender_address?.phone && (
                      <div className="flex items-center text-muted-foreground mt-1">
                        <Phone className="w-3 h-3 mr-1" />
                        <a href={`tel:${shipment.sender_address.phone}`} className="hover:underline">
                          {shipment.sender_address.phone}
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3 h-3 mt-1 text-muted-foreground flex-shrink-0" />
                    <div className="text-muted-foreground text-xs">
                      <p>{shipment.sender_address?.street}, {shipment.sender_address?.number}</p>
                      <p>{shipment.sender_address?.neighborhood}</p>
                      <p>{shipment.sender_address?.city} - {shipment.sender_address?.state}</p>
                      <p>CEP: {shipment.sender_address?.cep}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Destinatário */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Destinatário
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <p className="font-medium">{shipment.recipient_address?.name}</p>
                    {shipment.recipient_address?.phone && (
                      <div className="flex items-center text-muted-foreground mt-1">
                        <Phone className="w-3 h-3 mr-1" />
                        <a href={`tel:${shipment.recipient_address.phone}`} className="hover:underline">
                          {shipment.recipient_address.phone}
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3 h-3 mt-1 text-muted-foreground flex-shrink-0" />
                    <div className="text-muted-foreground text-xs">
                      <p>{shipment.recipient_address?.street}, {shipment.recipient_address?.number}</p>
                      <p>{shipment.recipient_address?.neighborhood}</p>
                      <p>{shipment.recipient_address?.city} - {shipment.recipient_address?.state}</p>
                      <p>CEP: {shipment.recipient_address?.cep}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Histórico de Status */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Histórico de Ocorrências
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mx-auto"></div>
                    </div>
                  ) : statusHistory.length === 0 && occurrences.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nenhuma ocorrência registrada</p>
                  ) : (
                    <div className="space-y-4">
                      {/* Histórico de Status */}
                      {statusHistory.map((history, index) => (
                        <div key={history.id} className="relative">
                          {index < statusHistory.length - 1 && (
                            <div className="absolute left-6 top-8 w-px h-16 bg-border"></div>
                          )}
                          
                          <div className="flex gap-3">
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                              {getStatusIcon(history.status)}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {getStatusBadge(history.status)}
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(history.created_at)}
                                </span>
                              </div>
                              
                              {history.observacoes && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {history.observacoes}
                                </p>
                              )}

                              {history.status_description && (
                                <p className="text-sm text-muted-foreground mb-2 italic">
                                  {history.status_description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Ocorrências (Fotos e Áudios) */}
                      {occurrences.map((occurrence, index) => (
                        <div key={occurrence.id} className="relative">
                          {index < occurrences.length - 1 && (
                            <div className="absolute left-6 top-8 w-px h-16 bg-border"></div>
                          )}
                          
                          <div className="flex gap-3">
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                              {occurrence.occurrence_type === 'foto' ? (
                                <Camera className="h-4 w-4 text-blue-600" />
                              ) : (
                                <FileText className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={occurrence.occurrence_type === 'foto' ? 'default' : 'secondary'}>
                                  {occurrence.occurrence_type === 'foto' ? 'Foto' : 'Áudio'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(occurrence.created_at)}
                                </span>
                              </div>
                              
                              {occurrence.description && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {occurrence.description}
                                </p>
                              )}

                              {/* Exibir conteúdo da ocorrência */}
                              {occurrence.occurrence_type === 'foto' ? (
                                <img
                                  src={occurrence.file_url}
                                  alt="Foto da ocorrência"
                                  className="w-24 h-24 object-cover rounded cursor-pointer hover:opacity-80"
                                  onClick={() => window.open(occurrence.file_url, '_blank')}
                                />
                              ) : (
                                <div className="p-2 bg-muted rounded text-sm">
                                  <p className="text-muted-foreground">Clique para reproduzir áudio</p>
                                  <audio controls className="w-full mt-1">
                                    <source src={occurrence.file_url} type="audio/webm" />
                                    Seu navegador não suporta o elemento de áudio.
                                  </audio>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};