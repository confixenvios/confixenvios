import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, FileText, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { createSecureSupabaseClient } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OccurrenceSimpleModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string;
  motoristaId: string;
  onSuccess: () => void;
}

const OCCURRENCE_OPTIONS = [
  { value: 'entrega_realizada', label: 'Entrega realizada' },
  { value: 'destinatario_ausente', label: 'Destinatário ausente' },
  { value: 'local_fechado', label: 'Local fechado' },
  { value: 'endereco_nao_encontrado', label: 'Endereço não encontrado' },
  { value: 'endereco_incompleto', label: 'Endereço incompleto' },
  { value: 'recusa_destinatario', label: 'Recusa do destinatário' },
  { value: 'produto_avariado', label: 'Produto avariado' },
  { value: 'produto_divergente', label: 'Produto divergente' },
  { value: 'tentativa_frustrada', label: 'Tentativa frustrada — motivo não informado' },
];

export const OccurrenceSimpleModal = ({
  isOpen,
  onClose,
  shipmentId,
  motoristaId,
  onSuccess
}: OccurrenceSimpleModalProps) => {
  const [selectedOccurrence, setSelectedOccurrence] = useState<string>('');
  const [existingOccurrences, setExistingOccurrences] = useState<any[]>([]);
  const [loadingOccurrences, setLoadingOccurrences] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Reset when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedOccurrence('');
      setExistingOccurrences([]);
    }
  }, [isOpen]);

  // Load existing occurrences when modal opens
  React.useEffect(() => {
    if (isOpen && shipmentId) {
      loadExistingOccurrences();
    }
  }, [isOpen, shipmentId]);

  const loadExistingOccurrences = async () => {
    setLoadingOccurrences(true);
    const supabase = createSecureSupabaseClient();
    
    try {
      const { data: occurrences, error } = await supabase
        .from('shipment_occurrences')
        .select('*')
        .eq('shipment_id', shipmentId)
        .neq('occurrence_type', 'entrega_finalizada') // Não mostrar fotos de finalização aqui
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Erro ao buscar ocorrências:', error);
      } else {
        setExistingOccurrences(occurrences || []);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar ocorrências:', error);
    } finally {
      setLoadingOccurrences(false);
    }
  };

  const getOccurrenceLabel = (value: string) => {
    const option = OCCURRENCE_OPTIONS.find(opt => opt.value === value);
    return option?.label || value;
  };

  const handleSaveOccurrence = async () => {
    if (isSaving) return;
    
    if (!selectedOccurrence) {
      toast({
        title: "Selecione uma ocorrência",
        description: "Escolha um tipo de ocorrência para registrar.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    const supabase = createSecureSupabaseClient();
    
    try {
      const occurrenceLabel = getOccurrenceLabel(selectedOccurrence);
      
      // Registrar ocorrência
      const { error: occurrenceError } = await supabase
        .from('shipment_occurrences')
        .insert({
          shipment_id: shipmentId,
          motorista_id: motoristaId,
          occurrence_type: selectedOccurrence,
          file_url: '', // Sem arquivo para este tipo de ocorrência
          description: occurrenceLabel
        });
        
      if (occurrenceError) {
        console.error('❌ Erro ao registrar ocorrência:', occurrenceError);
        throw new Error(`Erro ao registrar ocorrência: ${occurrenceError.message}`);
      }

      // Registrar no histórico de status
      const { error: historyError } = await supabase
        .from('shipment_status_history')
        .insert({
          shipment_id: shipmentId,
          motorista_id: motoristaId,
          status: 'TENTATIVA_ENTREGA',
          status_description: occurrenceLabel,
          observacoes: `Ocorrência registrada: ${occurrenceLabel}`
        });

      if (historyError) {
        console.warn('⚠️ Erro ao registrar histórico:', historyError);
      }

      // Atualizar status da remessa para TENTATIVA_ENTREGA
      const { error: updateError } = await supabase
        .from('shipments')
        .update({ 
          status: 'TENTATIVA_ENTREGA',
          updated_at: new Date().toISOString()
        })
        .eq('id', shipmentId);

      if (updateError) {
        console.warn('⚠️ Erro ao atualizar status:', updateError);
      }
      
      toast({
        title: "Sucesso",
        description: "Ocorrência registrada com sucesso!"
      });

      await loadExistingOccurrences();
      setSelectedOccurrence('');
      onSuccess();
      
    } catch (error: any) {
      console.error('❌ Erro no processo:', error);
      toast({
        title: "Erro", 
        description: error.message || 'Erro desconhecido',
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-[400px] mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Registrar Ocorrência
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Histórico de Ocorrências Registradas */}
          {existingOccurrences.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="h-4 w-4" />
                Ocorrências Registradas ({existingOccurrences.length})
              </div>
              
              <div className="max-h-32 overflow-y-auto space-y-2">
                {existingOccurrences.map((occurrence) => (
                  <div key={occurrence.id} className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {occurrence.description || getOccurrenceLabel(occurrence.occurrence_type)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {new Date(occurrence.created_at).toLocaleString('pt-BR')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingOccurrences && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
              <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
            </div>
          )}

          {/* Seleção de Ocorrência */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Selecione o tipo de ocorrência:</p>
            
            <RadioGroup 
              value={selectedOccurrence} 
              onValueChange={setSelectedOccurrence}
              className="space-y-2"
            >
              {OCCURRENCE_OPTIONS.map((option) => (
                <div 
                  key={option.value} 
                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedOccurrence === option.value 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedOccurrence(option.value)}
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label 
                    htmlFor={option.value} 
                    className="flex-1 cursor-pointer text-sm"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Botões de ação */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveOccurrence}
              disabled={!selectedOccurrence || isSaving}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Registrar'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
