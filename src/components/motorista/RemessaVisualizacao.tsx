import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  MapPin, 
  Phone, 
  User, 
  Calendar, 
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RemessaVisualizacaoProps {
  isOpen: boolean;
  onClose: () => void;
  remessa: any;
}

export const RemessaVisualizacao = ({ 
  isOpen, 
  onClose, 
  remessa
}: RemessaVisualizacaoProps) => {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-[400px] max-h-[85vh] p-0 mx-auto">
        <DialogHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              {remessa.tracking_code || `ID${remessa.id.slice(0, 8).toUpperCase()}`}
            </DialogTitle>
            <div className="flex-shrink-0">
              {getStatusBadge(remessa.status)}
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-left">
            Criado em: {format(new Date(remessa.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
          </p>
        </DialogHeader>

        <div className="px-4 pb-4 space-y-4">
          {/* Informações da Mercadoria */}
          <Card className="border-0 shadow-none bg-muted/30">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Informações da Mercadoria
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Peso:</span>
                  <p className="font-medium">{remessa.weight}kg</p>
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
                  <span className="text-muted-foreground">Dimensões:</span>
                  <p className="font-medium">{remessa.length}x{remessa.width}x{remessa.height}cm</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Remetente */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <User className="h-4 w-4" />
              Remetente
            </h4>
            <div className="text-sm space-y-1 ml-6">
              <p className="font-medium">{remessa.sender_address?.name}</p>
              {remessa.sender_address?.phone && (
                <p className="text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {remessa.sender_address.phone}
                </p>
              )}
              <p className="text-muted-foreground">
                {remessa.sender_address?.street}, {remessa.sender_address?.number}
                {remessa.sender_address?.complement && `, ${remessa.sender_address.complement}`}
              </p>
              <p className="text-muted-foreground">
                {remessa.sender_address?.neighborhood}
              </p>
              <p className="text-muted-foreground">
                {remessa.sender_address?.city} - {remessa.sender_address?.state}
              </p>
              <p className="text-muted-foreground">
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
            <div className="text-sm space-y-1 ml-6">
              <p className="font-medium">{remessa.recipient_address?.name}</p>
              {remessa.recipient_address?.phone && (
                <p className="text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {remessa.recipient_address.phone}
                </p>
              )}
              <p className="text-muted-foreground">
                {remessa.recipient_address?.street}, {remessa.recipient_address?.number}
                {remessa.recipient_address?.complement && `, ${remessa.recipient_address.complement}`}
              </p>
              <p className="text-muted-foreground">
                {remessa.recipient_address?.neighborhood}
              </p>
              <p className="text-muted-foreground">
                {remessa.recipient_address?.city} - {remessa.recipient_address?.state}
              </p>
              <p className="text-muted-foreground">
                CEP: {remessa.recipient_address?.cep}
              </p>
            </div>
          </div>

          {/* Botão Voltar */}
          <div className="pt-4 border-t">
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
  );
};