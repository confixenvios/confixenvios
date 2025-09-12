import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Mic } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AudioRecorder } from './AudioRecorder';
import { PhotoUpload } from './PhotoUpload';
import { AudioPlayer } from '@/components/AudioPlayer';
import { X, PlayCircle, Image as ImageIcon, FileText, Plus } from 'lucide-react';
import { createSecureSupabaseClient } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OccurrenceSimpleModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string;
  motoristaId: string;
  onSuccess: () => void;
}

export const OccurrenceSimpleModal = ({
  isOpen,
  onClose,
  shipmentId,
  motoristaId,
  onSuccess
}: OccurrenceSimpleModalProps) => {
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [existingOccurrences, setExistingOccurrences] = useState<any[]>([]);
  const [loadingOccurrences, setLoadingOccurrences] = useState(false);
  const { toast } = useToast();

  // Reset attachments when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setPhotos([]);
      setPhotoPreviewUrls(prev => {
        // Cleanup preview URLs to prevent memory leaks
        prev.forEach(url => URL.revokeObjectURL(url));
        return [];
      });
      setAudioUrl(null);
      setExistingOccurrences([]);
    }
  }, [isOpen]);

  // Load existing occurrences when modal opens
  React.useEffect(() => {
    if (isOpen && shipmentId) {
      loadExistingOccurrences();
    }
  }, [isOpen, shipmentId]);

  // Cleanup preview URLs when component unmounts
  React.useEffect(() => {
    return () => {
      photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [photoPreviewUrls]);

  const loadExistingOccurrences = async () => {
    setLoadingOccurrences(true);
    const supabase = createSecureSupabaseClient();
    
    try {
      console.log('📋 Buscando ocorrências existentes para shipment:', shipmentId);
      
      const { data: occurrences, error } = await supabase
        .from('shipment_occurrences')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Erro ao buscar ocorrências:', error);
      } else {
        console.log('📋 Ocorrências encontradas:', occurrences);
        setExistingOccurrences(occurrences || []);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar ocorrências:', error);
    } finally {
      setLoadingOccurrences(false);
    }
  };

  const handlePhotoSave = (photo: File) => {
    console.log('📸 [PHOTO SAVE DEBUG] Foto recebida:', photo.name, photo.size);
    
    // Create preview URL for the photo
    const previewUrl = URL.createObjectURL(photo);
    
    setPhotos(prev => {
      console.log('📸 [PHOTO SAVE DEBUG] Fotos antes:', prev.length);
      const newPhotos = [...prev, photo];
      console.log('📸 [PHOTO SAVE DEBUG] Fotos depois:', newPhotos.length);
      return newPhotos;
    });
    
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

  const removeAudio = () => {
    setAudioUrl(null);
  };

  const handleAudioSave = (savedAudioUrl: string) => {
    console.log('🎵 [AUDIO SAVE DEBUG] URL do áudio recebida:', savedAudioUrl);
    setAudioUrl(savedAudioUrl);
    setShowAudioRecorder(false);
  };

  const handleSaveOccurrence = async () => {
    console.log('🔍 [OCCURRENCE DEBUG] Iniciando processo de salvamento...');
    console.log('📸 Fotos:', photos.length);
    console.log('🎵 Audio URL:', audioUrl ? 'presente' : 'ausente');
    console.log('📦 Shipment ID:', shipmentId);
    console.log('🚛 Motorista ID:', motoristaId);
    
    // Verificar se há anexos ANTES de tentar salvar
    if (photos.length === 0 && !audioUrl) {
      console.log('❌ [OCCURRENCE DEBUG] Nenhum anexo fornecido');
      toast({
        title: "Nenhum anexo",
        description: "Adicione pelo menos uma foto ou áudio para registrar a ocorrência.",
        variant: "destructive"
      });
      return;
    }

    const supabase = createSecureSupabaseClient();
    
    try {
      // TESTAR ACESSO À TABELA PRIMEIRO
      console.log('🔍 [DEBUG] Testando acesso à tabela shipment_occurrences...');
      const { data: testData, error: testError } = await supabase
        .from('shipment_occurrences')
        .select('count')
        .limit(1);
      
      if (testError) {
        console.error('❌ [DEBUG] Erro ao acessar tabela shipment_occurrences:', testError);
        toast({
          title: "Erro de permissão",
          description: "Não foi possível acessar a tabela de ocorrências. Verifique as permissões.",
          variant: "destructive"
        });
        return;
      }
      console.log('✅ [DEBUG] Acesso à tabela OK');
      
      // Salvar fotos como ocorrências
      if (photos.length > 0) {
        console.log('📸 Fazendo upload e salvando fotos...');
        
        for (const photo of photos) {
          console.log('📸 [UPLOAD] Iniciando upload da foto:', photo.name, photo.size);
          
          // Upload da foto
          const fileName = `photo_${shipmentId}_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
          const filePath = `shipment-photos/${fileName}`;
          
          const { error: uploadError, data: uploadData } = await supabase.storage
            .from('shipment-photos')
            .upload(filePath, photo, {
              contentType: 'image/jpeg',
              upsert: false
            });
          
          console.log('📸 [UPLOAD] Resultado do upload:', { uploadError, uploadData });
          
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('shipment-photos')
              .getPublicUrl(filePath);
            
            console.log('📸 [UPLOAD] URL pública gerada:', publicUrl);
              
            // Registrar foto como ocorrência
            console.log('💾 [PHOTO DEBUG] Tentando inserir ocorrência de foto...');
            console.log('💾 [PHOTO DEBUG] Dados a serem inseridos:', {
              shipment_id: shipmentId,
              motorista_id: motoristaId,
              occurrence_type: 'foto',
              file_url: publicUrl,
              description: 'Foto registrada pelo motorista'
            });
            
            const { data: photoData, error: photoError } = await supabase
              .from('shipment_occurrences')
              .insert({
                shipment_id: shipmentId,
                motorista_id: motoristaId,
                occurrence_type: 'foto',
                file_url: publicUrl,
                description: 'Foto registrada pelo motorista'
              })
              .select();
              
            console.log('💾 [PHOTO DEBUG] Resultado da inserção:', { photoData, photoError });
              
            if (photoError) {
              console.error('❌ [PHOTO DEBUG] Erro ao registrar foto:', photoError);
              console.error('❌ [PHOTO DEBUG] Erro detalhes:', JSON.stringify(photoError, null, 2));
              console.error('❌ [PHOTO DEBUG] Código do erro:', photoError.code);
              console.error('❌ [PHOTO DEBUG] Mensagem:', photoError.message);
              console.error('❌ [PHOTO DEBUG] Detalhes:', photoError.details);
              console.error('❌ [PHOTO DEBUG] Hint:', photoError.hint);
              
              throw new Error(`Erro ao registrar foto: ${photoError.message}`);
            } else {
              console.log('📸 [PHOTO DEBUG] Foto registrada com sucesso:', photoData);
            }
          } else {
            console.error('❌ Erro no upload da foto:', uploadError);
            throw new Error(`Erro no upload da foto: ${uploadError.message}`);
          }
        }
      }

      // Salvar áudio como ocorrência
      if (audioUrl) {
        console.log('🎵 [AUDIO DEBUG] Registrando áudio como ocorrência...');
        console.log('🎵 [AUDIO DEBUG] Dados:', {
          shipment_id: shipmentId,
          motorista_id: motoristaId,
          occurrence_type: 'audio',
          file_url: audioUrl,
          description: 'Áudio registrado pelo motorista'
        });
        
        const { data: audioData, error: audioError } = await supabase
          .from('shipment_occurrences')
          .insert({
            shipment_id: shipmentId,
            motorista_id: motoristaId,
            occurrence_type: 'audio',  
            file_url: audioUrl,
            description: 'Áudio registrado pelo motorista'
          })
          .select();
          
        if (audioError) {
          console.error('❌ [AUDIO DEBUG] Erro ao registrar áudio:', audioError);
          console.error('❌ [AUDIO DEBUG] Erro detalhes:', JSON.stringify(audioError, null, 2));
        } else {
          console.log('🎵 [AUDIO DEBUG] Áudio registrado com sucesso:', audioData);
        }
      }
      
      console.log('✅ Ocorrências registradas com sucesso');
      
      toast({
        title: "Sucesso",
        description: "Ocorrência registrada com sucesso!"
      });

      // Reload existing occurrences to show the new ones immediately 
      await loadExistingOccurrences();

      // Reset e fechar modal
      setPhotos([]);
      setPhotoPreviewUrls(prev => {
        prev.forEach(url => URL.revokeObjectURL(url));
        return [];
      });
      setAudioUrl(null);
      onSuccess();
      
      
    } catch (error: any) {
      console.error('❌ [OCCURRENCE DEBUG] Erro no processo:', error);
      console.error('❌ [OCCURRENCE DEBUG] Stack trace:', error.stack);
      console.error('❌ [OCCURRENCE DEBUG] Error object:', JSON.stringify(error, null, 2));
      toast({
        title: "Erro", 
        description: error.message || 'Erro desconhecido',
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[90vw] max-w-[400px] mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Registrar Ocorrência
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 p-4">
            {/* Histórico de Ocorrências Registradas */}
            {existingOccurrences.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Ocorrências Registradas ({existingOccurrences.length})
                </div>
                
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {existingOccurrences.map((occurrence, index) => (
                    <div key={occurrence.id} className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {occurrence.occurrence_type === 'foto' ? (
                            <ImageIcon className="h-4 w-4 text-blue-600" />
                          ) : (
                            <PlayCircle className="h-4 w-4 text-green-600" />
                          )}
                          <span className="text-sm font-medium capitalize">
                            {occurrence.occurrence_type === 'foto' ? 'Foto' : 'Áudio'} #{index + 1}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {new Date(occurrence.created_at).toLocaleString('pt-BR')}
                        </Badge>
                      </div>
                      
                      {occurrence.occurrence_type === 'foto' ? (
                        <div className="aspect-video bg-muted rounded overflow-hidden">
                          <img
                            src={occurrence.file_url}
                            alt={`Foto ${index + 1}`}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => window.open(occurrence.file_url, '_blank')}
                          />
                        </div>
                      ) : (
                        <div className="bg-background rounded p-2">
                          <AudioPlayer
                            audioUrl={occurrence.file_url}
                            fileName={`audio_${index + 1}.webm`}
                            className="w-full"
                          />
                        </div>
                      )}
                      
                      {occurrence.description && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {occurrence.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loadingOccurrences && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                <span className="ml-2 text-sm text-muted-foreground">Carregando ocorrências...</span>
              </div>
            )}

            {/* Adicionar Nova Ocorrência */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                <Plus className="h-4 w-4" />
                Adicionar Nova Ocorrência
              </div>
            
              {/* Botões para anexos */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowPhotoUpload(true)}
                  className="h-16 flex flex-col items-center gap-2"
                >
                  <Camera className="h-6 w-6" />
                  <span className="text-sm">Tirar Foto</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAudioRecorder(true)}
                  className="h-16 flex flex-col items-center gap-2"
                >
                  <Mic className="h-6 w-6" />
                  <span className="text-sm">Gravar Áudio</span>
                </Button>
              </div>
            </div>

            {/* Pré-visualização das Fotos */}
            {photoPreviewUrls.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Fotos Capturadas ({photoPreviewUrls.length})
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

            {/* Pré-visualização do Áudio */}
            {audioUrl && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PlayCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Áudio Gravado
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeAudio}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <AudioPlayer
                    audioUrl={audioUrl}
                    fileName="audio_ocorrencia.webm"
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Status dos Anexos - Badge resumo */}
            {(photos.length > 0 || audioUrl) && (
              <div className="flex gap-2 justify-center pt-2 border-t">
                {photos.length > 0 && (
                  <Badge variant="default" className="text-xs bg-green-100 text-green-700 border-green-300">
                    ✓ {photos.length} foto{photos.length > 1 ? 's' : ''}
                  </Badge>
                )}
                {audioUrl && (
                  <Badge variant="default" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                    ✓ Áudio gravado
                  </Badge>
                )}
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
              <Button
                className="flex-1"
                onClick={() => {
                  console.log('🔥 [BUTTON DEBUG] Botão Salvar clicado!');
                  console.log('🔥 [BUTTON DEBUG] Fotos atuais:', photos.length);
                  console.log('🔥 [BUTTON DEBUG] Audio URL atual:', audioUrl);
                  console.log('🔥 [BUTTON DEBUG] Botão desabilitado?', photos.length === 0 && !audioUrl);
                  handleSaveOccurrence();
                }}
                disabled={photos.length === 0 && !audioUrl}
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AudioRecorder
        isOpen={showAudioRecorder}
        onClose={() => setShowAudioRecorder(false)}
        onSave={handleAudioSave}
        title="Gravar Áudio da Ocorrência"
        shipmentId={shipmentId}
      />

      <PhotoUpload
        isOpen={showPhotoUpload}
        onClose={() => setShowPhotoUpload(false)}
        onSave={handlePhotoSave}
        title="Tirar Foto da Ocorrência"
      />
    </>
  );
};