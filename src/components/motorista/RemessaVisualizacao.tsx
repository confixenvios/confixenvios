import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
  ArrowLeft,
  History,
  Eye,
  Image as ImageIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface RemessaVisualizacaoProps {
  isOpen: boolean;
  onClose: () => void;
  remessa: any;
}

interface StatusHistoryEntry {
  id: string;
  status: string;
  status_description: string | null;
  observacoes: string | null;
  created_at: string;
  motorista_id: string | null;
  motoristas?: { nome: string; telefone: string } | null;
  photo_url?: string | null;
}

export const RemessaVisualizacao = ({ 
  isOpen, 
  onClose, 
  remessa
}: RemessaVisualizacaoProps) => {
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen && remessa) {
      loadStatusHistory();
    }
  }, [isOpen, remessa]);

  const loadStatusHistory = async () => {
    if (!remessa) return;
    
    setLoadingHistory(true);
    try {
      const isB2B = remessa.tracking_code?.startsWith('B2B-');
      
      // Para B2B, buscar o ID real da tabela b2b_shipments
      let shipmentIdForHistory = remessa.id;
      
      if (isB2B) {
        // Buscar o ID real do b2b_shipments pelo tracking_code
        const { data: b2bData } = await supabase
          .from('b2b_shipments')
          .select('id')
          .eq('tracking_code', remessa.tracking_code)
          .single();
        
        if (b2bData) {
          shipmentIdForHistory = b2bData.id;
        }
      }

      // Buscar histórico e ocorrências em paralelo
      const [historyResult, occurrencesResult] = await Promise.all([
        supabase
          .from('shipment_status_history')
          .select(`
            id,
            status,
            status_description,
            observacoes,
            created_at,
            motorista_id,
            motoristas (
              nome,
              telefone
            )
          `)
          .or(isB2B 
            ? `b2b_shipment_id.eq.${shipmentIdForHistory}` 
            : `shipment_id.eq.${shipmentIdForHistory}`)
          .order('created_at', { ascending: true }),
        supabase
          .from('shipment_occurrences')
          .select('*')
          .eq('shipment_id', shipmentIdForHistory)
          .order('created_at', { ascending: true })
      ]);

      if (!historyResult.error && historyResult.data) {
        // Combinar histórico com fotos baseado no timestamp
        const historyWithPhotos = historyResult.data.map((entry: any) => {
          const entryTime = new Date(entry.created_at).getTime();
          // Encontrar ocorrência com timestamp próximo (dentro de 10 segundos)
          const matchingOccurrence = occurrencesResult.data?.find((occ: any) => {
            const occTime = new Date(occ.created_at).getTime();
            return Math.abs(occTime - entryTime) < 10000;
          });
          return {
            ...entry,
            photo_url: matchingOccurrence?.file_url || null
          };
        });
        setStatusHistory(historyWithPhotos);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!remessa) return null;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'PENDING_LABEL': { label: 'Aguardando Etiqueta', variant: 'secondary' as const },
      'LABEL_GENERATED': { label: 'Etiqueta Gerada', variant: 'default' as const },
      'PAYMENT_CONFIRMED': { label: 'Disponível para Coleta', variant: 'default' as const },
      'PAID': { label: 'Disponível para Coleta', variant: 'default' as const },
      'PENDENTE': { label: 'Pendente', variant: 'secondary' as const },
      'ACEITA': { label: 'Aceita', variant: 'default' as const },
      'COLETA_ACEITA': { label: 'Coleta Aceita', variant: 'default' as const },
      'B2B_COLETA_FINALIZADA': { label: 'Coleta Finalizada', variant: 'success' as const },
      'B2B_ENTREGA_ACEITA': { label: 'Entrega Aceita', variant: 'default' as const },
      'COLETA_FINALIZADA': { label: 'Coleta Realizada', variant: 'success' as const },
      'EM_TRANSITO': { label: 'Em Trânsito', variant: 'default' as const },
      'TENTATIVA_ENTREGA': { label: 'Insucesso na Entrega', variant: 'destructive' as const },
      'ENTREGA_FINALIZADA': { label: 'Entregue', variant: 'success' as const },
      'ENTREGUE': { label: 'Entregue', variant: 'success' as const },
      'AGUARDANDO_DESTINATARIO': { label: 'Aguardando Destinatário', variant: 'secondary' as const },
      'ENDERECO_INCORRETO': { label: 'Endereço Incorreto', variant: 'destructive' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                   { label: status, variant: 'outline' as const };
    
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusPhase = (status: string): string => {
    if (['PENDENTE', 'ACEITA', 'B2B_COLETA_FINALIZADA'].includes(status)) {
      return 'B2B-1 (Coleta)';
    }
    if (['B2B_ENTREGA_ACEITA', 'ENTREGUE'].includes(status)) {
      return 'B2B-2 (Entrega)';
    }
    return 'Convencional';
  };

  const isB2B = remessa.tracking_code?.startsWith('B2B-');

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

        <ScrollArea className="max-h-[60vh] overflow-y-auto">
        <div className="px-4 pb-4 space-y-4">
          {/* Histórico de Status */}
          {statusHistory.length > 0 && (
            <Card className="border-0 shadow-none bg-primary/5">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Histórico de Status
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-3">
                  {statusHistory.map((entry, index) => (
                    <div key={entry.id} className="relative pl-4 border-l-2 border-primary/30">
                      <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-primary"></div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(entry.status)}
                          {isB2B && (
                            <Badge variant="outline" className="text-xs">
                              {getStatusPhase(entry.status)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                        {entry.motoristas?.nome && (
                          <p className="text-xs text-muted-foreground">
                            Motorista: {entry.motoristas.nome}
                          </p>
                        )}
                        {entry.observacoes && (
                          <p className="text-xs text-muted-foreground italic">{entry.observacoes}</p>
                        )}
                        {entry.photo_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs mt-1"
                            onClick={() => window.open(entry.photo_url!, '_blank')}
                          >
                            <ImageIcon className="w-3 h-3 mr-1" />
                            Ver Foto
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {loadingHistory && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mx-auto"></div>
              <p className="text-xs text-muted-foreground mt-2">Carregando histórico...</p>
            </div>
          )}

          {/* Informações da Mercadoria */}
          <Card className="border-0 shadow-none bg-muted/30">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Informações da Mercadoria
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {(() => {
                const isB2BShipment = remessa.tracking_code?.startsWith('B2B-');
                let vehicleType = '';
                
                if (isB2BShipment) {
                  try {
                    if (remessa.observations) {
                      const obs = typeof remessa.observations === 'string' 
                        ? JSON.parse(remessa.observations) 
                        : remessa.observations;
                      vehicleType = obs.vehicle_type || obs.vehicleType || '';
                    }
                  } catch (e) {
                    console.log('Erro ao parsear observations:', e);
                  }
                }
                
                return (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Peso Total:</span>
                      <p className="font-medium">{Number(remessa.weight).toFixed(2)}kg</p>
                    </div>
                    {isB2BShipment && vehicleType && (
                      <div>
                        <span className="text-muted-foreground">Veículo:</span>
                        <p className="font-medium capitalize">{vehicleType}</p>
                      </div>
                    )}
                    {!isB2BShipment && (
                      <div>
                        <span className="text-muted-foreground">Formato:</span>
                        <p className="font-medium capitalize">{remessa.format}</p>
                      </div>
                    )}
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
                );
              })()}
            </CardContent>
          </Card>

          {/* Volumes Individuais */}
          {(() => {
            const isB2BShipment = remessa.tracking_code?.startsWith('B2B-');
            const volumes = remessa.quote_data?.merchandiseDetails?.volumes || 
                            remessa.quote_data?.technicalData?.volumes || 
                            remessa.quote_data?.originalFormData?.volumes ||
                            remessa.quote_data?.volumes ||
                            remessa.quote_data?.quoteData?.volumes;
            
            if (Array.isArray(volumes) && volumes.length > 0) {
              return (
                <div className="space-y-2">
                  {volumes.map((volume: any, index: number) => (
                    <div key={index} className="p-3 border border-primary/20 rounded-lg bg-primary/5">
                      <div className="flex items-center mb-2">
                        <Package className="w-4 h-4 mr-2 text-primary" />
                        <span className="font-medium text-sm">Volume {index + 1}</span>
                      </div>
                      {isB2BShipment ? (
                        <div className="text-xs">
                          <p className="text-muted-foreground">Peso</p>
                          <p className="font-medium">{volume.weight || volume.peso}kg</p>
                        </div>
                      ) : (
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
                      )}
                    </div>
                  ))}
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

          {/* Destinatário(s) / Endereço do CD */}
          <div>
            {(() => {
              const isB2B1 = isB2B && ['PENDENTE', 'ACEITA'].includes(remessa.status);
              const isB2B2 = isB2B && ['B2B_COLETA_FINALIZADA', 'B2B_ENTREGA_ACEITA', 'ENTREGUE'].includes(remessa.status);
              
              // Para B2B-1, mostrar endereço fixo do CD
              if (isB2B1) {
                return (
                  <>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Endereço do CD
                    </h4>
                    <div className="text-sm space-y-1 ml-6">
                      <p className="font-medium">Centro de Distribuição</p>
                      <p className="text-muted-foreground">
                        Av. Primeira Avenida
                      </p>
                      <p className="text-muted-foreground">
                        Cidade Vera Cruz
                      </p>
                      <p className="text-muted-foreground">
                        Aparecida de Goiânia - GO
                      </p>
                      <p className="text-muted-foreground">
                        CEP: 74934-600
                      </p>
                    </div>
                  </>
                );
              }
              
              // Para B2B-2, mostrar destinatários de cada volume
              if (isB2B2) {
                let volumeAddresses: any[] = [];
                
                try {
                  // Tentar de remessa.observations primeiro
                  if (remessa.observations) {
                    const obs = typeof remessa.observations === 'string' 
                      ? JSON.parse(remessa.observations) 
                      : remessa.observations;
                    volumeAddresses = obs.volume_addresses || obs.volumeAddresses || [];
                  }
                  
                  // Fallback para quote_data.observations ou quote_data.parsedObservations
                  if (volumeAddresses.length === 0 && remessa.quote_data) {
                    const quoteObs = remessa.quote_data.parsedObservations || 
                      (typeof remessa.quote_data.observations === 'string' 
                        ? JSON.parse(remessa.quote_data.observations) 
                        : remessa.quote_data.observations);
                    if (quoteObs) {
                      volumeAddresses = quoteObs.volume_addresses || quoteObs.volumeAddresses || [];
                    }
                  }
                } catch (e) {
                  console.log('Erro ao parsear observations:', e);
                }
                
                if (volumeAddresses.length > 0) {
                  return (
                    <>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Destinatários ({volumeAddresses.length} volumes)
                      </h4>
                      <div className="space-y-3 ml-6">
                        {volumeAddresses.map((addr: any, index: number) => (
                          <div key={index} className="p-3 border border-primary/20 rounded-lg bg-primary/5">
                            <div className="flex items-center mb-2">
                              <Package className="w-4 h-4 mr-2 text-primary" />
                              <span className="font-medium text-sm">Volume {index + 1}</span>
                            </div>
                            <div className="text-sm space-y-1">
                              <p className="font-medium">{addr.recipient_name || addr.recipientName || '-'}</p>
                              {(addr.recipient_phone || addr.recipientPhone) && (
                                <p className="text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {addr.recipient_phone || addr.recipientPhone}
                                </p>
                              )}
                              <p className="text-muted-foreground">
                                {addr.street}, {addr.number}
                                {addr.complement && addr.complement !== '0' && `, ${addr.complement}`}
                              </p>
                              <p className="text-muted-foreground">
                                {addr.neighborhood}
                              </p>
                              <p className="text-muted-foreground">
                                {addr.city} - {addr.state}
                              </p>
                              <p className="text-muted-foreground">
                                CEP: {addr.cep}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                }
              }
              
              // Fallback para destinatário único (remessas convencionais)
              return (
                <>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Destinatário
                  </h4>
                  <div className="text-sm space-y-1 ml-6">
                    <p className="font-medium">{remessa.recipient_address?.name || '-'}</p>
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
                </>
              );
            })()}
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
