import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Camera, 
  PenTool, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Package,
  ArrowLeft,
  Mic,
  Download,
  Volume2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AudioPlayer } from './AudioPlayer';
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
        .not('motorista_id', 'is', null) // Apenas mudanças com motorista
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
      'COLETA_ACEITA': { label: 'Coleta Aceita', variant: 'default' as const },
      'COLETA_FINALIZADA': { label: 'Coleta Finalizada', variant: 'success' as const },
      'EM_TRANSITO': { label: 'Em Trânsito', variant: 'default' as const },
      'TENTATIVA_ENTREGA': { label: 'Tentativa de Entrega', variant: 'destructive' as const },
      'ENTREGA_FINALIZADA': { label: 'Entregue', variant: 'success' as const },
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

  const handleDownloadAudio = (audioUrl: string, trackingCode: string, statusHistory: StatusHistory) => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `audio_${trackingCode}_${statusHistory.status}_${format(new Date(statusHistory.created_at), 'ddMMyyyy_HHmm')}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Data não informada';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Data inválida';
    
    return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full mx-4 max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Ocorrências do Motorista - {shipment.tracking_code || `ID${shipment.id.slice(0, 8).toUpperCase()}`}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-4 px-1">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mx-auto"></div>
                <p className="text-muted-foreground mt-2">Carregando dados...</p>
              </div>
            ) : statusHistory.length === 0 && occurrences.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Nenhum registro encontrado</p>
                <p className="text-sm text-muted-foreground">
                  Este envio ainda não possui status ou ocorrências registradas pelo motorista
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Histórico de Status */}
                {statusHistory.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Histórico de Status
                    </h3>
                    {statusHistory.map((history, index) => (
                      <div key={history.id} className="relative">
                        {index < statusHistory.length - 1 && (
                          <div className="absolute left-6 top-16 w-px h-16 bg-border"></div>
                        )}
                        
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            {getStatusIcon(history.status)}
                          </div>
                          
                          <div className="flex-1 min-w-0 space-y-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              {getStatusBadge(history.status)}
                              <span className="text-sm text-muted-foreground">
                                {formatDate(history.created_at)}
                              </span>
                            </div>
                            
                            {/* Observações */}
                            {history.observacoes && (
                              <div className="bg-muted/50 rounded-lg p-3">
                                <p className="text-sm font-medium mb-1 flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  Observações:
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {history.observacoes}
                                </p>
                              </div>
                            )}

                            {/* Status Description */}
                            {history.status_description && (
                              <div className="bg-muted/50 rounded-lg p-3">
                                <p className="text-sm font-medium mb-1">Descrição:</p>
                                <p className="text-sm text-muted-foreground">
                                  {history.status_description}
                                </p>
                              </div>
                            )}

                            {/* Dados de ocorrência adicionais */}
                            {history.occurrence_data && (
                              <div className="bg-muted/50 rounded-lg p-3">
                                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  Detalhes da Mudança:
                                </p>
                                <div className="text-sm text-muted-foreground space-y-1">
                                  {typeof history.occurrence_data === 'object' ? (
                                    Object.entries(history.occurrence_data).map(([key, value]) => (
                                      <div key={key}>
                                        <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span> {String(value)}
                                      </div>
                                    ))
                                  ) : (
                                    <p>{String(history.occurrence_data)}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ocorrências (Fotos e Áudios) */}
                {occurrences.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Ocorrências Registradas
                    </h3>
                    {occurrences.map((occurrence, index) => (
                      <div key={occurrence.id} className="relative">
                        {index < occurrences.length - 1 && (
                          <div className="absolute left-6 top-16 w-px h-16 bg-border"></div>
                        )}
                        
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            {occurrence.occurrence_type === 'foto' ? (
                              <Camera className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Mic className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0 space-y-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <Badge variant={occurrence.occurrence_type === 'foto' ? 'default' : 'secondary'}>
                                {occurrence.occurrence_type === 'foto' ? 'Foto' : 'Áudio'}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(occurrence.created_at)}
                              </span>
                            </div>
                            
                            {/* Descrição da ocorrência */}
                            {occurrence.description && (
                              <div className="bg-muted/50 rounded-lg p-3">
                                <p className="text-sm font-medium mb-1">Observação:</p>
                                <p className="text-sm text-muted-foreground">
                                  {occurrence.description}
                                </p>
                              </div>
                            )}

                            {/* Conteúdo da ocorrência */}
                            {occurrence.occurrence_type === 'foto' ? (
                              <div className="space-y-2">
                                <img
                                  src={occurrence.file_url}
                                  alt="Foto da ocorrência"
                                  className="w-32 h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity border-2 border-border hover:border-primary"
                                  onClick={() => window.open(occurrence.file_url, '_blank')}
                                />
                                <p className="text-xs text-muted-foreground">Clique na foto para visualizar em tamanho completo</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <AudioPlayer 
                                  audioUrl={occurrence.file_url}
                                  fileName={`audio_${shipment.tracking_code || shipment.id.slice(0,8)}_${format(new Date(occurrence.created_at), 'ddMMyyyy_HHmm')}.webm`}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};