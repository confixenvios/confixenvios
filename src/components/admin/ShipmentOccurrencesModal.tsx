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
  ArrowLeft 
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
  photos_urls: string[] | null;
  signature_url: string | null;
  occurrence_data: any;
  motorista_id: string | null;
}

export const ShipmentOccurrencesModal = ({ 
  isOpen, 
  onClose, 
  shipment 
}: ShipmentOccurrencesModalProps) => {
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && shipment?.id) {
      loadStatusHistory();
    }
  }, [isOpen, shipment?.id]);

  const loadStatusHistory = async () => {
    if (!shipment?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shipment_status_history')
        .select('*')
        .eq('shipment_id', shipment.id)
        .not('motorista_id', 'is', null) // Apenas ocorrências com motorista
        .order('created_at', { ascending: false });

      if (error) throw error;

      setStatusHistory(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
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
                <p className="text-muted-foreground mt-2">Carregando ocorrências...</p>
              </div>
            ) : statusHistory.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Nenhuma ocorrência encontrada</p>
                <p className="text-sm text-muted-foreground">
                  Este envio ainda não possui ocorrências registradas pelo motorista
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {statusHistory.map((history, index) => (
                  <div key={history.id} className="relative">
                    {index < statusHistory.length - 1 && (
                      <div className="absolute left-6 top-16 w-px h-20 bg-border"></div>
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
                        
                        {history.observacoes && (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-sm font-medium mb-1">Observações:</p>
                            <p className="text-sm text-muted-foreground">
                              {history.observacoes}
                            </p>
                          </div>
                        )}

                        {/* Fotos */}
                        {history.photos_urls && history.photos_urls.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium flex items-center gap-2">
                              <Camera className="h-4 w-4" />
                              Fotos ({history.photos_urls.length})
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              {history.photos_urls.map((url, idx) => (
                                <img
                                  key={idx}
                                  src={url}
                                  alt={`Foto ${idx + 1}`}
                                  className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => window.open(url, '_blank')}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Assinatura */}
                        {history.signature_url && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium flex items-center gap-2">
                              <PenTool className="h-4 w-4" />
                              Assinatura
                            </p>
                            <div className="bg-white border rounded-lg p-2 w-fit">
                              <img
                                src={history.signature_url}
                                alt="Assinatura"
                                className="max-w-48 h-20 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(history.signature_url!, '_blank')}
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