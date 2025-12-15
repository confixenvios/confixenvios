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
  observacoes: string | null;
  created_at: string;
  motorista_id: string | null;
  motorista_nome: string | null;
  is_alert: boolean | null;
}

interface B2BVolumeStatusHistoryProps {
  volumeId: string;
}

const B2BVolumeStatusHistory = ({ volumeId }: B2BVolumeStatusHistoryProps) => {
  const [history, setHistory] = useState<StatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [volumeId]);

  const loadHistory = async () => {
    try {
      const { data: historyData, error } = await supabase
        .from('b2b_status_history')
        .select('*')
        .eq('volume_id', volumeId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setHistory(historyData || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string): { label: string; color: string } => {
    const configs: Record<string, { label: string; color: string }> = {
      'PENDENTE': { label: 'Pendente', color: 'bg-yellow-500' },
      'EM_TRANSITO': { label: 'Em Trânsito', color: 'bg-blue-500' },
      'NO_CD': { label: 'Recebido no CD', color: 'bg-purple-500' },
      'EM_ROTA': { label: 'Em Rota', color: 'bg-indigo-500' },
      'ENTREGUE': { label: 'Entregue', color: 'bg-green-500' },
      'OCORRENCIA': { label: 'Ocorrência', color: 'bg-red-500' },
    };
    return configs[status] || { label: status, color: 'bg-gray-500' };
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
                <Badge variant={item.is_alert ? 'destructive' : 'secondary'} className="text-xs">
                  {config.label}
                </Badge>
              </div>
              
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
              
              {item.motorista_nome && (
                <p className="text-xs text-muted-foreground">
                  Motorista: {item.motorista_nome}
                </p>
              )}
              
              {item.observacoes && (
                <p className="text-xs text-muted-foreground mt-1 italic">
                  {item.observacoes}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default B2BVolumeStatusHistory;
