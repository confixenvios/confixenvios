import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Package, Search, X, MapPin, User } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CdEtiArrivalModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  cdUserName: string;
}

interface FoundVolume {
  id: string;
  tracking_code: string;
  volume_eti_code: string;
  volume_number: number;
  volume_weight: number;
  recipient_name: string | null;
  recipient_city: string | null;
  recipient_state: string | null;
  status: string;
  b2b_client?: {
    company_name: string;
  };
}

export const CdEtiArrivalModal = ({ 
  open, 
  onClose, 
  onComplete,
  cdUserName 
}: CdEtiArrivalModalProps) => {
  const [etiCode, setEtiCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundVolume, setFoundVolume] = useState<FoundVolume | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [registeredVolumes, setRegisteredVolumes] = useState<string[]>([]);

  const handleSearch = async () => {
    if (!etiCode.trim()) {
      toast.error('Digite o código ETI');
      return;
    }

    setSearching(true);
    try {
      // Formatar o código ETI (adicionar ETI- se necessário)
      let searchCode = etiCode.trim().toUpperCase();
      if (!searchCode.startsWith('ETI-')) {
        // Se for apenas os 4 dígitos, adicionar prefixo
        if (/^\d{4}$/.test(searchCode)) {
          searchCode = `ETI-${searchCode}`;
        }
      }

      // Buscar volume pelo código ETI
      const { data, error } = await supabase
        .from('b2b_shipments')
        .select(`
          id, tracking_code, volume_eti_code, volume_number, volume_weight,
          recipient_name, recipient_city, recipient_state, status,
          b2b_clients(company_name)
        `)
        .eq('volume_eti_code', searchCode)
        .single();

      if (error || !data) {
        toast.error('Volume não encontrado com este código ETI');
        setFoundVolume(null);
        return;
      }

      // Verificar se já está no CD ou entregue
      if (['B2B_NO_CD', 'B2B_VOLUME_DISPONIVEL', 'B2B_VOLUME_ACEITO', 'ENTREGUE'].includes(data.status)) {
        toast.info('Este volume já foi registrado no CD');
        setFoundVolume(null);
        return;
      }

      // Verificar se está em status válido para chegada (aceito por motorista B2B-0)
      if (!['B2B_COLETA_ACEITA'].includes(data.status)) {
        toast.warning('Este volume ainda não foi coletado pelo motorista');
        setFoundVolume(null);
        return;
      }

      setFoundVolume({
        ...data,
        b2b_client: data.b2b_clients as any
      });

    } catch (error) {
      console.error('Erro ao buscar volume:', error);
      toast.error('Erro ao buscar volume');
    } finally {
      setSearching(false);
    }
  };

  const handleConfirmArrival = async () => {
    if (!foundVolume) return;

    setConfirming(true);
    try {
      // Atualizar status do volume para B2B_VOLUME_DISPONIVEL (pronto para entrega B2B-2)
      const { error: updateError } = await supabase
        .from('b2b_shipments')
        .update({ 
          status: 'B2B_VOLUME_DISPONIVEL',
          motorista_id: null // Libera o motorista B2B-0
        })
        .eq('id', foundVolume.id);

      if (updateError) throw updateError;

      // Registrar no histórico
      await supabase.from('shipment_status_history').insert({
        b2b_shipment_id: foundVolume.id,
        status: 'B2B_VOLUME_DISPONIVEL',
        observacoes: `Chegada confirmada no CD via ETI por ${cdUserName}`
      });

      toast.success(`Volume ${foundVolume.volume_eti_code} registrado no CD!`);
      
      // Adicionar à lista de registrados
      setRegisteredVolumes(prev => [...prev, foundVolume.volume_eti_code]);
      
      // Limpar para próximo registro
      setFoundVolume(null);
      setEtiCode('');

    } catch (error) {
      console.error('Erro ao confirmar chegada:', error);
      toast.error('Erro ao confirmar chegada');
    } finally {
      setConfirming(false);
    }
  };

  const handleClose = () => {
    setEtiCode('');
    setFoundVolume(null);
    setRegisteredVolumes([]);
    onClose();
    if (registeredVolumes.length > 0) {
      onComplete();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Registrar Chegada de Volume
          </DialogTitle>
          <DialogDescription>
            Digite o código ETI do volume para registrar sua chegada no CD
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Volumes já registrados nesta sessão */}
          {registeredVolumes.length > 0 && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-800 mb-2">
                Volumes registrados ({registeredVolumes.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {registeredVolumes.map((code, i) => (
                  <Badge key={i} variant="outline" className="bg-green-100 text-green-700 border-green-300">
                    {code}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Campo de busca */}
          <div className="space-y-2">
            <Label htmlFor="eti-code">Código ETI</Label>
            <div className="flex gap-2">
              <Input
                id="eti-code"
                value={etiCode}
                onChange={(e) => setEtiCode(e.target.value)}
                placeholder="ETI-0001 ou 0001"
                className="font-mono"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Volume encontrado */}
          {foundVolume && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    <span className="font-mono font-medium">{foundVolume.tracking_code}</span>
                  </div>
                  <Badge variant="outline" className="font-mono bg-blue-100 text-blue-700">
                    {foundVolume.volume_eti_code}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span>{foundVolume.b2b_client?.company_name || 'Cliente'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Package className="h-3 w-3 text-muted-foreground" />
                    <span>{foundVolume.volume_weight?.toFixed(1) || '0'}kg</span>
                  </div>
                  {foundVolume.recipient_city && (
                    <div className="flex items-center gap-1 col-span-2">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span>{foundVolume.recipient_name} - {foundVolume.recipient_city}/{foundVolume.recipient_state}</span>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleConfirmArrival} 
                  disabled={confirming}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {confirming ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Confirmar Chegada no CD
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              <X className="h-4 w-4 mr-2" />
              {registeredVolumes.length > 0 ? 'Finalizar' : 'Cancelar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
