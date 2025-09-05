import { useState } from 'react';
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
  PenTool,
  FileText,
  ArrowLeft,
  Truck
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SignaturePad } from './SignaturePad';
import { PhotoUpload } from './PhotoUpload';
import { OccurrenceModal } from './OccurrenceModal';

interface RemessaDetalhesProps {
  isOpen: boolean;
  onClose: () => void;
  remessa: any;
  onUpdateStatus: (remessaId: string, newStatus: string, data?: any) => void;
}

export const RemessaDetalhes = ({ 
  isOpen, 
  onClose, 
  remessa, 
  onUpdateStatus 
}: RemessaDetalhesProps) => {
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [showOccurrenceModal, setShowOccurrenceModal] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [signature, setSignature] = useState<string | null>(null);

  if (!remessa) return null;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'PENDING_LABEL': { label: 'Aguardando Etiqueta', variant: 'secondary' as const },
      'LABEL_GENERATED': { label: 'Etiqueta Gerada', variant: 'default' as const },
      'COLETA_ACEITA': { label: 'Coleta Aceita', variant: 'default' as const },
      'COLETA_FINALIZADA': { label: 'Coleta Finalizada', variant: 'success' as const },
      'EM_TRANSITO': { label: 'Em Trânsito', variant: 'default' as const },
      'TENTATIVA_ENTREGA': { label: 'Tentativa de Entrega', variant: 'destructive' as const },
      'ENTREGA_FINALIZADA': { label: 'Entregue', variant: 'success' as const },
      'AGUARDANDO_DESTINATARIO': { label: 'Aguardando Destinatário', variant: 'secondary' as const },
      'ENDERECO_INCORRETO': { label: 'Endereço Incorreto', variant: 'destructive' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                   { label: status, variant: 'outline' as const };
    
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const canAcceptPickup = () => {
    return ['PENDING_LABEL', 'LABEL_GENERATED'].includes(remessa.status);
  };

  const canRegisterOccurrence = () => {
    return !['ENTREGA_FINALIZADA'].includes(remessa.status);
  };

  const handleAcceptPickup = () => {
    onUpdateStatus(remessa.id, 'COLETA_ACEITA');
  };

  const handlePhotoSave = (photo: File) => {
    setPhotos(prev => [...prev, photo]);
  };

  const handleSignatureSave = (signatureDataUrl: string) => {
    setSignature(signatureDataUrl);
  };

  const handleOccurrenceSave = (occurrence: any) => {
    const data = {
      occurrence,
      photos: photos.length > 0 ? photos : undefined,
      signature: signature || undefined
    };
    
    onUpdateStatus(remessa.id, occurrence.newStatus, data);
    
    // Reset attachments after saving
    setPhotos([]);
    setSignature(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount / 100);
  };

  const getFreightValue = () => {
    // Tenta pegar do payment_data primeiro (já em centavos)
    if (remessa.payment_data?.pix_details?.amount) {
      return remessa.payment_data.pix_details.amount;
    }
    if (remessa.payment_data?.pixData?.amount) {
      return remessa.payment_data.pixData.amount;
    }
    if (remessa.payment_data?.amount) {
      return remessa.payment_data.amount;
    }
    
    // Se não encontrar no payment_data, busca no quote_data
    if (remessa.quote_data?.deliveryDetails?.totalPrice) {
      return remessa.quote_data.deliveryDetails.totalPrice * 100; // Converte para centavos
    }
    if (remessa.quote_data?.deliveryDetails?.shippingPrice) {
      return remessa.quote_data.deliveryDetails.shippingPrice * 100; // Converte para centavos
    }
    if (remessa.quote_data?.amount) {
      return remessa.quote_data.amount * 100; // Converte para centavos
    }
    
    return 0;
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
                      onClick={() => setShowSignaturePad(true)}
                    >
                      <PenTool className="h-4 w-4 mr-1" />
                      Assinatura
                    </Button>
                  </div>

                  {/* Status dos Anexos */}
                  {(photos.length > 0 || signature) && (
                    <div className="flex gap-2 text-xs">
                      {photos.length > 0 && (
                        <Badge variant="outline">
                          {photos.length} foto{photos.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {signature && (
                        <Badge variant="outline">
                          Assinatura capturada
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
                      <p className="text-muted-foreground text-xs">Valor do Frete</p>
                      <p className="font-medium text-success">
                        {formatCurrency(getFreightValue())}
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

      <SignaturePad
        isOpen={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        onSave={handleSignatureSave}
        title="Assinatura do Recebedor"
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