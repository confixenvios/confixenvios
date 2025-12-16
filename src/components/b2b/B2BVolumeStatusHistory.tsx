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

  const getStatusConfig = (status: string): { label: string; dotColor: string; badgeClass: string } => {
    const configs: Record<string, { label: string; dotColor: string; badgeClass: string }> = {
      'AGUARDANDO_ACEITE_COLETA': { label: 'Aguardando Aceite Coleta', dotColor: 'bg-yellow-500', badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      'COLETA_ACEITA': { label: 'Coleta Aceita', dotColor: 'bg-orange-500', badgeClass: 'bg-orange-100 text-orange-800 border-orange-300' },
      'COLETADO': { label: 'Coletado', dotColor: 'bg-sky-500', badgeClass: 'bg-sky-100 text-sky-800 border-sky-300' },
      'EM_TRANSITO': { label: 'Em Trânsito', dotColor: 'bg-blue-500', badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' },
      'EM_TRIAGEM': { label: 'Em Triagem', dotColor: 'bg-purple-500', badgeClass: 'bg-purple-100 text-purple-800 border-purple-300' },
      'AGUARDANDO_ACEITE_EXPEDICAO': { label: 'Aguardando Aceite Expedição', dotColor: 'bg-indigo-500', badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
      'EXPEDIDO': { label: 'Expedido', dotColor: 'bg-cyan-500', badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
      'NO_CD': { label: 'Recebido no CD', dotColor: 'bg-violet-500', badgeClass: 'bg-violet-100 text-violet-800 border-violet-300' },
      'EM_ROTA': { label: 'Em Rota', dotColor: 'bg-blue-500', badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' },
      'ENTREGUE': { label: 'Entregue', dotColor: 'bg-green-500', badgeClass: 'bg-green-600 text-white border-green-600' },
      'CONCLUIDO': { label: 'Concluído', dotColor: 'bg-green-500', badgeClass: 'bg-green-600 text-white border-green-600' },
      'OCORRENCIA': { label: 'Ocorrência', dotColor: 'bg-red-500', badgeClass: 'bg-red-100 text-red-800 border-red-300' },
      'DEVOLUCAO': { label: 'Devolução', dotColor: 'bg-red-500', badgeClass: 'bg-red-100 text-red-800 border-red-300' },
    };
    return configs[status] || { label: status, dotColor: 'bg-gray-500', badgeClass: 'bg-gray-100 text-gray-800 border-gray-300' };
  };

  // Parseia observações JSON para extrair mensagem e foto
  const parseObservacoes = (observacoes: string | null): { text: string | null; fotoUrl: string | null } => {
    if (!observacoes) return { text: null, fotoUrl: null };
    
    try {
      const parsed = JSON.parse(observacoes);
      if (parsed.mensagem || parsed.foto_url) {
        return {
          text: parsed.mensagem || null,
          fotoUrl: parsed.foto_url || null
        };
      }
    } catch {
      // Não é JSON, retorna como texto normal
    }
    return { text: observacoes, fotoUrl: null };
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
        const parsedObs = parseObservacoes(item.observacoes);

        return (
          <div key={item.id} className="relative pl-6">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-[9px] top-6 bottom-0 w-0.5 bg-border" />
            )}
            
            {/* Timeline dot */}
            <div className={`absolute left-0 top-1.5 w-[18px] h-[18px] rounded-full ${config.dotColor} border-2 border-background`} />
            
            <div className="pb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-xs ${config.badgeClass}`}>
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
              
              {parsedObs.text && (
                <p className="text-xs text-muted-foreground mt-1 italic">
                  {parsedObs.text}
                </p>
              )}
              
              {parsedObs.fotoUrl && (
                <a 
                  href={parsedObs.fotoUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                >
                  <Image className="h-3 w-3" />
                  Ver foto da entrega
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default B2BVolumeStatusHistory;
