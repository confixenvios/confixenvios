import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import B2BLabelGenerator from '@/components/b2b/B2BLabelGenerator';
import B2BStatusBadge from '@/components/b2b/B2BStatusBadge';

interface B2BShipment {
  id: string;
  tracking_code: string;
  status: string;
  created_at: string;
  recipient_name: string | null;
  recipient_phone: string | null;
  recipient_cep: string | null;
  recipient_city: string | null;
  recipient_state: string | null;
  recipient_street: string | null;
  recipient_number: string | null;
  recipient_complement?: string | null;
  recipient_neighborhood: string | null;
  volume_count: number | null;
  volume_weight: number | null;
  volume_eti_code: string | null;
  delivery_date?: string | null;
  observations?: string | null;
  motorista_id: string | null;
  motorista_nome?: string | null;
}

interface CdShipmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: B2BShipment | null;
}

const CdShipmentDetailsModal = ({ isOpen, onClose, shipment }: CdShipmentDetailsModalProps) => {
  if (!shipment) return null;

  const parseObservations = (observations: string | null | undefined) => {
    if (!observations) return null;
    try {
      return JSON.parse(observations);
    } catch {
      return null;
    }
  };

  const obs = parseObservations(shipment.observations);

  // Preparar dados para o gerador de etiquetas
  const volumeAddresses = obs?.volume_addresses || (obs?.volume_address ? [obs.volume_address] : []);
  const volumeWeights = obs?.volume_weights || [shipment.volume_weight || 0];
  const pickupAddress = obs?.pickup_address || {};

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Detalhes do Pedido</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[calc(85vh-100px)] px-6 py-4">
          <div className="space-y-4">
            {/* Código de Rastreio e Volumes */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Código de Rastreio</p>
                <p className="font-mono font-semibold">{shipment.tracking_code}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Volumes</p>
                <p className="font-semibold">{shipment.volume_count || 1}</p>
              </div>
            </div>

            {/* Data de Entrega e Criado em */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Data de Entrega</p>
                <p className="font-semibold">
                  {shipment.delivery_date 
                    ? format(new Date(shipment.delivery_date), 'dd/MM/yyyy')
                    : format(new Date(), 'dd/MM/yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Criado em</p>
                <p className="font-semibold">
                  {format(new Date(shipment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>

            {/* Status */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <B2BStatusBadge status={shipment.status} showIcon size="sm" />
            </div>

            {/* Destinatário */}
            <hr className="border-border" />
            <h4 className="font-semibold">Destinatário</h4>
            <div className="p-3 bg-muted/30 rounded-lg border">
              <p className="font-semibold">{shipment.recipient_name || volumeAddresses[0]?.recipient_name || volumeAddresses[0]?.name || 'Destinatário'}</p>
              {(shipment.recipient_phone || volumeAddresses[0]?.recipient_phone) && (
                <p className="text-sm text-muted-foreground">{shipment.recipient_phone || volumeAddresses[0]?.recipient_phone}</p>
              )}
              {(shipment.recipient_street || volumeAddresses[0]?.street) && (
                <>
                  <p className="text-sm text-muted-foreground mt-1">
                    {shipment.recipient_street || volumeAddresses[0]?.street}, {shipment.recipient_number || volumeAddresses[0]?.number}
                    {(shipment.recipient_complement || volumeAddresses[0]?.complement) && `, ${shipment.recipient_complement || volumeAddresses[0]?.complement}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {shipment.recipient_neighborhood || volumeAddresses[0]?.neighborhood} - {shipment.recipient_city || volumeAddresses[0]?.city}/{shipment.recipient_state || volumeAddresses[0]?.state}
                  </p>
                  <p className="text-sm text-muted-foreground">CEP: {shipment.recipient_cep || volumeAddresses[0]?.cep}</p>
                </>
              )}
            </div>

            {/* Dados do Pagamento */}
            {obs && (
              <>
                <hr className="border-border" />
                <h4 className="font-semibold">Dados do Pagamento</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Veículo</p>
                    <p className="font-semibold capitalize">{obs.vehicle_type || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Pago</p>
                    <p className="font-semibold text-green-600">
                      R$ {obs.amount_paid?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>

                {/* Peso do Volume */}
                {(shipment.volume_weight || obs.volume_weights) && (
                  <div>
                    <p className="text-sm text-muted-foreground">Peso</p>
                    <p className="font-semibold">
                      {shipment.volume_weight || obs.volume_weights?.[0] || 0} kg
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Motorista */}
            {shipment.motorista_nome && (
              <>
                <hr className="border-border" />
                <h4 className="font-semibold">Motorista</h4>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-semibold text-blue-700">{shipment.motorista_nome}</p>
                  <p className="text-xs text-blue-600">Responsável pela coleta/entrega</p>
                </div>
              </>
            )}

            {/* Etiquetas */}
            {(volumeAddresses.length > 0 || pickupAddress) && (
              <>
                <hr className="border-border" />
                <h4 className="font-semibold">Etiquetas</h4>
                <B2BLabelGenerator
                  shipmentId={shipment.id}
                  trackingCode={shipment.tracking_code}
                  volumeCount={shipment.volume_count || 1}
                  volumeWeights={volumeWeights}
                  volumeAddresses={volumeAddresses}
                  pickupAddress={pickupAddress}
                  companyName="CONFIX ENVIOS"
                  deliveryDate={shipment.delivery_date || undefined}
                  shipmentVolumeWeight={shipment.volume_weight || undefined}
                />
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CdShipmentDetailsModal;
