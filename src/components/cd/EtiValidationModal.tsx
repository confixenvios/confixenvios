import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Package, AlertCircle } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EtiValidationModalProps {
  open: boolean;
  onClose: () => void;
  shipmentId: string;
  volumeCount: number;
  onFinalize: () => void;
}

interface VolumeLabel {
  id: string;
  volume_number: number;
  eti_code: string;
  eti_sequence_number: number;
}

export const EtiValidationModal = ({
  open,
  onClose,
  shipmentId,
  volumeCount,
  onFinalize
}: EtiValidationModalProps) => {
  const [volumeLabels, setVolumeLabels] = useState<VolumeLabel[]>([]);
  const [inputValues, setInputValues] = useState<Record<number, string>>({});
  const [validatedVolumes, setValidatedVolumes] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingLabels, setLoadingLabels] = useState(true);

  useEffect(() => {
    if (open && shipmentId) {
      loadVolumeLabels();
      setInputValues({});
      setValidatedVolumes(new Set());
    }
  }, [open, shipmentId]);

  const loadVolumeLabels = async () => {
    try {
      setLoadingLabels(true);
      const { data, error } = await supabase
        .from('b2b_volume_labels')
        .select('*')
        .eq('b2b_shipment_id', shipmentId)
        .order('volume_number', { ascending: true });

      if (error) throw error;
      setVolumeLabels(data || []);
    } catch (error) {
      console.error('Erro ao carregar etiquetas:', error);
      toast.error('Erro ao carregar códigos ETI');
    } finally {
      setLoadingLabels(false);
    }
  };

  const handleInputChange = (volumeNumber: number, value: string) => {
    // Limitar a 4 dígitos numéricos
    const cleanValue = value.replace(/\D/g, '').slice(0, 4);
    setInputValues(prev => ({ ...prev, [volumeNumber]: cleanValue }));

    // Verificar se o código está correto
    const expectedLabel = volumeLabels.find(l => l.volume_number === volumeNumber);
    if (expectedLabel) {
      // Extrair os 4 dígitos do código ETI (ex: "ETI-0001" -> "0001")
      const expectedCode = expectedLabel.eti_code.replace('ETI-', '');
      if (cleanValue === expectedCode) {
        setValidatedVolumes(prev => new Set([...prev, volumeNumber]));
      } else {
        setValidatedVolumes(prev => {
          const newSet = new Set(prev);
          newSet.delete(volumeNumber);
          return newSet;
        });
      }
    }
  };

  const allVolumesValidated = volumeLabels.length > 0 && validatedVolumes.size === volumeLabels.length;

  const handleFinalize = async () => {
    if (!allVolumesValidated) {
      toast.error('Valide todos os volumes antes de finalizar');
      return;
    }

    setLoading(true);
    try {
      onFinalize();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Validar Volumes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Digite o código de 4 dígitos de cada etiqueta ETI para validar os volumes.
          </p>

          {loadingLabels ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : volumeLabels.length === 0 ? (
            <div className="flex items-center gap-2 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <p className="text-sm text-amber-700">
                Nenhuma etiqueta ETI encontrada para esta remessa.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {volumeLabels.map((label) => {
                const isValidated = validatedVolumes.has(label.volume_number);
                return (
                  <div key={label.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label className="text-sm font-medium flex items-center gap-2 mb-1">
                        Volume {label.volume_number}
                        {isValidated && (
                          <Badge className="bg-green-500 text-white text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Validado
                          </Badge>
                        )}
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">ETI-</span>
                        <Input
                          placeholder="0000"
                          value={inputValues[label.volume_number] || ''}
                          onChange={(e) => handleInputChange(label.volume_number, e.target.value)}
                          className={`w-24 font-mono text-center ${
                            isValidated 
                              ? 'border-green-500 bg-green-50' 
                              : inputValues[label.volume_number]?.length === 4 
                                ? 'border-red-500 bg-red-50' 
                                : ''
                          }`}
                          maxLength={4}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {validatedVolumes.size} de {volumeLabels.length} volumes validados
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleFinalize}
                disabled={!allVolumesValidated || loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Finalizar Coleta
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
