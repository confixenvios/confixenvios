import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Package, Truck, CheckCircle, LogOut, MapPin, RefreshCw, Plus, User, Eye, ChevronDown, History, Camera, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import B2BVolumeStatusHistory from '@/components/b2b/B2BVolumeStatusHistory';

interface Motorista {
  id: string;
  nome: string;
  username: string;
  telefone: string;
}

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
  recipient_complement: string | null;
  recipient_neighborhood: string;
  recipient_city: string;
  recipient_state: string;
  created_at: string;
  motorista_coleta_id: string | null;
  motorista_entrega_id: string | null;
  b2b_shipment_id: string;
  shipment?: {
    tracking_code: string;
    delivery_date: string;
    pickup_address?: {
      name: string;
      contact_name: string;
      contact_phone: string;
      street: string;
      number: string;
      neighborhood: string;
      city: string;
      state: string;
    };
  };
}

const MotoristaDashboard = () => {
  const navigate = useNavigate();
  const [motorista, setMotorista] = useState<Motorista | null>(null);
  const [loading, setLoading] = useState(true);
  const [volumes, setVolumes] = useState<B2BVolume[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('disponiveis');
  
  // Modal para buscar volume por ETI (para entregadores)
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchEtiInput, setSearchEtiInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundVolume, setFoundVolume] = useState<B2BVolume | null>(null);
  
  // Modal de detalhes
  const [selectedVolume, setSelectedVolume] = useState<B2BVolume | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Modal de aceitar coleta
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [acceptEtiInput, setAcceptEtiInput] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [volumeToAccept, setVolumeToAccept] = useState<B2BVolume | null>(null);
  
  // Modal finalizar entrega
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [finalizeEtiInput, setFinalizeEtiInput] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [volumeToFinalize, setVolumeToFinalize] = useState<B2BVolume | null>(null);
  const [deliveryPhoto, setDeliveryPhoto] = useState<File | null>(null);
  
  // Modal ocorrência
  const [occurrenceModalOpen, setOccurrenceModalOpen] = useState(false);
  const [occurrenceVolume, setOccurrenceVolume] = useState<B2BVolume | null>(null);
  const [occurrenceText, setOccurrenceText] = useState('');
  const [savingOccurrence, setSavingOccurrence] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedMotorista = localStorage.getItem('motorista_id');
      const storedNome = localStorage.getItem('motorista_nome');
      const storedUsername = localStorage.getItem('motorista_username');
      
      if (!storedMotorista || !storedNome) {
        navigate('/motorista/auth');
        return;
      }
      
      setMotorista({
        id: storedMotorista,
        nome: storedNome,
        username: storedUsername || '',
        telefone: ''
      });
      
      await loadVolumes(storedMotorista);
    } catch (error) {
      navigate('/motorista/auth');
    } finally {
      setLoading(false);
    }
  };

  const loadVolumes = async (motoristaId?: string) => {
    const id = motoristaId || motorista?.id;
    if (!id) return;
    
    setRefreshing(true);
    try {
      // Buscar volumes disponíveis para coleta (PENDENTE)
      const { data: disponiveis, error: dispError } = await supabase
        .from('b2b_volumes')
        .select(`
          *,
          shipment:b2b_shipments(
            tracking_code, 
            delivery_date,
            pickup_address:b2b_pickup_addresses(name, contact_name, contact_phone, street, number, neighborhood, city, state)
          )
        `)
        .eq('status', 'PENDENTE')
        .is('motorista_coleta_id', null);

      // Buscar volumes atribuídos ao motorista (coleta ou entrega)
      const { data: meusVolumes, error: meusError } = await supabase
        .from('b2b_volumes')
        .select(`
          *,
          shipment:b2b_shipments(
            tracking_code, 
            delivery_date,
            pickup_address:b2b_pickup_addresses(name, contact_name, contact_phone, street, number, neighborhood, city, state)
          )
        `)
        .or(`motorista_coleta_id.eq.${id},motorista_entrega_id.eq.${id}`);

      if (dispError) throw dispError;
      if (meusError) throw meusError;

      // Combinar volumes únicos
      const allVolumes = [...(disponiveis || []), ...(meusVolumes || [])];
      const uniqueVolumes = allVolumes.filter((v, i, arr) => 
        arr.findIndex(x => x.id === v.id) === i
      );

      setVolumes(uniqueVolumes);
    } catch (error) {
      toast.error('Erro ao carregar volumes');
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('motorista_id');
    localStorage.removeItem('motorista_nome');
    localStorage.removeItem('motorista_username');
    navigate('/motorista/auth');
  };

  // Filtros de volumes
  const disponiveis = volumes.filter(v => 
    v.status === 'PENDENTE' && !v.motorista_coleta_id
  );
  
  const minhasRemessas = volumes.filter(v => 
    (v.motorista_coleta_id === motorista?.id && ['EM_TRANSITO'].includes(v.status)) ||
    (v.motorista_entrega_id === motorista?.id && ['EM_ROTA'].includes(v.status))
  );
  
  const entregues = volumes.filter(v => 
    v.status === 'ENTREGUE' && 
    (v.motorista_coleta_id === motorista?.id || v.motorista_entrega_id === motorista?.id)
  );

  const handleShowDetails = (volume: B2BVolume) => {
    setSelectedVolume(volume);
    setShowDetailsModal(true);
  };

  // Aceitar coleta
  const handleOpenAcceptModal = (volume: B2BVolume) => {
    setVolumeToAccept(volume);
    setAcceptEtiInput('');
    setAcceptModalOpen(true);
  };

  const handleAcceptVolume = async () => {
    if (!volumeToAccept || !motorista) return;
    
    // Validar ETI
    const inputEti = acceptEtiInput.toUpperCase().includes('ETI-') 
      ? acceptEtiInput.toUpperCase() 
      : `ETI-${acceptEtiInput.padStart(4, '0')}`;
    
    if (inputEti !== volumeToAccept.eti_code) {
      toast.error('Código ETI não confere');
      return;
    }

    setAccepting(true);
    try {
      // Atualizar volume
      const { error } = await supabase
        .from('b2b_volumes')
        .update({
          status: 'EM_TRANSITO',
          motorista_coleta_id: motorista.id
        })
        .eq('id', volumeToAccept.id);

      if (error) throw error;

      // Registrar histórico
      await supabase.from('b2b_status_history').insert({
        volume_id: volumeToAccept.id,
        status: 'EM_TRANSITO',
        motorista_id: motorista.id,
        motorista_nome: motorista.nome,
        observacoes: 'Coleta aceita pelo motorista'
      });

      toast.success('Coleta aceita com sucesso!');
      setAcceptModalOpen(false);
      await loadVolumes();
    } catch (error) {
      toast.error('Erro ao aceitar coleta');
    } finally {
      setAccepting(false);
    }
  };

  // Buscar volume para entrega (motoristas de entrega)
  const handleSearchVolume = async () => {
    if (!searchEtiInput.trim()) return;
    
    setSearching(true);
    try {
      const etiCode = searchEtiInput.toUpperCase().includes('ETI-') 
        ? searchEtiInput.toUpperCase() 
        : `ETI-${searchEtiInput.padStart(4, '0')}`;

      const { data, error } = await supabase
        .from('b2b_volumes')
        .select(`
          *,
          shipment:b2b_shipments(tracking_code, delivery_date)
        `)
        .eq('eti_code', etiCode)
        .eq('status', 'NO_CD')
        .single();

      if (error || !data) {
        toast.error('Volume não encontrado no CD');
        setFoundVolume(null);
        return;
      }

      setFoundVolume(data);
    } catch (error) {
      toast.error('Erro ao buscar volume');
    } finally {
      setSearching(false);
    }
  };

  const handleClaimVolume = async () => {
    if (!foundVolume || !motorista) return;

    try {
      const { error } = await supabase
        .from('b2b_volumes')
        .update({
          status: 'EM_ROTA',
          motorista_entrega_id: motorista.id
        })
        .eq('id', foundVolume.id);

      if (error) throw error;

      await supabase.from('b2b_status_history').insert({
        volume_id: foundVolume.id,
        status: 'EM_ROTA',
        motorista_id: motorista.id,
        motorista_nome: motorista.nome,
        observacoes: 'Saiu para entrega'
      });

      toast.success('Volume atribuído para entrega!');
      setSearchModalOpen(false);
      setFoundVolume(null);
      setSearchEtiInput('');
      await loadVolumes();
    } catch (error) {
      toast.error('Erro ao atribuir volume');
    }
  };

  // Finalizar entrega
  const handleOpenFinalizeModal = (volume: B2BVolume) => {
    setVolumeToFinalize(volume);
    setFinalizeEtiInput('');
    setDeliveryPhoto(null);
    setFinalizeModalOpen(true);
  };

  const handleFinalizeDelivery = async () => {
    if (!volumeToFinalize || !motorista) return;

    // Validar ETI
    const inputEti = finalizeEtiInput.toUpperCase().includes('ETI-') 
      ? finalizeEtiInput.toUpperCase() 
      : `ETI-${finalizeEtiInput.padStart(4, '0')}`;
    
    if (inputEti !== volumeToFinalize.eti_code) {
      toast.error('Código ETI não confere');
      return;
    }

    if (!deliveryPhoto) {
      toast.error('Tire uma foto de comprovação');
      return;
    }

    setFinalizing(true);
    try {
      // Upload da foto
      const fileName = `b2b-entregas/${volumeToFinalize.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('shipment-photos')
        .upload(fileName, deliveryPhoto);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('shipment-photos')
        .getPublicUrl(fileName);

      // Atualizar volume
      const { error } = await supabase
        .from('b2b_volumes')
        .update({
          status: 'ENTREGUE',
          foto_entrega_url: urlData.publicUrl
        })
        .eq('id', volumeToFinalize.id);

      if (error) throw error;

      // Registrar histórico
      await supabase.from('b2b_status_history').insert({
        volume_id: volumeToFinalize.id,
        status: 'ENTREGUE',
        motorista_id: motorista.id,
        motorista_nome: motorista.nome,
        observacoes: 'Entrega finalizada com sucesso'
      });

      toast.success('Entrega finalizada!');
      setFinalizeModalOpen(false);
      await loadVolumes();
    } catch (error) {
      toast.error('Erro ao finalizar entrega');
    } finally {
      setFinalizing(false);
    }
  };

  // Registrar ocorrência
  const handleOpenOccurrence = (volume: B2BVolume) => {
    setOccurrenceVolume(volume);
    setOccurrenceText('');
    setOccurrenceModalOpen(true);
  };

  const handleSaveOccurrence = async () => {
    if (!occurrenceVolume || !motorista || !occurrenceText.trim()) return;

    setSavingOccurrence(true);
    try {
      await supabase.from('b2b_status_history').insert({
        volume_id: occurrenceVolume.id,
        status: 'OCORRENCIA',
        motorista_id: motorista.id,
        motorista_nome: motorista.nome,
        observacoes: occurrenceText,
        is_alert: true
      });

      toast.success('Ocorrência registrada');
      setOccurrenceModalOpen(false);
    } catch (error) {
      toast.error('Erro ao registrar ocorrência');
    } finally {
      setSavingOccurrence(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'PENDENTE': 'bg-yellow-500',
      'EM_TRANSITO': 'bg-orange-500',
      'NO_CD': 'bg-purple-500',
      'EM_ROTA': 'bg-blue-500',
      'ENTREGUE': 'bg-green-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'PENDENTE': 'Pendente',
      'EM_TRANSITO': 'Em Trânsito',
      'NO_CD': 'No CD',
      'EM_ROTA': 'Em Rota',
      'ENTREGUE': 'Entregue',
    };
    return labels[status] || status;
  };

  // Renderiza card de volume disponível
  const renderDisponiveisCard = (v: B2BVolume) => (
    <Card key={v.id} className="mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between mb-2">
          <div>
            <h3 className="font-mono font-medium">{v.eti_code}</h3>
            {v.shipment && (
              <p className="text-xs text-muted-foreground">{v.shipment.tracking_code}</p>
            )}
          </div>
          <Badge className="bg-yellow-500">Disponível</Badge>
        </div>
        
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            {v.weight} kg
          </p>
          {v.shipment?.pickup_address && (
            <p className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Coleta: {v.shipment.pickup_address.city}/{v.shipment.pickup_address.state}
            </p>
          )}
        </div>

        <Button
          className="w-full mt-3"
          onClick={() => handleOpenAcceptModal(v)}
        >
          Aceitar Coleta
        </Button>
      </CardContent>
    </Card>
  );

  // Renderiza card de minhas remessas
  const renderMinhasRemessasCard = (v: B2BVolume) => (
    <Card key={v.id} className="mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between mb-2">
          <div>
            <h3 className="font-mono font-medium text-lg">{v.eti_code}</h3>
          </div>
          <Badge className={getStatusColor(v.status)}>
            {getStatusLabel(v.status)}
          </Badge>
        </div>
        
        <div className="text-sm space-y-1">
          <p className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {v.recipient_name}
          </p>
          <p className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {v.recipient_street}, {v.recipient_number} - {v.recipient_city}/{v.recipient_state}
          </p>
          <p className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            {v.weight} kg
          </p>
        </div>

        {/* Histórico */}
        <Collapsible className="mt-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between p-2 h-8 text-xs">
              <span className="flex items-center gap-1">
                <History className="h-3 w-3" />
                Histórico
              </span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 border-t mt-2">
            <B2BVolumeStatusHistory volumeId={v.id} />
          </CollapsibleContent>
        </Collapsible>

        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => handleOpenOccurrence(v)}
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Ocorrência
          </Button>
          {v.status === 'EM_ROTA' && (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => handleOpenFinalizeModal(v)}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Finalizar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse">Carregando...</div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Truck className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-semibold">Portal do Motorista</h1>
              <p className="text-sm text-muted-foreground">{motorista?.nome}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setSearchModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => loadVolumes()}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="disponiveis">
              Disponíveis ({disponiveis.length})
            </TabsTrigger>
            <TabsTrigger value="minhas">
              Minhas ({minhasRemessas.length})
            </TabsTrigger>
            <TabsTrigger value="entregues">
              Entregues ({entregues.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="disponiveis">
            {disponiveis.length ? (
              disponiveis.map(v => renderDisponiveisCard(v))
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhum volume disponível para coleta
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="minhas">
            {minhasRemessas.length ? (
              minhasRemessas.map(v => renderMinhasRemessasCard(v))
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhum volume atribuído
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="entregues">
            {entregues.length ? (
              entregues.map(v => (
                <Card key={v.id} className="mb-3">
                  <CardContent className="p-4">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-mono font-medium">{v.eti_code}</h3>
                        <p className="text-sm text-muted-foreground">{v.recipient_name}</p>
                      </div>
                      <Badge className="bg-green-500">Entregue</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhuma entrega finalizada
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal: Buscar volume para entrega */}
      <Dialog open={searchModalOpen} onOpenChange={setSearchModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buscar Volume para Entrega</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Digite o código ETI do volume que está no CD.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Ex: ETI-0001"
              value={searchEtiInput}
              onChange={(e) => setSearchEtiInput(e.target.value)}
              className="font-mono"
            />
            <Button onClick={handleSearchVolume} disabled={searching}>
              {searching ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>
          
          {foundVolume && (
            <Card className="mt-4">
              <CardContent className="p-4">
                <div className="flex justify-between mb-2">
                  <h3 className="font-mono font-medium">{foundVolume.eti_code}</h3>
                  <Badge className="bg-purple-500">No CD</Badge>
                </div>
                <p className="text-sm">{foundVolume.recipient_name}</p>
                <p className="text-sm text-muted-foreground">
                  {foundVolume.recipient_city}/{foundVolume.recipient_state}
                </p>
                <Button className="w-full mt-3" onClick={handleClaimVolume}>
                  Atribuir para Entrega
                </Button>
              </CardContent>
            </Card>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Aceitar coleta */}
      <Dialog open={acceptModalOpen} onOpenChange={setAcceptModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aceitar Coleta</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Digite o código ETI para confirmar a coleta.
          </p>
          {volumeToAccept && (
            <p className="text-center font-mono text-lg font-bold text-muted-foreground">
              Esperado: {volumeToAccept.eti_code}
            </p>
          )}
          <Input
            placeholder="Digite o código ETI"
            value={acceptEtiInput}
            onChange={(e) => setAcceptEtiInput(e.target.value)}
            className="font-mono text-center text-lg"
          />
          <Button onClick={handleAcceptVolume} disabled={accepting}>
            {accepting ? 'Aceitando...' : 'Confirmar Coleta'}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Modal: Finalizar entrega */}
      <Dialog open={finalizeModalOpen} onOpenChange={setFinalizeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Entrega</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Digite o código ETI e tire uma foto de comprovação.
          </p>
          {volumeToFinalize && (
            <p className="text-center font-mono text-lg font-bold text-muted-foreground">
              Esperado: {volumeToFinalize.eti_code}
            </p>
          )}
          <Input
            placeholder="Digite o código ETI"
            value={finalizeEtiInput}
            onChange={(e) => setFinalizeEtiInput(e.target.value)}
            className="font-mono text-center text-lg"
          />
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Foto de Comprovação *</label>
            <Input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setDeliveryPhoto(e.target.files?.[0] || null)}
            />
            {deliveryPhoto && (
              <p className="text-xs text-green-600">Foto selecionada: {deliveryPhoto.name}</p>
            )}
          </div>
          
          <Button onClick={handleFinalizeDelivery} disabled={finalizing}>
            <Camera className="h-4 w-4 mr-2" />
            {finalizing ? 'Finalizando...' : 'Finalizar Entrega'}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Modal: Ocorrência */}
      <Dialog open={occurrenceModalOpen} onOpenChange={setOccurrenceModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Ocorrência</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Descreva o problema encontrado.
          </p>
          <textarea
            className="w-full p-3 border rounded-md min-h-[100px]"
            placeholder="Descreva a ocorrência..."
            value={occurrenceText}
            onChange={(e) => setOccurrenceText(e.target.value)}
          />
          <Button 
            onClick={handleSaveOccurrence} 
            disabled={savingOccurrence || !occurrenceText.trim()}
          >
            {savingOccurrence ? 'Salvando...' : 'Registrar Ocorrência'}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MotoristaDashboard;
