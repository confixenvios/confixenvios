import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, FileText, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface B2BOccurrenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  b2bShipmentId: string;
  motoristaId: string;
  onSuccess: () => void;
}

const OCCURRENCE_OPTIONS = [
  { value: 'destinatario_ausente', label: 'Destinatário ausente' },
  { value: 'local_fechado', label: 'Local fechado' },
  { value: 'endereco_nao_encontrado', label: 'Endereço não encontrado' },
  { value: 'endereco_incompleto', label: 'Endereço incompleto' },
  { value: 'recusa_destinatario', label: 'Recusa do destinatário' },
  { value: 'produto_avariado', label: 'Produto avariado' },
  { value: 'produto_divergente', label: 'Produto divergente' },
  { value: 'tentativa_frustrada', label: 'Tentativa frustrada — motivo não informado' },
  { value: 'atraso_coleta', label: 'Atraso na coleta' },
  { value: 'problema_veiculo', label: 'Problema no veículo' },
];

export const B2BOccurrenceModal = ({
  isOpen,
  onClose,
  b2bShipmentId,
  motoristaId,
  onSuccess
}: B2BOccurrenceModalProps) => {
  const [selectedOccurrence, setSelectedOccurrence] = useState<string>('');
  const [existingHistory, setExistingHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedOccurrence('');
      setExistingHistory([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && b2bShipmentId) {
      loadExistingHistory();
    }
  }, [isOpen, b2bShipmentId]);

  const loadExistingHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('shipment_status_history')
        .select('*')
        .eq('b2b_shipment_id', b2bShipmentId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar histórico:', error);
      } else {
        setExistingHistory(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getOccurrenceLabel = (value: string) => {
    const option = OCCURRENCE_OPTIONS.find(opt => opt.value === value);
    return option?.label || value;
  };

  const handleSaveOccurrence = async () => {
    if (isSaving || !selectedOccurrence) return;

    setIsSaving(true);
    try {
      const occurrenceLabel = getOccurrenceLabel(selectedOccurrence);
      
      // Registrar no histórico de status da remessa B2B
      const { error: historyError } = await supabase
        .from('shipment_status_history')
        .insert({
          b2b_shipment_id: b2bShipmentId,
          motorista_id: motoristaId,
          status: 'OCORRENCIA',
          status_description: occurrenceLabel,
          observacoes: `Ocorrência registrada: ${occurrenceLabel}`
        });

      if (historyError) {
        console.error('Erro ao registrar histórico:', historyError);
        throw new Error(`Erro ao registrar ocorrência: ${historyError.message}`);
      }
      
      toast.success('Ocorrência registrada com sucesso!');
      await loadExistingHistory();
      setSelectedOccurrence('');
      onSuccess();
      
    } catch (error: any) {
      console.error('Erro no processo:', error);
      toast.error(error.message || 'Erro ao registrar ocorrência');
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
          {/* Histórico de Ocorrências */}
          {existingHistory.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="h-4 w-4" />
                Histórico ({existingHistory.length})
              </div>
              
              <div className="max-h-32 overflow-y-auto space-y-2">
                {existingHistory.slice(0, 5).map((item) => (
                  <div key={item.id} className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {item.status_description || item.status}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {new Date(item.created_at).toLocaleString('pt-BR')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingHistory && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
                  <Label htmlFor={option.value} className="flex-1 cursor-pointer text-sm">
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
