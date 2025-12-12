import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Truck, Package, LogOut, CheckCircle, Clock, Eye, FileText, Menu, Zap, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { RemessaVisualizacao } from '@/components/motorista/RemessaVisualizacao';
import { VolumeSearchModal } from '@/components/motorista/VolumeSearchModal';
import { getMotoristaShipments, getAvailableShipments, acceptShipment, type MotoristaShipment, type BaseShipment, type MotoristaVisibilidade } from '@/services/shipmentsService';
import { supabase } from '@/integrations/supabase/client';

interface MotoristaSession {
  id: string;
  nome: string;
  email: string;
  status: string;
  visibilidade?: MotoristaVisibilidade;
}

type ViewType = 'disponiveis' | 'minhas' | 'entregues';

const MotoristaDashboard = () => {
  const navigate = useNavigate();
  const [motoristaSession, setMotoristaSession] = useState<MotoristaSession | null>(null);
  const [remessas, setRemessas] = useState<MotoristaShipment[]>([]);
  const [remessasDisponiveis, setRemessasDisponiveis] = useState<BaseShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRemessa, setSelectedRemessa] = useState<MotoristaShipment | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('disponiveis');
  const [menuOpen, setMenuOpen] = useState(false);
  const [volumeSearchOpen, setVolumeSearchOpen] = useState(false);

  useEffect(() => {
    const checkMotoristaAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/motorista/auth');
          return;
        }

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

        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, phone, document')
          .eq('id', session.user.id)
          .single();

        const { data: motorista } = await supabase
          .from('motoristas')
          .select('status, ve_convencional, ve_b2b_coleta, ve_b2b_entrega')
          .eq('email', session.user.email)
          .single();

        const visibilidade: MotoristaVisibilidade = {
          ve_convencional: motorista?.ve_convencional ?? true,
          ve_b2b_coleta: motorista?.ve_b2b_coleta ?? false,
          ve_b2b_entrega: motorista?.ve_b2b_entrega ?? false
        };

        const motoristaData: MotoristaSession = {
          id: session.user.id,
          nome: profile?.first_name || session.user.email || 'Motorista',
          email: session.user.email || '',
          status: motorista?.status || 'ativo',
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/motorista/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'PENDENTE_COLETA': { label: 'Pendente Coleta', variant: 'default' },
      'EM_TRANSITO': { label: 'Em Trânsito', variant: 'secondary' },
      'NO_CD': { label: 'No CD', variant: 'secondary' },
      'EM_ROTA': { label: 'Em Rota', variant: 'default' },
      'ENTREGUE': { label: 'Entregue', variant: 'outline' },
      'PAID': { label: 'Disponível', variant: 'default' },
      'PAYMENT_CONFIRMED': { label: 'Disponível', variant: 'default' },
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' as const };
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

  // Filtrar remessas por status
  const minhasRemessasAtivas = remessas.filter(r => 
    ['PENDENTE_COLETA', 'EM_TRANSITO'].includes(r.status)
  );
  const remessasEntregues = remessas.filter(r => 
    ['NO_CD', 'EM_ROTA', 'ENTREGUE'].includes(r.status)
  );

  const menuItems = [
    { id: 'disponiveis' as ViewType, label: 'Disponíveis', icon: Package, count: remessasDisponiveis.length, color: 'text-orange-500' },
    { id: 'minhas' as ViewType, label: 'Minhas Remessas', icon: Truck, count: minhasRemessasAtivas.length, color: 'text-blue-500' },
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
                {isB2B ? (
                  <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                    <Zap className="h-3 w-3 mr-1" />
                    B2B
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                    <Package className="h-3 w-3 mr-1" />
                    Normal
                  </Badge>
                )}
                <div>
                  <h3 className="font-medium text-sm font-mono">{remessa.tracking_code}</h3>
                  <p className="text-xs text-muted-foreground">
                    {new Date(remessa.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              {getStatusBadge(remessa.status)}
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
                {Number(remessa.weight).toFixed(2)}kg
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
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
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
              {/* Botão + para motoristas de entrega B2B */}
              {motoristaSession?.visibilidade?.ve_b2b_entrega && (
                <Button
                  variant="default"
                  size="icon"
                  onClick={() => setVolumeSearchOpen(true)}
                  className="bg-green-600 hover:bg-green-700 h-9 w-9"
                  title="Inserir Volume B2B"
                >
                  <Plus className="h-5 w-5" />
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

      <main className="container mx-auto px-4 py-4 space-y-4">
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
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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

        {selectedRemessa && (
          <RemessaVisualizacao
            isOpen={viewModalOpen}
            onClose={() => setViewModalOpen(false)}
            remessa={selectedRemessa}
          />
        )}

        {/* Modal de busca de volume B2B para motoristas de entrega */}
        {motoristaSession?.id && (
          <VolumeSearchModal
            open={volumeSearchOpen}
            onClose={() => setVolumeSearchOpen(false)}
            motoristaId={motoristaSession.id}
            onVolumeAccepted={() => {
              loadMinhasRemessas(motoristaSession.id);
              if (motoristaSession.visibilidade) {
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
