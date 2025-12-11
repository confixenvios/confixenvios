import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Package, MapPin, CheckCircle, AlertCircle, User } from "lucide-react";
import { searchVolumeByEtiCode, acceptB2BVolume, type BaseShipment } from '@/services/shipmentsService';
import { toast } from 'sonner';

interface VolumeSearchModalProps {
  open: boolean;
  onClose: () => void;
  motoristaId: string;
  onVolumeAccepted: () => void;
}

export const VolumeSearchModal = ({
  open,
  onClose,
  motoristaId,
  onVolumeAccepted
}: VolumeSearchModalProps) => {
  const [etiCode, setEtiCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundVolume, setFoundVolume] = useState<BaseShipment | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const handleSearch = async () => {
    if (etiCode.length !== 4) {
      toast.error('Digite os 4 dígitos do código ETI');
      return;
    }

    setSearching(true);
    setFoundVolume(null);
    setConfirming(false);

    try {
      const volume = await searchVolumeByEtiCode(etiCode);
      
      if (volume) {
        setFoundVolume(volume);
        setConfirming(true);
      } else {
        toast.error('Volume não encontrado ou já atribuído a outro motorista');
      }
    } catch (error) {
      console.error('Erro na busca:', error);
      toast.error('Erro ao buscar volume');
    } finally {
      setSearching(false);
    }
  };

  const handleConfirmAccept = async () => {
    if (!foundVolume) return;

    setAccepting(true);
    try {
      const result = await acceptB2BVolume(foundVolume.id, motoristaId);
      
      if (result.success) {
        toast.success('Volume aceito com sucesso!');
        onVolumeAccepted();
        handleClose();
      } else {
        toast.error(result.error || 'Erro ao aceitar volume');
      }
    } catch (error) {
      console.error('Erro ao aceitar volume:', error);
      toast.error('Erro ao aceitar volume');
    } finally {
      setAccepting(false);
    }
  };

  const handleClose = () => {
    setEtiCode('');
    setFoundVolume(null);
    setConfirming(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inserir Volume B2B
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!confirming ? (
            <>
              <p className="text-sm text-muted-foreground">
                Digite os 4 últimos dígitos do código ETI do volume que deseja aceitar.
              </p>

              <div className="flex items-center gap-2">
                <span className="text-lg font-medium text-muted-foreground">ETI-</span>
                <Input
                  placeholder="0000"
                  value={etiCode}
                  onChange={(e) => setEtiCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-28 font-mono text-center text-xl tracking-wider"
                  maxLength={4}
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSearch}
                  disabled={etiCode.length !== 4 || searching}
                  className="bg-primary hover:bg-primary/90"
                >
                  {searching ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Buscar
                </Button>
              </div>
            </>
          ) : foundVolume ? (
            <>
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-sm text-green-700 font-medium">
                  Volume encontrado!
                </p>
              </div>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-lg font-bold text-primary">
                      ETI-{etiCode.padStart(4, '0')}
                    </span>
                    <Badge className="bg-purple-500">Volume {foundVolume.volume_number}</Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{foundVolume.recipient_address?.name || 'Destinatário'}</span>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p>{foundVolume.recipient_address?.street}, {foundVolume.recipient_address?.number}</p>
                        <p>{foundVolume.recipient_address?.neighborhood}</p>
                        <p>{foundVolume.recipient_address?.city}/{foundVolume.recipient_address?.state}</p>
                        <p>CEP: {foundVolume.recipient_address?.cep}</p>
                      </div>
                    </div>

                    {foundVolume.volume_weight && (
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>{foundVolume.volume_weight.toFixed(1)}kg</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <p className="text-sm text-muted-foreground text-center">
                Confirma que deseja aceitar este volume?
              </p>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setConfirming(false);
                  setFoundVolume(null);
                  setEtiCode('');
                }}>
                  Voltar
                </Button>
                <Button
                  onClick={handleConfirmAccept}
                  disabled={accepting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {accepting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Confirmar e Aceitar
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};
