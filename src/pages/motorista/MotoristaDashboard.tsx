import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, Package, MapPin, Phone, LogOut, CheckCircle, Clock, Calendar, Eye, User, FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RemessaDetalhes } from '@/components/motorista/RemessaDetalhes';
import { getMotoristaShipments, getAvailableShipments, acceptShipment, type MotoristaShipment, type BaseShipment } from '@/services/shipmentsService';

interface MotoristaSession {
  id: string;
  nome: string;
  email: string;
  status: string;
}

const MotoristaDashboard = () => {
  const navigate = useNavigate();
  const [motoristaSession, setMotoristaSession] = useState<MotoristaSession | null>(null);
  const [remessas, setRemessas] = useState<MotoristaShipment[]>([]);
  const [remessasDisponiveis, setRemessasDisponiveis] = useState<BaseShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRemessa, setSelectedRemessa] = useState<MotoristaShipment | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    console.log('🚀 === DASHBOARD MOTORISTA INICIADO ===');
    console.log('🔍 Verificando sessão do motorista...');
    
    const sessionData = localStorage.getItem('motorista_session');
    console.log('📱 Session data do localStorage:', sessionData);
    console.log('🌐 URL atual:', window.location.href);
    console.log('📊 Estado atual - loading:', loading, 'remessas:', remessas.length);
    
    if (!sessionData) {
      console.log('❌ Nenhuma sessão encontrada - redirecionando para auth');
      navigate('/motorista/auth');
      return;
    }

    try {
      const session = JSON.parse(sessionData);
      console.log('👤 Sessão parseada:', session);
      console.log('🆔 ID do motorista:', session.id);
      console.log('📧 Email do motorista:', session.email);
      console.log('📋 Status do motorista:', session.status);
      console.log('👨‍💼 Nome do motorista:', session.nome);
      
      if (!session.id) {
        console.error('❌ ID do motorista não encontrado na sessão!');
        localStorage.removeItem('motorista_session');
        navigate('/motorista/auth');
        return;
      }
      
      setMotoristaSession(session);
      console.log('🔄 Chamando loadMinhasRemessas com ID:', session.id);
      loadMinhasRemessas(session.id);
      console.log('🔄 Chamando loadRemessasDisponiveis...');
      loadRemessasDisponiveis();
    } catch (error) {
      console.error('❌ Erro ao parsear sessão:', error);
      localStorage.removeItem('motorista_session');
      navigate('/motorista/auth');
    }
  }, [navigate]);

  const loadMinhasRemessas = async (motoristaId: string) => {
    try {
      console.log('🚛 === CARREGANDO REMESSAS COM SERVIÇO CENTRALIZADO ===');
      console.log('🆔 Motorista ID:', motoristaId);
      
      const data = await getMotoristaShipments(motoristaId);
      
      console.log('📦 Remessas retornadas do serviço:', data);
      console.log('📊 Quantidade de remessas:', data.length);
      
      if (data.length > 0) {
        console.log('📦 Primeira remessa:', data[0]);
      }
      
      setRemessas(data);
    } catch (error) {
      console.error('❌ Erro ao carregar remessas:', error);
      toast.error('Erro ao carregar suas coletas');
    } finally {
      setLoading(false);
    }
  };

  const loadRemessasDisponiveis = async () => {
    try {
      console.log('🔍 === CARREGANDO REMESSAS DISPONÍVEIS ===');
      
      const data = await getAvailableShipments();
      
      console.log('📦 Remessas disponíveis:', data);
      console.log('📊 Quantidade disponível:', data.length);
      
      setRemessasDisponiveis(data);
    } catch (error) {
      console.error('❌ Erro ao carregar remessas disponíveis:', error);
      toast.error('Erro ao carregar remessas disponíveis');
    }
  };

  const handleAcceptShipment = async (shipmentId: string) => {
    if (!motoristaSession?.id) return;
    
    setAccepting(shipmentId);
    try {
      console.log('🚚 === ACEITANDO REMESSA COM SERVIÇO CENTRALIZADO ===');
      console.log('📦 Remessa ID:', shipmentId);
      console.log('🆔 Motorista ID:', motoristaSession.id);
      
      const result = await acceptShipment(shipmentId, motoristaSession.id);
      
      if (result && typeof result === 'object' && 'success' in result) {
        const response = result as { success: boolean; message?: string; error?: string };
        if (response.success) {
          toast.success(response.message || 'Remessa aceita com sucesso!');
          // Recarregar as listas
          loadMinhasRemessas(motoristaSession.id);
          loadRemessasDisponiveis();
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
      // Só limpar localStorage, não precisamos do Supabase auth
      localStorage.removeItem('motorista_session');
      navigate('/motorista/auth');
      toast.success('Logout realizado com sucesso');
    } catch (error) {
      console.error('Erro no logout:', error);
      localStorage.removeItem('motorista_session');
      navigate('/motorista/auth');
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Mobile-First Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-primary to-primary/80">
                <Truck className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-semibold text-lg leading-tight">Portal do Motorista</h1>
                <p className="text-sm text-muted-foreground truncate">
                  {motoristaSession?.nome}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 space-y-6">
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
                    Entre em contato se houver dúvidas.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards - Mobile Optimized - Only for active drivers */}
        {motoristaSession?.status === 'ativo' && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
              <CardContent className="p-3 text-center">
                <div className="w-8 h-8 mx-auto mb-2 flex items-center justify-center rounded-full bg-orange-500 text-white">
                  <Clock className="h-4 w-4" />
                </div>
                <p className="text-lg text-orange-700 dark:text-orange-300">
                  {remessas.filter(r => ['PENDING_LABEL', 'LABEL_GENERATED', 'PAYMENT_CONFIRMED', 'PAID'].includes(r.status)).length}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400">Pendentes</p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
              <CardContent className="p-3 text-center">
                <div className="w-8 h-8 mx-auto mb-2 flex items-center justify-center rounded-full bg-blue-500 text-white">
                  <Truck className="h-4 w-4" />
                </div>
                <p className="text-lg text-blue-700 dark:text-blue-300">
                  {remessas.filter(r => ['COLETA_ACEITA', 'COLETA_FINALIZADA', 'EM_TRANSITO'].includes(r.status)).length}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Em Rota</p>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/motorista/relatorios')}>
              <CardContent className="p-3 text-center">
                <div className="w-8 h-8 mx-auto mb-2 flex items-center justify-center rounded-full bg-green-500 text-white">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <p className="text-lg text-green-700 dark:text-green-300">
                  {remessas.filter(r => r.status === 'ENTREGA_FINALIZADA').length}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">Entregues</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Remessas Disponíveis - Only for active drivers */}
        {motoristaSession?.status === 'ativo' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Remessas Disponíveis</h2>
                <p className="text-sm text-muted-foreground">
                  {remessasDisponiveis.length} {remessasDisponiveis.length === 1 ? 'remessa disponível' : 'remessas disponíveis'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadRemessasDisponiveis}
                disabled={refreshing}
                className="text-xs"
              >
                {refreshing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                ) : (
                  'Atualizar'
                )}
              </Button>
            </div>

            {remessasDisponiveis.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-muted">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-2">Nenhuma remessa disponível</h3>
                  <p className="text-sm text-muted-foreground">
                    Não há remessas aguardando coleta no momento.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {remessasDisponiveis.map((remessa) => (
                  <Card key={remessa.id} className="hover:shadow-md transition-shadow border-blue-200">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-sm">{remessa.tracking_code}</h3>
                            <p className="text-xs text-muted-foreground">
                              {new Date(remessa.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                              Disponível
                            </Badge>
                          </div>
                        </div>

                        {/* Addresses */}
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

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="text-xs text-muted-foreground">
                            {remessa.weight}kg | {remessa.length}x{remessa.width}x{remessa.height}cm
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedRemessa(remessa as MotoristaShipment);
                                setDetailsModalOpen(true);
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Ver
                            </Button>
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
                                <Plus className="h-3 w-3 mr-1" />
                              )}
                              Aceitar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Minhas Remessas - Only for active drivers */}
        {motoristaSession?.status === 'ativo' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Minhas Remessas</h2>
                <p className="text-sm text-muted-foreground">
                  {remessas.filter(r => r.status !== 'ENTREGA_FINALIZADA').length} {remessas.filter(r => r.status !== 'ENTREGA_FINALIZADA').length === 1 ? 'remessa ativa' : 'remessas ativas'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/motorista/relatorios')}
                  className="text-xs"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Relatórios
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadMinhasRemessas(motoristaSession?.id || '')}
                  disabled={refreshing}
                  className="text-xs"
                >
                  {refreshing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                  ) : (
                    'Atualizar'
                  )}
                </Button>
              </div>
            </div>

            {remessas.filter(r => r.status !== 'ENTREGA_FINALIZADA').length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-muted">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-2">Nenhuma remessa aceita</h3>
                  <p className="text-sm text-muted-foreground">
                    Você ainda não aceitou nenhuma remessa. Verifique as remessas disponíveis acima.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {remessas.filter(remessa => remessa.status !== 'ENTREGA_FINALIZADA').map((remessa) => (
                  <Card key={remessa.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-sm">{remessa.tracking_code}</h3>
                            <p className="text-xs text-muted-foreground">
                              {new Date(remessa.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {remessa.status}
                            </Badge>
                          </div>
                        </div>

                        {/* Addresses */}
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

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="text-xs text-muted-foreground">
                            {remessa.weight}kg | {remessa.length}x{remessa.width}x{remessa.height}cm
                          </div>
                          <Button
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedRemessa(remessa);
                              setDetailsModalOpen(true);
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Ver
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Enhanced Remessa Details Modal */}
        <RemessaDetalhes
          isOpen={detailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          remessa={selectedRemessa}
          onUpdateStatus={() => {
            if (motoristaSession?.id) {
              loadMinhasRemessas(motoristaSession.id);
              loadRemessasDisponiveis();
            }
            setDetailsModalOpen(false);
          }}
        />
      </main>
    </div>
  );
};

export default MotoristaDashboard;