import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Camera, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Package,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface ShipmentOccurrencesModalProps {
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

const OCCURRENCE_LABELS: Record<string, string> = {
  'entrega_realizada': 'Entrega realizada',
  'destinatario_ausente': 'Destinatário ausente',
  'local_fechado': 'Local fechado',
  'endereco_nao_encontrado': 'Endereço não encontrado',
  'endereco_incompleto': 'Endereço incompleto',
  'recusa_destinatario': 'Recusa do destinatário',
  'produto_avariado': 'Produto avariado',
  'produto_divergente': 'Produto divergente',
  'tentativa_frustrada': 'Tentativa frustrada — motivo não informado',
  'entrega_finalizada': 'Foto de comprovação de entrega',
  'foto': 'Foto registrada',
  'audio': 'Áudio registrado'
};

export const ShipmentOccurrencesModal = ({ 
  isOpen, 
  onClose, 
  shipment 
}: ShipmentOccurrencesModalProps) => {
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
        .not('motorista_id', 'is', null)
        .order('created_at', { ascending: false });

      if (statusError) throw statusError;

      // Carregar ocorrências
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

  // Encontrar a foto de entrega finalizada para exibir botão
  const getDeliveryPhotoUrl = (): string | null => {
    const deliveryPhoto = occurrences.find(o => o.occurrence_type === 'entrega_finalizada');
    return deliveryPhoto?.file_url || null;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
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

  const getOccurrenceIcon = (type: string) => {
    if (type === 'entrega_finalizada') {
      return <Camera className="h-5 w-5 text-green-600" />;
    }
    return <AlertCircle className="h-5 w-5 text-orange-500" />;
  };

  const getOccurrenceLabel = (occurrence: ShipmentOccurrence) => {
    // Primeiro tenta usar a descrição salva
    if (occurrence.description && occurrence.description !== 'Foto registrada pelo motorista' && occurrence.description !== 'Áudio registrado pelo motorista') {
      return occurrence.description;
    }
    // Depois tenta mapear pelo tipo
    return OCCURRENCE_LABELS[occurrence.occurrence_type] || occurrence.occurrence_type;
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Data não informada';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Data inválida';
    
    return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  // Separar ocorrências por tipo
  const deliveryPhotos = occurrences.filter(o => o.occurrence_type === 'entrega_finalizada');
  const statusOccurrences = occurrences.filter(o => 
    o.occurrence_type !== 'entrega_finalizada' && 
    o.occurrence_type !== 'foto' && 
    o.occurrence_type !== 'audio'
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full mx-4 max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Ocorrências - {shipment.tracking_code || `ID${shipment.id.slice(0, 8).toUpperCase()}`}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-4 px-1">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mx-auto"></div>
                <p className="text-muted-foreground mt-2">Carregando dados...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Fotos de Comprovação de Entrega */}
                {deliveryPhotos.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-green-600">
                      <Camera className="h-5 w-5" />
                      Fotos de Comprovação de Entrega
                    </h3>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {deliveryPhotos.map((photo, index) => (
                        <div key={photo.id} className="space-y-2">
                          <img
                            src={photo.file_url}
                            alt={`Foto ${index + 1}`}
                            className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity border-2 border-green-200 hover:border-green-500 shadow-md"
                            onClick={() => window.open(photo.file_url, '_blank')}
                          />
                          <p className="text-xs text-muted-foreground text-center">
                            {formatDate(photo.created_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ocorrências Registradas */}
                {statusOccurrences.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-orange-600">
                      <AlertCircle className="h-5 w-5" />
                      Ocorrências Registradas
                    </h3>
                    
                    <div className="space-y-3">
                      {statusOccurrences.map((occurrence) => (
                        <div key={occurrence.id} className="flex gap-4 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                            {getOccurrenceIcon(occurrence.occurrence_type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap mb-2">
                              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                                {getOccurrenceLabel(occurrence)}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(occurrence.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Histórico de Status */}
                {statusHistory.length > 0 && (
                  <div className="space-y-4 pt-6 border-t border-border">
                    <h3 className="font-semibold text-base flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Histórico de Status
                    </h3>
                    <div className="space-y-3">
                      {statusHistory.map((history, index) => (
                        <div key={history.id} className="relative">
                          {index < statusHistory.length - 1 && (
                            <div className="absolute left-5 top-12 w-px h-12 bg-border"></div>
                          )}
                          
                          <div className="flex gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                              {getStatusIcon(history.status)}
                            </div>
                            
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                {getStatusBadge(history.status)}
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(history.created_at)}
                                </span>
                              </div>
                              
                              {history.observacoes && (
                                <div className="bg-muted/50 rounded p-2">
                                  <p className="text-xs font-medium mb-1">Observações:</p>
                                  <p className="text-xs text-muted-foreground">
                                    {history.observacoes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Caso não tenha nenhum dado */}
                {statusHistory.length === 0 && occurrences.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">Nenhum registro encontrado</p>
                    <p className="text-sm text-muted-foreground">
                      Este envio ainda não possui ocorrências ou histórico registrado pelo motorista
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          {getDeliveryPhotoUrl() && (
            <Button
              variant="default"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => window.open(getDeliveryPhotoUrl()!, '_blank')}
            >
              <Camera className="h-4 w-4 mr-2" />
              Ver Foto de Entrega
            </Button>
          )}
          <Button variant="outline" className="flex-1" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
