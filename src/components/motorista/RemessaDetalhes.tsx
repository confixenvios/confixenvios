import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Package, 
  MapPin, 
  Phone, 
  User, 
  Calendar, 
  CheckCircle,
  Camera,
  Mic,
  FileText,
  ArrowLeft,
  Truck
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AudioRecorder } from './AudioRecorder';
import { PhotoUpload } from './PhotoUpload';
import { OccurrenceModal } from './OccurrenceModal';
import { createSecureSupabaseClient } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RemessaDetalhesProps {
  isOpen: boolean;
  onClose: () => void;
  remessa: any;
  onUpdateStatus: (newStatus: string, data?: any) => void;
}

export const RemessaDetalhes = ({ 
  isOpen, 
  onClose, 
  remessa, 
  onUpdateStatus 
}: RemessaDetalhesProps) => {
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [showOccurrenceModal, setShowOccurrenceModal] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Reset attachments when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setPhotos([]);
      setAudioUrl(null);
    }
  }, [isOpen]);

  if (!remessa) return null;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'PENDING_LABEL': { label: 'Aguardando Etiqueta', variant: 'secondary' as const },
      'LABEL_GENERATED': { label: 'Etiqueta Gerada', variant: 'default' as const },
      'PAYMENT_CONFIRMED': { label: 'Disponível para Coleta', variant: 'default' as const },
      'PAID': { label: 'Disponível para Coleta', variant: 'default' as const },
      'COLETA_ACEITA': { label: 'Coleta Aceita', variant: 'default' as const },
      'COLETA_FINALIZADA': { label: 'Coleta Realizada', variant: 'success' as const },
      'EM_TRANSITO': { label: 'Em Trânsito', variant: 'default' as const },
      'TENTATIVA_ENTREGA': { label: 'Insucesso na Entrega', variant: 'destructive' as const },
      'ENTREGA_FINALIZADA': { label: 'Entregue', variant: 'success' as const },
      'AGUARDANDO_DESTINATARIO': { label: 'Aguardando Destinatário', variant: 'secondary' as const },
      'ENDERECO_INCORRETO': { label: 'Endereço Incorreto', variant: 'destructive' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                   { label: status, variant: 'outline' as const };
    
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const canAcceptPickup = () => {
    return ['PENDING_LABEL', 'LABEL_GENERATED', 'PAYMENT_CONFIRMED', 'PAID'].includes(remessa.status) && !remessa.motorista_id;
  };

  const canRegisterOccurrence = () => {
    return remessa.motorista_id && ['COLETA_ACEITA', 'COLETA_FINALIZADA', 'EM_TRANSITO', 'TENTATIVA_ENTREGA'].includes(remessa.status);
  };

  const canChangeStatus = () => {
    return remessa.motorista_id && ['COLETA_ACEITA', 'COLETA_FINALIZADA', 'EM_TRANSITO', 'TENTATIVA_ENTREGA'].includes(remessa.status);
  };

  const handleAcceptPickup = () => {
    onUpdateStatus('COLETA_ACEITA');
  };

  const handlePhotoSave = (photo: File) => {
    setPhotos(prev => [...prev, photo]);
  };

  const handleAudioSave = (savedAudioUrl: string) => {
    setAudioUrl(savedAudioUrl);
  };

  const handleOccurrenceSave = async (occurrence: any) => {
    console.log('🎯 Iniciando salvamento separado - Status e Ocorrências:', {
      remessaId: remessa.id,
      motoristaId: remessa.motorista_id,
      occurrence,
      photosCount: photos.length,
      hasAudio: !!audioUrl
    });

    const supabase = createSecureSupabaseClient();
    
    try {
      // 1. Atualizar status da remessa
      console.log('📊 Atualizando status da remessa...');
      const { error: updateError } = await supabase
        .from('shipments')
        .update({ 
          status: occurrence.newStatus,
          updated_at: new Date().toISOString() 
        })
        .eq('id', remessa.id);
        
      if (updateError) {
        console.error('❌ Erro ao atualizar status:', updateError);
        throw new Error(`Erro ao atualizar status: ${updateError.message}`);
      }

      // 2. Registrar mudança de status no histórico
      console.log('📝 Registrando no histórico de status...');
      const { error: statusError } = await supabase
        .from('shipment_status_history')
        .insert({
          shipment_id: remessa.id,
          status: occurrence.newStatus,
          motorista_id: remessa.motorista_id,
          observacoes: occurrence.observations || null,
          status_description: occurrence.description,
          occurrence_data: {
            type: occurrence.type,
            description: occurrence.description,
            timestamp: new Date().toISOString()
          }
        });
      
      if (statusError) {
        console.error('❌ Erro ao registrar status:', statusError);
        throw new Error(`Erro ao registrar histórico: ${statusError.message}`);
      }

      // 3. Salvar fotos como ocorrências
      if (photos.length > 0) {
        console.log('📸 Fazendo upload e salvando fotos...');
        
        for (const photo of photos) {
          // Upload da foto
          const fileName = `photo_${remessa.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
          const filePath = `shipment-photos/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('shipment-photos')
            .upload(filePath, photo, {
              contentType: 'image/jpeg',
              upsert: false
            });
          
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('shipment-photos')
              .getPublicUrl(filePath);
              
            // Registrar foto como ocorrência
            const { error: photoError } = await supabase
              .from('shipment_occurrences')
              .insert({
                shipment_id: remessa.id,
                motorista_id: remessa.motorista_id,
                occurrence_type: 'foto',
                file_url: publicUrl,
                description: occurrence.observations || null
              });
              
            if (photoError) {
              console.error('❌ Erro ao registrar foto:', photoError);
            } else {
              console.log('📸 Foto registrada como ocorrência:', publicUrl);
            }
          } else {
            console.error('❌ Erro no upload da foto:', uploadError);
          }
        }
      }

      // 4. Salvar áudio como ocorrência
      if (audioUrl) {
        console.log('🎵 Registrando áudio como ocorrência...');
        const { error: audioError } = await supabase
          .from('shipment_occurrences')
          .insert({
            shipment_id: remessa.id,
            motorista_id: remessa.motorista_id,
            occurrence_type: 'audio',
            file_url: audioUrl,
            description: occurrence.observations || null
          });
          
        if (audioError) {
          console.error('❌ Erro ao registrar áudio:', audioError);
        } else {
          console.log('🎵 Áudio registrado como ocorrência');
        }
      }
      
      console.log('✅ Processo completo finalizado');
      
      toast({
        title: "Sucesso",
        description: "Status atualizado e ocorrências registradas!"
      });
      
    } catch (error: any) {
      console.error('❌ Erro no processo:', error);
      toast({
        title: "Erro", 
        description: error.message,
        variant: "destructive"
      });
    }
    
    // Reset states
    setPhotos([]);
    setAudioUrl(null);
    setShowOccurrenceModal(false);
    onUpdateStatus(occurrence.newStatus);
  };


  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[90vw] max-w-[400px] max-h-[85vh] p-0 mx-auto">
          <DialogHeader className="p-4 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold">
                {remessa.tracking_code || `ID${remessa.id.slice(0, 8).toUpperCase()}`}
              </DialogTitle>
              
              {/* Botão Aceitar Coleta ou Status */}
              {canAcceptPickup() ? (
                <Button
                  size="sm"
                  onClick={handleAcceptPickup}
                  className="h-8 px-3"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Coleta Aceita
                </Button>
              ) : canChangeStatus() ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOccurrenceModal(true)}
                  className="h-8 px-2"
                >
                  {getStatusBadge(remessa.status)}
                </Button>
              ) : (
                getStatusBadge(remessa.status)
              )}
            </div>
          </DialogHeader>

          <div className="p-4 pt-2">
            {/* Registrar Ocorrência - Simples */}
            {canChangeStatus() && (
              <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                <h4 className="text-sm font-medium mb-3 text-center">Registrar Ocorrência</h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowPhotoUpload(true)}
                    className="flex-1 h-10"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Foto
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAudioRecorder(true)}
                    className="flex-1 h-10"
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    Áudio
                  </Button>
                </div>
                {(photos.length > 0 || audioUrl) && (
                  <div className="flex gap-2 mt-2 justify-center">
                    {photos.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {photos.length} foto{photos.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {audioUrl && (
                      <Badge variant="secondary" className="text-xs">
                        Áudio
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )}

            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-4">
                {/* Info Básica */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Peso Total:</span>
                    <p className="font-medium">{Number(remessa.weight).toFixed(2)}kg</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Formato:</span>
                    <p className="font-medium capitalize">{remessa.format}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Serviço:</span>
                    <p className="font-medium">
                      {remessa.selected_option === 'express' ? 'Expresso' : 'Econômico'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Volumes:</span>
                    <p className="font-medium">
                      {remessa.quote_data?.merchandiseDetails?.volumes?.length || 
                       remessa.quote_data?.technicalData?.volumes?.length || 1}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Volumes Individuais */}
                {(() => {
                  const volumes = remessa.quote_data?.merchandiseDetails?.volumes || 
                                  remessa.quote_data?.technicalData?.volumes || 
                                  remessa.quote_data?.originalFormData?.volumes ||
                                  remessa.quote_data?.volumes ||
                                  remessa.quote_data?.quoteData?.volumes;
                  
                  if (Array.isArray(volumes) && volumes.length > 0) {
                    return (
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Volumes Individuais
                        </h4>
                        <div className="space-y-2">
                          {volumes.map((volume: any, index: number) => (
                            <div key={index} className="p-3 border border-primary/20 rounded-lg bg-primary/5">
                              <div className="flex items-center mb-2">
                                <Package className="w-4 h-4 mr-2 text-primary" />
                                <span className="font-medium text-sm">Volume {index + 1}</span>
                              </div>
                              <div className="grid grid-cols-4 gap-2 text-xs">
                                <div>
                                  <p className="text-muted-foreground">Peso</p>
                                  <p className="font-medium">{volume.weight || volume.peso}kg</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Compr.</p>
                                  <p className="font-medium">{volume.length || volume.comprimento}cm</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Largura</p>
                                  <p className="font-medium">{volume.width || volume.largura}cm</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Altura</p>
                                  <p className="font-medium">{volume.height || volume.altura}cm</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                <Separator />

                {/* Remetente */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Remetente
                  </h4>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">{remessa.sender_address?.name}</p>
                    {remessa.sender_address?.phone && (
                      <p className="text-muted-foreground">
                        <Phone className="h-3 w-3 inline mr-1" />
                        {remessa.sender_address.phone}
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      {remessa.sender_address?.street}, {remessa.sender_address?.number}
                      <br />
                      {remessa.sender_address?.neighborhood}
                      <br />
                      {remessa.sender_address?.city} - {remessa.sender_address?.state}
                      <br />
                      CEP: {remessa.sender_address?.cep}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Destinatário */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Destinatário
                  </h4>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">{remessa.recipient_address?.name}</p>
                    {remessa.recipient_address?.phone && (
                      <p className="text-muted-foreground">
                        <Phone className="h-3 w-3 inline mr-1" />
                        {remessa.recipient_address.phone}
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      {remessa.recipient_address?.street}, {remessa.recipient_address?.number}
                      <br />
                      {remessa.recipient_address?.neighborhood}
                      <br />
                      {remessa.recipient_address?.city} - {remessa.recipient_address?.state}
                      <br />
                      CEP: {remessa.recipient_address?.cep}
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Botão Voltar */}
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={onClose}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AudioRecorder
        isOpen={showAudioRecorder}
        onClose={() => setShowAudioRecorder(false)}
        onSave={handleAudioSave}
        title="Confirmação do Cliente"
        shipmentId={remessa.id}
      />

      <PhotoUpload
        isOpen={showPhotoUpload}
        onClose={() => setShowPhotoUpload(false)}
        onSave={handlePhotoSave}
        title="Foto da Mercadoria"
      />

      <OccurrenceModal
        isOpen={showOccurrenceModal}
        onClose={() => setShowOccurrenceModal(false)}
        onSave={handleOccurrenceSave}
        shipmentId={remessa.id}
      />
    </>
  );
};