import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Mic, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { createSecureSupabaseClient } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OccurrenceTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string;
  motoristaId: string;
  onSuccess: () => void;
}

export const OccurrenceTestModal = ({
  isOpen,
  onClose,
  shipmentId,
  motoristaId,
  onSuccess
}: OccurrenceTestModalProps) => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const supabase = createSecureSupabaseClient();

  const testInsertPhoto = async () => {
    console.log('🧪 [TEST] Testando inserção de foto...');
    setIsLoading(true);
    
    try {
      // URL de teste para foto
      const testPhotoUrl = 'https://dhznyjtisfdxzbnzinab.supabase.co/storage/v1/object/public/shipment-photos/test-photo.jpg';
      
      // Usar a função de teste do banco
      const { data, error } = await supabase.rpc('test_insert_occurrence', {
        p_shipment_id: shipmentId,
        p_motorista_id: motoristaId,
        p_occurrence_type: 'foto',
        p_file_url: testPhotoUrl,
        p_description: 'TESTE: Foto inserida via modal de teste'
      });

      console.log('📊 [TEST] Resultado da função test_insert_occurrence:', { data, error });

      if (error) {
        console.error('❌ [TEST] Erro ao chamar função:', error);
        setTestResults(prev => [...prev, `❌ ERRO na função: ${error.message}`]);
        toast({
          title: "Erro no teste",
          description: `Erro: ${error.message}`,
          variant: "destructive"
        });
      } else {
        console.log('✅ [TEST] Função executada com sucesso:', data);
        setTestResults(prev => [...prev, `✅ SUCESSO: Foto inserida via função - ${JSON.stringify(data)}`]);
        toast({
          title: "Teste de foto",
          description: "Foto de teste inserida com sucesso!",
        });
      }

    } catch (error: any) {
      console.error('💥 [TEST] Erro crítico:', error);
      setTestResults(prev => [...prev, `💥 ERRO CRÍTICO: ${error.message}`]);
    }
    
    setIsLoading(false);
  };

  const testInsertAudio = async () => {
    console.log('🧪 [TEST] Testando inserção de áudio...');
    setIsLoading(true);
    
    try {
      // URL de teste para áudio
      const testAudioUrl = 'https://dhznyjtisfdxzbnzinab.supabase.co/storage/v1/object/public/shipment-audio/test-audio.webm';
      
      // Usar a função de teste do banco
      const { data, error } = await supabase.rpc('test_insert_occurrence', {
        p_shipment_id: shipmentId,
        p_motorista_id: motoristaId,
        p_occurrence_type: 'audio',
        p_file_url: testAudioUrl,
        p_description: 'TESTE: Áudio inserido via modal de teste'
      });

      console.log('📊 [TEST] Resultado da função test_insert_occurrence:', { data, error });

      if (error) {
        console.error('❌ [TEST] Erro ao chamar função:', error);
        setTestResults(prev => [...prev, `❌ ERRO na função: ${error.message}`]);
        toast({
          title: "Erro no teste",
          description: `Erro: ${error.message}`,
          variant: "destructive"
        });
      } else {
        console.log('✅ [TEST] Função executada com sucesso:', data);
        setTestResults(prev => [...prev, `✅ SUCESSO: Áudio inserido via função - ${JSON.stringify(data)}`]);
        toast({
          title: "Teste de áudio",
          description: "Áudio de teste inserido com sucesso!",
        });
      }

    } catch (error: any) {
      console.error('💥 [TEST] Erro crítico:', error);
      setTestResults(prev => [...prev, `💥 ERRO CRÍTICO: ${error.message}`]);
    }
    
    setIsLoading(false);
  };

  const testDirectInsert = async () => {
    console.log('🧪 [TEST] Testando inserção direta...');
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('shipment_occurrences')
        .insert({
          shipment_id: shipmentId,
          motorista_id: motoristaId,
          occurrence_type: 'foto',
          file_url: 'https://example.com/test-direct.jpg',
          description: 'TESTE: Inserção direta via Supabase client'
        })
        .select();

      console.log('📊 [TEST] Resultado da inserção direta:', { data, error });

      if (error) {
        console.error('❌ [TEST] Erro na inserção direta:', error);
        setTestResults(prev => [...prev, `❌ ERRO direto: ${error.message} - ${error.details || ''} - ${error.hint || ''}`]);
      } else {
        console.log('✅ [TEST] Inserção direta com sucesso:', data);
        setTestResults(prev => [...prev, `✅ SUCESSO direto: ${JSON.stringify(data)}`]);
        toast({
          title: "Teste direto",
          description: "Inserção direta funcionou!",
        });
      }

    } catch (error: any) {
      console.error('💥 [TEST] Erro crítico na inserção direta:', error);
      setTestResults(prev => [...prev, `💥 ERRO CRÍTICO direto: ${error.message}`]);
    }
    
    setIsLoading(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const handleClose = () => {
    clearResults();
    onClose();
    onSuccess(); // Chamar para recarregar dados
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[90vw] max-w-[500px] mx-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            🧪 Teste de Ocorrências
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-4">
          <div className="text-sm text-muted-foreground">
            <strong>Shipment ID:</strong> {shipmentId}<br/>
            <strong>Motorista ID:</strong> {motoristaId}
          </div>

          {/* Botões de teste */}
          <div className="grid grid-cols-1 gap-3">
            <Button
              variant="outline"
              onClick={testInsertPhoto}
              disabled={isLoading}
              className="h-12 flex items-center gap-2"
            >
              <Camera className="h-5 w-5" />
              <span>Testar Inserção de Foto</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={testInsertAudio}
              disabled={isLoading}
              className="h-12 flex items-center gap-2"
            >
              <Mic className="h-5 w-5" />
              <span>Testar Inserção de Áudio</span>
            </Button>

            <Button
              variant="outline"
              onClick={testDirectInsert}
              disabled={isLoading}
              className="h-12 flex items-center gap-2"
            >
              <Upload className="h-5 w-5" />
              <span>Testar Inserção Direta</span>
            </Button>
          </div>

          {/* Resultados dos testes */}
          {testResults.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Resultados:</h4>
                <Button variant="ghost" size="sm" onClick={clearResults}>
                  Limpar
                </Button>
              </div>
              <div className="max-h-40 overflow-y-auto bg-muted p-3 rounded text-xs space-y-1">
                {testResults.map((result, index) => (
                  <div key={index} className="break-all">
                    {result}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="text-center">
              <Badge variant="secondary">Executando teste...</Badge>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
            >
              Fechar e Recarregar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};