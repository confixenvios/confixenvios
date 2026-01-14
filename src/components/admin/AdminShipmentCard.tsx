import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Package, Eye, Download, MapPin, Clock, FileText, Send, 
  CheckCircle, XCircle, Receipt, Loader2, MessageCircle,
  User, Phone, Tag, ChevronDown, Printer, Truck
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { AdminShipment } from '@/services/shipmentsService';

interface AdminShipmentCardProps {
  shipment: AdminShipment;
  onViewDetails: (shipment: AdminShipment) => void;
  onViewOccurrences: (shipment: AdminShipment) => void;
  onOpenLabelModal: (shipment: AdminShipment) => void;
  onDownloadLabel: (url: string, trackingCode: string) => void;
  onSendWebhook: (shipment: AdminShipment) => void;
  onSendB2BWhatsApp: (shipment: AdminShipment) => void;
  sendingWebhook: boolean;
  sendingB2BWhatsapp: boolean;
  webhookStatus?: 'sent' | 'pending' | 'error';
  getStatusBadge: (status: string) => JSX.Element;
  getQuoteValue: (shipment: AdminShipment) => number;
}

const AdminShipmentCard = ({
  shipment,
  onViewDetails,
  onViewOccurrences,
  onOpenLabelModal,
  onDownloadLabel,
  onSendWebhook,
  onSendB2BWhatsApp,
  sendingWebhook,
  sendingB2BWhatsapp,
  webhookStatus,
  getStatusBadge,
  getQuoteValue
}: AdminShipmentCardProps) => {
  const isB2BExpresso = shipment.tracking_code?.startsWith('B2B-') || shipment.client_name.includes('(Expresso)');
  
  // Verificar se é remessa Jadlog/Nacional
  const isNacionalLabel = shipment.pricing_table_name?.toLowerCase().includes('jadlog') ||
    shipment.pricing_table_name?.toLowerCase().includes('magalog') ||
    shipment.pricing_table_name?.toLowerCase().includes('alfa') ||
    shipment.carrier_order_id ||
    shipment.carrier_barcode;

  // Calcular previsão de entrega
  const getDeliveryDate = () => {
    const deliveryDays = shipment.quote_data?.shippingQuote?.economicDays || 
                         shipment.quote_data?.deliveryDetails?.deliveryDays || 
                         7;
    const createdDate = new Date(shipment.created_at);
    createdDate.setDate(createdDate.getDate() + deliveryDays);
    return createdDate;
  };

  // Obter cor da barra de status
  const getStatusBarColor = () => {
    if (shipment.status === 'DELIVERED' || shipment.status === 'ENTREGA_FINALIZADA' || shipment.status === 'ENTREGUE') {
      return 'bg-emerald-500';
    }
    if (shipment.status === 'PENDING_PAYMENT') {
      return 'bg-red-500';
    }
    if (isB2BExpresso) {
      return 'bg-orange-500';
    }
    return 'bg-primary';
  };

  // Badge de webhook
  const getWebhookBadge = () => {
    if (!['PAID', 'PAYMENT_CONFIRMED', 'LABEL_GENERATED', 'PAGO_AGUARDANDO_ETIQUETA'].includes(shipment.status)) {
      return null;
    }
    
    if (webhookStatus === 'sent') {
      return <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200">Webhook OK</Badge>;
    }
    if (webhookStatus === 'pending') {
      return <Badge className="text-[10px] bg-yellow-100 text-yellow-700 border-yellow-200">Webhook Pendente</Badge>;
    }
    if (webhookStatus === 'error') {
      return <Badge className="text-[10px] bg-red-100 text-red-700 border-red-200">Webhook Erro</Badge>;
    }
    return null;
  };

  const value = getQuoteValue(shipment);
  const deliveryDate = getDeliveryDate();

  return (
    <div
      className={cn(
        "border-0 rounded-xl shadow-md hover:shadow-lg transition-all bg-white overflow-hidden",
        isB2BExpresso && "bg-orange-50/30"
      )}
    >
      {/* Status bar on top */}
      <div className={`h-1.5 ${getStatusBarColor()}`} />
      
      <div className="p-4">
        {/* Header: Código + Data + Status + CTe badges */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              isB2BExpresso ? "bg-orange-500/10" : "bg-primary/10"
            )}>
              <Package className={cn(
                "h-5 w-5",
                isB2BExpresso ? "text-orange-500" : "text-primary"
              )} />
            </div>
            <div>
              <span className="font-mono text-sm font-bold text-foreground">
                {shipment.tracking_code || `ID${shipment.id.slice(0, 8).toUpperCase()}`}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(shipment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Badge de status */}
            {isB2BExpresso ? (
              shipment.status === 'ENTREGUE' ? (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Entrega Finalizada</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-700 border-red-200">Pagamento Confirmado</Badge>
              )
            ) : (
              getStatusBadge(shipment.status)
            )}
            
            {/* Badge de CT-e */}
            {shipment.cte_emission && shipment.cte_emission.status === 'aprovado' && (
              <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                CT-e
              </Badge>
            )}
            {shipment.cte_emission && shipment.cte_emission.status === 'reprovado' && (
              <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                <XCircle className="w-3 h-3 mr-1" />
                CT-e Reprovado
              </Badge>
            )}
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="space-y-2 text-sm mb-3">
          {/* Cliente */}
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{shipment.client_name}</span>
            <span className="text-xs text-muted-foreground">
              ({shipment.user_id ? 'Cadastrado' : 'Anônimo'})
            </span>
          </div>

          {/* Rota */}
          {!isB2BExpresso && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>
                {shipment.sender_address?.city || 'Origem'}/{shipment.sender_address?.state || 'UF'} → {' '}
                {shipment.recipient_address?.city || 'Destino'}/{shipment.recipient_address?.state || 'UF'}
              </span>
            </div>
          )}

          {/* CEPs */}
          {!isB2BExpresso && (
            <div className="text-xs text-muted-foreground pl-5">
              CEP: {shipment.sender_address?.cep || 'N/A'} → {shipment.recipient_address?.cep || 'N/A'}
            </div>
          )}

          {/* Motorista */}
          {isB2BExpresso ? (
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <Truck className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-muted-foreground">Coleta:</span>
                {shipment.motorista_coleta ? (
                  <span className="font-medium">{shipment.motorista_coleta.nome}</span>
                ) : (
                  <Badge variant="outline" className="text-[10px] h-5">Aguardando</Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Entrega:</span>
                {shipment.motorista_entrega ? (
                  <span className="font-medium">{shipment.motorista_entrega.nome}</span>
                ) : (
                  <Badge variant="outline" className="text-[10px] h-5">Aguardando</Badge>
                )}
              </div>
            </div>
          ) : shipment.motoristas ? (
            <div className="flex items-center gap-2 text-xs">
              <Truck className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{shipment.motoristas.nome}</span>
              <Badge className="bg-green-100 text-green-700 text-[10px]">Aceita</Badge>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <Truck className="h-3.5 w-3.5 text-muted-foreground" />
              <Badge variant="outline" className="text-[10px]">Aguardando aceite</Badge>
            </div>
          )}

          {/* Info row: Peso, Previsão, Valor */}
          <div className="flex items-center gap-4 pt-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Package className="h-3 w-3" />
              <span>{shipment.weight}kg • {shipment.format}</span>
            </div>
            {!isB2BExpresso && (
              <div className="flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>Prev: {format(deliveryDate, 'dd/MM/yyyy')}</span>
              </div>
            )}
            <div className="ml-auto">
              <span className="font-bold text-primary">
                R$ {value.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

          {/* Tabela de preços e Transportadora */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {shipment.pricing_table_name && (
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3 text-primary" />
                <span className="text-muted-foreground">Tabela:</span>
                <Badge variant="outline" className="text-[10px]">{shipment.pricing_table_name}</Badge>
              </div>
            )}
            {/* Transportadora - pegar do quote_data.deliveryDetails.selectedCarrier */}
            {(shipment.quote_data?.deliveryDetails?.selectedCarrier || shipment.quote_data?.shippingQuote) && (
              <div className="flex items-center gap-1">
                <Truck className="h-3 w-3 text-primary" />
                <span className="text-muted-foreground">Transportadora:</span>
                <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 uppercase">
                  {shipment.quote_data?.deliveryDetails?.selectedCarrier || 
                   (shipment.quote_data?.shippingQuote?.jadlog?.permitido ? 'Jadlog' : 
                    shipment.quote_data?.shippingQuote?.magalog?.permitido ? 'Magalog' : 
                    'N/A')}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Badges de etiqueta e webhook */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* Etiqueta status */}
          {isNacionalLabel ? (
            (shipment.status === 'LABEL_AVAILABLE' || shipment.label_pdf_url || shipment.carrier_order_id) ? (
              <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                Etiqueta Disponível
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">Aguardando Etiqueta</Badge>
            )
          ) : shipment.label_pdf_url ? (
            <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
              Etiqueta Emitida
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">Aguardando Etiqueta</Badge>
          )}

          {/* Webhook status */}
          {getWebhookBadge()}
        </div>

        {/* Botões de ação */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(shipment)}
            className="h-8"
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Detalhes
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewOccurrences(shipment)}
            className="h-8"
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Ocorrências
          </Button>

          {/* Botão Etiqueta */}
          {isNacionalLabel ? (
            (shipment.status === 'LABEL_AVAILABLE' || shipment.label_pdf_url || shipment.carrier_order_id) && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onOpenLabelModal(shipment)}
                className="h-8 bg-primary hover:bg-primary/90"
              >
                <Tag className="h-3.5 w-3.5 mr-1.5" />
                Etiqueta
              </Button>
            )
          ) : shipment.label_pdf_url && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onDownloadLabel(shipment.label_pdf_url!, shipment.tracking_code || shipment.id)}
              className="h-8 bg-primary hover:bg-primary/90"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              PDF
            </Button>
          )}

          {/* CT-e buttons */}
          {shipment.cte_emission && shipment.cte_emission.status === 'aprovado' && (
            <>
              {shipment.cte_emission.xml_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(shipment.cte_emission!.xml_url!, '_blank')}
                  className="h-8"
                  title="XML do CT-e"
                >
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                </Button>
              )}
              {shipment.cte_emission.dacte_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const response = await fetch(shipment.cte_emission!.dacte_url!);
                      if (!response.ok) throw new Error('Erro ao baixar DACTE');
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `DACTE-${shipment.cte_emission!.numero_cte || shipment.tracking_code}.pdf`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);
                    } catch (error) {
                      console.error('Erro ao baixar DACTE:', error);
                      window.open(shipment.cte_emission!.dacte_url!, '_blank');
                    }
                  }}
                  className="h-8"
                  title="DACTE"
                >
                  <Receipt className="h-3.5 w-3.5 text-green-600" />
                </Button>
              )}
            </>
          )}

          {/* Webhook button */}
          {!isB2BExpresso && ['PAID', 'PAYMENT_CONFIRMED', 'LABEL_GENERATED', 'PAGO_AGUARDANDO_ETIQUETA'].includes(shipment.status) && (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => onSendWebhook(shipment)}
              disabled={sendingWebhook}
            >
              {sendingWebhook ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5 mr-1.5" />
              )}
              Webhook
            </Button>
          )}

          {/* B2B WhatsApp */}
          {isB2BExpresso && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSendB2BWhatsApp(shipment)}
              disabled={sendingB2BWhatsapp}
              className="h-8 text-green-600 hover:bg-green-50"
            >
              {sendingB2BWhatsapp ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
              )}
              WhatsApp
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminShipmentCard;
