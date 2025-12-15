import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Package, Truck, CheckCircle, LogOut, MapPin, RefreshCw, Download, Route, User, Eye, ChevronDown, History } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import B2BStatusHistory from '@/components/b2b/B2BStatusHistory';

interface CdUser {
  id: string;
  nome: string;
  email: string;
}

interface B2BShipment {
  id: string;
  tracking_code: string;
  status: string;
  created_at: string;
  total_volumes: number;
  total_weight: number;
  motorista_coleta_id: string | null;
  motorista_entrega_id: string | null;
  motorista_nome?: string | null;
  delivery_date?: string | null;
  observations?: string | null;
}

const CdDashboard = () => {
  const navigate = useNavigate();
  const [cdUser, setCdUser] = useState<CdUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<B2BShipment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('em_transito');
  
  // Modal para receber volume no CD
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [receiveEtiInput, setReceiveEtiInput] = useState('');
  const [receiving, setReceiving] = useState(false);
  
  // Modal de detalhes
  const [selectedShipment, setSelectedShipment] = useState<B2BShipment | null>(null);
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
      await loadShipments();
    } catch (error) {
      navigate('/cd/auth');
    } finally {
      setLoading(false);
    }
  };

  const loadShipments = async () => {
    setRefreshing(true);
    try {
      // Buscar remessas B2B
      const { data, error } = await supabase
        .from('b2b_shipments')
        .select('id, tracking_code, status, created_at, total_volumes, total_weight, motorista_coleta_id, motorista_entrega_id, delivery_date, observations')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Buscar nomes dos motoristas
      const motoristaIds = [...new Set((data || [])
        .flatMap(s => [s.motorista_coleta_id, s.motorista_entrega_id])
        .filter(Boolean))] as string[];
      
      let motoristasMap: Record<string, string> = {};

      if (motoristaIds.length > 0) {
        const { data: motoristas } = await supabase
          .from('motoristas')
          .select('id, nome')
          .in('id', motoristaIds);
        
        if (motoristas) {
          motoristasMap = motoristas.reduce((acc: any, m: any) => {
            acc[m.id] = m.nome;
            return acc;
          }, {});
        }
      }

      // Combinar dados das remessas com nomes dos motoristas
      const shipmentsWithMotorista = (data || []).map(s => ({
        ...s,
        motorista_nome: s.motorista_coleta_id ? motoristasMap[s.motorista_coleta_id] : 
                        s.motorista_entrega_id ? motoristasMap[s.motorista_entrega_id] : null
      }));

      setShipments(shipmentsWithMotorista);
    } catch (error) {
      toast.error('Erro ao carregar remessas');
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
      toast.info('Funcionalidade em desenvolvimento');
      setReceiveModalOpen(false);
      setReceiveEtiInput('');
    } catch (error) {
      toast.error('Erro ao receber volume');
    } finally {
      setReceiving(false);
    }
  };

  // Filtra remessas por status
  const emTransito = shipments.filter(s => 
    ['PENDENTE', 'ACEITA'].includes(s.status)
  );
  
  const noCd = shipments.filter(s => s.status === 'NO_CD');
  const emRota = shipments.filter(s => ['EM_ROTA'].includes(s.status));
  const entregues = shipments.filter(s => s.status === 'CONCLUIDO');

  const handleShowDetails = (shipment: B2BShipment) => {
    setSelectedShipment(shipment);
    setShowDetailsModal(true);
  };

  // Renderiza card COM histórico de status
  const renderCard = (s: B2BShipment) => (
    <Card key={s.id} className="mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between mb-2">
          <div>
            <h3 className="font-mono font-medium">{s.tracking_code}</h3>
          </div>
          <Badge className={
            s.status === 'CONCLUIDO' ? 'bg-green-500' : 
            ['EM_ROTA'].includes(s.status) ? 'bg-blue-500' : 
            s.status === 'NO_CD' ? 'bg-purple-500' : 
            'bg-orange-500'
          }>
            {s.status === 'NO_CD' ? 'No CD' :
             s.status === 'EM_ROTA' ? 'Em Rota' :
             s.status === 'CONCLUIDO' ? 'Concluído' :
             'Pendente'}
          </Badge>
        </div>
        
        <div className="text-sm text-muted-foreground">
          <Package className="h-3 w-3 inline mr-1" />
          {s.total_volumes} volume(s) - {s.total_weight} kg
        </div>

        {/* Mostrar motorista */}
        {s.motorista_nome && (
          <div className="flex items-center gap-1 mt-2 text-sm">
            <User className="h-3 w-3 text-blue-500" />
            <span className="text-blue-600 font-medium">Motorista: {s.motorista_nome}</span>
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
            <B2BStatusHistory shipmentId={s.id} />
          </CollapsibleContent>
        </Collapsible>

        {/* Botão Ver Detalhes */}
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={() => handleShowDetails(s)}
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
            <Package className="h-6 w-6 text-purple-600" />
            <div>
              <h1 className="font-semibold">Centro de Distribuição</h1>
              <p className="text-sm text-muted-foreground">{cdUser?.nome}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadShipments}>
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
              <Package className="h-5 w-5 mx-auto text-purple-500" />
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
              <p className="text-xs">Concluídos</p>
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
              Em Trânsito
            </TabsTrigger>
            <TabsTrigger value="no_cd" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
              No CD
            </TabsTrigger>
            <TabsTrigger value="em_rota" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
              Em Rota
            </TabsTrigger>
            <TabsTrigger value="entregues" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700">
              Concluídos
            </TabsTrigger>
          </TabsList>

          {/* Em Trânsito */}
          <TabsContent value="em_transito">
            {emTransito.length ? (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Volumes aguardando coleta ou sendo transportados
                </p>
                {emTransito.map(s => renderCard(s))}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhuma remessa em trânsito
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
                {noCd.map(s => renderCard(s))}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhuma remessa no CD
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
                {emRota.map(s => renderCard(s))}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhuma remessa em rota
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Concluídos */}
          <TabsContent value="entregues">
            {entregues.length ? (
              entregues.map(s => renderCard(s))
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhuma remessa concluída
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
            placeholder="Ex: 0001"
            value={receiveEtiInput}
            onChange={(e) => setReceiveEtiInput(e.target.value)}
            className="font-mono text-center text-lg"
            maxLength={4}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Remessa</DialogTitle>
          </DialogHeader>
          {selectedShipment && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Código</p>
                <p className="font-mono font-semibold">{selectedShipment.tracking_code}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Volumes</p>
                  <p className="font-semibold">{selectedShipment.total_volumes}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Peso Total</p>
                  <p className="font-semibold">{selectedShipment.total_weight} kg</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Histórico</p>
                <B2BStatusHistory shipmentId={selectedShipment.id} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CdDashboard;
