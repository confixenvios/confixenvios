import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Package, MapPin, User, Phone, Loader2, Clock, CheckCircle2, Truck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import B2BVolumeStatusHistory from '@/components/b2b/B2BVolumeStatusHistory';

interface B2BVolume {
  id: string;
  eti_code: string;
  volume_number: number;
  weight: number;
  status: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_cep: string;
  recipient_street: string;
  recipient_number: string;
  recipient_neighborhood: string;
  recipient_city: string;
  recipient_state: string;
  created_at: string;
  b2b_shipment_id: string;
}

interface B2BShipment {
  id: string;
  tracking_code: string;
  delivery_date: string;
}

const B2BRastreamento = () => {
  const [searchCode, setSearchCode] = useState('');
  const [volumes, setVolumes] = useState<B2BVolume[]>([]);
  const [shipments, setShipments] = useState<B2BShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [selectedVolume, setSelectedVolume] = useState<B2BVolume | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    loadUserVolumes();
  }, []);

  const loadUserVolumes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get B2B client
      const { data: clientData } = await supabase
        .from('b2b_clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!clientData) return;

      // Get shipments
      const { data: shipmentsData } = await supabase
        .from('b2b_shipments')
        .select('id, tracking_code, delivery_date')
        .eq('b2b_client_id', clientData.id)
        .order('created_at', { ascending: false });

      setShipments(shipmentsData || []);

      // Get volumes
      const shipmentIds = (shipmentsData || []).map(s => s.id);
      if (shipmentIds.length > 0) {
        const { data: volumesData } = await supabase
          .from('b2b_volumes')
          .select('*')
          .in('b2b_shipment_id', shipmentIds)
          .order('created_at', { ascending: false })
          .limit(50);

        setVolumes(volumesData || []);
      }
    } catch (error) {
      console.error('Erro ao carregar volumes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchCode.trim()) {
      toast.error('Digite um código ETI para buscar');
      return;
    }

    setSearching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clientData } = await supabase
        .from('b2b_clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!clientData) return;

      // Search for volume by ETI code
      const { data: volumeData, error } = await supabase
        .from('b2b_volumes')
        .select('*, b2b_shipments!inner(b2b_client_id, tracking_code, delivery_date)')
        .eq('b2b_shipments.b2b_client_id', clientData.id)
        .ilike('eti_code', `%${searchCode.trim()}%`)
        .limit(1)
        .single();

      if (error || !volumeData) {
        toast.error('Código não encontrado');
        return;
      }

      setSelectedVolume(volumeData);
      setShowHistoryModal(true);
    } catch (error) {
      toast.error('Erro ao buscar código');
    } finally {
      setSearching(false);
    }
  };

  const getVolumeShipment = (volume: B2BVolume) => {
    return shipments.find(s => s.id === volume.b2b_shipment_id);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'AGUARDANDO_ACEITE_COLETA': 'bg-yellow-500',
      'COLETA_ACEITA': 'bg-orange-500',
      'COLETADO': 'bg-sky-500',
      'EM_TRANSITO': 'bg-blue-500',
      'EM_TRIAGEM': 'bg-purple-500',
      'NO_CD': 'bg-violet-500',
      'EM_ROTA': 'bg-indigo-500',
      'ENTREGUE': 'bg-emerald-500',
      'CONCLUIDO': 'bg-emerald-500',
      'DEVOLUCAO': 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'AGUARDANDO_ACEITE_COLETA': 'Aguardando Coleta',
      'COLETA_ACEITA': 'Coleta Aceita',
      'COLETADO': 'Coletado',
      'EM_TRANSITO': 'Em Trânsito',
      'EM_TRIAGEM': 'Em Triagem',
      'NO_CD': 'No CD',
      'EM_ROTA': 'Em Rota de Entrega',
      'ENTREGUE': 'Entregue',
      'CONCLUIDO': 'Entregue',
      'DEVOLUCAO': 'Devolução',
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status: string) => {
    if (status === 'ENTREGUE' || status === 'CONCLUIDO') {
      return <CheckCircle2 className="h-4 w-4" />;
    }
    if (status === 'EM_ROTA' || status === 'EM_TRANSITO') {
      return <Truck className="h-4 w-4" />;
    }
    if (status === 'DEVOLUCAO') {
      return <AlertCircle className="h-4 w-4" />;
    }
    return <Clock className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Search Card */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Rastrear Envio Expresso
          </CardTitle>
          <CardDescription>Digite o código ETI para acompanhar seu envio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Input
                placeholder="Ex: ETI-0001"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="text-lg h-12"
              />
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={searching}
              className="h-12 px-6 bg-primary hover:bg-primary/90"
            >
              {searching ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Search className="h-5 w-5 mr-2" />
                  Rastrear
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Volumes */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Seus Envios Recentes
          </CardTitle>
          <CardDescription>Clique em qualquer envio para ver o histórico completo</CardDescription>
        </CardHeader>
        <CardContent>
          {volumes.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum envio encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {volumes.slice(0, 10).map((volume) => {
                const shipment = getVolumeShipment(volume);
                return (
                  <div
                    key={volume.id}
                    onClick={() => {
                      setSelectedVolume(volume);
                      setShowHistoryModal(true);
                    }}
                    className="p-4 border rounded-xl hover:shadow-md transition-all cursor-pointer bg-white group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full ${getStatusColor(volume.status)} flex items-center justify-center text-white`}>
                          {getStatusIcon(volume.status)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-foreground">{volume.eti_code}</span>
                            <Badge variant="secondary" className={`text-xs text-white ${getStatusColor(volume.status)}`}>
                              {getStatusLabel(volume.status)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {volume.recipient_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {volume.recipient_city}/{volume.recipient_state}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {shipment?.delivery_date && (
                          <p className="text-sm text-muted-foreground">
                            Previsão: {format(new Date(shipment.delivery_date + 'T12:00:00'), 'dd/MM/yyyy')}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(volume.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Rastreamento - {selectedVolume?.eti_code}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[calc(85vh-120px)] px-6 py-4">
            {selectedVolume && (
              <div className="space-y-6">
                {/* Volume Info */}
                <div className="p-4 bg-muted/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={`text-white ${getStatusColor(selectedVolume.status)}`}>
                      {getStatusLabel(selectedVolume.status)}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{selectedVolume.recipient_name}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {selectedVolume.recipient_phone}
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {selectedVolume.recipient_street}, {selectedVolume.recipient_number} - {selectedVolume.recipient_neighborhood}, {selectedVolume.recipient_city}/{selectedVolume.recipient_state}
                    </p>
                  </div>
                </div>

                {/* Status History */}
                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Histórico de Movimentações
                  </h4>
                  <B2BVolumeStatusHistory volumeId={selectedVolume.id} />
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default B2BRastreamento;