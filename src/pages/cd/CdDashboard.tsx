import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Package, Truck, CheckCircle, LogOut, MapPin, RefreshCw, Download, Route, User, Eye, ChevronDown, History, Warehouse } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import B2BVolumeStatusHistory from '@/components/b2b/B2BVolumeStatusHistory';

interface CdUser {
  id: string;
  nome: string;
  email: string;
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
  };
  motorista_coleta_nome?: string;
  motorista_entrega_nome?: string;
}

const CdDashboard = () => {
  const navigate = useNavigate();
  const [cdUser, setCdUser] = useState<CdUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [volumes, setVolumes] = useState<B2BVolume[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('em_transito');
  
  // Modal para receber volume no CD
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [receiveEtiInput, setReceiveEtiInput] = useState('');
  const [receiving, setReceiving] = useState(false);
  
  // Modal de detalhes
  const [selectedVolume, setSelectedVolume] = useState<B2BVolume | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedUser = localStorage.getItem('cd_user');
      if (!storedUser) {
        navigate('/cd/auth');
        return;
      }
      setCdUser(JSON.parse(storedUser));
      await loadVolumes();
    } catch (error) {
      navigate('/cd/auth');
    } finally {
      setLoading(false);
    }
  };

  const loadVolumes = async () => {
    setRefreshing(true);
    try {
      // Buscar volumes B2B com dados do shipment
      const { data, error } = await supabase
        .from('b2b_volumes')
        .select(`
          *,
          shipment:b2b_shipments(tracking_code, delivery_date)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Buscar nomes dos motoristas
      const motoristaIds = [...new Set((data || [])
        .flatMap(v => [v.motorista_coleta_id, v.motorista_entrega_id])
        .filter(Boolean))] as string[];
      
      let motoristasMap: Record<string, string> = {};

      if (motoristaIds.length > 0) {
        const { data: motoristas } = await supabase
          .from('motoristas')
          .select('id, nome')
          .in('id', motoristaIds);
        
        if (motoristas) {
          motoristasMap = motoristas.reduce((acc: Record<string, string>, m) => {
            acc[m.id] = m.nome;
            return acc;
          }, {});
        }
      }

      // Combinar dados dos volumes com nomes dos motoristas
      const volumesWithMotorista = (data || []).map(v => ({
        ...v,
        motorista_coleta_nome: v.motorista_coleta_id ? motoristasMap[v.motorista_coleta_id] : undefined,
        motorista_entrega_nome: v.motorista_entrega_id ? motoristasMap[v.motorista_entrega_id] : undefined
      }));

      setVolumes(volumesWithMotorista);
    } catch (error) {
      toast.error('Erro ao carregar volumes');
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cd_user');
    navigate('/cd/auth');
  };

  const handleReceiveVolume = async () => {
    if (!receiveEtiInput.trim()) return;
    setReceiving(true);
    
    try {
      // Formatar código ETI
      const etiCode = receiveEtiInput.toUpperCase().includes('ETI-') 
        ? receiveEtiInput.toUpperCase() 
        : `ETI-${receiveEtiInput.padStart(4, '0')}`;

      // Buscar volume pelo ETI code
      const { data: volume, error: findError } = await supabase
        .from('b2b_volumes')
        .select('id, status, eti_code')
        .eq('eti_code', etiCode)
        .single();

      if (findError || !volume) {
        toast.error('Volume não encontrado');
        return;
      }

      if (volume.status !== 'EM_TRANSITO') {
        toast.error(`Volume não está em trânsito. Status atual: ${volume.status}`);
        return;
      }

      // Atualizar status para NO_CD
      const { error: updateError } = await supabase
        .from('b2b_volumes')
        .update({ 
          status: 'NO_CD',
          motorista_coleta_id: null // Desvincular motorista de coleta
        })
        .eq('id', volume.id);

      if (updateError) throw updateError;

      // Registrar histórico
      await supabase.from('b2b_status_history').insert({
        volume_id: volume.id,
        status: 'NO_CD',
        observacoes: `Recebido no CD por ${cdUser?.nome}`
      });

      toast.success(`Volume ${etiCode} recebido no CD!`);
      setReceiveModalOpen(false);
      setReceiveEtiInput('');
      await loadVolumes();
    } catch (error) {
      toast.error('Erro ao receber volume');
    } finally {
      setReceiving(false);
    }
  };

  // Filtra volumes por status
  const emTransito = volumes.filter(v => v.status === 'EM_TRANSITO');
  const noCd = volumes.filter(v => v.status === 'NO_CD');
  const emRota = volumes.filter(v => v.status === 'EM_ROTA');
  const entregues = volumes.filter(v => v.status === 'ENTREGUE');

  const handleShowDetails = (volume: B2BVolume) => {
    setSelectedVolume(volume);
    setShowDetailsModal(true);
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

  // Renderiza card de volume
  const renderVolumeCard = (v: B2BVolume) => (
    <Card key={v.id} className="mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between mb-2">
          <div>
            <h3 className="font-mono font-medium text-lg">{v.eti_code}</h3>
            {v.shipment && (
              <p className="text-xs text-muted-foreground">{v.shipment.tracking_code}</p>
            )}
          </div>
          <Badge className={getStatusColor(v.status)}>
            {getStatusLabel(v.status)}
          </Badge>
        </div>
        
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {v.recipient_name}
          </p>
          <p className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {v.recipient_city}/{v.recipient_state}
          </p>
          <p className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            {v.weight} kg
          </p>
        </div>

        {/* Mostrar motoristas */}
        {v.motorista_coleta_nome && (
          <div className="flex items-center gap-1 mt-2 text-xs">
            <Truck className="h-3 w-3 text-orange-500" />
            <span>Coleta: {v.motorista_coleta_nome}</span>
          </div>
        )}
        {v.motorista_entrega_nome && (
          <div className="flex items-center gap-1 mt-1 text-xs">
            <Route className="h-3 w-3 text-blue-500" />
            <span>Entrega: {v.motorista_entrega_nome}</span>
          </div>
        )}

        {/* Histórico de Status - Collapsible */}
        <Collapsible className="mt-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between p-2 h-8 text-xs">
              <span className="flex items-center gap-1">
                <History className="h-3 w-3" />
                Histórico de Status
              </span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 border-t mt-2">
            <B2BVolumeStatusHistory volumeId={v.id} />
          </CollapsibleContent>
        </Collapsible>

        {/* Botão Ver Detalhes */}
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={() => handleShowDetails(v)}
        >
          <Eye className="h-4 w-4 mr-1" />
          Ver Detalhes
        </Button>
      </CardContent>
    </Card>
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse">Carregando...</div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Warehouse className="h-6 w-6 text-purple-600" />
            <div>
              <h1 className="font-semibold">Centro de Distribuição</h1>
              <p className="text-sm text-muted-foreground">{cdUser?.nome}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadVolumes}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4">
        {/* Cards de estatísticas */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <Card>
            <CardContent className="p-3 text-center">
              <Truck className="h-5 w-5 mx-auto text-orange-500" />
              <p className="text-2xl font-bold">{emTransito.length}</p>
              <p className="text-xs">Em Trânsito</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Warehouse className="h-5 w-5 mx-auto text-purple-500" />
              <p className="text-2xl font-bold">{noCd.length}</p>
              <p className="text-xs">No CD</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Route className="h-5 w-5 mx-auto text-blue-500" />
              <p className="text-2xl font-bold">{emRota.length}</p>
              <p className="text-xs">Em Rota</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <CheckCircle className="h-5 w-5 mx-auto text-green-500" />
              <p className="text-2xl font-bold">{entregues.length}</p>
              <p className="text-xs">Entregues</p>
            </CardContent>
          </Card>
        </div>

        {/* Botão principal - Receber volume no CD */}
        <Button 
          className="w-full mb-4 bg-purple-600 hover:bg-purple-700" 
          onClick={() => setReceiveModalOpen(true)}
        >
          <Download className="h-4 w-4 mr-2" />
          Receber Volume no CD
        </Button>

        {/* Abas */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="em_transito" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700">
              Em Trânsito ({emTransito.length})
            </TabsTrigger>
            <TabsTrigger value="no_cd" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
              No CD ({noCd.length})
            </TabsTrigger>
            <TabsTrigger value="em_rota" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
              Em Rota ({emRota.length})
            </TabsTrigger>
            <TabsTrigger value="entregues" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700">
              Entregues ({entregues.length})
            </TabsTrigger>
          </TabsList>

          {/* Em Trânsito */}
          <TabsContent value="em_transito">
            {emTransito.length ? (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Volumes sendo transportados pelos motoristas de coleta
                </p>
                {emTransito.map(v => renderVolumeCard(v))}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhum volume em trânsito
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* No CD */}
          <TabsContent value="no_cd">
            {noCd.length ? (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Volumes aguardando motorista de entrega
                </p>
                {noCd.map(v => renderVolumeCard(v))}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhum volume no CD
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Em Rota */}
          <TabsContent value="em_rota">
            {emRota.length ? (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Volumes em rota com motoristas de entrega
                </p>
                {emRota.map(v => renderVolumeCard(v))}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhum volume em rota
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Entregues */}
          <TabsContent value="entregues">
            {entregues.length ? (
              entregues.map(v => renderVolumeCard(v))
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhum volume entregue
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal: Receber Volume no CD */}
      <Dialog open={receiveModalOpen} onOpenChange={setReceiveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receber Volume no CD</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Digite o código ETI do volume para recebê-lo no CD.
          </p>
          <Input
            placeholder="Ex: ETI-0001 ou 0001"
            value={receiveEtiInput}
            onChange={(e) => setReceiveEtiInput(e.target.value)}
            className="font-mono text-center text-lg"
          />
          <Button 
            onClick={handleReceiveVolume} 
            disabled={receiving || !receiveEtiInput.trim()}
            className="w-full"
          >
            {receiving ? 'Recebendo...' : 'Confirmar Recebimento'}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Volume</DialogTitle>
          </DialogHeader>
          {selectedVolume && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Código ETI</p>
                  <p className="font-mono text-xl font-bold">{selectedVolume.eti_code}</p>
                </div>
                <Badge className={getStatusColor(selectedVolume.status)}>
                  {getStatusLabel(selectedVolume.status)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Volume</p>
                  <p className="font-semibold">{selectedVolume.volume_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Peso</p>
                  <p className="font-semibold">{selectedVolume.weight} kg</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Destinatário</p>
                <div className="bg-muted/50 p-3 rounded text-sm">
                  <p className="font-medium">{selectedVolume.recipient_name}</p>
                  <p>{selectedVolume.recipient_phone}</p>
                  <p>{selectedVolume.recipient_street}, {selectedVolume.recipient_number}</p>
                  {selectedVolume.recipient_complement && <p>{selectedVolume.recipient_complement}</p>}
                  <p>{selectedVolume.recipient_neighborhood}</p>
                  <p>{selectedVolume.recipient_city}/{selectedVolume.recipient_state} - CEP: {selectedVolume.recipient_cep}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Histórico</p>
                <B2BVolumeStatusHistory volumeId={selectedVolume.id} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CdDashboard;
