import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, X, Package, AlertTriangle, Camera, Image } from 'lucide-react';
import { toast } from 'sonner';

interface QRCodeScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredCodes: string[];
  shipmentType: 'B2B-1' | 'B2B-2';
  trackingCode: string;
  onAllScanned: (photoFile?: File) => void;
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isB2B2 = shipmentType === 'B2B-2';

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
      setPhotoFile(null);
      setPhotoPreview(null);
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
  };

  const handleRemoveVolume = (volumeIndex: number) => {
    setValidatedVolumes(prev => prev.filter(v => v !== volumeIndex));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleContinue = () => {
    if (isB2B2 && !photoFile) {
      toast.error('Foto obrigatória para finalizar a entrega');
      return;
    }
    onAllScanned(isB2B2 ? photoFile! : undefined);
  };

  const remainingCount = requiredCodes.length - validatedVolumes.length;
  const allValidated = remainingCount <= 0;
  const canContinue = allValidated && (!isB2B2 || photoFile);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md mx-auto max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary flex-shrink-0" />
            <span>Validar Volumes - {shipmentType}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Info */}
          <div className="flex items-start gap-2 p-2 sm:p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm min-w-0">
              <p className="font-medium text-blue-800 dark:text-blue-200">
                Digite os 4 dígitos de cada etiqueta
              </p>
              <p className="text-blue-700 dark:text-blue-300 mt-0.5">
                {shipmentType === 'B2B-1' 
                  ? 'Confirme cada volume antes de realizar a coleta.'
                  : 'Confirme cada volume e anexe foto da entrega.'}
              </p>
            </div>
          </div>

          {/* Tracking Code */}
          <div className="p-2 sm:p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Remessa</p>
            <p className="font-medium text-sm sm:text-base break-all">{trackingCode}</p>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 rounded-lg">
            <span className="text-xs sm:text-sm font-medium">Volumes validados:</span>
            <Badge variant={allValidated ? "default" : "secondary"} className={allValidated ? "bg-green-600" : ""}>
              {validatedVolumes.length} / {requiredCodes.length}
            </Badge>
          </div>

          {/* Remaining count */}
          {!allValidated && (
            <div className="p-2 sm:p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200">
                <span className="font-medium">{remainingCount}</span> volume(s) restante(s) para validar
              </p>
            </div>
          )}

          {/* Manual input - only 4 digits */}
          {!allValidated && (
            <div className="space-y-2">
              <p className="text-xs sm:text-sm font-medium">Digite os 4 dígitos da etiqueta:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={manualInput}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setManualInput(value);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                  placeholder="0001"
                  maxLength={4}
                  className="flex-1 px-3 py-2 sm:py-3 border rounded-lg text-lg sm:text-xl font-mono text-center tracking-widest bg-background"
                />
                <Button onClick={handleManualSubmit} size="default" className="px-4 sm:px-6">
                  Validar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Ex: Para ETI-0001, digite apenas 0001
              </p>
            </div>
          )}

          {/* Validated volumes list */}
          {validatedVolumes.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Volumes validados:</p>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {validatedVolumes.sort((a, b) => a - b).map((volumeIndex) => (
                  <div key={volumeIndex} className="flex items-center justify-between p-1.5 sm:p-2 bg-green-50 dark:bg-green-950/30 rounded border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-xs sm:text-sm font-medium">Volume {volumeIndex + 1}</span>
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

          {/* Photo upload - only for B2B-2 */}
          {isB2B2 && allValidated && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                <p className="text-xs sm:text-sm font-medium">
                  Foto da entrega <span className="text-destructive">*</span>
                </p>
              </div>
              
              {photoPreview ? (
                <div className="relative">
                  <img 
                    src={photoPreview} 
                    alt="Preview" 
                    className="w-full h-32 sm:h-40 object-cover rounded-lg border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={handleRemovePhoto}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-4 sm:p-6 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Image className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-xs sm:text-sm text-muted-foreground text-center">
                    Clique para adicionar foto
                  </p>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-3 border-t">
            <Button variant="outline" onClick={onClose} size="default">
              Cancelar
            </Button>
            <Button 
              onClick={handleContinue}
              disabled={!canContinue}
              className="bg-green-600 hover:bg-green-700"
              size="default"
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
