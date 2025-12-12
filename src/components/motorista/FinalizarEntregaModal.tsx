import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, CheckCircle, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PhotoUpload } from './PhotoUpload';
import { QRCodeScanModal } from './QRCodeScanModal';
import { X, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { createSecureSupabaseClient } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FinalizarEntregaModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string;
  motoristaId: string;
  trackingCode?: string;
  shipmentType?: 'normal' | 'B2B-0' | 'B2B-2';
  currentStatus?: string;
  volumeCount?: number;
  onSuccess: () => void;
}

export const FinalizarEntregaModal = ({
  isOpen,
  onClose,
  shipmentId,
  motoristaId,
  trackingCode,
  shipmentType,
  currentStatus,
  volumeCount = 1,
  onSuccess
}: FinalizarEntregaModalProps) => {
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [showQRScan, setShowQRScan] = useState(false);
  const [qrValidated, setQrValidated] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [etiCodes, setEtiCodes] = useState<string[]>([]);
  const [loadingEtiCodes, setLoadingEtiCodes] = useState(false);
  const { toast } = useToast();

  const isB2B = trackingCode?.startsWith('B2B-') || shipmentType?.startsWith('B2B');
  const isB2BColeta = shipmentType === 'B2B-0' || (isB2B && currentStatus === 'ACEITA');
  const isB2BEntrega = shipmentType === 'B2B-2' || (isB2B && (currentStatus === 'B2B_COLETA_FINALIZADA' || currentStatus === 'B2B_ENTREGA_ACEITA'));

  // Fetch ETI codes for B2B shipments
  useEffect(() => {
    const fetchEtiCodes = async () => {
      if (!isB2B || !shipmentId || volumeCount <= 0) {
        return;
      }

      setLoadingEtiCodes(true);
      try {
        const supabase = createSecureSupabaseClient();
        const { data, error } = await supabase
          .from('b2b_volume_labels')
          .select('eti_code')
          .eq('b2b_shipment_id', shipmentId)
          .order('volume_number');

        if (error) {
          console.error('Error fetching ETI codes:', error);
          // Generate fallback codes
          const fallbackCodes = Array.from({ length: volumeCount }, (_, i) => `ETI-${String(i + 1).padStart(4, '0')}`);
          setEtiCodes(fallbackCodes);
          console.log('🔄 Using fallback codes:', fallbackCodes);
        } else if (data && data.length > 0) {
          const codes = data.map(d => d.eti_code);
          setEtiCodes(codes);
          console.log('✅ ETI codes loaded:', codes);
        } else {
          // No ETI codes yet, use fallback
          const fallbackCodes = Array.from({ length: volumeCount }, (_, i) => `ETI-${String(i + 1).padStart(4, '0')}`);
          setEtiCodes(fallbackCodes);
          console.log('⚠️ No ETI codes found, using fallback:', fallbackCodes);
        }
      } catch (err) {
        console.error('Error in fetchEtiCodes:', err);
        const fallbackCodes = Array.from({ length: volumeCount }, (_, i) => `ETI-${String(i + 1).padStart(4, '0')}`);
        setEtiCodes(fallbackCodes);
        console.log('❌ Error, using fallback codes:', fallbackCodes);
      } finally {
        setLoadingEtiCodes(false);
      }
    };

    if (isOpen && isB2B) {
      fetchEtiCodes();
    }
  }, [isOpen, isB2B, shipmentId, volumeCount, trackingCode]);

  // Reset when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setPhotos([]);
      setPhotoPreviewUrls(prev => {
        prev.forEach(url => URL.revokeObjectURL(url));
        return [];
      });
      setQrValidated(false);
      setShowQRScan(false);
    }
  }, [isOpen]);

  // Cleanup preview URLs when component unmounts
  useEffect(() => {
    return () => {
      photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [photoPreviewUrls]);

  const handlePhotoSave = (photo: File) => {
    const previewUrl = URL.createObjectURL(photo);
    setPhotos(prev => [...prev, photo]);
    setPhotoPreviewUrls(prev => [...prev, previewUrl]);
    setShowPhotoUpload(false);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls(prev => {
      const urlToRemove = prev[index];
      URL.revokeObjectURL(urlToRemove);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleQRValidationComplete = (photoFile?: File) => {
    setQrValidated(true);
    setShowQRScan(false);
    
    // For B2B-2, the photo comes from the validation modal
    if (isB2BEntrega && photoFile) {
      const previewUrl = URL.createObjectURL(photoFile);
      setPhotos([photoFile]);
      setPhotoPreviewUrls([previewUrl]);
      toast({
        title: "Volumes validados!",
        description: "Foto de entrega anexada."
      });
    } else {
      toast({
        title: "Volumes validados!",
        description: isB2BColeta ? "Coleta pronta para finalizar." : "Agora tire uma foto para finalizar."
      });
    }
  };

  const handleStartFinalization = () => {
    if (isB2B && !qrValidated) {
      setShowQRScan(true);
    }
  };

  const handleFinalizarEntrega = async () => {
    // Photo is only required for B2B-2 (delivery phase) and normal shipments
    if (isB2BEntrega && photos.length === 0) {
      toast({
        title: "Foto obrigatória",
        description: "Adicione pelo menos uma foto da entrega para finalizar.",
        variant: "destructive"
      });
      return;
    }

    if (!isB2B && photos.length === 0) {
      toast({
        title: "Foto obrigatória",
        description: "Adicione pelo menos uma foto da entrega para finalizar.",
        variant: "destructive"
      });
      return;
    }

    // For B2B, require volume validation first
    if (isB2B && !qrValidated) {
      toast({
        title: "Validação obrigatória",
        description: "Valide todos os volumes primeiro.",
        variant: "destructive"
      });
      setShowQRScan(true);
      return;
    }

    setSaving(true);
    const supabase = createSecureSupabaseClient();
    
    try {
      console.log('📸 [FINALIZAR] Iniciando finalização...');
      console.log('📦 Shipment ID:', shipmentId);
      console.log('🚛 Motorista ID:', motoristaId);
      console.log('📸 Fotos:', photos.length);
      console.log('🏢 É B2B:', isB2B);
      console.log('🚚 Tipo:', shipmentType, 'Status atual:', currentStatus);
      console.log('🔄 É B2B Coleta (B2B-1):', isB2BColeta);
      console.log('📦 É B2B Entrega (B2B-2):', isB2BEntrega);
      console.log('✅ QR Validado:', qrValidated);

      // Upload cada foto e criar ocorrência
      for (const photo of photos) {
        const fileName = `entrega_${shipmentId}_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const filePath = `shipment-photos/${fileName}`;
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('shipment-photos')
          .upload(filePath, photo, {
            contentType: 'image/jpeg',
            upsert: false
          });
        
        if (uploadError) {
          console.error('❌ Erro no upload da foto:', uploadError);
          throw new Error(`Erro no upload da foto: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('shipment-photos')
          .getPublicUrl(filePath);
        
        console.log('📸 URL pública gerada:', publicUrl);
          
        // Registrar foto como ocorrência de entrega finalizada
        const { error: occurrenceError } = await supabase
          .from('shipment_occurrences')
          .insert({
            shipment_id: shipmentId,
            motorista_id: motoristaId,
            occurrence_type: isB2BColeta ? 'coleta_finalizada' : 'entrega_finalizada',
            file_url: publicUrl,
            description: isB2BColeta ? 'Foto de comprovação de coleta' : 'Foto de comprovação de entrega'
          });
          
        if (occurrenceError) {
          console.error('❌ Erro ao registrar ocorrência:', occurrenceError);
          throw new Error(`Erro ao registrar ocorrência: ${occurrenceError.message}`);
        }
      }

      // Atualizar status da remessa baseado no tipo (B2B-1, B2B-2 ou normal)
      if (isB2B) {
        let newStatus: string;
        if (isB2BColeta) {
          newStatus = 'B2B_COLETA_FINALIZADA';
        } else {
          newStatus = 'ENTREGUE';
        }
        
        const updateData: any = { 
          status: newStatus,
          updated_at: new Date().toISOString()
        };
        
        if (isB2BColeta) {
          updateData.motorista_id = null;
        }
        
        const { error: updateError } = await supabase
          .from('b2b_shipments')
          .update(updateData)
          .eq('id', shipmentId);

        if (updateError) {
          console.error('❌ Erro ao atualizar status B2B:', updateError);
          throw new Error(`Erro ao atualizar status B2B: ${updateError.message}`);
        }
        
        console.log(`✅ B2B atualizado para: ${newStatus}`);
      } else {
        const { error: updateError } = await supabase
          .from('shipments')
          .update({ 
            status: 'ENTREGA_FINALIZADA',
            updated_at: new Date().toISOString()
          })
          .eq('id', shipmentId);

        if (updateError) {
          console.error('❌ Erro ao atualizar status:', updateError);
          throw new Error(`Erro ao atualizar status: ${updateError.message}`);
        }
      }

      // Registrar no histórico de status
      const statusForHistory = isB2BColeta ? 'B2B_COLETA_FINALIZADA' : (isB2B ? 'ENTREGUE' : 'ENTREGA_FINALIZADA');
      const statusDescription = isB2BColeta 
        ? 'Coleta finalizada - Aguardando motorista de entrega' 
        : 'Entrega finalizada com sucesso';
      
      const historyData = isB2B 
        ? {
            b2b_shipment_id: shipmentId,
            motorista_id: motoristaId,
            status: statusForHistory,
            status_description: statusDescription,
            observacoes: isB2BColeta 
              ? `Coleta finalizada pelo motorista. ${photos.length} foto(s) de comprovação anexada(s). Volumes validados via código. Remessa liberada para fase de entrega.`
              : `Entrega finalizada pelo motorista. ${photos.length} foto(s) de comprovação anexada(s). Volumes validados via código.`
          }
        : {
            shipment_id: shipmentId,
            motorista_id: motoristaId,
            status: statusForHistory,
            status_description: statusDescription,
            observacoes: `Entrega finalizada pelo motorista. ${photos.length} foto(s) de comprovação anexada(s).`
          };
      
      const { error: historyError } = await supabase
        .from('shipment_status_history')
        .insert(historyData);

      if (historyError) {
        console.warn('⚠️ Erro ao registrar histórico:', historyError);
      }
      
      console.log(`✅ ${isB2BColeta ? 'Coleta' : 'Entrega'} finalizada com sucesso`);
      
      toast({
        title: isB2BColeta ? "Coleta Finalizada!" : "Entrega Finalizada!",
        description: isB2BColeta 
          ? `A coleta ${trackingCode || ''} foi finalizada. Remessa aguardando motorista de entrega.`
          : `A entrega ${trackingCode || ''} foi finalizada com sucesso.`
      });

      setPhotos([]);
      setPhotoPreviewUrls(prev => {
        prev.forEach(url => URL.revokeObjectURL(url));
        return [];
      });
      setQrValidated(false);
      onSuccess();
      onClose();
      
    } catch (error: any) {
      console.error('❌ Erro ao finalizar entrega:', error);
      toast({
        title: "Erro", 
        description: error.message || 'Erro ao finalizar entrega',
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[90vw] max-w-[400px] mx-auto max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              {shipmentType === 'B2B-0' ? 'Finalizar Coleta' : 'Finalizar Entrega'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 p-4">
            {/* Alerta sobre validação de volumes para B2B */}
            {isB2B && !qrValidated && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <Package className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800 dark:text-blue-200">Validação de volumes obrigatória</p>
                  <p className="text-blue-700 dark:text-blue-300 mt-1">
                    Digite o código de cada volume ({volumeCount}) antes de finalizar.
                  </p>
                </div>
              </div>
            )}

            {isB2B && qrValidated && (
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-green-800 dark:text-green-200">Volumes validados!</p>
                  <p className="text-green-700 dark:text-green-300 mt-1">
                    Todos os {volumeCount} volume(s) foram validados.
                  </p>
                </div>
              </div>
            )}

            {/* Alerta sobre foto obrigatória - apenas para B2B-2 */}
            {isB2BEntrega && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">Foto obrigatória</p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">
                    Tire pelo menos uma foto comprovando a entrega antes de finalizar.
                  </p>
                </div>
              </div>
            )}

            {/* Tracking code info */}
            {trackingCode && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Remessa</p>
                <p className="font-medium">{trackingCode}</p>
                {isB2B && (
                  <p className="text-xs text-muted-foreground mt-1">{volumeCount} volume(s)</p>
                )}
              </div>
            )}

            {/* Botão para validar volumes (B2B) */}
            {isB2B && !qrValidated && (
              <Button
                variant="outline"
                onClick={() => setShowQRScan(true)}
                className="w-full h-14 flex flex-col items-center gap-1 border-blue-300 text-blue-600 hover:bg-blue-50"
                disabled={loadingEtiCodes}
              >
                <Package className="h-5 w-5" />
                <span className="text-sm">
                  {loadingEtiCodes ? 'Carregando códigos...' : 'Validar Volumes'}
                </span>
              </Button>
            )}
            
            {/* Botão para tirar foto - apenas para B2B-2 (após validação) ou remessas normais (não B2B) */}
            {isB2BEntrega && qrValidated && (
              <Button
                variant="outline"
                onClick={() => setShowPhotoUpload(true)}
                className="w-full h-14 flex flex-col items-center gap-1"
              >
                <Camera className="h-5 w-5" />
                <span className="text-sm">Tirar Foto da Entrega</span>
              </Button>
            )}
            
            {/* Botão para tirar foto - remessas normais (não B2B) */}
            {!isB2B && (
              <Button
                variant="outline"
                onClick={() => setShowPhotoUpload(true)}
                className="w-full h-14 flex flex-col items-center gap-1"
              >
                <Camera className="h-5 w-5" />
                <span className="text-sm">Tirar Foto da Entrega</span>
              </Button>
            )}

            {/* Pré-visualização das Fotos */}
            {photoPreviewUrls.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Fotos da Entrega ({photoPreviewUrls.length})
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {photoPreviewUrls.map((url, index) => (
                    <div key={index} className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                      <img
                        src={url}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => removePhoto(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <Badge 
                        variant="secondary" 
                        className="absolute bottom-1 left-1 text-xs bg-black/60 text-white border-none"
                      >
                        Foto {index + 1}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status de fotos */}
            <div className="flex items-center justify-center">
              {photos.length > 0 ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {photos.length} foto{photos.length > 1 ? 's' : ''} pronta{photos.length > 1 ? 's' : ''}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Nenhuma foto adicionada
                </Badge>
              )}
            </div>

            {/* Botões de ação */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button 
                onClick={handleFinalizarEntrega}
                disabled={
                  saving || 
                  (isB2B && !qrValidated) || 
                  (isB2BEntrega && photos.length === 0) ||
                  (!isB2B && photos.length === 0)
                }
                className="bg-green-600 hover:bg-green-700"
              >
                {saving ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Finalizando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Finalizar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Upload Modal */}
      <PhotoUpload
        isOpen={showPhotoUpload}
        onClose={() => setShowPhotoUpload(false)}
        onSave={handlePhotoSave}
        title="Foto da Entrega"
      />

      {/* QR Code Scan Modal */}
      {isB2B && (
        <QRCodeScanModal
          isOpen={showQRScan}
          onClose={() => setShowQRScan(false)}
          requiredCodes={etiCodes}
          shipmentType={isB2BColeta ? 'B2B-0' : 'B2B-2'}
          trackingCode={trackingCode || ''}
          onAllScanned={handleQRValidationComplete}
        />
      )}
    </>
  );
};