import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Mic } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { createSecureSupabaseClient } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OccurrenceForceModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string;
  motoristaId: string;
  onSuccess: () => void;
}

export const OccurrenceForceModal = ({
  isOpen,
  onClose,
  shipmentId,
  motoristaId,
  onSuccess
}: OccurrenceForceModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const forceCreatePhotoOccurrence = async () => {
    console.log('🔥 [FORCE] Forçando criação de ocorrência de foto...');
    setIsLoading(true);
    
    try {
      const supabase = createSecureSupabaseClient();
      
      // Criar uma URL fake para a foto
      const fakePhotoUrl = `https://dhznyjtisfdxzbnzinab.supabase.co/storage/v1/object/public/shipment-photos/forced_photo_${Date.now()}.jpg`;
      
      console.log('🔥 [FORCE] Inserindo diretamente na tabela...');
      console.log('🔥 [FORCE] Dados:', {
        shipment_id: shipmentId,
        motorista_id: motoristaId,
        occurrence_type: 'foto',
        file_url: fakePhotoUrl,
        description: 'FORÇADO: Foto criada via modal de força bruta'
      });
      
      // Tentar inserção direta
      const { data, error } = await supabase
        .from('shipment_occurrences')
        .insert({
          shipment_id: shipmentId,
          motorista_id: motoristaId,
          occurrence_type: 'foto',
          file_url: fakePhotoUrl,
          description: 'FORÇADO: Foto criada via modal de força bruta'
        })
        .select();
      
      console.log('🔥 [FORCE] Resultado da inserção:', { data, error });
      
      if (error) {
        console.error('❌ [FORCE] Erro na inserção:', error);
        console.error('❌ [FORCE] Detalhes do erro:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        toast({
          title: "Erro na inserção forçada",
          description: `${error.message} ${error.details || ''} ${error.hint || ''}`,
          variant: "destructive"
        });
      } else {
        console.log('✅ [FORCE] Inserção forçada com sucesso:', data);
        
        toast({
          title: "Sucesso!",
          description: "Ocorrência de foto forçada criada com sucesso!"
        });
        
        onSuccess();
        onClose();
      }
      
    } catch (error: any) {
      console.error('💥 [FORCE] Erro crítico:', error);
      toast({
        title: "Erro crítico",
        description: error.message || 'Erro desconhecido',
        variant: "destructive"
      });
    }
    
    setIsLoading(false);
  };

  const forceCreateAudioOccurrence = async () => {
    console.log('🔥 [FORCE] Forçando criação de ocorrência de áudio...');
    setIsLoading(true);
    
    try {
      const supabase = createSecureSupabaseClient();
      
      // Criar uma URL fake para o áudio
      const fakeAudioUrl = `https://dhznyjtisfdxzbnzinab.supabase.co/storage/v1/object/public/shipment-audio/forced_audio_${Date.now()}.webm`;
      
      console.log('🔥 [FORCE] Inserindo diretamente na tabela...');
      console.log('🔥 [FORCE] Dados:', {
        shipment_id: shipmentId,
        motorista_id: motoristaId,
        occurrence_type: 'audio',
        file_url: fakeAudioUrl,
        description: 'FORÇADO: Áudio criado via modal de força bruta'
      });
      
      // Tentar inserção direta
      const { data, error } = await supabase
        .from('shipment_occurrences')
        .insert({
          shipment_id: shipmentId,
          motorista_id: motoristaId,
          occurrence_type: 'audio',
          file_url: fakeAudioUrl,
          description: 'FORÇADO: Áudio criado via modal de força bruta'
        })
        .select();
      
      console.log('🔥 [FORCE] Resultado da inserção:', { data, error });
      
      if (error) {
        console.error('❌ [FORCE] Erro na inserção:', error);
        console.error('❌ [FORCE] Detalhes do erro:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        toast({
          title: "Erro na inserção forçada",
          description: `${error.message} ${error.details || ''} ${error.hint || ''}`,
          variant: "destructive"
        });
      } else {
        console.log('✅ [FORCE] Inserção forçada com sucesso:', data);
        
        toast({
          title: "Sucesso!",
          description: "Ocorrência de áudio forçada criada com sucesso!"
        });
        
        onSuccess();
        onClose();
      }
      
    } catch (error: any) {
      console.error('💥 [FORCE] Erro crítico:', error);
      toast({
        title: "Erro crítico",
        description: error.message || 'Erro desconhecido',
        variant: "destructive"
      });
    }
    
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-[400px] mx-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            🔥 Forçar Criação de Ocorrência
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-4">
          <div className="text-sm text-muted-foreground">
            <strong>Shipment ID:</strong> {shipmentId}<br/>
            <strong>Motorista ID:</strong> {motoristaId}
          </div>

          <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
            <p className="text-sm text-orange-800">
              ⚠️ Este modal força a criação de ocorrências diretamente no banco, 
              ignorando uploads de arquivos reais. Use apenas para teste.
            </p>
          </div>

          {/* Botões para forçar criação */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="destructive"
              onClick={forceCreatePhotoOccurrence}
              disabled={isLoading}
              className="h-16 flex flex-col items-center gap-2"
            >
              <Camera className="h-6 w-6" />
              <span className="text-sm">Forçar Foto</span>
            </Button>
            <Button
              variant="destructive" 
              onClick={forceCreateAudioOccurrence}
              disabled={isLoading}
              className="h-16 flex flex-col items-center gap-2"
            >
              <Mic className="h-6 w-6" />
              <span className="text-sm">Forçar Áudio</span>
            </Button>
          </div>

          {isLoading && (
            <div className="text-center">
              <Badge variant="secondary">Forçando inserção...</Badge>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};