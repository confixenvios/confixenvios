import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, X, Package, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface QRCodeScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredCodes: string[];
  shipmentType: 'B2B-1' | 'B2B-2';
  trackingCode: string;
  onAllScanned: () => void;
}

export const QRCodeScanModal: React.FC<QRCodeScanModalProps> = ({
  isOpen,
  onClose,
  requiredCodes,
  shipmentType,
  trackingCode,
  onAllScanned
}) => {
  const [validatedVolumes, setValidatedVolumes] = useState<number[]>([]);
  const [manualInput, setManualInput] = useState('');

  // Extract the 4-digit numbers from ETI codes (e.g., "ETI-0001" -> "0001")
  const getExpectedDigits = (): string[] => {
    return requiredCodes.map(code => {
      const match = code.match(/ETI-(\d{4})/i);
      return match ? match[1] : code;
    });
  };

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setValidatedVolumes([]);
      setManualInput('');
    }
  }, [isOpen]);

  const handleManualSubmit = () => {
    const digits = manualInput.trim();
    
    if (!digits || digits.length !== 4 || !/^\d{4}$/.test(digits)) {
      toast.error('Digite os 4 dígitos numéricos (ex: 0001)');
      return;
    }

    const expectedDigits = getExpectedDigits();
    const matchIndex = expectedDigits.findIndex((expected, index) => 
      expected === digits && !validatedVolumes.includes(index)
    );

    if (matchIndex === -1) {
      // Check if already validated
      const alreadyValidated = expectedDigits.findIndex((expected, index) => 
        expected === digits && validatedVolumes.includes(index)
      );
      
      if (alreadyValidated !== -1) {
        toast.error('Este volume já foi validado');
      } else {
        toast.error('Código não pertence a esta remessa');
      }
      return;
    }

    const newValidatedVolumes = [...validatedVolumes, matchIndex];
    setValidatedVolumes(newValidatedVolumes);
    setManualInput('');
    toast.success(`Volume ${matchIndex + 1} validado!`);

    // Check if all codes validated
    if (newValidatedVolumes.length >= requiredCodes.length) {
      toast.success('Todos os volumes validados!');
      onAllScanned();
    }
  };

  const handleRemoveVolume = (volumeIndex: number) => {
    setValidatedVolumes(prev => prev.filter(v => v !== volumeIndex));
  };

  const remainingCount = requiredCodes.length - validatedVolumes.length;
  const allValidated = remainingCount <= 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[450px] mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Validar Volumes - {shipmentType}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-2">
          {/* Info */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-200">
                Digite os 4 dígitos de cada etiqueta
              </p>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                {shipmentType === 'B2B-1' 
                  ? 'Confirme cada volume antes de realizar a coleta.'
                  : 'Confirme cada volume antes de finalizar a entrega.'}
              </p>
            </div>
          </div>

          {/* Tracking Code */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Remessa</p>
            <p className="font-medium">{trackingCode}</p>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium">Volumes validados:</span>
            <Badge variant={allValidated ? "default" : "secondary"} className={allValidated ? "bg-green-600" : ""}>
              {validatedVolumes.length} / {requiredCodes.length}
            </Badge>
          </div>

          {/* Validated volumes list - show only volume number */}
          {validatedVolumes.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Volumes validados:</p>
              <div className="space-y-1">
                {validatedVolumes.sort((a, b) => a - b).map((volumeIndex) => (
                  <div key={volumeIndex} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/30 rounded border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Volume {volumeIndex + 1}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemoveVolume(volumeIndex)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remaining count */}
          {!allValidated && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <span className="font-medium">{remainingCount}</span> volume(s) restante(s) para validar
              </p>
            </div>
          )}

          {/* Manual input - only 4 digits */}
          {!allValidated && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Digite os 4 dígitos da etiqueta:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setManualInput(value);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                  placeholder="0001"
                  maxLength={4}
                  className="flex-1 px-4 py-3 border rounded-lg text-xl font-mono text-center tracking-widest"
                />
                <Button onClick={handleManualSubmit} size="lg">
                  Validar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Ex: Para ETI-0001, digite apenas 0001
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={onAllScanned}
              disabled={!allValidated}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Continuar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};