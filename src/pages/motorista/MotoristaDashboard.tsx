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
import { RemessaVisualizacao } from '@/components/motorista/RemessaVisualizacao';
import { OccurrenceSimpleModal } from '@/components/motorista/OccurrenceSimpleModal';
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
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [occurrenceModalOpen, setOccurrenceModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    const sessionData = localStorage.getItem('motorista_session');
    
    if (!sessionData) {
      navigate('/motorista/auth');
      return;
    }

    try {
      const session = JSON.parse(sessionData);
      
      if (!session.id) {
        localStorage.removeItem('motorista_session');
        navigate('/motorista/auth');
        return;
      }
      
      setMotoristaSession(session);
      loadMinhasRemessas(session.id);
      loadRemessasDisponiveis();
    } catch (error) {
      console.error('❌ Erro ao parsear sessão:', error);
      localStorage.removeItem('motorista_session');
      navigate('/motorista/auth');
    }
  }, [navigate]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'PENDING_LABEL': { label: 'Aguardando Etiqueta', variant: 'secondary' as const },
      'LABEL_GENERATED': { label: 'Etiqueta Gerada', variant: 'default' as const },
      'PAYMENT_CONFIRMED': { label: 'Disponível para Coleta', variant: 'default' as const },
      'PAID': { label: 'Disponível para Coleta', variant: 'default' as const },
      'COLETA_ACEITA': { label: 'Coleta Aceita', variant: 'default' as const },
      'COLETA_FINALIZADA': { label: 'Coleta Realizada', variant: 'success' as const },
      'EM_TRANSITO': { label: 'Em Trânsito', variant: 'default' as const },
      'TENTATIVA_ENTREGA': { label: 'Insucesso na Entrega', variant: 'destructive' as const },
      'ENTREGA_FINALIZADA': { label: 'Entregue', variant: 'success' as const },
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

  const loadRemessasDisponiveis = async () => {
    try {
      const data = await getAvailableShipments();
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
      const result = await acceptShipment(shipmentId, motoristaSession.id);
      
      if (result && typeof result === 'object' && 'success' in result) {
        const response = result as { success: boolean; message?: string; error?: string };
        if (response.success) {
          toast.success(response.message || 'Remessa aceita com sucesso!');
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

        {/* Stats Cards - Only for active drivers */}
        {motoristaSession?.status === 'ativo' && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
              <CardContent className="p-3 text-center">
                <div className="w-8 h-8 mx-auto mb-2 flex items-center justify-center rounded-full bg-orange-500 text-white">
                  <Clock className="h-4 w-4" />
                </div>
                <p className="text-lg text-orange-700 dark:text-orange-300">
                  {remessasDisponiveis.length}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400">Disponíveis</p>
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
                  <Card key={remessa.id} className="hover:shadow-md transition-shadow border-green-200">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-sm">{remessa.tracking_code}</h3>
                            <p className="text-xs text-muted-foreground">
                              {new Date(remessa.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-300">
                              Aguardando Coleta
                            </Badge>
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
                                setViewModalOpen(true);
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
                                <CheckCircle className="h-3 w-3 mr-1" />
                              )}
                              Aceitar Coleta
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
                  onClick={() => motoristaSession?.id && loadMinhasRemessas(motoristaSession.id)}
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
                    <Truck className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-2">Nenhuma remessa ativa</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Aceite remessas da lista "Disponíveis" para começar.
                  </p>
                  <Button onClick={() => navigate('/motorista/relatorios')} variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Ver Histórico
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {remessas
                  .filter(r => r.status !== 'ENTREGA_FINALIZADA')
                  .map((remessa) => (
                    <Card 
                      key={remessa.id} 
                      className="hover:shadow-md transition-shadow border-blue-200"
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-sm">{remessa.tracking_code}</h3>
                              <p className="text-xs text-muted-foreground">
                                {new Date(remessa.created_at).toLocaleDateString('pt-BR')}
                              </p>
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
                                {remessa.sender_address?.street}, {remessa.sender_address?.number}
                                {remessa.sender_address?.complement && `, ${remessa.sender_address.complement}`}
                              </p>
                              <p className="text-muted-foreground">
                                {remessa.sender_address?.neighborhood}
                              </p>
                              <p className="text-muted-foreground">
                                {remessa.sender_address?.city} - {remessa.sender_address?.state}
                              </p>
                              <p className="text-muted-foreground">
                                CEP: {remessa.sender_address?.cep}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="font-medium text-muted-foreground">Destinatário</p>
                              <p className="font-medium">{remessa.recipient_address?.name}</p>
                              <p className="text-muted-foreground">
                                {remessa.recipient_address?.street}, {remessa.recipient_address?.number}
                                {remessa.recipient_address?.complement && `, ${remessa.recipient_address.complement}`}
                              </p>
                              <p className="text-muted-foreground">
                                {remessa.recipient_address?.neighborhood}
                              </p>
                              <p className="text-muted-foreground">
                                {remessa.recipient_address?.city} - {remessa.recipient_address?.state}
                              </p>
                              <p className="text-muted-foreground">
                                CEP: {remessa.recipient_address?.cep}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="text-xs text-muted-foreground">
                              {remessa.weight}kg | {remessa.length}x{remessa.width}x{remessa.height}cm
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedRemessa(remessa);
                                  setViewModalOpen(true);
                                }}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Ver
                              </Button>
                              {remessa.motorista_id && ['COLETA_ACEITA', 'COLETA_FINALIZADA', 'EM_TRANSITO', 'TENTATIVA_ENTREGA'].includes(remessa.status) && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRemessa(remessa);
                                    setOccurrenceModalOpen(true);
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Gerar Ocorrência
                                </Button>
                              )}
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

        {/* View Modal - Simple visualization */}
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
            if (motoristaSession?.id) {
              loadMinhasRemessas(motoristaSession.id);
              loadRemessasDisponiveis();
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
              if (motoristaSession?.id) {
                loadMinhasRemessas(motoristaSession.id);
                loadRemessasDisponiveis();
              }
            }}
          />
        )}
      </main>
    </div>
  );
};

export default MotoristaDashboard;