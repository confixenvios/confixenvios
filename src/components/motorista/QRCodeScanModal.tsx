import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, CheckCircle, X, QrCode, AlertTriangle } from 'lucide-react';
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
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setScannedCodes([]);
      setManualInput('');
    } else {
      stopCamera();
    }
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setScanning(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Erro ao acessar câmera. Use entrada manual.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const handleManualSubmit = () => {
    const code = manualInput.trim().toUpperCase();
    
    if (!code) {
      toast.error('Digite um código válido');
      return;
    }

    if (scannedCodes.includes(code)) {
      toast.error('Este código já foi escaneado');
      return;
    }

    // Check if code is valid for this shipment
    const isValidCode = requiredCodes.some(rc => 
      rc.toUpperCase() === code || 
      code.includes(rc.toUpperCase()) ||
      rc.toUpperCase().includes(code)
    );

    if (!isValidCode) {
      toast.error('Código não pertence a esta remessa');
      return;
    }

    const newScannedCodes = [...scannedCodes, code];
    setScannedCodes(newScannedCodes);
    setManualInput('');
    toast.success(`Código ${code} validado!`);

    // Check if all codes scanned
    if (newScannedCodes.length >= requiredCodes.length) {
      toast.success('Todos os volumes validados!');
      onAllScanned();
    }
  };

  const handleRemoveCode = (code: string) => {
    setScannedCodes(prev => prev.filter(c => c !== code));
  };

  const remainingCount = requiredCodes.length - scannedCodes.length;
  const allScanned = remainingCount <= 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[450px] mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Validar Volumes - {shipmentType}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-2">
          {/* Info */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-200">
                Escaneie os QR codes de cada volume
              </p>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                {shipmentType === 'B2B-1' 
                  ? 'Escaneie cada etiqueta antes de realizar a coleta.'
                  : 'Escaneie cada etiqueta antes de finalizar a entrega.'}
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
            <Badge variant={allScanned ? "default" : "secondary"} className={allScanned ? "bg-green-600" : ""}>
              {scannedCodes.length} / {requiredCodes.length}
            </Badge>
          </div>

          {/* Scanned codes list - show only volume number, not the code */}
          {scannedCodes.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Volumes validados:</p>
              <div className="space-y-1">
                {scannedCodes.map((code, index) => (
                  <div key={code} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/30 rounded border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Volume {index + 1}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemoveCode(code)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remaining count - without showing expected codes */}
          {!allScanned && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <span className="font-medium">{remainingCount}</span> volume(s) restante(s) para validar
              </p>
            </div>
          )}

          {/* Camera view */}
          {scanning && (
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-white/50 rounded-lg" />
              </div>
            </div>
          )}

          {/* Manual input */}
          {!allScanned && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Entrada manual do código:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                  placeholder="Digite o código ETI..."
                  className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono"
                />
                <Button onClick={handleManualSubmit} size="sm">
                  Validar
                </Button>
              </div>
            </div>
          )}

          {/* Camera toggle - simplified for now */}
          {!allScanned && (
            <Button
              variant="outline"
              onClick={scanning ? stopCamera : startCamera}
              className="w-full"
            >
              <Camera className="h-4 w-4 mr-2" />
              {scanning ? 'Parar Câmera' : 'Usar Câmera (Beta)'}
            </Button>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={onAllScanned}
              disabled={!allScanned}
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