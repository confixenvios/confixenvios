import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Truck, Package, MapPin, Phone, LogOut, CheckCircle, Clock, Calendar, Eye, User, FileText, Plus, List, ClipboardList, Menu, Route, History, Zap, Play, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RemessaDetalhes } from '@/components/motorista/RemessaDetalhes';
import { RemessaVisualizacao } from '@/components/motorista/RemessaVisualizacao';
import { OccurrenceSimpleModal } from '@/components/motorista/OccurrenceSimpleModal';
import { FinalizarEntregaModal } from '@/components/motorista/FinalizarEntregaModal';
import { VolumeSearchModal } from '@/components/motorista/VolumeSearchModal';
import { getMotoristaShipments, getAvailableShipments, acceptShipment, getMotoristaVisibilidade, type MotoristaShipment, type BaseShipment, type MotoristaVisibilidade } from '@/services/shipmentsService';
import { supabase } from '@/integrations/supabase/client';

interface MotoristaSession {
  id: string;
  nome: string;
  email: string;
  status: string;
  tipo_pedidos?: 'normal' | 'b2b' | 'ambos';
  visibilidade?: MotoristaVisibilidade;
}

type ViewType = 'disponiveis' | 'minhas' | 'em_rota' | 'entregues';

const MotoristaDashboard = () => {
  const navigate = useNavigate();
  const [motoristaSession, setMotoristaSession] = useState<MotoristaSession | null>(null);
  const [remessas, setRemessas] = useState<MotoristaShipment[]>([]);
  const [remessasDisponiveis, setRemessasDisponiveis] = useState<BaseShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRemessa, setSelectedRemessa] = useState<MotoristaShipment | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [occurrenceModalOpen, setOccurrenceModalOpen] = useState(false);
  const [finalizarEntregaModalOpen, setFinalizarEntregaModalOpen] = useState(false);
  const [volumeSearchModalOpen, setVolumeSearchModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('disponiveis');
  const [menuOpen, setMenuOpen] = useState(false);
  const [remessasEmRotaIds, setRemessasEmRotaIds] = useState<string[]>(() => {
    // Carregar do localStorage
    const saved = localStorage.getItem('remessas_em_rota');
    return saved ? JSON.parse(saved) : [];
  });

  // Salvar no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem('remessas_em_rota', JSON.stringify(remessasEmRotaIds));
  }, [remessasEmRotaIds]);

  const handleMoveToEmRota = (remessaId: string) => {
    setRemessasEmRotaIds(prev => [...prev, remessaId]);
    toast.success('Remessa movida para Em Rota');
  };

  const handleMoveToMinhas = (remessaId: string) => {
    setRemessasEmRotaIds(prev => prev.filter(id => id !== remessaId));
    toast.success('Remessa movida para Minhas Remessas');
  };

  useEffect(() => {
    const checkMotoristaAuth = async () => {
      try {
        // Verificar sessão via Supabase Auth
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/motorista/auth');
          return;
        }

        // Verificar se é motorista
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'motorista')
          .single();

        if (rolesError || !roles) {
          toast.error('Você não tem permissão de motorista');
          await supabase.auth.signOut();
          navigate('/motorista/auth');
          return;
        }

        // Buscar dados do perfil e motorista
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, phone, document')
          .eq('id', session.user.id)
          .single();

        // Buscar dados do motorista (tipo_pedidos, status, visibilidade)
        const { data: motorista } = await supabase
          .from('motoristas')
          .select('status, tipo_pedidos, ve_convencional, ve_b2b_coleta, ve_b2b_entrega')
          .eq('email', session.user.email)
          .single();

        // Mapeia colunas antigas para novo formato de 3 fases
        const visibilidade: MotoristaVisibilidade = {
          ve_convencional: motorista?.ve_convencional ?? true,
          ve_b2b_0: motorista?.ve_b2b_coleta ?? false,  // B2B-0: coleta externa
          ve_b2b_2: motorista?.ve_b2b_entrega ?? false  // B2B-2: entrega final
        };

        const motoristaData: MotoristaSession = {
          id: session.user.id,
          nome: profile?.first_name || session.user.email || 'Motorista',
          email: session.user.email || '',
          status: motorista?.status || 'ativo',
          tipo_pedidos: (motorista?.tipo_pedidos as 'normal' | 'b2b' | 'ambos') || 'ambos',
          visibilidade
        };
        
        setMotoristaSession(motoristaData);
        loadMinhasRemessas(session.user.id);
        loadRemessasDisponiveis(visibilidade);
      } catch (error) {
        console.error('❌ Erro ao verificar autenticação:', error);
        navigate('/motorista/auth');
      } finally {
        setLoading(false);
      }
    };

    checkMotoristaAuth();

    // Escutar mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/motorista/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'PENDING_LABEL': { label: 'Aguardando Etiqueta', variant: 'secondary' as const },
      'LABEL_GENERATED': { label: 'Etiqueta Gerada', variant: 'default' as const },
      'PAYMENT_CONFIRMED': { label: 'Disponível para Coleta', variant: 'default' as const },
      'PAID': { label: 'Disponível para Coleta', variant: 'default' as const },
      'PENDENTE': { label: 'Disponível para Coleta', variant: 'default' as const },
      'COLETA_ACEITA': { label: 'Coleta Aceita', variant: 'default' as const },
      'ACEITA': { label: 'Coleta Aceita', variant: 'default' as const },
      'B2B_ENTREGA_ACEITA': { label: 'Entrega Aceita', variant: 'default' as const },
      'COLETA_FINALIZADA': { label: 'Coleta Realizada', variant: 'success' as const },
      'B2B_COLETA_FINALIZADA': { label: 'Coleta Realizada', variant: 'success' as const },
      'EM_TRANSITO': { label: 'Em Trânsito', variant: 'default' as const },
      'TENTATIVA_ENTREGA': { label: 'Insucesso na Entrega', variant: 'destructive' as const },
      'ENTREGA_FINALIZADA': { label: 'Entregue', variant: 'success' as const },
      'ENTREGUE': { label: 'Entregue', variant: 'success' as const },
      'AGUARDANDO_DESTINATARIO': { label: 'Aguardando Destinatário', variant: 'secondary' as const },
      'ENDERECO_INCORRETO': { label: 'Endereço Incorreto', variant: 'destructive' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                   { label: status, variant: 'outline' as const };
    
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const loadMinhasRemessas = async (motoristaId: string) => {
    try {
      const data = await getMotoristaShipments(motoristaId);
      setRemessas(data);
    } catch (error) {
      console.error('❌ Erro ao carregar remessas:', error);
      toast.error('Erro ao carregar suas coletas');
    } finally {
      setLoading(false);
    }
  };

  const loadRemessasDisponiveis = async (visibilidade?: MotoristaVisibilidade) => {
    setRefreshing(true);
    try {
      const data = await getAvailableShipments(visibilidade);
      setRemessasDisponiveis(data);
    } catch (error) {
      console.error('❌ Erro ao carregar remessas disponíveis:', error);
      toast.error('Erro ao carregar remessas disponíveis');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAcceptShipment = async (shipmentId: string) => {
    if (!motoristaSession?.id) return;
    
    setAccepting(shipmentId);
    try {
      const result = await acceptShipment(shipmentId, motoristaSession.id);
      
      if (result && typeof result === 'object' && 'success' in result) {
        const response = result as { success: boolean; message?: string; error?: string };
        if (response.success) {
          toast.success(response.message || 'Remessa aceita com sucesso!');
          loadMinhasRemessas(motoristaSession.id);
          loadRemessasDisponiveis(motoristaSession.visibilidade);
        } else {
          toast.error(response.error || 'Erro ao aceitar remessa');
        }
      } else {
        toast.error('Erro ao aceitar remessa');
      }
    } catch (error) {
      console.error('❌ Erro ao aceitar remessa:', error);
      toast.error('Erro ao aceitar remessa');
    } finally {
      setAccepting(null);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/motorista/auth');
      toast.success('Logout realizado com sucesso');
    } catch (error) {
      console.error('Erro no logout:', error);
      navigate('/motorista/auth');
    }
  };

  const handleMenuSelect = (view: ViewType) => {
    setCurrentView(view);
    setMenuOpen(false);
  };

  // Contadores - incluir status B2B nas remessas
  // Remessas entregues: inclui finalizadas E remessas B2B que vieram do histórico (coletas B2B-1 finalizadas)
  const remessasEntregues = remessas.filter(r => {
    // Status de entrega final
    if (['ENTREGA_FINALIZADA', 'ENTREGUE'].includes(r.status)) return true;
    // Remessas B2B do histórico (o motorista finalizou a coleta B2B-1, mesmo que agora esteja em outro status)
    if (r.quote_data?.isFromHistory && r.tracking_code?.startsWith('B2B-')) return true;
    return false;
  });
  
  // Remessas ativas: exclui finalizadas e as que vieram do histórico
  const todasRemessasAtivas = remessas.filter(r => {
    if (['ENTREGA_FINALIZADA', 'ENTREGUE', 'CANCELLED', 'CANCELADO'].includes(r.status)) return false;
    if (r.quote_data?.isFromHistory) return false;
    return true;
  });

  // Separar entre "Minhas Remessas" e "Em Rota" baseado no estado local
  const minhasRemessasAtivas = todasRemessasAtivas.filter(r => !remessasEmRotaIds.includes(r.id));
  const remessasEmRota = todasRemessasAtivas.filter(r => remessasEmRotaIds.includes(r.id));

  const menuItems = [
    { id: 'disponiveis' as ViewType, label: 'Disponíveis', icon: Package, count: remessasDisponiveis.length, color: 'text-orange-500' },
    { id: 'minhas' as ViewType, label: 'Minhas Remessas', icon: ClipboardList, count: minhasRemessasAtivas.length, color: 'text-blue-500' },
    { id: 'em_rota' as ViewType, label: 'Em Rota', icon: Route, count: remessasEmRota.length, color: 'text-purple-500' },
    { id: 'entregues' as ViewType, label: 'Entregues', icon: CheckCircle, count: remessasEntregues.length, color: 'text-green-500' },
  ];

  const currentMenuItem = menuItems.find(item => item.id === currentView);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background/80 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-8 w-32 bg-muted rounded mx-auto mb-4"></div>
          <div className="h-4 w-24 bg-muted rounded mx-auto"></div>
        </div>
      </div>
    );
  }

  const renderShipmentCard = (remessa: MotoristaShipment | BaseShipment, showActions: boolean = true) => {
    const isB2B = remessa.tracking_code?.startsWith('B2B-');
    
    return (
      <Card key={remessa.id} className={`hover:shadow-md transition-shadow ${isB2B ? 'border-purple-200' : 'border-blue-200'}`}>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
              {/* Não mostrar badge B2B-1/B2B-2 ou Convencional na aba entregues */}
              {currentView !== 'entregues' && (
                isB2B ? (
                  <Badge 
                    variant="outline" 
                    className={
                      ['B2B_COLETA_FINALIZADA', 'B2B_ENTREGA_ACEITA', 'ENTREGUE'].includes(remessa.status)
                        ? "bg-purple-100 text-purple-700 border-purple-300"
                        : "bg-blue-100 text-blue-700 border-blue-300"
                    }
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    {['B2B_COLETA_FINALIZADA', 'B2B_ENTREGA_ACEITA', 'ENTREGUE'].includes(remessa.status)
                      ? "B2B-2" 
                      : "B2B-1"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                    <Package className="h-3 w-3 mr-1" />
                    Convencional
                  </Badge>
                )
              )}
                <div>
                  <h3 className="font-medium text-sm">{remessa.tracking_code}</h3>
                  <p className="text-xs text-muted-foreground">
                    {new Date(remessa.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(remessa.status)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Remetente</p>
                <p className="font-medium">{remessa.sender_address?.name}</p>
                <p className="text-muted-foreground">
                  {remessa.sender_address?.city}, {remessa.sender_address?.state}
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Destinatário</p>
                <p className="font-medium">{remessa.recipient_address?.name}</p>
                <p className="text-muted-foreground">
                  {remessa.recipient_address?.city}, {remessa.recipient_address?.state}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                {Number(remessa.weight).toFixed(2)}kg | {remessa.quote_data?.merchandiseDetails?.volumes?.length || remessa.quote_data?.technicalData?.volumes?.length || 1} volume(s)
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedRemessa(remessa as MotoristaShipment);
                    setViewModalOpen(true);
                  }}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Ver
                </Button>
                {showActions && currentView === 'disponiveis' && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleAcceptShipment(remessa.id)}
                    disabled={accepting === remessa.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {accepting === remessa.id ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-1"></div>
                    ) : (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    )}
                    Aceitar
                  </Button>
                )}
                {showActions && currentView === 'minhas' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMoveToEmRota(remessa.id)}
                    className="border-purple-300 text-purple-600 hover:bg-purple-50"
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                )}
                {showActions && currentView === 'em_rota' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMoveToMinhas(remessa.id)}
                    className="border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    <Undo2 className="h-3 w-3" />
                  </Button>
                )}
                {showActions && (currentView === 'minhas' || currentView === 'em_rota') && 
                  (remessa as MotoristaShipment).motorista_id && 
                  ['COLETA_ACEITA', 'COLETA_FINALIZADA', 'EM_TRANSITO', 'TENTATIVA_ENTREGA', 'ACEITA', 'B2B_ENTREGA_ACEITA'].includes(remessa.status) && (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setSelectedRemessa(remessa as MotoristaShipment);
                        setOccurrenceModalOpen(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Ocorrência
                    </Button>
                    {/* B2B-1 não mostra "Finalizar Coleta" - agora é responsabilidade do CD */}
                    {/* B2B-2 e normais mostram "Finalizar" */}
                    {!(isB2B && ['PENDENTE', 'ACEITA'].includes(remessa.status)) && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setSelectedRemessa(remessa as MotoristaShipment);
                          setFinalizarEntregaModalOpen(true);
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Finalizar
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const getShipmentsForCurrentView = () => {
    switch (currentView) {
      case 'disponiveis':
        return remessasDisponiveis;
      case 'minhas':
        return minhasRemessasAtivas;
      case 'em_rota':
        return remessasEmRota;
      case 'entregues':
        return remessasEntregues;
      default:
        return [];
    }
  };

  const getEmptyStateMessage = () => {
    switch (currentView) {
      case 'disponiveis':
        return { title: 'Nenhuma remessa disponível', subtitle: 'Não há remessas aguardando coleta no momento.' };
      case 'minhas':
        return { title: 'Nenhuma remessa ativa', subtitle: 'Aceite remessas da lista "Disponíveis" para começar.' };
      case 'em_rota':
        return { title: 'Nenhuma remessa em rota', subtitle: 'Suas remessas em trânsito aparecerão aqui.' };
      case 'entregues':
        return { title: 'Nenhuma entrega realizada', subtitle: 'Suas entregas concluídas aparecerão aqui.' };
      default:
        return { title: 'Nenhuma remessa', subtitle: '' };
    }
  };

  const currentShipments = getShipmentsForCurrentView();
  const emptyState = getEmptyStateMessage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Mobile-First Header with Menu */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Menu Button */}
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-0">
                  <SheetHeader className="p-4 border-b bg-gradient-to-r from-primary to-primary/80">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                        <Truck className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <SheetTitle className="text-white text-lg">Portal do Motorista</SheetTitle>
                        <p className="text-sm text-white/80 truncate max-w-[180px]">
                          {motoristaSession?.nome}
                        </p>
                      </div>
                    </div>
                  </SheetHeader>
                  
                  <div className="p-2">
                    {/* Tipo de Pedidos Badge */}
                    {motoristaSession?.tipo_pedidos && motoristaSession.tipo_pedidos !== 'ambos' && (
                      <div className="p-3 mb-2 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Tipo de pedidos</p>
                        <Badge variant="outline" className={motoristaSession.tipo_pedidos === 'b2b' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}>
                          {motoristaSession.tipo_pedidos === 'b2b' ? 'B2B Express' : 'Normais'}
                        </Badge>
                      </div>
                    )}

                    <nav className="space-y-1">
                      {menuItems.map(item => (
                        <button
                          key={item.id}
                          onClick={() => handleMenuSelect(item.id)}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                            currentView === item.id 
                              ? 'bg-primary text-primary-foreground' 
                              : 'hover:bg-muted'
                          }`}
                        >
                          <item.icon className={`h-5 w-5 ${currentView === item.id ? '' : item.color}`} />
                          <span className="flex-1 font-medium">{item.label}</span>
                          <Badge variant={currentView === item.id ? 'secondary' : 'outline'} className="ml-auto">
                            {item.count}
                          </Badge>
                        </button>
                      ))}
                    </nav>

                    <div className="border-t mt-4 pt-4">
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          navigate('/motorista/relatorios');
                        }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left hover:bg-muted transition-colors"
                      >
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">Relatórios</span>
                      </button>
                      
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left hover:bg-destructive/10 text-destructive transition-colors"
                      >
                        <LogOut className="h-5 w-5" />
                        <span className="font-medium">Sair</span>
                      </button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {currentMenuItem && (
                    <currentMenuItem.icon className={`h-5 w-5 ${currentMenuItem.color}`} />
                  )}
                  <h1 className="font-semibold text-lg leading-tight">{currentMenuItem?.label}</h1>
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentShipments.length} {currentShipments.length === 1 ? 'remessa' : 'remessas'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Botão Inserir Volume - apenas para drivers B2B-2 */}
              {motoristaSession?.visibilidade?.ve_b2b_2 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setVolumeSearchModalOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Inserir Volume</span>
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (motoristaSession?.id && motoristaSession.visibilidade) {
                    loadMinhasRemessas(motoristaSession.id);
                    loadRemessasDisponiveis(motoristaSession.visibilidade);
                  }
                }}
                disabled={refreshing}
              >
                {refreshing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                ) : (
                  'Atualizar'
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 space-y-4">
        {/* Status Pendente Alert */}
        {motoristaSession?.status === 'pendente' && (
          <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-yellow-500 text-white flex-shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
                    Cadastro Pendente de Aprovação
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Seu cadastro está sendo analisado pelo administrador. 
                    Você receberá acesso às remessas após a aprovação.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Shipments List */}
        {motoristaSession?.status === 'ativo' && (
          <div className="space-y-3">
            {currentShipments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-muted">
                    {currentMenuItem && <currentMenuItem.icon className="h-8 w-8 text-muted-foreground" />}
                  </div>
                  <h3 className="font-medium mb-2">{emptyState.title}</h3>
                  <p className="text-sm text-muted-foreground">{emptyState.subtitle}</p>
                </CardContent>
              </Card>
            ) : (
              currentShipments.map((remessa) => 
                renderShipmentCard(remessa as MotoristaShipment, currentView !== 'entregues')
              )
            )}
          </div>
        )}

        {/* View Modal */}
        {selectedRemessa && (
          <RemessaVisualizacao
            isOpen={viewModalOpen}
            onClose={() => setViewModalOpen(false)}
            remessa={selectedRemessa}
          />
        )}

        {/* Enhanced Remessa Details Modal */}
        <RemessaDetalhes
          isOpen={detailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          remessa={selectedRemessa}
          onUpdateStatus={(newStatus: string) => {
            console.log('📊 Status atualizado para:', newStatus);
            toast.success('Status atualizado com sucesso!');
            if (motoristaSession?.id && motoristaSession.visibilidade) {
              loadMinhasRemessas(motoristaSession.id);
              loadRemessasDisponiveis(motoristaSession.visibilidade);
            }
            setDetailsModalOpen(false);
          }}
        />

        {/* Occurrence Modal */}
        {selectedRemessa && motoristaSession?.id && (
          <OccurrenceSimpleModal
            isOpen={occurrenceModalOpen}
            onClose={() => setOccurrenceModalOpen(false)}
            shipmentId={selectedRemessa.id}
            motoristaId={motoristaSession.id}
            onSuccess={() => {
              console.log('📊 Ocorrência criada com sucesso');
              if (motoristaSession?.id && motoristaSession.visibilidade) {
                loadMinhasRemessas(motoristaSession.id);
                loadRemessasDisponiveis(motoristaSession.visibilidade);
              }
            }}
          />
        )}

        {/* Finalizar Entrega Modal */}
        {selectedRemessa && motoristaSession?.id && (
          <FinalizarEntregaModal
            isOpen={finalizarEntregaModalOpen}
            onClose={() => setFinalizarEntregaModalOpen(false)}
            shipmentId={selectedRemessa.id}
            motoristaId={motoristaSession.id}
            trackingCode={selectedRemessa.tracking_code || ''}
            shipmentType={
              selectedRemessa.tracking_code?.startsWith('B2B-') 
                ? (['B2B_COLETA_FINALIZADA', 'B2B_ENTREGA_ACEITA'].includes(selectedRemessa.status) ? 'B2B-2' : 'B2B-1')
                : 'normal'
            }
            currentStatus={selectedRemessa.status}
            volumeCount={
              selectedRemessa.quote_data?.merchandiseDetails?.volumes?.length || 
              selectedRemessa.quote_data?.technicalData?.volumes?.length || 
              selectedRemessa.quote_data?.volume_count || 
              1
            }
            onSuccess={() => {
              console.log('✅ Entrega/Coleta finalizada com sucesso');
              if (motoristaSession?.id && motoristaSession.visibilidade) {
                loadMinhasRemessas(motoristaSession.id);
                loadRemessasDisponiveis(motoristaSession.visibilidade);
              }
            }}
          />
        )}

        {/* Modal de busca de volume B2B-2 */}
        {motoristaSession?.id && (
          <VolumeSearchModal
            open={volumeSearchModalOpen}
            onClose={() => setVolumeSearchModalOpen(false)}
            motoristaId={motoristaSession.id}
            onVolumeAccepted={() => {
              if (motoristaSession?.id && motoristaSession.visibilidade) {
                loadMinhasRemessas(motoristaSession.id);
                loadRemessasDisponiveis(motoristaSession.visibilidade);
              }
            }}
          />
        )}
      </main>
    </div>
  );
};

export default MotoristaDashboard;
