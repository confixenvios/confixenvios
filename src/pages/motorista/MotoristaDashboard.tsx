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
import { Package, Truck, CheckCircle, LogOut, MapPin, RefreshCw, User, Camera, AlertTriangle, Menu, ClipboardList, Send, History, X, Search, PenTool, Home } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SignaturePad } from '@/components/motorista/SignaturePad';
import B2BVolumeStatusHistory from '@/components/b2b/B2BVolumeStatusHistory';
import confixLogo from '@/assets/confix-logo-black.png';

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
    vehicle_type?: string;
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

// Status config - Confix brand colors
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; iconBg: string }> = {
  'AGUARDANDO_ACEITE_COLETA': { label: 'Aguardando Aceite', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200', iconBg: 'bg-amber-500' },
  'COLETA_ACEITA': { label: 'Coleta Aceita', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', iconBg: 'bg-blue-500' },
  'COLETADO': { label: 'Coletado', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200', iconBg: 'bg-orange-500' },
  'EM_TRIAGEM': { label: 'Em Triagem', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200', iconBg: 'bg-purple-500' },
  'AGUARDANDO_ACEITE_EXPEDICAO': { label: 'Aguardando Expedição', color: 'text-indigo-700', bgColor: 'bg-indigo-50 border-indigo-200', iconBg: 'bg-indigo-500' },
  'EXPEDIDO': { label: 'Expedido', color: 'text-cyan-700', bgColor: 'bg-cyan-50 border-cyan-200', iconBg: 'bg-cyan-500' },
  'CONCLUIDO': { label: 'Concluído', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200', iconBg: 'bg-emerald-500' },
  'DEVOLUCAO': { label: 'Devolução', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', iconBg: 'bg-red-500' },
};

// Tipos de ocorrência para falha na coleta
const OCCURRENCE_TYPES_COLETA = [
  'Endereço não encontrado',
  'Avaria no volume',
  'Embalagem inadequada',
  'Etiqueta pendente',
  'Outros'
];

// Tipos de ocorrência para entrega
const OCCURRENCE_TYPES_ENTREGA = [
  'Endereço não encontrado',
  'Recusa de recebimento',
  'Avaria no volume',
  'Destinatário ausente',
  'Problema de acesso',
  'Outros'
];

const MotoristaDashboard = () => {
  const navigate = useNavigate();
  const [motorista, setMotorista] = useState<Motorista | null>(null);
  const [loading, setLoading] = useState(true);
  const [volumes, setVolumes] = useState<B2BVolume[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // Menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHomeDashboard, setShowHomeDashboard] = useState(true);
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
  
  // Modal coletar em lote (ACEITO -> COLETADO)
  const [collectBatchModalOpen, setCollectBatchModalOpen] = useState(false);
  const [collectBatchEtiInput, setCollectBatchEtiInput] = useState('');
  const [collectBatchVolumes, setCollectBatchVolumes] = useState<B2BVolume[]>([]);
  const [collectingBatch, setCollectingBatch] = useState(false);
  const [collectDelivererName, setCollectDelivererName] = useState('');
  const [collectDelivererDocument, setCollectDelivererDocument] = useState('');
  const [collectSignature, setCollectSignature] = useState<string | null>(null);
  const [signaturePadOpen, setSignaturePadOpen] = useState(false);
  
  // Aceitar despache individual ou todos
  const [acceptingDespache, setAcceptingDespache] = useState(false);
  const [acceptingAllDespache, setAcceptingAllDespache] = useState(false);
  
  // Modal finalizar individual (legado)
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [volumeToFinalize, setVolumeToFinalize] = useState<B2BVolume | null>(null);
  const [finalizeEtiInput, setFinalizeEtiInput] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [deliveryPhoto, setDeliveryPhoto] = useState<File | null>(null);
  const [etiValidated, setEtiValidated] = useState(false);
  const [finalizeReceiverName, setFinalizeReceiverName] = useState('');
  const [finalizeReceiverDocument, setFinalizeReceiverDocument] = useState('');
  const [finalizeSignature, setFinalizeSignature] = useState<string | null>(null);
  const [finalizeSignaturePadOpen, setFinalizeSignaturePadOpen] = useState(false);
  
  // Modal finalizar em lote (EXPEDIDO -> CONCLUIDO)
  const [finalizeBatchModalOpen, setFinalizeBatchModalOpen] = useState(false);
  const [finalizeBatchEtiInput, setFinalizeBatchEtiInput] = useState('');
  const [finalizeBatchVolumes, setFinalizeBatchVolumes] = useState<B2BVolume[]>([]);
  const [finalizingBatch, setFinalizingBatch] = useState(false);
  const [finalizeBatchReceiverName, setFinalizeBatchReceiverName] = useState('');
  const [finalizeBatchReceiverDocument, setFinalizeBatchReceiverDocument] = useState('');
  const [finalizeBatchSignature, setFinalizeBatchSignature] = useState<string | null>(null);
  const [finalizeBatchSignaturePadOpen, setFinalizeBatchSignaturePadOpen] = useState(false);
  const [finalizeBatchPhotos, setFinalizeBatchPhotos] = useState<File[]>([]);
  
  // Modal ocorrência
  const [occurrenceModalOpen, setOccurrenceModalOpen] = useState(false);
  const [occurrenceVolume, setOccurrenceVolume] = useState<B2BVolume | null>(null);
  const [occurrenceType, setOccurrenceType] = useState('');
  const [occurrenceText, setOccurrenceText] = useState('');
  const [savingOccurrence, setSavingOccurrence] = useState(false);
  
  // Modal detalhes
  const [selectedVolume, setSelectedVolume] = useState<B2BVolume | null>(null);
  
  // Campo de busca
  const [searchFilter, setSearchFilter] = useState('');
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
            vehicle_type,
            pickup_address:b2b_pickup_addresses!b2b_shipments_pickup_address_id_fkey(name, contact_name, contact_phone, street, number, neighborhood, city, state)
          )
        `)
        .or(`status.eq.AGUARDANDO_ACEITE_COLETA,status.eq.PENDENTE,motorista_coleta_id.eq.${id},motorista_entrega_id.eq.${id}`)
        .order('created_at', { ascending: false });
      
      // Buscar também volumes que este motorista coletou (via histórico) para "Entregue ao CD"
      const { data: collectedHistory } = await supabase
        .from('b2b_status_history')
        .select('volume_id')
        .eq('motorista_id', id)
        .eq('status', 'COLETADO');
      
      const collectedVolumeIds = (collectedHistory || []).map(h => h.volume_id);
      
      // Buscar volumes que este motorista despachou (via histórico) para "Devoluções"
      const { data: dispatchedHistory } = await supabase
        .from('b2b_status_history')
        .select('volume_id')
        .eq('motorista_id', id)
        .eq('status', 'EXPEDIDO');
      
      const dispatchedVolumeIds = (dispatchedHistory || []).map(h => h.volume_id);
      
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
              pickup_address:b2b_pickup_addresses!b2b_shipments_pickup_address_id_fkey(name, contact_name, contact_phone, street, number, neighborhood, city, state)
            )
          `)
          .in('id', collectedVolumeIds)
          .in('status', ['EM_TRIAGEM', 'AGUARDANDO_ACEITE_EXPEDICAO', 'EXPEDIDO', 'CONCLUIDO']);
        
        additionalVolumes = additionalData || [];
      }
      
      // Buscar volumes devolvidos que este motorista tinha despachado
      let returnedVolumes: any[] = [];
      if (dispatchedVolumeIds.length > 0) {
        const { data: returnedData } = await supabase
          .from('b2b_volumes')
          .select(`
            *,
            shipment:b2b_shipments(
              tracking_code, 
              delivery_date,
              pickup_address:b2b_pickup_addresses!b2b_shipments_pickup_address_id_fkey(name, contact_name, contact_phone, street, number, neighborhood, city, state)
            )
          `)
          .in('id', dispatchedVolumeIds)
          .eq('status', 'DEVOLUCAO');
        
        returnedVolumes = returnedData || [];
      }
      
      // Combinar e remover duplicados
      const allVolumes = [...(data || [])];
      additionalVolumes.forEach(av => {
        if (!allVolumes.find(v => v.id === av.id)) {
          allVolumes.push(av);
        }
      });
      returnedVolumes.forEach(rv => {
        if (!allVolumes.find(v => v.id === rv.id)) {
          allVolumes.push(rv);
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

  // Helper para filtrar por busca
  const filterBySearch = (list: B2BVolume[]) => {
    if (!searchFilter.trim()) return list;
    const searchDigits = searchFilter.replace(/\D/g, '').slice(-4).padStart(4, '0');
    return list.filter(v => v.eti_code.endsWith(searchDigits));
  };

  // Filtros - Coletas
  const pendentes = filterBySearch(volumes.filter(v => (v.status === 'AGUARDANDO_ACEITE_COLETA' || v.status === 'PENDENTE') && !v.motorista_coleta_id));
  const aceitos = filterBySearch(volumes.filter(v => v.status === 'COLETA_ACEITA' && v.motorista_coleta_id === motorista?.id));
  const coletados = filterBySearch(volumes.filter(v => v.status === 'COLETADO' && v.motorista_coleta_id === motorista?.id));
  const entreguesAoCd = filterBySearch(volumes.filter(v => {
    if (!['EM_TRIAGEM', 'AGUARDANDO_ACEITE_EXPEDICAO', 'EXPEDIDO', 'CONCLUIDO'].includes(v.status)) return false;
    if (v.motorista_coleta_id === motorista?.id) return true;
    const coletouNoHistorico = v.status_history?.some(h => 
      h.status === 'COLETADO' && h.motorista_id === motorista?.id
    );
    return coletouNoHistorico;
  }));

  // Filtros - Despache
  const aguardandoExpedicao = filterBySearch(volumes.filter(v => v.status === 'AGUARDANDO_ACEITE_EXPEDICAO' && v.motorista_entrega_id === motorista?.id));
  const despachados = filterBySearch(volumes.filter(v => v.status === 'EXPEDIDO' && v.motorista_entrega_id === motorista?.id));
  const concluidos = filterBySearch(volumes.filter(v => v.status === 'CONCLUIDO' && v.motorista_entrega_id === motorista?.id));
  const devolucoes = filterBySearch(volumes.filter(v => {
    if (v.status !== 'DEVOLUCAO') return false;
    // Verifica se motorista_entrega_id é o motorista atual OU se no histórico há registro de EXPEDIDO por este motorista
    if (v.motorista_entrega_id === motorista?.id) return true;
    // Verificar no histórico se este motorista despachava o volume
    const despachouNoHistorico = v.status_history?.some(h => 
      h.status === 'EXPEDIDO' && h.motorista_id === motorista?.id
    );
    return despachouNoHistorico;
  }));

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
          status: 'COLETA_ACEITA',
          motorista_coleta_id: motorista.id
        })
        .eq('id', volumeToAccept.id);

      if (error) throw error;

      await supabase.from('b2b_status_history').insert({
        volume_id: volumeToAccept.id,
        status: 'COLETA_ACEITA',
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
    if (!volumeToFinalize || !motorista) return;

    // Validações
    if (!finalizeEtiInput.trim()) {
      toast.error('Digite o código da etiqueta');
      return;
    }
    if (!finalizeReceiverName.trim()) {
      toast.error('Nome de quem recebeu é obrigatório');
      return;
    }
    if (!finalizeReceiverDocument.trim()) {
      toast.error('Documento de quem recebeu é obrigatório');
      return;
    }
    if (!finalizeSignature) {
      toast.error('Assinatura é obrigatória');
      return;
    }
    if (!deliveryPhoto) {
      toast.error('Foto de comprovação é obrigatória');
      return;
    }

    // Validar código ETI
    const inputEti = parseEtiCode(finalizeEtiInput);
    if (inputEti !== volumeToFinalize.eti_code) {
      toast.error('Código ETI não confere');
      return;
    }

    setFinalizing(true);
    try {
      // Upload assinatura
      const signatureBlob = await fetch(finalizeSignature).then(r => r.blob());
      const signatureFileName = `b2b-entregas/assinaturas/${volumeToFinalize.id}_${Date.now()}.png`;
      const { error: signatureUploadError } = await supabase.storage
        .from('shipment-photos')
        .upload(signatureFileName, signatureBlob);

      if (signatureUploadError) throw signatureUploadError;

      const { data: signatureUrlData } = supabase.storage
        .from('shipment-photos')
        .getPublicUrl(signatureFileName);

      // Upload foto
      const photoFileName = `b2b-entregas/fotos/${volumeToFinalize.id}_${Date.now()}.jpg`;
      const { error: photoUploadError } = await supabase.storage
        .from('shipment-photos')
        .upload(photoFileName, deliveryPhoto);

      if (photoUploadError) throw photoUploadError;

      const { data: photoUrlData } = supabase.storage
        .from('shipment-photos')
        .getPublicUrl(photoFileName);

      // Atualizar volume
      const { error } = await supabase
        .from('b2b_volumes')
        .update({
          status: 'CONCLUIDO',
          foto_entrega_url: photoUrlData.publicUrl
        })
        .eq('id', volumeToFinalize.id);

      if (error) throw error;

      // Salvar histórico com todos os dados da entrega
      await supabase.from('b2b_status_history').insert({
        volume_id: volumeToFinalize.id,
        status: 'CONCLUIDO',
        motorista_id: motorista.id,
        motorista_nome: motorista.nome,
        observacoes: JSON.stringify({ 
          recebedor_nome: finalizeReceiverName.trim(),
          recebedor_documento: finalizeReceiverDocument.trim(),
          assinatura_url: signatureUrlData.publicUrl,
          foto_url: photoUrlData.publicUrl,
          finalizado_em: new Date().toISOString()
        })
      });

      toast.success('Entrega finalizada!');
      setFinalizeModalOpen(false);
      setFinalizeEtiInput('');
      setFinalizeReceiverName('');
      setFinalizeReceiverDocument('');
      setFinalizeSignature(null);
      setDeliveryPhoto(null);
      await loadVolumes();
    } catch (error) {
      console.error('Erro ao finalizar entrega:', error);
      toast.error('Erro ao finalizar entrega');
    } finally {
      setFinalizing(false);
    }
  };

  // ==================== COLETAR EM LOTE ====================
  const handleCollectBatchEtiKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && collectBatchEtiInput.trim()) {
      const inputEti = parseEtiCode(collectBatchEtiInput);
      
      // Verificar se já foi adicionado
      if (collectBatchVolumes.some(v => v.eti_code === inputEti)) {
        toast.error('Volume já adicionado');
        setCollectBatchEtiInput('');
        return;
      }
      
      // Verificar se existe nos volumes aceitos
      const volume = aceitos.find(v => v.eti_code === inputEti);
      if (!volume) {
        toast.error('Volume não encontrado ou não está aceito');
        setCollectBatchEtiInput('');
        return;
      }
      
      setCollectBatchVolumes([...collectBatchVolumes, volume]);
      setCollectBatchEtiInput('');
      toast.success(`Volume ${inputEti} adicionado`);
    }
  };

  const handleRemoveCollectBatchVolume = (id: string) => {
    setCollectBatchVolumes(collectBatchVolumes.filter(v => v.id !== id));
  };

  const handleConfirmCollectBatch = async () => {
    if (collectBatchVolumes.length === 0 || !motorista) return;
    
    // Validar campos obrigatórios
    if (!collectDelivererName.trim()) {
      toast.error('Nome de quem entregou é obrigatório');
      return;
    }
    if (!collectDelivererDocument.trim()) {
      toast.error('Documento de quem entregou é obrigatório');
      return;
    }
    if (!collectSignature) {
      toast.error('Assinatura é obrigatória');
      return;
    }
    
    setCollectingBatch(true);
    try {
      // Upload da assinatura para o storage
      let signatureUrl = null;
      if (collectSignature) {
        const signatureBlob = await fetch(collectSignature).then(r => r.blob());
        const signatureFileName = `b2b-coletas/assinaturas/${Date.now()}_${motorista.id}.png`;
        const { error: uploadError } = await supabase.storage
          .from('shipment-photos')
          .upload(signatureFileName, signatureBlob);

        if (uploadError) {
          console.error('Erro ao fazer upload da assinatura:', uploadError);
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from('shipment-photos')
          .getPublicUrl(signatureFileName);
        
        signatureUrl = urlData.publicUrl;
      }

      // Dados da coleta que serão salvos em cada volume
      const collectData = {
        entregador_nome: collectDelivererName.trim(),
        entregador_documento: collectDelivererDocument.trim(),
        assinatura_url: signatureUrl,
        coletado_em: new Date().toISOString()
      };

      for (const volume of collectBatchVolumes) {
        const { error } = await supabase
          .from('b2b_volumes')
          .update({ status: 'COLETADO' })
          .eq('id', volume.id);

        if (error) throw error;

        await supabase.from('b2b_status_history').insert({
          volume_id: volume.id,
          status: 'COLETADO',
          motorista_id: motorista.id,
          motorista_nome: motorista.nome,
          observacoes: JSON.stringify(collectData)
        });
      }

      toast.success(`${collectBatchVolumes.length} volume(s) coletado(s)!`);
      
      // Limpar todos os campos
      setCollectBatchModalOpen(false);
      setCollectBatchVolumes([]);
      setCollectBatchEtiInput('');
      setCollectDelivererName('');
      setCollectDelivererDocument('');
      setCollectSignature(null);
      
      await loadVolumes();
    } catch (error) {
      console.error('Erro ao coletar volumes:', error);
      toast.error('Erro ao coletar volumes');
    } finally {
      setCollectingBatch(false);
    }
  };

  // ==================== ACEITAR DESPACHE INDIVIDUAL ====================
  const handleAcceptDespacheVolume = async (volume: B2BVolume) => {
    if (!motorista) return;
    
    setAcceptingDespache(true);
    try {
      const { error } = await supabase
        .from('b2b_volumes')
        .update({ status: 'EXPEDIDO' })
        .eq('id', volume.id);

      if (error) throw error;

      await supabase.from('b2b_status_history').insert({
        volume_id: volume.id,
        status: 'EXPEDIDO',
        motorista_id: motorista.id,
        motorista_nome: motorista.nome,
        observacoes: 'Volume aceito pelo motorista - saindo para entrega'
      });

      toast.success('Volume expedido com sucesso!');
      await loadVolumes();
    } catch (error) {
      toast.error('Erro ao aceitar volume');
    } finally {
      setAcceptingDespache(false);
    }
  };

  // ==================== ACEITAR TODOS DESPACHE ====================
  const handleAcceptAllDespache = async () => {
    if (!motorista || aguardandoExpedicao.length === 0) return;
    
    setAcceptingAllDespache(true);
    try {
      for (const volume of aguardandoExpedicao) {
        const { error } = await supabase
          .from('b2b_volumes')
          .update({ status: 'EXPEDIDO' })
          .eq('id', volume.id);

        if (error) throw error;

        await supabase.from('b2b_status_history').insert({
          volume_id: volume.id,
          status: 'EXPEDIDO',
          motorista_id: motorista.id,
          motorista_nome: motorista.nome,
          observacoes: 'Volume aceito em lote pelo motorista - saindo para entrega'
        });
      }

      toast.success(`${aguardandoExpedicao.length} volume(s) despachado(s)!`);
      await loadVolumes();
    } catch (error) {
      toast.error('Erro ao aceitar volumes');
    } finally {
      setAcceptingAllDespache(false);
    }
  };

  // ==================== FINALIZAR EM LOTE ====================
  const handleFinalizeBatchEtiKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && finalizeBatchEtiInput.trim()) {
      const inputEti = parseEtiCode(finalizeBatchEtiInput);
      
      // Verificar se já foi adicionado
      if (finalizeBatchVolumes.some(v => v.eti_code === inputEti)) {
        toast.error('Volume já adicionado');
        setFinalizeBatchEtiInput('');
        return;
      }
      
      // Verificar se existe nos volumes despachados
      const volume = despachados.find(v => v.eti_code === inputEti);
      if (!volume) {
        toast.error('Volume não encontrado ou não está despachado');
        setFinalizeBatchEtiInput('');
        return;
      }
      
      setFinalizeBatchVolumes([...finalizeBatchVolumes, volume]);
      setFinalizeBatchEtiInput('');
      toast.success(`Volume ${inputEti} adicionado`);
    }
  };

  const handleRemoveFinalizeBatchVolume = (id: string) => {
    setFinalizeBatchVolumes(finalizeBatchVolumes.filter(v => v.id !== id));
  };

  const handleAddFinalizeBatchPhoto = (file: File) => {
    if (finalizeBatchPhotos.length >= 3) {
      toast.error('Máximo de 3 fotos permitidas');
      return;
    }
    setFinalizeBatchPhotos([...finalizeBatchPhotos, file]);
  };

  const handleRemoveFinalizeBatchPhoto = (index: number) => {
    setFinalizeBatchPhotos(finalizeBatchPhotos.filter((_, i) => i !== index));
  };

  const handleConfirmFinalizeBatch = async () => {
    if (finalizeBatchVolumes.length === 0 || !motorista) return;
    
    // Validar campos obrigatórios
    if (!finalizeBatchReceiverName.trim()) {
      toast.error('Nome de quem recebeu é obrigatório');
      return;
    }
    if (!finalizeBatchReceiverDocument.trim()) {
      toast.error('Documento de quem recebeu é obrigatório');
      return;
    }
    if (!finalizeBatchSignature) {
      toast.error('Assinatura é obrigatória');
      return;
    }
    if (finalizeBatchPhotos.length === 0) {
      toast.error('Pelo menos uma foto é obrigatória');
      return;
    }
    
    setFinalizingBatch(true);
    try {
      // Upload da assinatura
      let signatureUrl = null;
      if (finalizeBatchSignature) {
        const signatureBlob = await fetch(finalizeBatchSignature).then(r => r.blob());
        const signatureFileName = `b2b-entregas/assinaturas/${Date.now()}_${motorista.id}.png`;
        const { error: uploadError } = await supabase.storage
          .from('shipment-photos')
          .upload(signatureFileName, signatureBlob);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('shipment-photos')
          .getPublicUrl(signatureFileName);
        
        signatureUrl = urlData.publicUrl;
      }

      // Upload das fotos
      const photoUrls: string[] = [];
      for (let i = 0; i < finalizeBatchPhotos.length; i++) {
        const photo = finalizeBatchPhotos[i];
        const photoFileName = `b2b-entregas/fotos/${Date.now()}_${motorista.id}_${i}.jpg`;
        const { error: photoUploadError } = await supabase.storage
          .from('shipment-photos')
          .upload(photoFileName, photo);

        if (photoUploadError) throw photoUploadError;

        const { data: photoUrlData } = supabase.storage
          .from('shipment-photos')
          .getPublicUrl(photoFileName);
        
        photoUrls.push(photoUrlData.publicUrl);
      }

      // Dados da entrega que serão salvos em cada volume
      const deliveryData = {
        recebedor_nome: finalizeBatchReceiverName.trim(),
        recebedor_documento: finalizeBatchReceiverDocument.trim(),
        assinatura_url: signatureUrl,
        fotos_urls: photoUrls,
        finalizado_em: new Date().toISOString()
      };

      for (const volume of finalizeBatchVolumes) {
        const { error } = await supabase
          .from('b2b_volumes')
          .update({ 
            status: 'CONCLUIDO',
            foto_entrega_url: photoUrls[0] // Primeira foto como principal
          })
          .eq('id', volume.id);

        if (error) throw error;

        await supabase.from('b2b_status_history').insert({
          volume_id: volume.id,
          status: 'CONCLUIDO',
          motorista_id: motorista.id,
          motorista_nome: motorista.nome,
          observacoes: JSON.stringify(deliveryData)
        });
      }

      toast.success(`${finalizeBatchVolumes.length} entrega(s) finalizada(s)!`);
      
      // Limpar todos os campos
      setFinalizeBatchModalOpen(false);
      setFinalizeBatchVolumes([]);
      setFinalizeBatchEtiInput('');
      setFinalizeBatchReceiverName('');
      setFinalizeBatchReceiverDocument('');
      setFinalizeBatchSignature(null);
      setFinalizeBatchPhotos([]);
      
      await loadVolumes();
    } catch (error) {
      console.error('Erro ao finalizar entregas:', error);
      toast.error('Erro ao finalizar entregas');
    } finally {
      setFinalizingBatch(false);
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

  // Menu items (sem Início - movido para header)
  const menuItems = [
    { section: 'coletas', label: 'Coletas', icon: Truck },
    { section: 'despache', label: 'Expedição', icon: Send },
  ];

  const coletasSubItems = [
    { tab: 'pendentes', label: 'Aguardando Aceite', count: pendentes.length },
    { tab: 'aceitos', label: 'Aceitos', count: aceitos.length },
    { tab: 'coletados', label: 'Coletados', count: coletados.length },
    { tab: 'entregues_cd', label: 'Entregue ao CD', count: entreguesAoCd.length },
  ];

  const despachaSubItems = [
    { tab: 'aguardando', label: 'Aguardando Aceite', count: aguardandoExpedicao.length },
    { tab: 'despachados', label: 'Expedidos', count: despachados.length },
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
    const statusConfig = STATUS_CONFIG[v.status] || { label: v.status, color: 'text-gray-700', bgColor: 'bg-gray-100', iconBg: 'bg-gray-500' };
    const recentHistory = (v.status_history || []).slice(0, 2);
    const isPendente = v.status === 'AGUARDANDO_ACEITE_COLETA';
    const isAceito = v.status === 'COLETA_ACEITA';
    const isColetado = v.status === 'COLETADO';

    return (
      <Card key={v.id} className="mb-4 overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white">
        {/* Barra de status colorida no topo */}
        <div className={`h-1 ${statusConfig.iconBg}`} />
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${statusConfig.iconBg} flex items-center justify-center shadow-sm`}>
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-mono font-bold text-lg text-foreground">{v.eti_code}</h3>
                {!isPendente && !isAceito && !isColetado && v.shipment && (
                  <p className="text-xs text-muted-foreground">{v.shipment.tracking_code}</p>
                )}
              </div>
            </div>
            {v.status !== 'CONCLUIDO' && (
              <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border text-xs font-medium`}>
                {statusConfig.label}
              </Badge>
            )}
          </div>
          
          {/* Para PENDENTE: mostrar apenas ETI + bairro + peso + tipo veículo */}
          {isPendente ? (
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="font-bold text-foreground">{v.recipient_neighborhood}</span>
              </p>
              <p className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                <span className="font-bold text-foreground">{v.weight} kg</span>
              </p>
              {v.shipment?.vehicle_type && (
                <p className="flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  <span className="font-bold text-foreground">
                    {v.shipment.vehicle_type === 'moto' ? 'Moto' : 
                     v.shipment.vehicle_type === 'carro' ? 'Carro' : 
                     v.shipment.vehicle_type === 'caminhao' ? 'Caminhão' : 
                     v.shipment.vehicle_type}
                  </span>
                </p>
              )}
            </div>
          ) : (isAceito || isColetado) ? (
            /* Para ACEITO e COLETADO: mostrar endereço completo de coleta + destino CD */
            <>
              <div className="text-sm space-y-1">
                <p className="flex items-center gap-1">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="font-bold text-foreground">
                    {v.shipment?.pickup_address 
                      ? `${v.shipment.pickup_address.name || 'Local de Coleta'} - ${v.shipment.pickup_address.street}, ${v.shipment.pickup_address.number}, ${v.shipment.pickup_address.neighborhood}, ${v.shipment.pickup_address.city}/${v.shipment.pickup_address.state}`
                      : 'Local de Coleta'}
                  </span>
                </p>
                <p className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="font-bold text-foreground">
                    Avenida Primeira Avenida, SN, Quadra5B Lote 03 e 01 Cond Empresarial Village, Cidade Vera Cruz, CEP: 74934-600
                  </span>
                </p>
                <p className="flex items-center gap-1">
                  <Package className="h-3 w-3 text-muted-foreground" />
                  <span className="font-bold text-foreground">{v.weight} kg</span>
                </p>
                {v.shipment?.vehicle_type && (
                  <p className="flex items-center gap-1">
                    <Truck className="h-3 w-3 text-muted-foreground" />
                    <span className="font-bold text-foreground">
                      {v.shipment.vehicle_type === 'moto' ? 'Moto' : 
                       v.shipment.vehicle_type === 'carro' ? 'Carro' : 
                       v.shipment.vehicle_type === 'caminhao' ? 'Caminhão' : 
                       v.shipment.vehicle_type}
                    </span>
                  </p>
                )}
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
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
            <div className="flex gap-2">
              {/* Botão Ver sempre primeiro (esquerda) */}
              <Button 
                variant="outline"
                size="sm"
                className="border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                onClick={() => {
                  setSelectedVolume(v);
                  setShowDetailsModal(true);
                }}
              >
                Ver
              </Button>

              {showActions === 'accept' && (
                <Button 
                  size="sm"
                  className="bg-gradient-to-r from-primary to-red-600 hover:from-primary/90 hover:to-red-700 shadow-sm"
                  onClick={() => {
                    setVolumeToAccept(v);
                    setAcceptModalOpen(true);
                  }}
                >
                  Aceitar Coleta
                </Button>
              )}
              
              {/* Botão Aceitar individual para volumes aguardando despache */}
              {showActions === 'bip' && (
                <Button 
                  size="sm"
                  className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 shadow-sm"
                  onClick={() => handleAcceptDespacheVolume(v)}
                  disabled={acceptingDespache}
                >
                  {acceptingDespache ? 'Aceitando...' : 'Aceitar'}
                </Button>
              )}
              
            </div>

            {/* Ocorrência (para todos exceto pendentes, coletados e concluidos) - alinhado à direita */}
            {v.status !== 'AGUARDANDO_ACEITE_COLETA' && v.status !== 'COLETADO' && v.status !== 'CONCLUIDO' && (
              <Button 
                variant="outline"
                size="sm"
                className={v.status === 'COLETA_ACEITA' 
                  ? 'text-destructive border-destructive/50 hover:bg-destructive/10 hover:border-destructive' 
                  : 'border-slate-200 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700'}
                onClick={() => {
                  setOccurrenceVolume(v);
                  setOccurrenceModalOpen(true);
                }}
              >
                {v.status === 'COLETA_ACEITA' ? (
                  'Falha na Coleta'
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderVolumeList = (volumeList: B2BVolume[], _emptyMessage: string, actions: 'accept' | 'collect' | 'bip' | 'finalize' | 'none' = 'none') => {
    if (volumeList.length === 0) {
      return (
        <Card className="border-0 shadow-sm bg-white/80">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center">
              <Package className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      );
    }
    return volumeList.map(v => renderVolumeCard(v, actions));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <img src={confixLogo} alt="Confix Envios" className="h-12 animate-pulse" />
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header - Confix Brand - altura fixa */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-primary via-primary to-red-700 shadow-lg">
        <div className="container mx-auto px-4 py-2 flex items-center">
          {/* Esquerda: Logo + Saudação */}
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-white rounded-lg p-1">
              <img src={confixLogo} alt="Confix Envios" className="h-6" />
            </div>
            <div>
              <p className="text-xs text-white/70">Olá,</p>
              <p className="text-sm font-medium text-white">{motorista?.nome}</p>
            </div>
          </div>
          
          {/* Centro: Espaçamento */}
          <div className="flex-1 flex justify-center">
          </div>
          
          {/* Direita: Refresh + Sair */}
          <div className="flex items-center gap-1 flex-1 justify-end">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => loadVolumes()}
              className="text-white hover:bg-white/20"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-white hover:bg-white/20"
            >
              <LogOut className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>
      

      {/* Main content area */}
      {showHomeDashboard ? (
        <main className="min-h-[calc(100vh-80px)] bg-gradient-to-br from-slate-50 via-white to-slate-100">
          {/* Hero section with stats */}
          <div className="container mx-auto px-4 py-8">
            {/* Welcome section */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
                <Truck className="h-4 w-4" />
                <span>Painel do Motorista</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                Olá, {motorista?.nome?.split(' ')[0] || 'Motorista'}! 👋
              </h1>
              <p className="text-muted-foreground text-lg">
                Escolha uma opção para começar seu trabalho
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Package className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{pendentes.length}</p>
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <ClipboardList className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{aceitos.length}</p>
                    <p className="text-xs text-muted-foreground">Aceitos</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Send className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{despachados.length}</p>
                    <p className="text-xs text-muted-foreground">Em Rota</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{concluidos.length}</p>
                    <p className="text-xs text-muted-foreground">Concluídos</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Card Coletas */}
              <div 
                className="group relative cursor-pointer"
                onClick={() => {
                  setShowHomeDashboard(false);
                  setActiveSection('coletas');
                  setActiveTab('pendentes');
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-red-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-70 transition-all duration-500" />
                <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 rounded-3xl bg-white group-hover:-translate-y-1">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-red-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary/10 to-red-500/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                  <CardContent className="relative p-8 flex flex-col items-center justify-center min-h-[280px]">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-red-600 flex items-center justify-center mb-6 shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform duration-300">
                      <ClipboardList className="h-12 w-12 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-foreground mb-2">Coletas</h3>
                    <p className="text-muted-foreground text-center mb-4">Aceite e colete volumes dos clientes</p>
                    <div className="flex items-center gap-2 text-primary font-medium">
                      <span>{pendentes.length + aceitos.length + coletados.length} volumes</span>
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Card Expedição */}
              <div 
                className="group relative cursor-pointer"
                onClick={() => {
                  setShowHomeDashboard(false);
                  setActiveSection('despache');
                  setActiveTab('aguardando');
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-70 transition-all duration-500" />
                <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 rounded-3xl bg-white group-hover:-translate-y-1">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-green-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-500/10 to-green-500/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                  <CardContent className="relative p-8 flex flex-col items-center justify-center min-h-[280px]">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                      <Send className="h-12 w-12 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-foreground mb-2">Expedição</h3>
                    <p className="text-muted-foreground text-center mb-4">Entregue volumes aos destinatários</p>
                    <div className="flex items-center gap-2 text-emerald-600 font-medium">
                      <span>{aguardandoExpedicao.length + despachados.length} volumes</span>
                      <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="mt-10 max-w-4xl mx-auto">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Dica rápida</h4>
                    <p className="text-sm text-muted-foreground">
                      Use o leitor de código de barras para bipar as etiquetas rapidamente. 
                      Você pode coletar ou entregar múltiplos volumes de uma só vez!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <div className="flex min-h-[calc(100vh-120px)]">
          {/* Sidebar fixa à esquerda */}
          <aside className="w-56 bg-white border-r shadow-sm flex-shrink-0 hidden md:block">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                {activeSection === 'coletas' ? (
                  <>
                    <div className="w-2 h-5 bg-gradient-to-b from-primary to-red-600 rounded-full" />
                    Coletas
                  </>
                ) : (
                  <>
                    <div className="w-2 h-5 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-full" />
                    Expedição
                  </>
                )}
              </h3>
            </div>
            <nav className="p-2 space-y-1">
              {(activeSection === 'coletas' ? coletasSubItems : despachaSubItems).map(sub => (
                <Button
                  key={sub.tab}
                  variant={activeTab === sub.tab ? "default" : "ghost"}
                  size="sm"
                  className={`w-full justify-between transition-all ${
                    activeTab === sub.tab 
                      ? activeSection === 'coletas' 
                        ? 'bg-primary text-white shadow-md hover:bg-primary/90' 
                        : 'bg-emerald-600 text-white shadow-md hover:bg-emerald-700'
                      : 'text-foreground hover:bg-slate-100 hover:text-foreground'
                  }`}
                  onClick={() => setActiveTab(sub.tab)}
                >
                  <span className="text-left truncate">{sub.label}</span>
                  <Badge 
                    variant="outline" 
                    className={`ml-2 flex-shrink-0 ${activeTab === sub.tab ? 'border-white/50 text-white bg-white/20' : 'bg-muted'}`}
                  >
                    {sub.count}
                  </Badge>
                </Button>
              ))}
            </nav>
            
            {/* Botão Voltar ao início */}
            <div className="p-2 border-t mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-foreground hover:bg-slate-100 hover:text-foreground"
                onClick={() => setShowHomeDashboard(true)}
              >
                🏠 Voltar ao início
              </Button>
            </div>
          </aside>

          {/* Conteúdo principal */}
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {/* Título da seção - visível apenas em mobile */}
            <div className="mb-4 flex items-center justify-between md:hidden">
              <div>
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  {activeSection === 'coletas' ? (
                    <>
                      <div className="w-2 h-8 bg-gradient-to-b from-primary to-red-600 rounded-full" />
                      Coletas
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-8 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-full" />
                      Expedição
                    </>
                  )}
                </h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-muted/50"
                onClick={() => setShowHomeDashboard(true)}
              >
                🏠 Início
              </Button>
            </div>

            {/* Menu de navegação mobile */}
            <div className="mb-4 md:hidden overflow-x-auto">
              <div className="flex gap-2 pb-2">
                {(activeSection === 'coletas' ? coletasSubItems : despachaSubItems).map(sub => (
                  <Button
                    key={sub.tab}
                    variant={activeTab === sub.tab ? "default" : "outline"}
                    size="sm"
                    className={`flex-shrink-0 whitespace-nowrap ${
                      activeTab === sub.tab 
                        ? activeSection === 'coletas' 
                          ? 'bg-primary text-white shadow-md hover:bg-primary/90' 
                          : 'bg-emerald-600 text-white shadow-md hover:bg-emerald-700'
                        : 'text-foreground hover:bg-slate-100'
                    }`}
                    onClick={() => setActiveTab(sub.tab)}
                  >
                    {sub.label}
                    <Badge 
                      variant="outline" 
                      className={`ml-2 ${activeTab === sub.tab ? 'border-white/50 text-white bg-white/20' : 'bg-muted'}`}
                    >
                      {sub.count}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>

            <div className="mb-6 hidden md:flex items-center justify-end">
              
              {/* Botão Coletar Vários para seção Coletas na aba aceitos */}
              {activeSection === 'coletas' && activeTab === 'aceitos' && aceitos.length > 0 && (
                <Button
                  className="bg-gradient-to-r from-primary to-red-600 hover:from-primary/90 hover:to-red-700 shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30"
                  onClick={() => {
                    setCollectBatchVolumes([]);
                    setCollectBatchModalOpen(true);
                  }}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Coletar
                </Button>
              )}
              
              {/* Botão Aceitar Todos para seção Despache na aba aguardando */}
              {activeSection === 'despache' && activeTab === 'aguardando' && aguardandoExpedicao.length > 0 && (
                <Button
                  className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 shadow-lg shadow-indigo-500/20 transition-all"
                  onClick={handleAcceptAllDespache}
                  disabled={acceptingAllDespache}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {acceptingAllDespache ? 'Aceitando...' : 'Aceitar Todos'}
                </Button>
              )}
              
              {/* Botão Finalizar para seção Despache na aba despachados */}
              {activeSection === 'despache' && activeTab === 'despachados' && despachados.length > 0 && (
                <Button
                  className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 shadow-lg shadow-emerald-500/20 transition-all"
                  onClick={() => {
                    setFinalizeBatchVolumes([]);
                    setFinalizeBatchModalOpen(true);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Finalizar
                </Button>
              )}
            </div>

            {/* Botões de ação mobile */}
            <div className="mb-4 flex justify-end md:hidden">
              {activeSection === 'coletas' && activeTab === 'aceitos' && aceitos.length > 0 && (
                <Button
                  className="bg-gradient-to-r from-primary to-red-600 hover:from-primary/90 hover:to-red-700 shadow-lg shadow-primary/20 transition-all"
                  onClick={() => {
                    setCollectBatchVolumes([]);
                    setCollectBatchModalOpen(true);
                  }}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Coletar
                </Button>
              )}
              
              {activeSection === 'despache' && activeTab === 'aguardando' && aguardandoExpedicao.length > 0 && (
                <Button
                  className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 shadow-lg shadow-indigo-500/20 transition-all"
                  onClick={handleAcceptAllDespache}
                  disabled={acceptingAllDespache}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {acceptingAllDespache ? 'Aceitando...' : 'Aceitar Todos'}
                </Button>
              )}
              
              {activeSection === 'despache' && activeTab === 'despachados' && despachados.length > 0 && (
                <Button
                  className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 shadow-lg shadow-emerald-500/20 transition-all"
                  onClick={() => {
                    setFinalizeBatchVolumes([]);
                    setFinalizeBatchModalOpen(true);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Finalizar
                </Button>
              )}
            </div>

            {/* Campo de busca - cabeçalho interno */}
            <div className="mb-4">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar pedido"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-9 font-mono border-border"
                />
              </div>
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
                {activeTab === 'aguardando' && renderVolumeList(aguardandoExpedicao, 'Nenhum volume aguardando despache', 'bip')}
                {activeTab === 'despachados' && renderVolumeList(despachados, 'Nenhum volume despachado')}
                {activeTab === 'concluidos' && renderVolumeList(concluidos, 'Nenhuma entrega concluída')}
                {activeTab === 'devolucoes' && renderVolumeList(devolucoes, 'Nenhuma devolução')}
              </>
            )}
          </main>
        </div>
      )}

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

      {/* Modal Coletar em Lote */}
      <Dialog open={collectBatchModalOpen} onOpenChange={(open) => {
        if (!open) {
          setCollectBatchModalOpen(false);
          setCollectBatchVolumes([]);
          setCollectBatchEtiInput('');
          setCollectDelivererName('');
          setCollectDelivererDocument('');
          setCollectSignature(null);
        } else {
          setCollectBatchModalOpen(true);
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-red-600" />
              Coleta
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Etiqueta input */}
            <div className="space-y-2">
              <Label>Etiqueta *</Label>
              <Input
                type="password"
                value={collectBatchEtiInput}
                onChange={(e) => setCollectBatchEtiInput(e.target.value)}
                onKeyDown={handleCollectBatchEtiKeyDown}
                placeholder="Bipe o código"
                className="font-mono text-center text-lg"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">Bipe e pressione Enter para adicionar</p>
            </div>

            {collectBatchVolumes.length > 0 && (
              <div className="space-y-2">
                <Label>Volumes adicionados ({collectBatchVolumes.length})</Label>
                <ScrollArea className="h-24 border rounded p-2">
                  {collectBatchVolumes.map(v => (
                    <div key={v.id} className="flex items-center justify-between py-1 border-b last:border-0">
                      <div>
                        <span className="font-mono text-sm">{v.eti_code}</span>
                        <span className="text-xs text-muted-foreground ml-2">{v.recipient_name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCollectBatchVolume(v.id)}
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}

            {/* Nome de quem entregou */}
            <div className="space-y-2">
              <Label>Nome de quem entregou *</Label>
              <Input
                value={collectDelivererName}
                onChange={(e) => setCollectDelivererName(e.target.value)}
                placeholder="Nome completo"
              />
            </div>

            {/* Documento de quem entregou */}
            <div className="space-y-2">
              <Label>Documento de quem entregou *</Label>
              <Input
                value={collectDelivererDocument}
                onChange={(e) => {
                  // Aceitar apenas números
                  const value = e.target.value.replace(/\D/g, '');
                  setCollectDelivererDocument(value);
                }}
                placeholder="CPF ou RG (apenas números)"
                maxLength={14}
              />
            </div>

            {/* Local para assinar */}
            <div className="space-y-2">
              <Label>Assinatura *</Label>
              {collectSignature ? (
                <div className="border rounded-md p-2 bg-white">
                  <div className="relative">
                    <img 
                      src={collectSignature} 
                      alt="Assinatura" 
                      className="w-full h-24 object-contain rounded"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1"
                      onClick={() => setCollectSignature(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setSignaturePadOpen(true)}
                  >
                    <PenTool className="h-4 w-4 mr-2" />
                    Refazer Assinatura
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-20 border-dashed"
                  onClick={() => setSignaturePadOpen(true)}
                >
                  <div className="flex flex-col items-center gap-1">
                    <PenTool className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Toque para assinar</span>
                  </div>
                </Button>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setCollectBatchModalOpen(false);
                  setCollectBatchVolumes([]);
                  setCollectBatchEtiInput('');
                  setCollectDelivererName('');
                  setCollectDelivererDocument('');
                  setCollectSignature(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={handleConfirmCollectBatch}
                disabled={
                  collectingBatch || 
                  collectBatchVolumes.length === 0 ||
                  !collectDelivererName.trim() ||
                  !collectDelivererDocument.trim() ||
                  !collectSignature
                }
              >
                {collectingBatch ? 'Coletando...' : `Confirmar (${collectBatchVolumes.length})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Pad Modal */}
      <SignaturePad
        isOpen={signaturePadOpen}
        onClose={() => setSignaturePadOpen(false)}
        onSave={(signatureDataUrl) => {
          setCollectSignature(signatureDataUrl);
          setSignaturePadOpen(false);
        }}
        title="Assinatura de Coleta"
      />

      {/* Modal Finalizar Entrega */}
      <Dialog open={finalizeModalOpen} onOpenChange={setFinalizeModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
              
              <div className="space-y-4">
                {/* Etiqueta */}
                <div className="space-y-2">
                  <Label>Etiqueta *</Label>
                  <Input
                    type="password"
                    value={finalizeEtiInput}
                    onChange={(e) => setFinalizeEtiInput(e.target.value)}
                    placeholder="Bipe o código de barras"
                    className="font-mono"
                    autoFocus
                  />
                </div>

                {/* Nome */}
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    value={finalizeReceiverName}
                    onChange={(e) => setFinalizeReceiverName(e.target.value)}
                    placeholder="Nome de quem recebeu"
                  />
                </div>

                {/* Documento */}
                <div className="space-y-2">
                  <Label>Documento *</Label>
                  <Input
                    value={finalizeReceiverDocument}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setFinalizeReceiverDocument(value);
                    }}
                    placeholder="CPF ou RG (apenas números)"
                    maxLength={14}
                  />
                </div>

                {/* Assinatura */}
                <div className="space-y-2">
                  <Label>Local pra assinar *</Label>
                  {finalizeSignature ? (
                    <div className="border rounded-md p-2 bg-white">
                      <div className="relative">
                        <img 
                          src={finalizeSignature} 
                          alt="Assinatura" 
                          className="w-full h-24 object-contain rounded"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1"
                          onClick={() => setFinalizeSignature(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => setFinalizeSignaturePadOpen(true)}
                      >
                        <PenTool className="h-4 w-4 mr-2" />
                        Refazer Assinatura
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full h-20 border-dashed"
                      onClick={() => setFinalizeSignaturePadOpen(true)}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <PenTool className="h-6 w-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Toque para assinar</span>
                      </div>
                    </Button>
                  )}
                </div>
                
                {/* Foto */}
                <div className="space-y-2">
                  <Label>Foto *</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      id="delivery-photo"
                      onChange={(e) => setDeliveryPhoto(e.target.files?.[0] || null)}
                    />
                    {deliveryPhoto ? (
                      <div className="space-y-2 relative">
                        <div className="relative inline-block">
                          <img 
                            src={URL.createObjectURL(deliveryPhoto)} 
                            alt="Preview" 
                            className="max-h-32 mx-auto rounded"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-7 w-7 rounded-full"
                            onClick={() => setDeliveryPhoto(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <label htmlFor="delivery-photo" className="cursor-pointer">
                          <p className="text-sm text-muted-foreground hover:text-primary">Clique para trocar</p>
                        </label>
                      </div>
                    ) : (
                      <label htmlFor="delivery-photo" className="cursor-pointer block">
                        <div className="space-y-2">
                          <Camera className="h-10 w-10 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Tirar foto</p>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => {
                    setFinalizeModalOpen(false);
                    setFinalizeEtiInput('');
                    setFinalizeReceiverName('');
                    setFinalizeReceiverDocument('');
                    setFinalizeSignature(null);
                    setDeliveryPhoto(null);
                  }}>
                    Cancelar
                  </Button>
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700" 
                    onClick={handleFinalizeDelivery} 
                    disabled={
                      finalizing || 
                      !finalizeEtiInput.trim() ||
                      !finalizeReceiverName.trim() ||
                      !finalizeReceiverDocument.trim() ||
                      !finalizeSignature ||
                      !deliveryPhoto
                    }
                  >
                    {finalizing ? 'Finalizando...' : 'Finalizar'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Signature Pad Modal - Finalizar Entrega */}
      <SignaturePad
        isOpen={finalizeSignaturePadOpen}
        onClose={() => setFinalizeSignaturePadOpen(false)}
        onSave={(signatureDataUrl) => {
          setFinalizeSignature(signatureDataUrl);
          setFinalizeSignaturePadOpen(false);
        }}
        title="Assinatura de Recebimento"
      />

      {/* Modal Finalizar em Lote */}
      <Dialog open={finalizeBatchModalOpen} onOpenChange={setFinalizeBatchModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Finalizar Entregas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Input de ETI */}
            <div className="space-y-2">
              <Label>Etiqueta *</Label>
              <Input
                type="password"
                value={finalizeBatchEtiInput}
                onChange={(e) => setFinalizeBatchEtiInput(e.target.value)}
                onKeyDown={handleFinalizeBatchEtiKeyDown}
                placeholder="Bipe o código (Enter para adicionar)"
                className="font-mono"
                autoFocus
              />
            </div>

            {/* Lista de volumes selecionados */}
            {finalizeBatchVolumes.length > 0 && (
              <div className="space-y-2">
                <Label>Volumes selecionados ({finalizeBatchVolumes.length})</Label>
                <ScrollArea className="max-h-32 border rounded-md p-2">
                  {finalizeBatchVolumes.map(v => (
                    <div key={v.id} className="flex items-center justify-between py-1">
                      <span className="font-mono text-sm">{v.eti_code}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleRemoveFinalizeBatchVolume(v.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}

            {/* Nome */}
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={finalizeBatchReceiverName}
                onChange={(e) => setFinalizeBatchReceiverName(e.target.value)}
                placeholder="Nome de quem recebeu"
              />
            </div>

            {/* Documento */}
            <div className="space-y-2">
              <Label>Documento *</Label>
              <Input
                value={finalizeBatchReceiverDocument}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setFinalizeBatchReceiverDocument(value);
                }}
                placeholder="CPF ou RG (apenas números)"
                maxLength={14}
              />
            </div>

            {/* Assinatura */}
            <div className="space-y-2">
              <Label>Local pra assinar *</Label>
              {finalizeBatchSignature ? (
                <div className="border rounded-md p-2 bg-white">
                  <div className="relative">
                    <img 
                      src={finalizeBatchSignature} 
                      alt="Assinatura" 
                      className="w-full h-24 object-contain rounded"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1"
                      onClick={() => setFinalizeBatchSignature(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setFinalizeBatchSignaturePadOpen(true)}
                  >
                    <PenTool className="h-4 w-4 mr-2" />
                    Refazer Assinatura
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-20 border-dashed"
                  onClick={() => setFinalizeBatchSignaturePadOpen(true)}
                >
                  <div className="flex flex-col items-center gap-1">
                    <PenTool className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Toque para assinar</span>
                  </div>
                </Button>
              )}
            </div>
            
            {/* Fotos (até 3) */}
            <div className="space-y-2">
              <Label>Fotos * ({finalizeBatchPhotos.length}/3)</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                {finalizeBatchPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {finalizeBatchPhotos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img 
                          src={URL.createObjectURL(photo)} 
                          alt={`Foto ${index + 1}`} 
                          className="h-20 w-20 object-cover rounded"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                          onClick={() => handleRemoveFinalizeBatchPhoto(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {finalizeBatchPhotos.length < 3 && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      id="batch-delivery-photo"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleAddFinalizeBatchPhoto(file);
                          e.target.value = '';
                        }
                      }}
                    />
                    <label htmlFor="batch-delivery-photo" className="cursor-pointer block text-center">
                      <div className="space-y-2">
                        <Camera className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {finalizeBatchPhotos.length === 0 
                            ? 'Tirar foto (obrigatório)' 
                            : 'Adicionar mais foto'}
                        </p>
                      </div>
                    </label>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setFinalizeBatchModalOpen(false);
                  setFinalizeBatchVolumes([]);
                  setFinalizeBatchEtiInput('');
                  setFinalizeBatchReceiverName('');
                  setFinalizeBatchReceiverDocument('');
                  setFinalizeBatchSignature(null);
                  setFinalizeBatchPhotos([]);
                }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleConfirmFinalizeBatch}
                disabled={
                  finalizingBatch || 
                  finalizeBatchVolumes.length === 0 ||
                  !finalizeBatchReceiverName.trim() ||
                  !finalizeBatchReceiverDocument.trim() ||
                  !finalizeBatchSignature ||
                  finalizeBatchPhotos.length === 0
                }
              >
                {finalizingBatch ? 'Finalizando...' : `Finalizar (${finalizeBatchVolumes.length})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Pad Modal - Finalizar em Lote */}
      <SignaturePad
        isOpen={finalizeBatchSignaturePadOpen}
        onClose={() => setFinalizeBatchSignaturePadOpen(false)}
        onSave={(signatureDataUrl) => {
          setFinalizeBatchSignature(signatureDataUrl);
          setFinalizeBatchSignaturePadOpen(false);
        }}
        title="Assinatura de Recebimento"
      />

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
                    {(occurrenceVolume.status === 'COLETA_ACEITA' ? OCCURRENCE_TYPES_COLETA : OCCURRENCE_TYPES_ENTREGA).map(type => (
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

              {/* Veículo Escolhido */}
              {selectedVolume.shipment?.vehicle_type && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Veículo Escolhido:</span>
                  <span className="font-medium capitalize">
                    {selectedVolume.shipment.vehicle_type === 'moto' ? 'Moto' : 
                     selectedVolume.shipment.vehicle_type === 'carro' ? 'Carro' : 
                     selectedVolume.shipment.vehicle_type === 'caminhao' ? 'Caminhão' : 
                     selectedVolume.shipment.vehicle_type}
                  </span>
                </div>
              )}

              {/* Para COLETA_ACEITA/COLETADO: mostrar endereço do CD fixo */}
              {(selectedVolume.status === 'COLETA_ACEITA' || selectedVolume.status === 'COLETADO') ? (
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
              ) : selectedVolume.status !== 'AGUARDANDO_ACEITE_COLETA' && (
                /* Para outros status (não AGUARDANDO_ACEITE_COLETA, COLETA_ACEITA, COLETADO): mostra destinatário real */
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
                    {selectedVolume.status === 'AGUARDANDO_ACEITE_COLETA' ? (
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
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Histórico Completo
                </h4>
                <ScrollArea className="h-48">
                  <B2BVolumeStatusHistory volumeId={selectedVolume.id} />
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
