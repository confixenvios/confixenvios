import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PhotoUpload } from './PhotoUpload';
import { X, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { createSecureSupabaseClient } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FinalizarEntregaModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string;
  motoristaId: string;
  trackingCode?: string;
  onSuccess: () => void;
}

export const FinalizarEntregaModal = ({
  isOpen,
  onClose,
  shipmentId,
  motoristaId,
  trackingCode,
  onSuccess
}: FinalizarEntregaModalProps) => {
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Reset when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setPhotos([]);
      setPhotoPreviewUrls(prev => {
        prev.forEach(url => URL.revokeObjectURL(url));
        return [];
      });
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

  const handleFinalizarEntrega = async () => {
    if (photos.length === 0) {
      toast({
        title: "Foto obrigatória",
        description: "Adicione pelo menos uma foto da entrega para finalizar.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    const supabase = createSecureSupabaseClient();
    
    // Detectar se é B2B pelo tracking code
    const isB2B = trackingCode?.startsWith('B2B-');
    
    try {
      console.log('📸 [FINALIZAR] Iniciando finalização de entrega...');
      console.log('📦 Shipment ID:', shipmentId);
      console.log('🚛 Motorista ID:', motoristaId);
      console.log('📸 Fotos:', photos.length);
      console.log('🏢 É B2B:', isB2B);

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
            occurrence_type: 'entrega_finalizada',
            file_url: publicUrl,
            description: 'Foto de comprovação de entrega'
          });
          
        if (occurrenceError) {
          console.error('❌ Erro ao registrar ocorrência:', occurrenceError);
          throw new Error(`Erro ao registrar ocorrência: ${occurrenceError.message}`);
        }
      }

      // Atualizar status da remessa baseado no tipo (B2B ou normal)
      if (isB2B) {
        // Atualizar tabela b2b_shipments
        const { error: updateError } = await supabase
          .from('b2b_shipments')
          .update({ 
            status: 'ENTREGUE',
            updated_at: new Date().toISOString()
          })
          .eq('id', shipmentId);

        if (updateError) {
          console.error('❌ Erro ao atualizar status B2B:', updateError);
          throw new Error(`Erro ao atualizar status B2B: ${updateError.message}`);
        }
      } else {
        // Atualizar tabela shipments (normal)
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
      const { error: historyError } = await supabase
        .from('shipment_status_history')
        .insert({
          shipment_id: shipmentId,
          motorista_id: motoristaId,
          status: isB2B ? 'ENTREGUE' : 'ENTREGA_FINALIZADA',
          status_description: 'Entrega finalizada com sucesso',
          observacoes: `Entrega finalizada pelo motorista. ${photos.length} foto(s) de comprovação anexada(s).`
        });

      if (historyError) {
        console.warn('⚠️ Erro ao registrar histórico:', historyError);
        // Não falhar por isso
      }
      
      console.log('✅ Entrega finalizada com sucesso');
      
      toast({
        title: "Entrega Finalizada!",
        description: `A entrega ${trackingCode || ''} foi finalizada com sucesso.`
      });

      // Reset e fechar modal
      setPhotos([]);
      setPhotoPreviewUrls(prev => {
        prev.forEach(url => URL.revokeObjectURL(url));
        return [];
      });
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
        <DialogContent className="w-[90vw] max-w-[400px] mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Finalizar Entrega
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 p-4">
            {/* Alerta sobre foto obrigatória */}
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">Foto obrigatória</p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  Tire pelo menos uma foto comprovando a entrega antes de finalizar.
                </p>
              </div>
            </div>

            {/* Tracking code info */}
            {trackingCode && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Remessa</p>
                <p className="font-medium">{trackingCode}</p>
              </div>
            )}
            
            {/* Botão para tirar foto */}
            <Button
              variant="outline"
              onClick={() => setShowPhotoUpload(true)}
              className="w-full h-16 flex flex-col items-center gap-2"
            >
              <Camera className="h-6 w-6" />
              <span className="text-sm">Tirar Foto da Entrega</span>
            </Button>

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
                disabled={photos.length === 0 || saving}
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
    </>
  );
};
