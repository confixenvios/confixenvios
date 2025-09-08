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
      'PAYMENT_CONFIRMED': { label: 'Pagamento Confirmado', variant: 'success' as const },
      'PAID': { label: 'Pago', variant: 'success' as const },
      'COLETA_ACEITA': { label: 'Coleta Aceita', variant: 'default' as const },
      'COLETA_FINALIZADA': { label: 'Coleta Realizada', variant: 'success' as const },
      'EM_TRANSITO': { label: 'Em Trânsito', variant: 'default' as const },
      'TENTATIVA_ENTREGA': { label: 'Insucesso na Entrega', variant: 'destructive' as const },
      'ENTREGA_FINALIZADA': { label: 'Entregue ao Destinatário com Sucesso', variant: 'success' as const },
      'AGUARDANDO_DESTINATARIO': { label: 'Aguardando Destinatário', variant: 'secondary' as const },
      'ENDERECO_INCORRETO': { label: 'Endereço Incorreto', variant: 'destructive' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                   { label: status, variant: 'outline' as const };
    
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const canAcceptPickup = () => {
    return ['PENDING_LABEL', 'LABEL_GENERATED', 'PAYMENT_CONFIRMED', 'PAID'].includes(remessa.status);
  };

  const canRegisterOccurrence = () => {
    return !['ENTREGA_FINALIZADA'].includes(remessa.status);
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
        <DialogContent className="w-[90vw] max-w-[400px] max-h-[85vh] p-4 mx-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" />
              Detalhes da Remessa
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh] pr-2">
            <div className="space-y-3">
              {/* Status e Ações Principais */}
              <Card className="border-0 shadow-none bg-muted/30">
                <CardHeader className="pb-2 px-4 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight break-words flex-1 min-w-0">
                      {remessa.tracking_code || `ID${remessa.id.slice(0, 8).toUpperCase()}`}
                    </CardTitle>
                    <div className="flex-shrink-0">
                      {getStatusBadge(remessa.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3 px-4 pb-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>Criado em: {format(new Date(remessa.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                  </div>

                  {/* Ações Rápidas */}
                  <div className="space-y-2">
                    {canAcceptPickup() && (
                      <Button
                        className="w-full"
                        onClick={handleAcceptPickup}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Aceitar Coleta
                      </Button>
                    )}
                    
                    {canRegisterOccurrence() && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowOccurrenceModal(true)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Registrar Ocorrência
                      </Button>
                    )}
                  </div>

                  {/* Anexos */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-sm"
                      onClick={() => setShowPhotoUpload(true)}
                    >
                      <Camera className="h-4 w-4 mr-1" />
                      Foto
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-sm"
                      onClick={() => setShowAudioRecorder(true)}
                    >
                      <Mic className="h-4 w-4 mr-1" />
                      Áudio
                    </Button>
                  </div>

                  {/* Status dos Anexos */}
                  {(photos.length > 0 || audioUrl) && (
                    <div className="flex gap-2 text-xs">
                      {photos.length > 0 && (
                        <Badge variant="outline">
                          {photos.length} foto{photos.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {audioUrl && (
                        <Badge variant="outline">
                          Áudio gravado
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Informações da Remessa */}
              <Card className="border-0 shadow-none bg-muted/30">
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardTitle className="text-base">Informações da Remessa</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Peso</p>
                      <p className="font-medium">{remessa.weight}kg</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Formato</p>
                      <p className="font-medium capitalize">{remessa.format}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Serviço</p>
                      <p className="font-medium">
                        {remessa.selected_option === 'express' ? 'Expresso' : 'Econômico'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Dimensões</p>
                      <p className="font-medium">
                        {remessa.length}x{remessa.width}x{remessa.height}cm
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Remetente */}
              <Card className="border-0 shadow-none bg-muted/30">
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Remetente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm px-4 pb-4">
                  <div>
                    <p className="font-medium break-words">{remessa.sender_address?.name}</p>
                    {remessa.sender_address?.phone && (
                      <div className="flex items-center text-muted-foreground mt-1">
                        <Phone className="w-3 h-3 mr-1 flex-shrink-0" />
                        <a href={`tel:${remessa.sender_address.phone}`} className="hover:underline break-words">
                          {remessa.sender_address.phone}
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3 h-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div className="text-muted-foreground text-xs leading-relaxed">
                      <p className="break-words">{remessa.sender_address?.street}, {remessa.sender_address?.number}</p>
                      <p className="break-words">{remessa.sender_address?.neighborhood}</p>
                      <p className="break-words">{remessa.sender_address?.city} - {remessa.sender_address?.state}</p>
                      <p>CEP: {remessa.sender_address?.cep}</p>
                      {remessa.sender_address?.complement && (
                        <p className="break-words">Complemento: {remessa.sender_address.complement}</p>
                      )}
                      {remessa.sender_address?.reference && (
                        <p className="break-words">Referência: {remessa.sender_address.reference}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Destinatário */}
              <Card className="border-0 shadow-none bg-muted/30">
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Destinatário
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm px-4 pb-4">
                  <div>
                    <p className="font-medium break-words">{remessa.recipient_address?.name}</p>
                    {remessa.recipient_address?.phone && (
                      <div className="flex items-center text-muted-foreground mt-1">
                        <Phone className="w-3 h-3 mr-1 flex-shrink-0" />
                        <a href={`tel:${remessa.recipient_address.phone}`} className="hover:underline break-words">
                          {remessa.recipient_address.phone}
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3 h-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div className="text-muted-foreground text-xs leading-relaxed">
                      <p className="break-words">{remessa.recipient_address?.street}, {remessa.recipient_address?.number}</p>
                      <p className="break-words">{remessa.recipient_address?.neighborhood}</p>
                      <p className="break-words">{remessa.recipient_address?.city} - {remessa.recipient_address?.state}</p>
                      <p>CEP: {remessa.recipient_address?.cep}</p>
                      {remessa.recipient_address?.complement && (
                        <p className="break-words">Complemento: {remessa.recipient_address.complement}</p>
                      )}
                      {remessa.recipient_address?.reference && (
                        <p className="break-words">Referência: {remessa.recipient_address.reference}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>

          <div className="flex pt-3 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={onClose}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
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