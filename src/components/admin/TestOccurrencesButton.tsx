import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { createSecureSupabaseClient } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TestTube, Eye, Trash2 } from 'lucide-react';

interface TestOccurrencesButtonProps {
  shipmentId: string;
  shipmentTrackingCode: string;
}

export const TestOccurrencesButton = ({ shipmentId, shipmentTrackingCode }: TestOccurrencesButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadOccurrences = async () => {
    setLoading(true);
    try {
      const supabase = createSecureSupabaseClient();
      
      console.log('🔍 [ADMIN TEST] Buscando ocorrências para shipment:', shipmentId);
      
      const { data, error } = await supabase
        .from('shipment_occurrences')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('created_at', { ascending: false });

      console.log('📊 [ADMIN TEST] Resultado da busca:', { data, error });

      if (error) {
        console.error('❌ [ADMIN TEST] Erro ao buscar:', error);
        toast({
          title: "Erro",
          description: `Erro ao buscar ocorrências: ${error.message}`,
          variant: "destructive"
        });
      } else {
        console.log('✅ [ADMIN TEST] Ocorrências encontradas:', data?.length || 0);
        setOccurrences(data || []);
        
        if ((data?.length || 0) === 0) {
          toast({
            title: "Nenhuma ocorrência",
            description: "Não foram encontradas ocorrências para esta remessa.",
          });
        } else {
          toast({
            title: "Sucesso",
            description: `${data?.length} ocorrência(s) encontrada(s)!`,
          });
        }
      }
    } catch (error: any) {
      console.error('💥 [ADMIN TEST] Erro crítico:', error);
      toast({
        title: "Erro crítico",
        description: error.message || 'Erro desconhecido',
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const deleteOccurrence = async (occurrenceId: string) => {
    try {
      const supabase = createSecureSupabaseClient();
      
      console.log('🗑️ [ADMIN TEST] Deletando ocorrência:', occurrenceId);
      
      const { error } = await supabase
        .from('shipment_occurrences')
        .delete()
        .eq('id', occurrenceId);

      if (error) {
        console.error('❌ [ADMIN TEST] Erro ao deletar:', error);
        toast({
          title: "Erro",
          description: `Erro ao deletar: ${error.message}`,
          variant: "destructive"
        });
      } else {
        console.log('✅ [ADMIN TEST] Ocorrência deletada');
        toast({
          title: "Sucesso",
          description: "Ocorrência deletada com sucesso!",
        });
        loadOccurrences(); // Recarregar lista
      }
    } catch (error: any) {
      console.error('💥 [ADMIN TEST] Erro ao deletar:', error);
      toast({
        title: "Erro crítico",
        description: error.message || 'Erro desconhecido',
        variant: "destructive"
      });
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    loadOccurrences();
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="border-blue-500 text-blue-600 hover:bg-blue-50"
      >
        <TestTube className="h-4 w-4 mr-1" />
        Ver Ocorrências
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-[90vw] max-w-[600px] mx-auto max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              🔍 Ocorrências - {shipmentTrackingCode}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 p-4">
            <div className="flex justify-between items-center">
              <Badge variant="secondary">
                Shipment ID: {shipmentId}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={loadOccurrences}
                disabled={loading}
              >
                {loading ? 'Carregando...' : 'Recarregar'}
              </Button>
            </div>

            {loading ? (
              <div className="text-center p-8">
                <Badge variant="secondary">Carregando ocorrências...</Badge>
              </div>
            ) : occurrences.length === 0 ? (
              <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-muted-foreground">
                  Nenhuma ocorrência encontrada para esta remessa.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Use os botões de teste no painel do motorista para criar ocorrências.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-medium">
                  {occurrences.length} Ocorrência(s) Encontrada(s):
                </h3>
                
                {occurrences.map((occurrence) => (
                  <div key={occurrence.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <Badge 
                          variant={occurrence.occurrence_type === 'foto' ? 'default' : 'secondary'}
                        >
                          {occurrence.occurrence_type === 'foto' ? '📸' : '🎵'} {occurrence.occurrence_type}
                        </Badge>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteOccurrence(occurrence.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <p><strong>ID:</strong> {occurrence.id}</p>
                      <p><strong>Motorista ID:</strong> {occurrence.motorista_id}</p>
                      <p><strong>Descrição:</strong> {occurrence.description}</p>
                      <p><strong>Arquivo:</strong> 
                        <a 
                          href={occurrence.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline ml-1"
                        >
                          {occurrence.file_url}
                        </a>
                      </p>
                      <p><strong>Criado em:</strong> {new Date(occurrence.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsOpen(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};