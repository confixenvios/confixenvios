import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Package, AlertCircle, SplitSquareVertical } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface B2BShipment {
  id: string;
  tracking_code: string | null;
  status: string;
  volume_count: number | null;
  observations?: string | null;
  b2b_client?: {
    company_name: string;
  };
}

interface VolumeLabel {
  id: string;
  volume_number: number;
  eti_code: string;
  eti_sequence_number: number;
}

interface VolumeData {
  volume_number: number;
  eti_code: string;
  weight: number;
  recipient_name: string;
  recipient_street: string;
  recipient_number: string;
  recipient_neighborhood: string;
  recipient_city: string;
  recipient_state: string;
  recipient_cep: string;
  recipient_phone: string;
}

interface DestrincharModalProps {
  open: boolean;
  onClose: () => void;
  shipment: B2BShipment;
  onComplete: () => void;
}

export const DestrincharModal = ({
  open,
  onClose,
  shipment,
  onComplete
}: DestrincharModalProps) => {
  const [volumeLabels, setVolumeLabels] = useState<VolumeLabel[]>([]);
  const [inputValues, setInputValues] = useState<Record<number, string>>({});
  const [validatedVolumes, setValidatedVolumes] = useState<Set<number>>(new Set());
  const [volumeData, setVolumeData] = useState<VolumeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLabels, setLoadingLabels] = useState(true);

  useEffect(() => {
    if (open && shipment.id) {
      loadVolumeLabels();
      parseVolumeData();
      setInputValues({});
      setValidatedVolumes(new Set());
    }
  }, [open, shipment.id]);

  const loadVolumeLabels = async () => {
    try {
      setLoadingLabels(true);
      const { data, error } = await supabase
        .from('b2b_volume_labels')
        .select('*')
        .eq('b2b_shipment_id', shipment.id)
        .order('volume_number', { ascending: true });

      if (error) throw error;
      setVolumeLabels(data || []);
    } catch (error) {
      console.error('Erro ao carregar etiquetas:', error);
      toast.error('Erro ao carregar códigos ETI');
    } finally {
      setLoadingLabels(false);
    }
  };

  const parseVolumeData = () => {
    try {
      if (!shipment.observations) return;
      
      const observations = typeof shipment.observations === 'string' 
        ? JSON.parse(shipment.observations) 
        : shipment.observations;
      
      const volumeWeights = observations.volume_weights || [];
      const volumeAddresses = observations.volume_addresses || observations.volumeAddresses || [];
      
      const data: VolumeData[] = [];
      const volumeCount = shipment.volume_count || volumeWeights.length || 1;
      
      for (let i = 0; i < volumeCount; i++) {
        const addr = volumeAddresses[i] || {};
        data.push({
          volume_number: i + 1,
          eti_code: '', // Será preenchido após carregar labels
          weight: volumeWeights[i] || 0,
          recipient_name: addr.recipient_name || addr.name || '',
          recipient_street: addr.street || '',
          recipient_number: addr.number || '',
          recipient_neighborhood: addr.neighborhood || '',
          recipient_city: addr.city || '',
          recipient_state: addr.state || '',
          recipient_cep: addr.cep || '',
          recipient_phone: addr.recipient_phone || addr.phone || ''
        });
      }
      
      setVolumeData(data);
    } catch (e) {
      console.error('Erro ao parsear dados dos volumes:', e);
    }
  };

  // Atualizar volumeData com ETI codes quando labels carregarem
  useEffect(() => {
    if (volumeLabels.length > 0 && volumeData.length > 0) {
      setVolumeData(prev => prev.map(v => {
        const label = volumeLabels.find(l => l.volume_number === v.volume_number);
        return { ...v, eti_code: label?.eti_code || '' };
      }));
    }
  }, [volumeLabels]);

  const handleInputChange = (volumeNumber: number, value: string) => {
    const cleanValue = value.replace(/\D/g, '').slice(0, 4);
    setInputValues(prev => ({ ...prev, [volumeNumber]: cleanValue }));

    const expectedLabel = volumeLabels.find(l => l.volume_number === volumeNumber);
    if (expectedLabel) {
      const expectedCode = expectedLabel.eti_code.replace('ETI-', '');
      if (cleanValue === expectedCode) {
        setValidatedVolumes(prev => new Set([...prev, volumeNumber]));
      } else {
        setValidatedVolumes(prev => {
          const newSet = new Set(prev);
          newSet.delete(volumeNumber);
          return newSet;
        });
      }
    }
  };

  const allVolumesValidated = volumeLabels.length > 0 && validatedVolumes.size === volumeLabels.length;

  const handleDestrinchar = async () => {
    if (!allVolumesValidated) {
      toast.error('Valide todos os volumes antes de desmembrar');
      return;
    }

    setLoading(true);
    try {
      // Criar um registro B2B para cada volume
      for (const volume of volumeData) {
        const label = volumeLabels.find(l => l.volume_number === volume.volume_number);
        if (!label) continue;

        const { error: insertError } = await supabase
          .from('b2b_shipments')
          .insert({
            b2b_client_id: shipment.id.split('-')[0], // Fallback - idealmente buscar o real
            tracking_code: `${shipment.tracking_code}-V${volume.volume_number}`,
            status: 'B2B_VOLUME_DISPONIVEL',
            is_volume: true,
            parent_shipment_id: shipment.id,
            volume_eti_code: label.eti_code,
            volume_number: volume.volume_number,
            volume_weight: volume.weight,
            recipient_name: volume.recipient_name,
            recipient_street: volume.recipient_street,
            recipient_number: volume.recipient_number,
            recipient_neighborhood: volume.recipient_neighborhood,
            recipient_city: volume.recipient_city,
            recipient_state: volume.recipient_state,
            recipient_cep: volume.recipient_cep,
            recipient_phone: volume.recipient_phone
          });

        if (insertError) {
          // Se falhar porque b2b_client_id não existe, buscar o correto
          console.error('Erro ao criar volume, tentando buscar b2b_client_id:', insertError);
          
          const { data: parentData } = await supabase
            .from('b2b_shipments')
            .select('b2b_client_id')
            .eq('id', shipment.id)
            .single();

          if (parentData?.b2b_client_id) {
            const { error: retryError } = await supabase
              .from('b2b_shipments')
              .insert({
                b2b_client_id: parentData.b2b_client_id,
                tracking_code: `${shipment.tracking_code}-V${volume.volume_number}`,
                status: 'B2B_VOLUME_DISPONIVEL',
                is_volume: true,
                parent_shipment_id: shipment.id,
                volume_eti_code: label.eti_code,
                volume_number: volume.volume_number,
                volume_weight: volume.weight,
                recipient_name: volume.recipient_name,
                recipient_street: volume.recipient_street,
                recipient_number: volume.recipient_number,
                recipient_neighborhood: volume.recipient_neighborhood,
                recipient_city: volume.recipient_city,
                recipient_state: volume.recipient_state,
                recipient_cep: volume.recipient_cep,
                recipient_phone: volume.recipient_phone
              });

            if (retryError) throw retryError;
          } else {
            throw insertError;
          }
        }
      }

      // Atualizar status da remessa pai para indicar que foi desmembrada
      await supabase
        .from('b2b_shipments')
        .update({ status: 'B2B_DESMEMBRADA' })
        .eq('id', shipment.id);

      // Registrar no histórico
      await supabase.from('shipment_status_history').insert({
        b2b_shipment_id: shipment.id,
        status: 'B2B_DESMEMBRADA',
        observacoes: `Remessa desmembrada em ${volumeData.length} volumes`
      });

      toast.success(`Remessa desmembrada em ${volumeData.length} volumes com sucesso!`);
      onComplete();
    } catch (error) {
      console.error('Erro ao desmembrar remessa:', error);
      toast.error('Erro ao desmembrar remessa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SplitSquareVertical className="h-5 w-5" />
            Desmembrar Remessa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm font-medium">Remessa: {shipment.tracking_code}</p>
            <p className="text-sm text-muted-foreground">{shipment.volume_count || 1} volume(s) a desmembrar</p>
          </div>

          <p className="text-sm text-muted-foreground">
            Digite o código de 4 dígitos de cada etiqueta ETI para confirmar e desmembrar os volumes.
          </p>

          {loadingLabels ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : volumeLabels.length === 0 ? (
            <div className="flex items-center gap-2 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <p className="text-sm text-amber-700">
                Nenhuma etiqueta ETI encontrada para esta remessa.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {volumeData.map((volume) => {
                const isValidated = validatedVolumes.has(volume.volume_number);
                const label = volumeLabels.find(l => l.volume_number === volume.volume_number);
                
                return (
                  <Card key={volume.volume_number} className={isValidated ? 'border-green-300 bg-green-50/50' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Volume {volume.volume_number}</span>
                            <Badge variant="outline">{volume.weight.toFixed(1)}kg</Badge>
                            {isValidated && (
                              <Badge className="bg-green-500 text-white text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Validado
                              </Badge>
                            )}
                          </div>
                          
                          {volume.recipient_name && (
                            <div className="text-sm text-muted-foreground">
                              <p><strong>Destinatário:</strong> {volume.recipient_name}</p>
                              <p>{volume.recipient_street}, {volume.recipient_number} - {volume.recipient_neighborhood}</p>
                              <p>{volume.recipient_city}/{volume.recipient_state} - CEP {volume.recipient_cep}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">ETI-</span>
                          <Input
                            placeholder="0000"
                            value={inputValues[volume.volume_number] || ''}
                            onChange={(e) => handleInputChange(volume.volume_number, e.target.value)}
                            className={`w-20 font-mono text-center ${
                              isValidated 
                                ? 'border-green-500 bg-green-50' 
                                : inputValues[volume.volume_number]?.length === 4 
                                  ? 'border-red-500 bg-red-50' 
                                  : ''
                            }`}
                            maxLength={4}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {validatedVolumes.size} de {volumeLabels.length} volumes validados
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleDestrinchar}
                disabled={!allVolumesValidated || loading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <SplitSquareVertical className="h-4 w-4 mr-2" />
                )}
                Desmembrar Volumes
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
