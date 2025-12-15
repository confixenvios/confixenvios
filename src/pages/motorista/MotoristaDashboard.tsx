import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Package, Truck, CheckCircle, LogOut, MapPin, RefreshCw, User, Camera, AlertTriangle, Menu, ClipboardList, Send, History, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  status_history?: Array<{
    status: string;
    created_at: string;
    observacoes: string | null;
    motorista_id: string | null;
    motorista_nome: string | null;
    is_alert: boolean;
  }>;
}

// Status config
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

// Tipos de ocorrência
const OCCURRENCE_TYPES = [
  'Endereço não encontrado',
  'Destinatário ausente',
  'Recusa de recebimento',
  'Avaria no volume',
  'Extravio parcial',
  'Problema de acesso',
  'Horário inadequado',
  'Documentação pendente',
  'Outro'
];

const MotoristaDashboard = () => {
  const navigate = useNavigate();
  const [motorista, setMotorista] = useState<Motorista | null>(null);
  const [loading, setLoading] = useState(true);
  const [volumes, setVolumes] = useState<B2BVolume[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // Menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('coletas');
  const [activeTab, setActiveTab] = useState('pendentes');
  
  // Modal aceitar
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [volumeToAccept, setVolumeToAccept] = useState<B2BVolume | null>(null);
  const [accepting, setAccepting] = useState(false);
  
  // Modal coletar
  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [volumeToCollect, setVolumeToCollect] = useState<B2BVolume | null>(null);
  const [collectEtiInput, setCollectEtiInput] = useState('');
  const [collecting, setCollecting] = useState(false);
  
  // Modal bipar expedição em lote (AGUARDANDO_EXPEDICAO -> DESPACHADO)
  const [bipBatchModalOpen, setBipBatchModalOpen] = useState(false);
  const [bipBatchEtiInput, setBipBatchEtiInput] = useState('');
  const [bipBatchVolumes, setBipBatchVolumes] = useState<B2BVolume[]>([]);
  const [bipingBatch, setBipingBatch] = useState(false);
  
  // Modal finalizar
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [volumeToFinalize, setVolumeToFinalize] = useState<B2BVolume | null>(null);
  const [finalizeEtiInput, setFinalizeEtiInput] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [deliveryPhoto, setDeliveryPhoto] = useState<File | null>(null);
  const [etiValidated, setEtiValidated] = useState(false);
  
  // Modal ocorrência
  const [occurrenceModalOpen, setOccurrenceModalOpen] = useState(false);
  const [occurrenceVolume, setOccurrenceVolume] = useState<B2BVolume | null>(null);
  const [occurrenceType, setOccurrenceType] = useState('');
  const [occurrenceText, setOccurrenceText] = useState('');
  const [savingOccurrence, setSavingOccurrence] = useState(false);
  
  // Modal detalhes
  const [selectedVolume, setSelectedVolume] = useState<B2BVolume | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedId = localStorage.getItem('motorista_id');
      const storedNome = localStorage.getItem('motorista_nome');
      const storedUsername = localStorage.getItem('motorista_username');
      
      if (!storedId || !storedNome) {
        navigate('/motorista/auth');
        return;
      }
      
      setMotorista({
        id: storedId,
        nome: storedNome,
        username: storedUsername || '',
        telefone: ''
      });
      
      await loadVolumes(storedId);
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
      // Buscar todos os volumes relevantes (incluindo volumes que o motorista coletou, mesmo após triagem)
      const { data, error } = await supabase
        .from('b2b_volumes')
        .select(`
          *,
          shipment:b2b_shipments(
            tracking_code, 
            delivery_date,
            pickup_address:b2b_pickup_addresses(name, contact_name, contact_phone, street, number, neighborhood, city, state)
          )
        `)
        .or(`status.eq.PENDENTE,motorista_coleta_id.eq.${id},motorista_entrega_id.eq.${id}`)
        .order('created_at', { ascending: false });
      
      // Buscar também volumes que este motorista coletou (via histórico) para "Entregue ao CD"
      const { data: collectedHistory } = await supabase
        .from('b2b_status_history')
        .select('volume_id')
        .eq('motorista_id', id)
        .eq('status', 'COLETADO');
      
      const collectedVolumeIds = (collectedHistory || []).map(h => h.volume_id);
      
      // Buscar volumes adicionais que o motorista coletou mas já avançaram
      let additionalVolumes: any[] = [];
      if (collectedVolumeIds.length > 0) {
        const { data: additionalData } = await supabase
          .from('b2b_volumes')
          .select(`
            *,
            shipment:b2b_shipments(
              tracking_code, 
              delivery_date,
              pickup_address:b2b_pickup_addresses(name, contact_name, contact_phone, street, number, neighborhood, city, state)
            )
          `)
          .in('id', collectedVolumeIds)
          .in('status', ['EM_TRIAGEM', 'AGUARDANDO_EXPEDICAO', 'DESPACHADO', 'CONCLUIDO']);
        
        additionalVolumes = additionalData || [];
      }
      
      // Combinar e remover duplicados
      const allVolumes = [...(data || [])];
      additionalVolumes.forEach(av => {
        if (!allVolumes.find(v => v.id === av.id)) {
          allVolumes.push(av);
        }
      });

      if (error) throw error;

      // Buscar histórico
      const volumeIds = allVolumes.map(v => v.id);
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

      const volumesWithHistory = allVolumes.map(v => ({
        ...v,
        status_history: historyMap[v.id] || []
      }));

      setVolumes(volumesWithHistory);
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

  // Filtros - Coletas
  const pendentes = volumes.filter(v => v.status === 'PENDENTE' && !v.motorista_coleta_id);
  const aceitos = volumes.filter(v => v.status === 'ACEITO' && v.motorista_coleta_id === motorista?.id);
  const coletados = volumes.filter(v => v.status === 'COLETADO' && v.motorista_coleta_id === motorista?.id);
  const entreguesAoCd = volumes.filter(v => {
    if (!['EM_TRIAGEM', 'AGUARDANDO_EXPEDICAO', 'DESPACHADO', 'CONCLUIDO'].includes(v.status)) return false;
    // Verifica se motorista_coleta_id é o motorista atual OU se no histórico há registro de COLETADO por este motorista
    if (v.motorista_coleta_id === motorista?.id) return true;
    // Verificar no histórico se este motorista coletou
    const coletouNoHistorico = v.status_history?.some(h => 
      h.status === 'COLETADO' && h.motorista_id === motorista?.id
    );
    return coletouNoHistorico;
  });

  // Filtros - Despache
  const aguardandoExpedicao = volumes.filter(v => v.status === 'AGUARDANDO_EXPEDICAO' && v.motorista_entrega_id === motorista?.id);
  const despachados = volumes.filter(v => v.status === 'DESPACHADO' && v.motorista_entrega_id === motorista?.id);
  const concluidos = volumes.filter(v => v.status === 'CONCLUIDO' && v.motorista_entrega_id === motorista?.id);
  const devolucoes = volumes.filter(v => v.status === 'DEVOLUCAO' && v.motorista_entrega_id === motorista?.id);

  // Parse ETI
  const parseEtiCode = (input: string): string => {
    const cleaned = input.replace(/\D/g, '').slice(-4);
    return `ETI-${cleaned.padStart(4, '0')}`;
  };

  // ==================== ACEITAR ====================
  const handleAcceptVolume = async () => {
    if (!volumeToAccept || !motorista) return;
    setAccepting(true);

    try {
      const { error } = await supabase
        .from('b2b_volumes')
        .update({
          status: 'ACEITO',
          motorista_coleta_id: motorista.id
        })
        .eq('id', volumeToAccept.id);

      if (error) throw error;

      await supabase.from('b2b_status_history').insert({
        volume_id: volumeToAccept.id,
        status: 'ACEITO',
        motorista_id: motorista.id,
        motorista_nome: motorista.nome,
        observacoes: 'Coleta aceita pelo motorista'
      });

      toast.success('Coleta aceita!');
      setAcceptModalOpen(false);
      await loadVolumes();
    } catch (error) {
      toast.error('Erro ao aceitar coleta');
    } finally {
      setAccepting(false);
    }
  };

  // ==================== COLETAR ====================
  const handleCollectVolume = async () => {
    if (!volumeToCollect || !motorista) return;
    
    const inputEti = parseEtiCode(collectEtiInput);
    if (inputEti !== volumeToCollect.eti_code) {
      toast.error('Código ETI não confere');
      return;
    }

    setCollecting(true);
    try {
      const { error } = await supabase
        .from('b2b_volumes')
        .update({ status: 'COLETADO' })
        .eq('id', volumeToCollect.id);

      if (error) throw error;

      await supabase.from('b2b_status_history').insert({
        volume_id: volumeToCollect.id,
        status: 'COLETADO',
        motorista_id: motorista.id,
        motorista_nome: motorista.nome,
        observacoes: 'Volume coletado - A caminho do CD'
      });

      toast.success('Volume coletado!');
      setCollectModalOpen(false);
      setCollectEtiInput('');
      await loadVolumes();
    } catch (error) {
      toast.error('Erro ao coletar volume');
    } finally {
      setCollecting(false);
    }
  };

  // ==================== FINALIZAR ENTREGA ====================
  const handleValidateEti = () => {
    if (!volumeToFinalize) return;
    
    const inputEti = parseEtiCode(finalizeEtiInput);
    if (inputEti !== volumeToFinalize.eti_code) {
      toast.error('Código ETI não confere');
      return;
    }
    
    setEtiValidated(true);
    toast.success('Código validado!');
  };

  const handleFinalizeDelivery = async () => {
    if (!volumeToFinalize || !motorista || !deliveryPhoto) return;

    setFinalizing(true);
    try {
      // Upload foto
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
          status: 'CONCLUIDO',
          foto_entrega_url: urlData.publicUrl
        })
        .eq('id', volumeToFinalize.id);

      if (error) throw error;

      await supabase.from('b2b_status_history').insert({
        volume_id: volumeToFinalize.id,
        status: 'CONCLUIDO',
        motorista_id: motorista.id,
        motorista_nome: motorista.nome,
        observacoes: 'Entrega concluída com sucesso'
      });

      toast.success('Entrega finalizada!');
      setFinalizeModalOpen(false);
      setFinalizeEtiInput('');
      setDeliveryPhoto(null);
      setEtiValidated(false);
      await loadVolumes();
    } catch (error) {
      toast.error('Erro ao finalizar entrega');
    } finally {
      setFinalizing(false);
    }
  };

  // ==================== BIPAR EXPEDIÇÃO EM LOTE ====================
  const handleBipBatchEtiKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && bipBatchEtiInput.trim()) {
      const inputEti = parseEtiCode(bipBatchEtiInput);
      
      // Verificar se já foi adicionado
      if (bipBatchVolumes.some(v => v.eti_code === inputEti)) {
        toast.error('Volume já adicionado');
        setBipBatchEtiInput('');
        return;
      }
      
      // Verificar se existe nos volumes aguardando expedição
      const volume = aguardandoExpedicao.find(v => v.eti_code === inputEti);
      if (!volume) {
        toast.error('Volume não encontrado ou não está aguardando expedição');
        setBipBatchEtiInput('');
        return;
      }
      
      setBipBatchVolumes([...bipBatchVolumes, volume]);
      setBipBatchEtiInput('');
      toast.success(`Volume ${inputEti} adicionado`);
    }
  };

  const handleRemoveBipBatchVolume = (id: string) => {
    setBipBatchVolumes(bipBatchVolumes.filter(v => v.id !== id));
  };

  const handleConfirmBipBatch = async () => {
    if (bipBatchVolumes.length === 0 || !motorista) return;
    
    setBipingBatch(true);
    try {
      for (const volume of bipBatchVolumes) {
        const { error } = await supabase
          .from('b2b_volumes')
          .update({ status: 'DESPACHADO' })
          .eq('id', volume.id);

        if (error) throw error;

        await supabase.from('b2b_status_history').insert({
          volume_id: volume.id,
          status: 'DESPACHADO',
          motorista_id: motorista.id,
          motorista_nome: motorista.nome,
          observacoes: 'Volume bipado pelo motorista - saindo para entrega'
        });
      }

      toast.success(`${bipBatchVolumes.length} volume(s) despachado(s)!`);
      setBipBatchModalOpen(false);
      setBipBatchVolumes([]);
      await loadVolumes();
    } catch (error) {
      toast.error('Erro ao bipar volumes');
    } finally {
      setBipingBatch(false);
    }
  };

  // ==================== OCORRÊNCIA ====================
  const handleSaveOccurrence = async () => {
    if (!occurrenceVolume || !motorista || !occurrenceType) return;

    setSavingOccurrence(true);
    try {
      const observacao = occurrenceText 
        ? `${occurrenceType}: ${occurrenceText}`
        : occurrenceType;

      await supabase.from('b2b_status_history').insert({
        volume_id: occurrenceVolume.id,
        status: 'OCORRENCIA',
        motorista_id: motorista.id,
        motorista_nome: motorista.nome,
        observacoes: observacao,
        is_alert: true
      });

      toast.success('Ocorrência registrada');
      setOccurrenceModalOpen(false);
      setOccurrenceType('');
      setOccurrenceText('');
      await loadVolumes();
    } catch (error) {
      toast.error('Erro ao registrar ocorrência');
    } finally {
      setSavingOccurrence(false);
    }
  };

  // Menu items
  const menuItems = [
    { section: 'coletas', label: 'Coletas', icon: Truck },
    { section: 'despache', label: 'Despache', icon: Send },
  ];

  const coletasSubItems = [
    { tab: 'pendentes', label: 'Pendentes', count: pendentes.length },
    { tab: 'aceitos', label: 'Aceitos', count: aceitos.length },
    { tab: 'coletados', label: 'Coletados', count: coletados.length },
    { tab: 'entregues_cd', label: 'Entregue ao CD', count: entreguesAoCd.length },
  ];

  const despachaSubItems = [
    { tab: 'aguardando', label: 'Aguardando Expedição', count: aguardandoExpedicao.length },
    { tab: 'despachados', label: 'Despachados', count: despachados.length },
    { tab: 'concluidos', label: 'Concluídos', count: concluidos.length },
    { tab: 'devolucoes', label: 'Devoluções', count: devolucoes.length },
  ];

  // Endereço fixo do Centro de Distribuição
  const CD_ADDRESS = {
    name: 'Centro de Distribuição',
    street: 'Avenida Primeira Avenida',
    number: 'SN',
    complement: 'Quadra5B Lote 03 e 01 Cond Empresarial Village',
    neighborhood: 'Cidade Vera Cruz',
    city: 'Aparecida de Goiânia',
    state: 'GO',
    cep: '74934-600'
  };

  // Renderizar card
  const renderVolumeCard = (v: B2BVolume, showActions: 'accept' | 'collect' | 'bip' | 'finalize' | 'none' = 'none') => {
    const statusConfig = STATUS_CONFIG[v.status] || { label: v.status, color: 'text-gray-700', bgColor: 'bg-gray-100' };
    const recentHistory = (v.status_history || []).slice(0, 2);
    const isPendente = v.status === 'PENDENTE';
    const isAceito = v.status === 'ACEITO';
    const isColetado = v.status === 'COLETADO';

    return (
      <Card key={v.id} className="mb-3">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-mono font-bold text-lg">{v.eti_code}</h3>
              {!isPendente && v.shipment && (
                <p className="text-xs text-muted-foreground">{v.shipment.tracking_code}</p>
              )}
            </div>
            <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border`}>
              {statusConfig.label}
            </Badge>
          </div>
          
          {/* Para PENDENTE: mostrar apenas ETI + bairro */}
          {isPendente ? (
            <div className="text-sm text-muted-foreground">
              <p className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="font-medium">{v.recipient_neighborhood}</span>
              </p>
            </div>
          ) : (isAceito || isColetado) ? (
            /* Para ACEITO e COLETADO: mostrar nome do local de coleta + destino CD */
            <>
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {v.shipment?.pickup_address?.name || 'Local de Coleta'}
                </p>
                <p className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Centro de Distribuição
                </p>
                <p className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {v.weight} kg
                </p>
              </div>
            </>
          ) : (
            /* Para outros status: mostrar detalhes completos do destinatário */
            <>
              <div className="text-sm text-muted-foreground space-y-1">
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

              {/* Histórico recente - apenas para não pendentes */}
              {recentHistory.length > 0 && (
                <div className="mt-3 pt-2 border-t">
                  <p className="text-xs font-medium mb-1 flex items-center gap-1">
                    <History className="h-3 w-3" />
                    Histórico
                  </p>
                  {recentHistory.map((h, idx) => (
                    <div key={idx} className={`text-xs p-1 rounded mb-1 ${h.is_alert ? 'bg-red-50 text-red-700' : 'bg-muted/50'}`}>
                      <span className="font-medium">{STATUS_CONFIG[h.status]?.label || h.status}</span>
                      <span className="text-muted-foreground ml-2">
                        {format(new Date(h.created_at), 'dd/MM HH:mm')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Botões de ação */}
          <div className="flex gap-2 mt-3">
            {showActions === 'accept' && (
              <Button 
                size="sm"
                onClick={() => {
                  setVolumeToAccept(v);
                  setAcceptModalOpen(true);
                }}
              >
                Aceitar Coleta
              </Button>
            )}
            
            {showActions === 'collect' && (
              <Button 
                size="sm"
                onClick={() => {
                  setVolumeToCollect(v);
                  setCollectModalOpen(true);
                }}
              >
                Coletar
              </Button>
            )}
            
            {/* Botão "Bipar Saída" removido do card individual - agora é em lote no header */}
            
            {showActions === 'finalize' && (
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setVolumeToFinalize(v);
                  setFinalizeModalOpen(true);
                  setEtiValidated(false);
                }}
              >
                Finalizar
              </Button>
            )}

            {/* Ocorrência (para todos exceto pendentes e concluidos) */}
            {v.status !== 'PENDENTE' && v.status !== 'CONCLUIDO' && (
              <Button 
                variant="outline"
                size="sm"
                onClick={() => {
                  setOccurrenceVolume(v);
                  setOccurrenceModalOpen(true);
                }}
              >
                <AlertTriangle className="h-4 w-4" />
              </Button>
            )}

            <Button 
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedVolume(v);
                setShowDetailsModal(true);
              }}
            >
              Ver
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderVolumeList = (volumeList: B2BVolume[], emptyMessage: string, actions: 'accept' | 'collect' | 'bip' | 'finalize' | 'none' = 'none') => {
    if (volumeList.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {emptyMessage}
          </CardContent>
        </Card>
      );
    }
    return volumeList.map(v => renderVolumeCard(v, actions));
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
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 space-y-2">
                  {menuItems.map(item => (
                    <div key={item.section}>
                      <Button
                        variant={activeSection === item.section ? "secondary" : "ghost"}
                        className="w-full justify-start mb-1"
                        onClick={() => {
                          setActiveSection(item.section);
                          setActiveTab(item.section === 'coletas' ? 'pendentes' : 'aguardando');
                        }}
                      >
                        <item.icon className="h-4 w-4 mr-2" />
                        {item.label}
                      </Button>
                      
                      {activeSection === item.section && (
                        <div className="pl-6 space-y-1">
                          {(item.section === 'coletas' ? coletasSubItems : despachaSubItems).map(sub => (
                            <Button
                              key={sub.tab}
                              variant={activeTab === sub.tab ? "default" : "ghost"}
                              size="sm"
                              className="w-full justify-between"
                              onClick={() => {
                                setActiveTab(sub.tab);
                                setMenuOpen(false);
                              }}
                            >
                              {sub.label}
                              <Badge variant="outline" className="ml-2">{sub.count}</Badge>
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            
            <div>
              <h1 className="font-semibold">Motorista</h1>
              <p className="text-sm text-muted-foreground">{motorista?.nome}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => loadVolumes()}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4">
        {/* Título da seção */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              {activeSection === 'coletas' ? 'Coletas' : 'Despache'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {activeTab === 'pendentes' && 'Volumes disponíveis para coleta'}
              {activeTab === 'aceitos' && 'Volumes aceitos - aguardando coleta'}
              {activeTab === 'coletados' && 'Volumes coletados - a caminho do CD'}
              {activeTab === 'entregues_cd' && 'Histórico de volumes entregues ao CD'}
              {activeTab === 'aguardando' && 'Volumes separados - bipe para sair'}
              {activeTab === 'despachados' && 'Volumes em rota - finalize a entrega'}
              {activeTab === 'concluidos' && 'Entregas concluídas'}
              {activeTab === 'devolucoes' && 'Volumes devolvidos'}
            </p>
          </div>
          
          {/* Botão Bipar Saída para seção Despache na aba aguardando */}
          {activeSection === 'despache' && activeTab === 'aguardando' && aguardandoExpedicao.length > 0 && (
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => setBipBatchModalOpen(true)}
            >
              <Send className="h-4 w-4 mr-2" />
              Bipar Saída
            </Button>
          )}
        </div>

        {/* Conteúdo */}
        {activeSection === 'coletas' && (
          <>
            {activeTab === 'pendentes' && renderVolumeList(pendentes, 'Nenhum volume pendente', 'accept')}
            {activeTab === 'aceitos' && renderVolumeList(aceitos, 'Nenhum volume aceito', 'collect')}
            {activeTab === 'coletados' && renderVolumeList(coletados, 'Nenhum volume coletado')}
            {activeTab === 'entregues_cd' && renderVolumeList(entreguesAoCd, 'Nenhum volume entregue ao CD')}
          </>
        )}

        {activeSection === 'despache' && (
          <>
            {activeTab === 'aguardando' && renderVolumeList(aguardandoExpedicao, 'Nenhum volume aguardando expedição', 'bip')}
            {activeTab === 'despachados' && renderVolumeList(despachados, 'Nenhum volume despachado', 'finalize')}
            {activeTab === 'concluidos' && renderVolumeList(concluidos, 'Nenhuma entrega concluída')}
            {activeTab === 'devolucoes' && renderVolumeList(devolucoes, 'Nenhuma devolução')}
          </>
        )}
      </main>

      {/* Modal Aceitar */}
      <Dialog open={acceptModalOpen} onOpenChange={setAcceptModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aceitar Coleta</DialogTitle>
          </DialogHeader>
          {volumeToAccept && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded">
                <p className="font-mono text-xl font-bold">{volumeToAccept.eti_code}</p>
                <p className="text-sm text-muted-foreground mt-1">{volumeToAccept.recipient_name}</p>
                <p className="text-sm text-muted-foreground">{volumeToAccept.weight} kg</p>
              </div>
              <p className="text-sm">Deseja aceitar esta coleta?</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setAcceptModalOpen(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleAcceptVolume} disabled={accepting}>
                  {accepting ? 'Aceitando...' : 'Confirmar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Coletar */}
      <Dialog open={collectModalOpen} onOpenChange={setCollectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Coletar Volume</DialogTitle>
          </DialogHeader>
          {volumeToCollect && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded">
                <p className="font-mono text-xl font-bold">{volumeToCollect.eti_code}</p>
                <p className="text-sm text-muted-foreground mt-1">{volumeToCollect.recipient_name}</p>
              </div>
              
              <div className="space-y-2">
                <Label>Bipe a etiqueta para confirmar</Label>
                <Input
                  type="password"
                  placeholder="****"
                  value={collectEtiInput}
                  onChange={(e) => setCollectEtiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && collectEtiInput && !collecting) {
                      handleCollectVolume();
                    }
                  }}
                  className="font-mono text-center text-lg"
                />
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setCollectModalOpen(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleCollectVolume} disabled={collecting || !collectEtiInput}>
                  {collecting ? 'Coletando...' : 'Confirmar Coleta'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Bipar Expedição em Lote */}
      <Dialog open={bipBatchModalOpen} onOpenChange={setBipBatchModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-indigo-600" />
              Bipar Volumes para Saída
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Bipe o código de barras da etiqueta</Label>
              <Input
                type="password"
                value={bipBatchEtiInput}
                onChange={(e) => setBipBatchEtiInput(e.target.value)}
                onKeyDown={handleBipBatchEtiKeyDown}
                className="font-mono text-center text-lg"
                placeholder=""
                autoFocus
              />
              <p className="text-xs text-muted-foreground">Bipe e pressione Enter para adicionar</p>
            </div>

            {bipBatchVolumes.length > 0 && (
              <div className="space-y-2">
                <Label>Volumes adicionados ({bipBatchVolumes.length})</Label>
                <ScrollArea className="h-40 border rounded p-2">
                  {bipBatchVolumes.map(v => (
                    <div key={v.id} className="flex items-center justify-between py-1 border-b last:border-0">
                      <div>
                        <span className="font-mono text-sm">{v.eti_code}</span>
                        <span className="text-xs text-muted-foreground ml-2">{v.recipient_name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveBipBatchVolume(v.id)}
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setBipBatchModalOpen(false);
                  setBipBatchVolumes([]);
                  setBipBatchEtiInput('');
                }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                onClick={handleConfirmBipBatch}
                disabled={bipingBatch || bipBatchVolumes.length === 0}
              >
                {bipingBatch ? 'Bipando...' : `Confirmar (${bipBatchVolumes.length})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Finalizar Entrega */}
      <Dialog open={finalizeModalOpen} onOpenChange={setFinalizeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Entrega</DialogTitle>
          </DialogHeader>
          {volumeToFinalize && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded">
                <p className="font-mono text-xl font-bold">{volumeToFinalize.eti_code}</p>
                <p className="text-sm text-muted-foreground mt-1">{volumeToFinalize.recipient_name}</p>
                <p className="text-sm text-muted-foreground">
                  {volumeToFinalize.recipient_street}, {volumeToFinalize.recipient_number}
                </p>
              </div>
              
              {!etiValidated ? (
                <div className="space-y-2">
                  <Label>Digite o código ETI para validar</Label>
                  <Input
                    placeholder="Ex: 0001"
                    value={finalizeEtiInput}
                    onChange={(e) => setFinalizeEtiInput(e.target.value)}
                    className="font-mono text-center text-lg"
                  />
                  <Button className="w-full" onClick={handleValidateEti} disabled={!finalizeEtiInput}>
                    Validar Código
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span>Código validado!</span>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Foto de comprovação *</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        id="delivery-photo"
                        onChange={(e) => setDeliveryPhoto(e.target.files?.[0] || null)}
                      />
                      <label htmlFor="delivery-photo" className="cursor-pointer">
                        {deliveryPhoto ? (
                          <div className="space-y-2">
                            <img 
                              src={URL.createObjectURL(deliveryPhoto)} 
                              alt="Preview" 
                              className="max-h-40 mx-auto rounded"
                            />
                            <p className="text-sm text-muted-foreground">Clique para trocar</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Camera className="h-10 w-10 mx-auto text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Tirar foto</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700" 
                    onClick={handleFinalizeDelivery} 
                    disabled={finalizing || !deliveryPhoto}
                  >
                    {finalizing ? 'Finalizando...' : 'Concluir Entrega'}
                  </Button>
                </div>
              )}
              
              <Button variant="outline" className="w-full" onClick={() => {
                setFinalizeModalOpen(false);
                setFinalizeEtiInput('');
                setDeliveryPhoto(null);
                setEtiValidated(false);
              }}>
                Cancelar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Ocorrência */}
      <Dialog open={occurrenceModalOpen} onOpenChange={setOccurrenceModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Registrar Ocorrência
            </DialogTitle>
          </DialogHeader>
          {occurrenceVolume && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded">
                <p className="font-mono font-bold">{occurrenceVolume.eti_code}</p>
              </div>
              
              <div className="space-y-2">
                <Label>Tipo de ocorrência *</Label>
                <Select value={occurrenceType} onValueChange={setOccurrenceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {OCCURRENCE_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Descreva a ocorrência..."
                  value={occurrenceText}
                  onChange={(e) => setOccurrenceText(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setOccurrenceModalOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleSaveOccurrence} 
                  disabled={savingOccurrence || !occurrenceType}
                >
                  {savingOccurrence ? 'Salvando...' : 'Registrar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes */}
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

              {/* Para ACEITO/COLETADO: mostrar endereço do CD fixo */}
              {(selectedVolume.status === 'ACEITO' || selectedVolume.status === 'COLETADO') ? (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Destino</h4>
                  <div className="bg-muted/50 p-3 rounded text-sm space-y-1">
                    <p className="font-medium">Centro de Distribuição</p>
                    <p>Avenida Primeira Avenida, SN</p>
                    <p>Quadra5B Lote 03 e 01 Cond Empresarial Village</p>
                    <p>Cidade Vera Cruz</p>
                    <p>CEP: 74934-600</p>
                  </div>
                </div>
              ) : selectedVolume.status !== 'PENDENTE' && (
                /* Para outros status (não PENDENTE, ACEITO, COLETADO): mostra destinatário real */
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Destinatário</h4>
                  <div className="bg-muted/50 p-3 rounded text-sm space-y-1">
                    <p className="font-medium">{selectedVolume.recipient_name}</p>
                    <p>{selectedVolume.recipient_phone}</p>
                    <p>{selectedVolume.recipient_street}, {selectedVolume.recipient_number}</p>
                    {selectedVolume.recipient_complement && <p>{selectedVolume.recipient_complement}</p>}
                    <p>{selectedVolume.recipient_neighborhood}</p>
                    <p>{selectedVolume.recipient_city}/{selectedVolume.recipient_state}</p>
                    <p>CEP: {selectedVolume.recipient_cep}</p>
                  </div>
                </div>
              )}

              {/* Endereço de Coleta - simplificado para Pendentes, completo para outros */}
              {selectedVolume.shipment?.pickup_address && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Endereço de Coleta</h4>
                  <div className="bg-muted/50 p-3 rounded text-sm space-y-1">
                    <p className="font-medium">{selectedVolume.shipment.pickup_address.name}</p>
                    {selectedVolume.status === 'PENDENTE' ? (
                      <>
                        <p>{selectedVolume.shipment.pickup_address.neighborhood}</p>
                        <p>{selectedVolume.shipment.pickup_address.contact_phone}</p>
                      </>
                    ) : (
                      <>
                        <p>{selectedVolume.shipment.pickup_address.contact_name} - {selectedVolume.shipment.pickup_address.contact_phone}</p>
                        <p>{selectedVolume.shipment.pickup_address.street}, {selectedVolume.shipment.pickup_address.number}</p>
                        <p>{selectedVolume.shipment.pickup_address.neighborhood} - {selectedVolume.shipment.pickup_address.city}/{selectedVolume.shipment.pickup_address.state}</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Histórico Completo</h4>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {(selectedVolume.status_history || []).map((h, idx) => (
                      <div 
                        key={idx} 
                        className={`text-sm p-2 rounded border ${h.is_alert ? 'bg-red-50 border-red-200' : 'bg-muted/30'}`}
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">{STATUS_CONFIG[h.status]?.label || h.status}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(h.created_at), "dd/MM HH:mm")}
                          </span>
                        </div>
                        {h.motorista_nome && <p className="text-xs text-muted-foreground">{h.motorista_nome}</p>}
                        {h.observacoes && <p className="text-muted-foreground mt-1">{h.observacoes}</p>}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MotoristaDashboard;
