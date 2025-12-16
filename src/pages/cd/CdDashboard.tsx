import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package, Truck, CheckCircle, LogOut, MapPin, RefreshCw, Download, Send, RotateCcw, User, ChevronDown, History, Warehouse, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CdUser {
  id: string;
  nome: string;
  email: string;
}

interface Motorista {
  id: string;
  nome: string;
  username: string;
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
      cep: string;
      street: string;
      number: string;
      complement: string | null;
      neighborhood: string;
      city: string;
      state: string;
    };
  };
  motorista_coleta_nome?: string;
  motorista_entrega_nome?: string;
  status_history?: Array<{
    status: string;
    created_at: string;
    observacoes: string | null;
    motorista_nome: string | null;
    is_alert: boolean;
  }>;
}

// Status labels e cores
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  'PENDENTE': { label: 'Pendente', color: 'text-yellow-700', bgColor: 'bg-yellow-100 border-yellow-300' },
  'ACEITO': { label: 'Aceito', color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-300' },
  'COLETADO': { label: 'Coletado', color: 'text-orange-700', bgColor: 'bg-orange-100 border-orange-300' },
  'EM_TRIAGEM': { label: 'Em Triagem', color: 'text-purple-700', bgColor: 'bg-purple-100 border-purple-300' },
  'AGUARDANDO_EXPEDICAO': { label: 'Aguardando Expedição', color: 'text-indigo-700', bgColor: 'bg-indigo-100 border-indigo-300' },
  'DESPACHADO': { label: 'Despachado', color: 'text-cyan-700', bgColor: 'bg-cyan-100 border-cyan-300' },
  'CONCLUIDO': { label: 'Concluído', color: 'text-green-700', bgColor: 'bg-green-100 border-green-300' },
  'DEVOLUCAO': { label: 'Devolução', color: 'text-red-700', bgColor: 'bg-red-100 border-red-300' },
};

