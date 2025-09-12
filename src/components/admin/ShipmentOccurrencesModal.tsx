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
            ) : (
              <div className="space-y-6">
                {/* Ocorrências (Fotos e Áudios) - PRIORIDADE */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2 text-primary">
                    <Camera className="h-5 w-5" />
                    Ocorrências Registradas (Fotos e Áudios)
                  </h3>
                  
                  {occurrences.length === 0 ? (
                    <div className="text-center py-8 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/30">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
                        <Camera className="h-8 w-8" />
                        <Mic className="h-8 w-8" />
                      </div>
                      <p className="font-medium mb-1">Nenhuma ocorrência registrada</p>
                      <p className="text-sm text-muted-foreground">
                        O motorista ainda não enviou fotos ou áudios para esta remessa
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {occurrences.map((occurrence, index) => (
                        <div key={occurrence.id} className="relative">
                          {index < occurrences.length - 1 && (
                            <div className="absolute left-6 top-16 w-px h-16 bg-border"></div>
                          )}
                          
                          <div className="flex gap-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                              {occurrence.occurrence_type === 'foto' ? (
                                <Camera className="h-5 w-5 text-primary" />
                              ) : (
                                <Mic className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0 space-y-3">
                              <div className="flex items-center gap-3 flex-wrap">
                                <Badge variant={occurrence.occurrence_type === 'foto' ? 'default' : 'secondary'} className="font-medium">
                                  {occurrence.occurrence_type === 'foto' ? '📷 Foto' : '🎤 Áudio'}
                                </Badge>
                                <span className="text-sm text-muted-foreground font-medium">
                                  {formatDate(occurrence.created_at)}
                                </span>
                              </div>
                              
                              {/* Descrição da ocorrência */}
                              {occurrence.description && (
                                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                                  <p className="text-sm font-medium mb-1 text-primary">Observação do Motorista:</p>
                                  <p className="text-sm">
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
                                    className="w-40 h-40 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity border-2 border-border hover:border-primary shadow-md"
                                    onClick={() => window.open(occurrence.file_url, '_blank')}
                                  />
                                  <p className="text-xs text-muted-foreground">📷 Clique na foto para visualizar em tamanho completo</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                                    <AudioPlayer 
                                      audioUrl={occurrence.file_url}
                                      fileName={`audio_${shipment.tracking_code || shipment.id.slice(0,8)}_${format(new Date(occurrence.created_at), 'ddMMyyyy_HHmm')}.webm`}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Histórico de Status - SECUNDÁRIO */}
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
                              
                              {/* Observações */}
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
          <Button variant="outline" className="flex-1" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};