import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Package, 
  Calendar, 
  MapPin, 
  Weight, 
  Clock, 
  Truck, 
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";

interface CarrierTrackingEvent {
  data: string;
  status: string;
  unidade: string;
}

interface CarrierTrackingVolume {
  peso: number;
  altura: number;
  largura: number;
  comprimento: number;
}

// Estrutura flexível para lidar com diferentes formatos de resposta
interface CarrierTrackingData {
  consulta?: Array<{
    codigo?: string;
    shipmentId?: string;
    tracking?: {
      codigo?: string;
      shipmentId?: string;
      dacte?: string;
      dtEmissao?: string;
      status?: string;
      valor?: number;
      peso?: number;
      eventos?: CarrierTrackingEvent[];
      volumes?: CarrierTrackingVolume[];
    };
    previsaoEntrega?: string;
  }>;
}

interface CarrierTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackingData: CarrierTrackingData | any;
  loading: boolean;
  error: string | null;
  trackingCode: string;
}

const getStatusBadge = (status: string | undefined | null) => {
  if (!status) {
    return <Badge variant="secondary">Sem dados</Badge>;
  }
  
  const statusLower = status.toLowerCase();
  
  if (statusLower.includes('entregue') || statusLower === 'entrega realizada') {
    return <Badge className="bg-green-500 hover:bg-green-600 text-white"><CheckCircle className="w-3 h-3 mr-1" />Entregue</Badge>;
  }
  if (statusLower.includes('transito') || statusLower.includes('trânsito')) {
    return <Badge className="bg-blue-500 hover:bg-blue-600 text-white"><Truck className="w-3 h-3 mr-1" />Em Trânsito</Badge>;
  }
  if (statusLower.includes('coleta')) {
    return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white"><Package className="w-3 h-3 mr-1" />Coleta</Badge>;
  }
  if (statusLower.includes('emissao') || statusLower.includes('emissão')) {
    return <Badge className="bg-purple-500 hover:bg-purple-600 text-white"><FileText className="w-3 h-3 mr-1" />Emissão</Badge>;
  }
  
  return <Badge variant="secondary">{status}</Badge>;
};

const formatValue = (value: any, suffix?: string): string => {
  if (value === undefined || value === null || value === '') {
    return 'Sem dados';
  }
  return suffix ? `${value}${suffix}` : String(value);
};

const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null) {
    return 'Sem dados';
  }
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
};

const CarrierTrackingModal = ({ 
  isOpen, 
  onClose, 
  trackingData, 
  loading, 
  error,
  trackingCode 
}: CarrierTrackingModalProps) => {
  // Extrair dados com fallbacks para diferentes estruturas de resposta
  const rawData = trackingData;
  const consulta = rawData?.consulta?.[0];
  const tracking = consulta?.tracking;
  
  // Dados podem estar no nível consulta ou dentro de tracking
  const codigo = tracking?.codigo || consulta?.codigo || consulta?.shipmentId;
  const shipmentId = tracking?.shipmentId || consulta?.shipmentId;
  const status = tracking?.status;
  const dtEmissao = tracking?.dtEmissao;
  const previsaoEntrega = consulta?.previsaoEntrega;
  const valor = tracking?.valor;
  const peso = tracking?.peso;
  const dacte = tracking?.dacte;
  const eventos = tracking?.eventos || [];
  const volumes = tracking?.volumes || [];

  // Verifica se há algum dado para exibir
  const hasAnyData = consulta || tracking;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Rastreamento na Transportadora
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Consultando transportadora...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <p className="text-destructive font-medium">Erro ao consultar</p>
            <p className="text-muted-foreground text-sm text-center mt-2">{error}</p>
          </div>
        )}

        {!loading && !error && !hasAnyData && (
          <div className="flex flex-col items-center justify-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum dado de rastreamento disponível</p>
          </div>
        )}

        {!loading && !error && hasAnyData && (
          <div className="space-y-6">
            {/* Informações Gerais */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Código</p>
                    <p className="font-mono font-medium">{formatValue(codigo)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                    {getStatusBadge(status)}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Emissão</p>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      {formatValue(dtEmissao)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Previsão Entrega</p>
                    <div className="flex items-center gap-1 text-sm font-medium text-primary">
                      <Clock className="w-3 h-3" />
                      {formatValue(previsaoEntrega)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Valor Frete</p>
                    <p className="font-medium">{formatCurrency(valor)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Peso</p>
                    <div className="flex items-center gap-1 text-sm">
                      <Weight className="w-3 h-3 text-muted-foreground" />
                      {peso !== undefined && peso !== null ? `${peso} kg` : 'Sem dados'}
                    </div>
                  </div>
                </div>

                {dacte && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Chave DACTE</p>
                      <p className="font-mono text-xs break-all bg-muted p-2 rounded">
                        {dacte}
                      </p>
                    </div>
                  </>
                )}

                {shipmentId && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">ID Remessa</p>
                      <p className="font-mono text-sm">{shipmentId}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Timeline de Eventos */}
            {eventos && eventos.length > 0 ? (
              <Card>
                <CardContent className="pt-4">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Histórico de Eventos
                  </h3>
                  <div className="relative">
                    {eventos.map((evento: CarrierTrackingEvent, index: number) => (
                      <div key={index} className="relative flex items-start gap-3 pb-6 last:pb-0">
                        {/* Timeline line */}
                        {index < eventos.length - 1 && (
                          <div className="absolute left-3 top-6 w-0.5 h-full bg-border" />
                        )}
                        
                        {/* Timeline dot */}
                        <div className={`relative z-10 flex items-center justify-center w-6 h-6 rounded-full border-2 ${
                          index === 0 
                            ? 'bg-primary border-primary text-primary-foreground' 
                            : 'bg-background border-border'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-primary-foreground' : 'bg-muted-foreground'}`} />
                        </div>
                        
                        {/* Event details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{evento.status || 'Sem dados'}</p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{evento.unidade || 'Sem dados'}</span>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {evento.data ? new Date(evento.data.replace(' ', 'T')).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'Sem dados'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-4">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Histórico de Eventos
                  </h3>
                  <p className="text-muted-foreground text-sm">Sem eventos registrados</p>
                </CardContent>
              </Card>
            )}

            {/* Volumes */}
            {volumes && volumes.length > 0 ? (
              <Card>
                <CardContent className="pt-4">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Volumes ({volumes.length})
                  </h3>
                  <div className="grid gap-3">
                    {volumes.map((volume: CarrierTrackingVolume, index: number) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <span className="text-sm font-medium">Volume {index + 1}</span>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Peso: {volume.peso !== undefined ? `${volume.peso} kg` : 'Sem dados'}</span>
                          {(volume.comprimento > 0 || volume.largura > 0 || volume.altura > 0) && (
                            <span>
                              {volume.comprimento}x{volume.largura}x{volume.altura} cm
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-4">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Volumes
                  </h3>
                  <p className="text-muted-foreground text-sm">Sem dados de volumes</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CarrierTrackingModal;
