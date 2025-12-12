import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Package, Truck, CheckCircle, LogOut, MapPin, RefreshCw, Download, Route, User } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
  recipient_name: string | null;
  recipient_phone: string | null;
  recipient_cep: string | null;
  recipient_city: string | null;
  recipient_state: string | null;
  recipient_street: string | null;
  recipient_number: string | null;
  recipient_neighborhood: string | null;
  volume_count: number | null;
  volume_weight: number | null;
  volume_eti_code: string | null;
  motorista_id: string | null;
  motorista_nome?: string | null;
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
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Buscar nomes dos motoristas
      const motoristaIds = [...new Set((data || []).filter(s => s.motorista_id).map(s => s.motorista_id))];
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

      // Buscar histórico de coleta para saber qual motorista coletou cada remessa
      const shipmentIds = (data || []).map(s => s.id);
      let coletaHistoryMap: Record<string, string> = {};

      if (shipmentIds.length > 0) {
        const { data: history } = await supabase
          .from('shipment_status_history')
          .select('b2b_shipment_id, motorista_id')
          .in('b2b_shipment_id', shipmentIds)
          .eq('status', 'B2B_COLETA_ACEITA');
        
        if (history) {
          // Buscar nomes dos motoristas do histórico
          const historyMotoristaIds = [...new Set(history.filter(h => h.motorista_id).map(h => h.motorista_id))];
          if (historyMotoristaIds.length > 0) {
            const { data: historyMotoristas } = await supabase
              .from('motoristas')
              .select('id, nome')
              .in('id', historyMotoristaIds);
            
            if (historyMotoristas) {
              historyMotoristas.forEach((m: any) => {
                motoristasMap[m.id] = m.nome;
              });
            }
          }
          
          history.forEach((h: any) => {
            if (h.motorista_id) {
              coletaHistoryMap[h.b2b_shipment_id] = h.motorista_id;
            }
          });
        }
      }

      // Combinar dados das remessas com nomes dos motoristas
      const shipmentsWithMotorista = (data || []).map(s => {
        // Prioriza motorista atual, depois busca do histórico de coleta
        const motoristaId = s.motorista_id || coletaHistoryMap[s.id];
        return {
          ...s,
          motorista_nome: motoristaId ? motoristasMap[motoristaId] : null
        };
      });

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

  // Receber volume no CD - busca por ETI e muda status para NO_CD
  // SÓ PERMITE SE TEM MOTORISTA ATRIBUÍDO (foi coletado)
  const handleReceiveVolume = async () => {
    if (!receiveEtiInput.trim()) return;
    setReceiving(true);
    try {
      // Busca volume pelo código ETI que foi ACEITO por motorista de coleta
      const shipment = shipments.find(s => 
        s.volume_eti_code?.replace('ETI-', '').padStart(4, '0') === receiveEtiInput.padStart(4, '0') && 
        s.status === 'B2B_COLETA_ACEITA' // Só aceita se status é B2B_COLETA_ACEITA
      );
      
      if (!shipment) {
        // Verifica se existe mas não foi coletado ainda
        const pendingShipment = shipments.find(s => 
          s.volume_eti_code?.replace('ETI-', '').padStart(4, '0') === receiveEtiInput.padStart(4, '0') && 
          ['PENDENTE_COLETA', 'B2B_COLETA_PENDENTE', 'PENDENTE'].includes(s.status)
        );
        
        if (pendingShipment) {
          toast.error('Volume ainda não foi coletado por um motorista');
          return;
        }
        
        toast.error('Volume não encontrado ou já recebido');
        return;
      }
      
      // Atualiza status para NO_CD (mantém motorista_id para histórico)
      const { error } = await supabase
        .from('b2b_shipments')
        .update({ 
          status: 'NO_CD'
          // NÃO limpa motorista_id - mantém para saber quem coletou
        })
        .eq('id', shipment.id);
      
      if (error) throw error;
      
      // Registra histórico
      await supabase.from('shipment_status_history').insert({
        b2b_shipment_id: shipment.id,
        status: 'NO_CD',
        status_description: `Volume recebido no CD por ${cdUser?.nome}`,
        observacoes: `Código ETI validado: ${shipment.volume_eti_code}. Coletado por: ${shipment.motorista_nome || 'N/A'}`
      });
      
      toast.success(`${shipment.tracking_code} recebido no CD!`);
      setReceiveModalOpen(false);
      setReceiveEtiInput('');
      await loadShipments();
    } catch (error) {
      toast.error('Erro ao receber volume');
    } finally {
      setReceiving(false);
    }
  };

  // Filtra remessas por status
  // Em Trânsito: volumes sendo coletados (pendentes ou aceitos por motorista de coleta)
  const emTransito = shipments.filter(s => 
    ['PENDENTE_COLETA', 'B2B_COLETA_PENDENTE', 'PENDENTE', 'B2B_COLETA_ACEITA'].includes(s.status)
  );
  
  // No CD: volumes que chegaram e aguardam motorista de entrega aceitar
  const noCd = shipments.filter(s => s.status === 'NO_CD');
  
  // Em Rota: volumes aceitos por motorista de entrega
  const emRota = shipments.filter(s => ['EM_ROTA', 'B2B_VOLUME_ACEITO'].includes(s.status));
  
  // Entregues: volumes finalizados
  const entregues = shipments.filter(s => s.status === 'ENTREGUE');

  // Renderiza card com informação do motorista de coleta
  const renderCard = (s: B2BShipment, showEti = true) => (
    <Card key={s.id} className="mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between mb-2">
          <div>
            <h3 className="font-mono font-medium">{s.tracking_code}</h3>
            {showEti && s.volume_eti_code && (
              <Badge variant="outline" className="bg-purple-50 mt-1">{s.volume_eti_code}</Badge>
            )}
          </div>
          <Badge className={
            s.status === 'ENTREGUE' ? 'bg-green-500' : 
            ['EM_ROTA', 'B2B_VOLUME_ACEITO'].includes(s.status) ? 'bg-blue-500' : 
            s.status === 'NO_CD' ? 'bg-purple-500' : 
            s.status === 'B2B_COLETA_ACEITA' ? 'bg-yellow-500' :
            'bg-orange-500'
          }>
            {s.status === 'NO_CD' ? 'No CD' :
             ['EM_ROTA', 'B2B_VOLUME_ACEITO'].includes(s.status) ? 'Em Rota' :
             s.status === 'ENTREGUE' ? 'Entregue' :
             s.status === 'B2B_COLETA_ACEITA' ? 'Coletado' :
             'Aguardando Coleta'}
          </Badge>
        </div>
        
        <div className="text-sm text-muted-foreground">
          <MapPin className="h-3 w-3 inline mr-1" />
          {s.recipient_name || 'Destinatário'} - {s.recipient_city || 'Cidade'}/{s.recipient_state || 'UF'}
        </div>
        
        {s.volume_weight && (
          <div className="text-sm text-muted-foreground mt-1">
            Peso: {s.volume_weight} kg
          </div>
        )}

        {/* Mostrar motorista de coleta */}
        {s.motorista_nome && (
          <div className="flex items-center gap-1 mt-2 text-sm">
            <User className="h-3 w-3 text-blue-500" />
            <span className="text-blue-600 font-medium">Coletado por: {s.motorista_nome}</span>
          </div>
        )}
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
              Em Trânsito
            </TabsTrigger>
            <TabsTrigger value="no_cd" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
              No CD
            </TabsTrigger>
            <TabsTrigger value="em_rota" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
              Em Rota
            </TabsTrigger>
            <TabsTrigger value="entregues" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700">
              Entregues
            </TabsTrigger>
          </TabsList>

          {/* Em Trânsito - mostra ETI e motorista se coletado */}
          <TabsContent value="em_transito">
            {emTransito.length ? (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Volumes aguardando coleta ou sendo transportados
                </p>
                {emTransito.map(s => renderCard(s, true))}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhuma remessa em trânsito
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* No CD - aguardando motorista de entrega aceitar */}
          <TabsContent value="no_cd">
            {noCd.length ? (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Volumes aguardando motorista de entrega aceitar
                </p>
                {noCd.map(s => renderCard(s, true))}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhuma remessa no CD
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Em Rota - aceitos por motoristas de entrega */}
          <TabsContent value="em_rota">
            {emRota.length ? (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Volumes em rota com motoristas de entrega
                </p>
                {emRota.map(s => renderCard(s, true))}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhuma remessa em rota
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Entregues */}
          <TabsContent value="entregues">
            {entregues.length ? (
              entregues.map(s => renderCard(s, true))
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhuma remessa entregue
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
            Digite os 4 dígitos do código ETI do volume coletado
          </p>
          <Input 
            placeholder="0001" 
            value={receiveEtiInput} 
            onChange={e => setReceiveEtiInput(e.target.value.replace(/\D/g, '').slice(0, 4))} 
            className="text-center text-2xl font-mono"
            maxLength={4}
          />
          <p className="text-xs text-amber-600">
            ⚠️ Apenas volumes já coletados por motorista podem ser recebidos
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => { setReceiveModalOpen(false); setReceiveEtiInput(''); }}
            >
              Cancelar
            </Button>
            <Button 
              className="flex-1 bg-purple-600 hover:bg-purple-700" 
              onClick={handleReceiveVolume} 
              disabled={receiving || receiveEtiInput.length < 4}
            >
              {receiving ? 'Recebendo...' : 'Confirmar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CdDashboard;