const CdDashboard = () => {
  const navigate = useNavigate();
  const [cdUser, setCdUser] = useState<CdUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [volumes, setVolumes] = useState<B2BVolume[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // Abas principais
  const [mainTab, setMainTab] = useState('coletas');
  const [subTab, setSubTab] = useState('pendentes');
  
  // Modal Receber Volume
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [receiveMotoristaId, setReceiveMotoristaId] = useState('');
  const [receiveEtiInput, setReceiveEtiInput] = useState('');
  const [receivedVolumes, setReceivedVolumes] = useState<B2BVolume[]>([]);
  const [receiving, setReceiving] = useState(false);
  
  // Modal Despachar Volume
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchMotoristaId, setDispatchMotoristaId] = useState('');
  const [dispatchEtiInput, setDispatchEtiInput] = useState('');
  const [dispatchedVolumes, setDispatchedVolumes] = useState<B2BVolume[]>([]);
  const [dispatching, setDispatching] = useState(false);
  
  // Modal Devolver Volume
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnMotoristaId, setReturnMotoristaId] = useState('');
  const [returnEtiInput, setReturnEtiInput] = useState('');
  const [returnedVolumes, setReturnedVolumes] = useState<B2BVolume[]>([]);
  const [returning, setReturning] = useState(false);
  
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
      await Promise.all([loadVolumes(), loadMotoristas()]);
    } catch (error) {
      navigate('/cd/auth');
    } finally {
      setLoading(false);
    }
  };

  const loadMotoristas = async () => {
    const { data, error } = await supabase
      .from('motoristas')
      .select('id, nome, username')
      .eq('status', 'ativo')
      .order('nome');
    
    if (!error && data) {
      setMotoristas(data);
    }
  };

  const loadVolumes = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('b2b_volumes')
        .select(`
          *,
          shipment:b2b_shipments(
            tracking_code, 
            delivery_date,
            pickup_address:b2b_pickup_addresses(
              name, contact_name, contact_phone, cep, street, number, complement, neighborhood, city, state
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Buscar nomes dos motoristas
      const motoristaIds = [...new Set((data || [])
        .flatMap(v => [v.motorista_coleta_id, v.motorista_entrega_id])
        .filter(Boolean))] as string[];
      
      let motoristasMap: Record<string, string> = {};
      if (motoristaIds.length > 0) {
        const { data: motoristasData } = await supabase
          .from('motoristas')
          .select('id, nome')
          .in('id', motoristaIds);
        
        if (motoristasData) {
          motoristasMap = motoristasData.reduce((acc: Record<string, string>, m) => {
            acc[m.id] = m.nome;
            return acc;
          }, {});
        }
      }

      // Buscar histórico de status para cada volume
      const volumeIds = (data || []).map(v => v.id);
      let historyMap: Record<string, any[]> = {};
      
      if (volumeIds.length > 0) {
        const { data: historyData } = await supabase
          .from('b2b_status_history')
          .select('*')
          .in('volume_id', volumeIds)
          .order('created_at', { ascending: false });
        
        if (historyData) {
          historyData.forEach(h => {
            if (!historyMap[h.volume_id]) historyMap[h.volume_id] = [];
            historyMap[h.volume_id].push(h);
          });
        }
      }

      const volumesWithData = (data || []).map(v => ({
        ...v,
        motorista_coleta_nome: v.motorista_coleta_id ? motoristasMap[v.motorista_coleta_id] : undefined,
        motorista_entrega_nome: v.motorista_entrega_id ? motoristasMap[v.motorista_entrega_id] : undefined,
        status_history: historyMap[v.id] || []
      }));

      setVolumes(volumesWithData);
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

  // Filtros por status
  const pendentes = volumes.filter(v => v.status === 'PENDENTE');
  const aceitos = volumes.filter(v => v.status === 'ACEITO');
  const coletados = volumes.filter(v => v.status === 'COLETADO');
  const emTriagem = volumes.filter(v => v.status === 'EM_TRIAGEM');
  const aguardandoExpedicao = volumes.filter(v => v.status === 'AGUARDANDO_EXPEDICAO');
  const despachados = volumes.filter(v => v.status === 'DESPACHADO');
  const concluidos = volumes.filter(v => v.status === 'CONCLUIDO');
  const devolucoes = volumes.filter(v => v.status === 'DEVOLUCAO');

  // Parsear código ETI
  const parseEtiCode = (input: string): string => {
    const cleaned = input.replace(/\D/g, '').slice(-4);
    return `ETI-${cleaned.padStart(4, '0')}`;
  };

  // ==================== RECEBER VOLUME ====================
  const handleReceiveEtiKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && receiveEtiInput.trim()) {
      e.preventDefault();
      const etiCode = parseEtiCode(receiveEtiInput);
      
      // Verificar se já foi adicionado
      if (receivedVolumes.find(v => v.eti_code === etiCode)) {
        toast.error('Volume já adicionado');
        setReceiveEtiInput('');
        return;
      }

      // Buscar volume com status COLETADO do motorista selecionado
      const volume = volumes.find(v => 
        v.eti_code === etiCode && 
        v.status === 'COLETADO' &&
        v.motorista_coleta_id === receiveMotoristaId
      );

      if (!volume) {
        toast.error('Volume não encontrado ou não está a caminho do CD');
        setReceiveEtiInput('');
        return;
      }

      setReceivedVolumes(prev => [...prev, volume]);
      setReceiveEtiInput('');
      toast.success(`Volume ${etiCode} adicionado`);
    }
  };

  const handleRemoveReceivedVolume = (volumeId: string) => {
    setReceivedVolumes(prev => prev.filter(v => v.id !== volumeId));
  };

  const handleConfirmReceive = async () => {
    if (receivedVolumes.length === 0) return;
    setReceiving(true);

    try {
      for (const volume of receivedVolumes) {
        await supabase
          .from('b2b_volumes')
          .update({ 
            status: 'EM_TRIAGEM',
            motorista_coleta_id: null // Desvincular motorista de coleta
          })
          .eq('id', volume.id);

        await supabase.from('b2b_status_history').insert({
          volume_id: volume.id,
          status: 'EM_TRIAGEM',
          observacoes: `Recebido no CD por ${cdUser?.nome}`
        });
      }

      toast.success(`${receivedVolumes.length} volume(s) recebido(s) no CD`);
      setReceiveModalOpen(false);
      setReceivedVolumes([]);
      setReceiveMotoristaId('');
      await loadVolumes();
    } catch (error) {
      toast.error('Erro ao receber volumes');
    } finally {
      setReceiving(false);
    }
  };

  // ==================== DESPACHAR VOLUME ====================
  const handleDispatchEtiKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && dispatchEtiInput.trim()) {
      e.preventDefault();
      const etiCode = parseEtiCode(dispatchEtiInput);
      
      if (dispatchedVolumes.find(v => v.eti_code === etiCode)) {
        toast.error('Volume já adicionado');
        setDispatchEtiInput('');
        return;
      }

      // Buscar volume em EM_TRIAGEM ou AGUARDANDO_EXPEDICAO
      const volume = volumes.find(v => 
        v.eti_code === etiCode && 
        ['EM_TRIAGEM', 'AGUARDANDO_EXPEDICAO'].includes(v.status)
      );

      if (!volume) {
        toast.error('Volume não encontrado ou não está disponível para despacho');
        setDispatchEtiInput('');
        return;
      }

      setDispatchedVolumes(prev => [...prev, volume]);
      setDispatchEtiInput('');
      toast.success(`Volume ${etiCode} adicionado`);
    }
  };

  const handleRemoveDispatchedVolume = (volumeId: string) => {
    setDispatchedVolumes(prev => prev.filter(v => v.id !== volumeId));
  };

  const handleConfirmDispatch = async () => {
    if (dispatchedVolumes.length === 0 || !dispatchMotoristaId) {
      toast.error('Selecione o motorista e adicione volumes');
      return;
    }
    setDispatching(true);

    try {
      const motoristaNome = motoristas.find(m => m.id === dispatchMotoristaId)?.nome;

      for (const volume of dispatchedVolumes) {
        // CD despacha para AGUARDANDO_EXPEDICAO, motorista bipa para DESPACHADO
        await supabase
          .from('b2b_volumes')
          .update({ 
            status: 'AGUARDANDO_EXPEDICAO',
            motorista_entrega_id: dispatchMotoristaId
          })
          .eq('id', volume.id);

        await supabase.from('b2b_status_history').insert({
          volume_id: volume.id,
          status: 'AGUARDANDO_EXPEDICAO',
          motorista_id: dispatchMotoristaId,
          motorista_nome: motoristaNome,
          observacoes: `Separado para expedição - ${motoristaNome} por ${cdUser?.nome}`
        });
      }

      toast.success(`${dispatchedVolumes.length} volume(s) separado(s) para expedição`);
      setDispatchModalOpen(false);
      setDispatchedVolumes([]);
      setDispatchMotoristaId('');
      await loadVolumes();
    } catch (error) {
      toast.error('Erro ao despachar volumes');
    } finally {
      setDispatching(false);
    }
  };

  // ==================== DEVOLVER VOLUME ====================
  const handleReturnEtiKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && returnEtiInput.trim()) {
      e.preventDefault();
      const etiCode = parseEtiCode(returnEtiInput);
      
      if (returnedVolumes.find(v => v.eti_code === etiCode)) {
        toast.error('Volume já adicionado');
        setReturnEtiInput('');
        return;
      }

      // Buscar volume DESPACHADO do motorista selecionado
      const volume = volumes.find(v => 
        v.eti_code === etiCode && 
        v.status === 'DESPACHADO' &&
        v.motorista_entrega_id === returnMotoristaId
      );

      if (!volume) {
        toast.error('Volume não encontrado ou não está despachado para este motorista');
        setReturnEtiInput('');
        return;
      }

      setReturnedVolumes(prev => [...prev, volume]);
      setReturnEtiInput('');
      toast.success(`Volume ${etiCode} adicionado`);
    }
  };

  const handleRemoveReturnedVolume = (volumeId: string) => {
    setReturnedVolumes(prev => prev.filter(v => v.id !== volumeId));
  };

  const handleConfirmReturn = async () => {
    if (returnedVolumes.length === 0 || !returnMotoristaId) {
      toast.error('Selecione o motorista e adicione volumes');
      return;
    }
    setReturning(true);

    try {
      const motoristaNome = motoristas.find(m => m.id === returnMotoristaId)?.nome;

      for (const volume of returnedVolumes) {
        await supabase
          .from('b2b_volumes')
          .update({ 
            status: 'DEVOLUCAO',
            motorista_entrega_id: null
          })
          .eq('id', volume.id);

        await supabase.from('b2b_status_history').insert({
          volume_id: volume.id,
          status: 'DEVOLUCAO',
          motorista_id: returnMotoristaId,
          motorista_nome: motoristaNome,
          observacoes: `Devolvido por ${motoristaNome} - Registrado por ${cdUser?.nome}`,
          is_alert: true
        });
      }

      toast.success(`${returnedVolumes.length} volume(s) devolvido(s)`);
      setReturnModalOpen(false);
      setReturnedVolumes([]);
      setReturnMotoristaId('');
      await loadVolumes();
    } catch (error) {
      toast.error('Erro ao devolver volumes');
    } finally {
      setReturning(false);
    }
  };

  // Renderizar card de volume
  const renderVolumeCard = (v: B2BVolume) => {
    const statusConfig = STATUS_CONFIG[v.status] || { label: v.status, color: 'text-gray-700', bgColor: 'bg-gray-100' };
    const recentHistory = (v.status_history || []).slice(0, 2);
    const hasDevolucaoHistory = (v.status_history || []).some(h => h.status === 'DEVOLUCAO');

    return (
      <Card key={v.id} className={`mb-3 ${hasDevolucaoHistory ? 'border-red-300 border-2' : ''}`}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-mono font-bold text-lg">{v.eti_code}</h3>
              {v.shipment && (
                <p className="text-xs text-muted-foreground">{v.shipment.tracking_code}</p>
              )}
            </div>
            <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border`}>
              {statusConfig.label}
            </Badge>
          </div>
          
          {hasDevolucaoHistory && (
            <div className="flex items-center gap-1 mb-2 text-red-600 text-xs">
              <AlertTriangle className="h-3 w-3" />
              <span>Volume foi devolvido anteriormente</span>
            </div>
          )}
          
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

          {/* Motoristas */}
          {v.motorista_coleta_nome && (
            <div className="flex items-center gap-1 mt-2 text-xs text-orange-600">
              <Truck className="h-3 w-3" />
              <span>Coleta: {v.motorista_coleta_nome}</span>
            </div>
          )}
          {v.motorista_entrega_nome && (
            <div className="flex items-center gap-1 mt-1 text-xs text-blue-600">
              <Send className="h-3 w-3" />
              <span>Entrega: {v.motorista_entrega_nome}</span>
            </div>
          )}

          {/* Histórico recente */}
          {recentHistory.length > 0 && (
            <div className="mt-3 pt-2 border-t">
              <p className="text-xs font-medium mb-1 flex items-center gap-1">
                <History className="h-3 w-3" />
                Histórico recente
              </p>
              <div className="space-y-1">
                {recentHistory.map((h, idx) => (
                  <div key={idx} className={`text-xs p-1.5 rounded ${h.is_alert ? 'bg-red-50 text-red-700' : 'bg-muted/50'}`}>
                    <div className="flex justify-between">
                      <span className="font-medium">{STATUS_CONFIG[h.status]?.label || h.status}</span>
                      <span className="text-muted-foreground">
                        {format(new Date(h.created_at), 'dd/MM HH:mm')}
                      </span>
                    </div>
                    {h.observacoes && <p className="text-muted-foreground truncate">{h.observacoes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            onClick={() => {
              setSelectedVolume(v);
              setShowDetailsModal(true);
            }}
          >
            Ver Detalhes
          </Button>
        </CardContent>
      </Card>
    );
  };

  // Render lista de volumes
  const renderVolumeList = (volumeList: B2BVolume[], emptyMessage: string) => {
    if (volumeList.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {emptyMessage}
          </CardContent>
        </Card>
      );
    }
    return volumeList.map(v => renderVolumeCard(v));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
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
        {/* Botões principais */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Button 
            className="bg-green-600 hover:bg-green-700 h-12" 
            onClick={() => setReceiveModalOpen(true)}
          >
            <Download className="h-4 w-4 mr-2" />
            Receber Volume
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 h-12" 
            onClick={() => setDispatchModalOpen(true)}
          >
            <Send className="h-4 w-4 mr-2" />
            Expedir Volume
          </Button>
          <Button 
            variant="destructive"
            className="h-12" 
            onClick={() => setReturnModalOpen(true)}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Devolver Volume
          </Button>
        </div>

        {/* Abas principais */}
        <Tabs value={mainTab} onValueChange={(v) => { setMainTab(v); setSubTab(''); }}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="coletas">
              Coletas ({pendentes.length + aceitos.length + coletados.length})
            </TabsTrigger>
            <TabsTrigger value="recepcao">
              Recepção ({emTriagem.length})
            </TabsTrigger>
            <TabsTrigger value="operacao">
              Expedição ({aguardandoExpedicao.length})
            </TabsTrigger>
            <TabsTrigger value="entregas">
              Entregas ({despachados.length + concluidos.length})
            </TabsTrigger>
            <TabsTrigger value="devolucoes">
              Devoluções ({devolucoes.length})
            </TabsTrigger>
          </TabsList>

          {/* Coletas */}
          <TabsContent value="coletas" className="mt-4">
            <Tabs value={subTab || 'pendentes'} onValueChange={setSubTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="pendentes">Pendentes ({pendentes.length})</TabsTrigger>
                <TabsTrigger value="aceitos">Aceitos ({aceitos.length})</TabsTrigger>
                <TabsTrigger value="coletados">Coletados ({coletados.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="pendentes">
                {renderVolumeList(pendentes, 'Nenhum volume pendente')}
              </TabsContent>
              <TabsContent value="aceitos">
                {renderVolumeList(aceitos, 'Nenhum volume aceito')}
              </TabsContent>
              <TabsContent value="coletados">
                {renderVolumeList(coletados, 'Nenhum volume coletado (a caminho do CD)')}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Recepção */}
          <TabsContent value="recepcao" className="mt-4">
            <p className="text-sm text-muted-foreground mb-3">Volumes em triagem no CD</p>
            {renderVolumeList(emTriagem, 'Nenhum volume em triagem')}
          </TabsContent>

          {/* Operação Interna */}
          <TabsContent value="operacao" className="mt-4">
            <p className="text-sm text-muted-foreground mb-3">Volumes aguardando expedição</p>
            {renderVolumeList(aguardandoExpedicao, 'Nenhum volume aguardando expedição')}
          </TabsContent>

          {/* Entregas */}
          <TabsContent value="entregas" className="mt-4">
            <Tabs value={subTab || 'despachados'} onValueChange={setSubTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="despachados">Despachados ({despachados.length})</TabsTrigger>
                <TabsTrigger value="concluidos">Concluídos ({concluidos.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="despachados">
                {renderVolumeList(despachados, 'Nenhum volume despachado')}
              </TabsContent>
              <TabsContent value="concluidos">
                {renderVolumeList(concluidos, 'Nenhum volume concluído')}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Devoluções */}
          <TabsContent value="devolucoes" className="mt-4">
            <p className="text-sm text-muted-foreground mb-3">Volumes devolvidos</p>
            {renderVolumeList(devolucoes, 'Nenhuma devolução')}
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal: Receber Volume */}
      <Dialog open={receiveModalOpen} onOpenChange={setReceiveModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-green-600" />
              Receber Volume no CD
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motorista que está entregando</Label>
              <Select value={receiveMotoristaId} onValueChange={setReceiveMotoristaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motorista" />
                </SelectTrigger>
                <SelectContent>
                  {motoristas.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {receiveMotoristaId && (
              <>
                <div className="space-y-2">
                  <Label>Código ETI (bipe ou digite)</Label>
                  <Input
                    placeholder="Ex: 0001"
                    value={receiveEtiInput}
                    onChange={(e) => setReceiveEtiInput(e.target.value)}
                    onKeyDown={handleReceiveEtiKeyDown}
                    className="font-mono text-center text-lg"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">Digite e pressione Enter</p>
                </div>

                {receivedVolumes.length > 0 && (
                  <div className="space-y-2">
                    <Label>Volumes adicionados ({receivedVolumes.length})</Label>
                    <ScrollArea className="h-40 border rounded p-2">
                      {receivedVolumes.map(v => (
                        <div key={v.id} className="flex items-center justify-between py-1 border-b last:border-0">
                          <span className="font-mono text-sm">{v.eti_code}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveReceivedVolume(v.id)}
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setReceiveModalOpen(false);
                  setReceivedVolumes([]);
                  setReceiveMotoristaId('');
                }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleConfirmReceive}
                disabled={receiving || receivedVolumes.length === 0}
              >
                {receiving ? 'Recebendo...' : `Confirmar (${receivedVolumes.length})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Despachar Volume */}
      <Dialog open={dispatchModalOpen} onOpenChange={setDispatchModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              Expedir Volume
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motorista de entrega</Label>
              <Select value={dispatchMotoristaId} onValueChange={setDispatchMotoristaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motorista" />
                </SelectTrigger>
                <SelectContent>
                  {motoristas.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {dispatchMotoristaId && (
              <>
                <div className="space-y-2">
                  <Label>Código ETI (bipe ou digite)</Label>
                  <Input
                    placeholder="Ex: 0001"
                    value={dispatchEtiInput}
                    onChange={(e) => setDispatchEtiInput(e.target.value)}
                    onKeyDown={handleDispatchEtiKeyDown}
                    className="font-mono text-center text-lg"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">Digite e pressione Enter</p>
                </div>

                {dispatchedVolumes.length > 0 && (
                  <div className="space-y-2">
                    <Label>Volumes a despachar ({dispatchedVolumes.length})</Label>
                    <ScrollArea className="h-40 border rounded p-2">
                      {dispatchedVolumes.map(v => (
                        <div key={v.id} className="flex items-center justify-between py-1 border-b last:border-0">
                          <span className="font-mono text-sm">{v.eti_code}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveDispatchedVolume(v.id)}
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setDispatchModalOpen(false);
                  setDispatchedVolumes([]);
                  setDispatchMotoristaId('');
                }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={handleConfirmDispatch}
                disabled={dispatching || dispatchedVolumes.length === 0 || !dispatchMotoristaId}
              >
                {dispatching ? 'Despachando...' : `Despachar (${dispatchedVolumes.length})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Devolver Volume */}
      <Dialog open={returnModalOpen} onOpenChange={setReturnModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-red-600" />
              Devolver Volume
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motorista que está devolvendo</Label>
              <Select value={returnMotoristaId} onValueChange={setReturnMotoristaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motorista" />
                </SelectTrigger>
                <SelectContent>
                  {motoristas.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {returnMotoristaId && (
              <>
                <div className="space-y-2">
                  <Label>Código ETI (bipe ou digite)</Label>
                  <Input
                    placeholder="Ex: 0001"
                    value={returnEtiInput}
                    onChange={(e) => setReturnEtiInput(e.target.value)}
                    onKeyDown={handleReturnEtiKeyDown}
                    className="font-mono text-center text-lg"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">Digite e pressione Enter</p>
                </div>

                {returnedVolumes.length > 0 && (
                  <div className="space-y-2">
                    <Label>Volumes a devolver ({returnedVolumes.length})</Label>
                    <ScrollArea className="h-40 border rounded p-2">
                      {returnedVolumes.map(v => (
                        <div key={v.id} className="flex items-center justify-between py-1 border-b last:border-0">
                          <span className="font-mono text-sm">{v.eti_code}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveReturnedVolume(v.id)}
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setReturnModalOpen(false);
                  setReturnedVolumes([]);
                  setReturnMotoristaId('');
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleConfirmReturn}
                disabled={returning || returnedVolumes.length === 0 || !returnMotoristaId}
              >
                {returning ? 'Devolvendo...' : `Devolver (${returnedVolumes.length})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Volume</DialogTitle>
          </DialogHeader>
          {selectedVolume && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Código ETI</p>
                  <p className="font-mono text-2xl font-bold">{selectedVolume.eti_code}</p>
                </div>
                <Badge className={`${STATUS_CONFIG[selectedVolume.status]?.bgColor} ${STATUS_CONFIG[selectedVolume.status]?.color} border`}>
                  {STATUS_CONFIG[selectedVolume.status]?.label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tracking</p>
                  <p className="font-medium">{selectedVolume.shipment?.tracking_code || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Peso</p>
                  <p className="font-medium">{selectedVolume.weight} kg</p>
                </div>
              </div>

              {/* Endereço de Coleta (Remetente) */}
              {selectedVolume.shipment?.pickup_address && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Endereço de Coleta
                  </h4>
                  <div className="bg-muted/50 p-3 rounded text-sm space-y-1">
                    <p className="font-medium">{selectedVolume.shipment.pickup_address.name}</p>
                    <p>{selectedVolume.shipment.pickup_address.contact_name} - {selectedVolume.shipment.pickup_address.contact_phone}</p>
                    <p>{selectedVolume.shipment.pickup_address.street}, {selectedVolume.shipment.pickup_address.number}</p>
                    {selectedVolume.shipment.pickup_address.complement && <p>{selectedVolume.shipment.pickup_address.complement}</p>}
                    <p>{selectedVolume.shipment.pickup_address.neighborhood}</p>
                    <p>{selectedVolume.shipment.pickup_address.city}/{selectedVolume.shipment.pickup_address.state} - {selectedVolume.shipment.pickup_address.cep}</p>
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Destinatário
                </h4>
                <div className="bg-muted/50 p-3 rounded text-sm space-y-1">
                  <p className="font-medium">{selectedVolume.recipient_name}</p>
                  <p>{selectedVolume.recipient_phone}</p>
                  <p>{selectedVolume.recipient_street}, {selectedVolume.recipient_number}</p>
                  {selectedVolume.recipient_complement && <p>{selectedVolume.recipient_complement}</p>}
                  <p>{selectedVolume.recipient_neighborhood}</p>
                  <p>{selectedVolume.recipient_city}/{selectedVolume.recipient_state} - {selectedVolume.recipient_cep}</p>
                </div>
              </div>

              {/* Histórico completo */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Histórico Completo
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(selectedVolume.status_history || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem histórico</p>
                  ) : (
                    (selectedVolume.status_history || []).map((h, idx) => (
                      <div 
                        key={idx} 
                        className={`text-sm p-2 rounded border ${h.is_alert ? 'bg-red-50 border-red-200' : 'bg-muted/30'}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-medium">{STATUS_CONFIG[h.status]?.label || h.status}</span>
                            {h.motorista_nome && (
                              <span className="text-muted-foreground ml-2">- {h.motorista_nome}</span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(h.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {h.observacoes && (
                          <p className="text-muted-foreground mt-1">{h.observacoes}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CdDashboard;
