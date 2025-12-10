import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Image, Loader2 } from 'lucide-react';

interface StatusHistoryItem {
  id: string;
  status: string;
  status_description: string | null;
  observacoes: string | null;
  created_at: string;
  motorista_id: string | null;
  occurrence_data: any;
  motorista_nome?: string;
}

interface B2BStatusHistoryProps {
  shipmentId: string;
}

const B2BStatusHistory = ({ shipmentId }: B2BStatusHistoryProps) => {
  const [history, setHistory] = useState<StatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [shipmentId]);

  const loadHistory = async () => {
    try {
      // Buscar histórico de status
      const { data: historyData, error } = await supabase
        .from('shipment_status_history')
        .select('*')
        .eq('b2b_shipment_id', shipmentId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Buscar nomes dos motoristas
      if (historyData && historyData.length > 0) {
        const motoristaIds = [...new Set(historyData.filter(h => h.motorista_id).map(h => h.motorista_id))];
        
        if (motoristaIds.length > 0) {
          const { data: motoristas } = await supabase
            .from('motoristas')
            .select('id, nome')
            .in('id', motoristaIds);

          const motoristaMap = new Map(motoristas?.map(m => [m.id, m.nome]) || []);
          
          const enrichedHistory = historyData.map(h => ({
            ...h,
            motorista_nome: h.motorista_id ? motoristaMap.get(h.motorista_id) || 'Motorista' : undefined
          }));
          
          setHistory(enrichedHistory);
        } else {
          setHistory(historyData);
        }
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string): { label: string; phase: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string } => {
    const configs: Record<string, { label: string; phase: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
      'ACEITA': { label: 'Aceita', phase: 'B2B-1 (Coleta)', variant: 'secondary', color: 'bg-orange-500' },
      'COLETA_ACEITA': { label: 'Aceita', phase: 'B2B-1 (Coleta)', variant: 'secondary', color: 'bg-orange-500' },
      'B2B_COLETA_FINALIZADA': { label: 'Coleta Finalizada', phase: 'B2B-1 (Coleta)', variant: 'destructive', color: 'bg-red-500' },
      'B2B_ENTREGA_ACEITA': { label: 'Entrega Aceita', phase: 'B2B-2 (Entrega)', variant: 'secondary', color: 'bg-orange-500' },
      'ENTREGUE': { label: 'Entregue', phase: 'B2B-2 (Entrega)', variant: 'default', color: 'bg-green-500' },
      'ENTREGA_FINALIZADA': { label: 'Entregue', phase: 'B2B-2 (Entrega)', variant: 'default', color: 'bg-green-500' },
    };
    return configs[status] || { label: status, phase: '', variant: 'outline', color: 'bg-gray-500' };
  };

  const getPhotoUrl = (item: StatusHistoryItem): string | null => {
    if (item.occurrence_data) {
      const occData = typeof item.occurrence_data === 'string' 
        ? JSON.parse(item.occurrence_data) 
        : item.occurrence_data;
      return occData?.photo_url || occData?.file_url || null;
    }
    return null;
  };

  const getPhotoCount = (item: StatusHistoryItem): number => {
    if (item.occurrence_data) {
      const occData = typeof item.occurrence_data === 'string' 
        ? JSON.parse(item.occurrence_data) 
        : item.occurrence_data;
      return occData?.photo_count || (occData?.photo_url ? 1 : 0);
    }
    return 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">Nenhum histórico de status disponível.</p>
    );
  }

  return (
    <div className="space-y-0">
      {history.map((item, index) => {
        const config = getStatusConfig(item.status);
        const photoUrl = getPhotoUrl(item);
        const photoCount = getPhotoCount(item);
        const isLast = index === history.length - 1;

        return (
          <div key={item.id} className="relative pl-6">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-[9px] top-6 bottom-0 w-0.5 bg-border" />
            )}
            
            {/* Timeline dot */}
            <div className={`absolute left-0 top-1.5 w-[18px] h-[18px] rounded-full ${config.color} border-2 border-background`} />
            
            <div className="pb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={config.variant} className="text-xs">
                  {config.label}
                </Badge>
                {config.phase && (
                  <span className="text-xs text-muted-foreground">{config.phase}</span>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
              
              {item.motorista_nome && (
                <p className="text-xs text-muted-foreground">
                  Motorista: {item.motorista_nome}
                </p>
              )}
              
              {item.status_description && (
                <p className="text-xs text-muted-foreground mt-1 italic">
                  {item.status_description}
                </p>
              )}
              
              {item.observacoes && (
                <p className="text-xs text-muted-foreground mt-1 italic">
                  {item.observacoes}
                </p>
              )}

              {photoUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 text-xs"
                  onClick={() => window.open(photoUrl, '_blank')}
                >
                  <Image className="h-3 w-3 mr-1" />
                  Ver Foto{photoCount > 1 ? `s (${photoCount})` : ''}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default B2BStatusHistory;
