import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, Package, MapPin, Phone, LogOut, CheckCircle, Clock, Calendar, Eye, User, FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RemessaDetalhes } from '@/components/motorista/RemessaDetalhes';

interface MotoristaSession {
  id: string;
  nome: string;
  email: string;
  status: string;
}

interface Remessa {
  id: string;
  tracking_code: string;
  status: string;
  created_at: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  format: string;
  selected_option: string;
  pickup_option: string;
  sender_address: {
    name: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
    complement?: string;
    reference?: string;
    phone?: string;
  };
  recipient_address: {
    name: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
    complement?: string;
    reference?: string;
    phone?: string;
  };
  quote_data: any;
  payment_data: any;
  cte_key?: string;
}

const MotoristaDashboard = () => {
  const navigate = useNavigate();
  const [motoristaSession, setMotoristaSession] = useState<MotoristaSession | null>(null);
  const [remessas, setRemessas] = useState<Remessa[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRemessa, setSelectedRemessa] = useState<Remessa | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Check motorista session
    const sessionData = localStorage.getItem('motorista_session');
    if (!sessionData) {
      navigate('/motorista/auth');
      return;
    }

    const session = JSON.parse(sessionData);
    setMotoristaSession(session);
    loadMinhasRemessas(session.id);
  }, [navigate]);

  const loadMinhasRemessas = async (motoristaId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_motorista_shipments', { 
          motorista_uuid: motoristaId 
        });

      if (error) throw error;
      
      // Transformar os dados para o formato esperado pelo componente
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        sender_address: item.sender_address || {},
        recipient_address: item.recipient_address || {}
      }));
      
      setRemessas(transformedData);
    } catch (error) {
      console.error('Erro ao carregar remessas:', error);
      toast.error('Erro ao carregar suas coletas');
    } finally {
      setLoading(false);
    }
  };

  const updateRemessaStatus = async (remessaId: string, newStatus: string, data?: any) => {
    if (!motoristaSession) return;

    try {
      setRefreshing(true);
      
      let photoUrls: string[] = [];
      let signatureUrl: string | null = null;

      // Upload photos to storage if provided
      if (data?.photos && data.photos.length > 0) {
        for (let i = 0; i < data.photos.length; i++) {
          const photo = data.photos[i];
          const fileExt = photo.name.split('.').pop();
          const fileName = `${motoristaSession.id}/${remessaId}_photo_${Date.now()}_${i}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('shipment-photos')
            .upload(fileName, photo);
            
          if (uploadError) {
            console.error('Error uploading photo:', uploadError);
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('shipment-photos')
              .getPublicUrl(fileName);
            photoUrls.push(publicUrl);
          }
        }
      }

      // Upload signature to storage if provided
      if (data?.signature) {
        // Convert base64 to blob
        const base64Data = data.signature.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });
        
        const fileName = `${motoristaSession.id}/${remessaId}_signature_${Date.now()}.png`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('shipment-signatures')
          .upload(fileName, blob);
          
        if (uploadError) {
          console.error('Error uploading signature:', uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('shipment-signatures')
            .getPublicUrl(fileName);
          signatureUrl = publicUrl;
        }
      }

      // Update shipment status
      const { error: shipmentError } = await supabase
        .from('shipments')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', remessaId);

      if (shipmentError) throw shipmentError;

      // Add to status history with enhanced data including files
      const historyData = {
        shipment_id: remessaId,
        status: newStatus,
        motorista_id: motoristaSession.id,
        observacoes: data?.occurrence?.observations || data?.observacoes || null,
        photos_urls: photoUrls.length > 0 ? photoUrls : null,
        signature_url: signatureUrl,
        occurrence_data: data?.occurrence ? {
          type: data.occurrence.type,
          description: data.occurrence.description,
          timestamp: new Date().toISOString()
        } : null
      };

      const { error: historyError } = await supabase
        .from('shipment_status_history')
        .insert([historyData]);

      if (historyError) throw historyError;

      toast.success('Status atualizado com sucesso!');
      await loadMinhasRemessas(motoristaSession.id);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setRefreshing(false);
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any; color?: string }> = {
      'PENDING_LABEL': { label: 'Aguardando', variant: 'secondary' },
      'LABEL_GENERATED': { label: 'Pronto p/ Coleta', variant: 'default' },
      'PAYMENT_CONFIRMED': { label: 'Pronto p/ Coleta', variant: 'default', color: 'bg-blue-100 text-blue-800' },
      'PAID': { label: 'Pronto p/ Coleta', variant: 'default', color: 'bg-blue-100 text-blue-800' },
      'COLETA_ACEITA': { label: 'Aceita', variant: 'default', color: 'bg-orange-100 text-orange-800' },
      'COLETA_FINALIZADA': { label: 'Coletado', variant: 'success', color: 'bg-green-100 text-green-800' },
      'EM_TRANSITO': { label: 'Em Rota', variant: 'default', color: 'bg-blue-100 text-blue-800' },
      'TENTATIVA_ENTREGA': { label: 'Tentativa', variant: 'destructive', color: 'bg-red-100 text-red-800' },
      'ENTREGA_FINALIZADA': { label: 'Entregue', variant: 'success', color: 'bg-green-100 text-green-800' },
      'AGUARDANDO_DESTINATARIO': { label: 'Aguard. Dest.', variant: 'secondary' },
      'ENDERECO_INCORRETO': { label: 'End. Incorreto', variant: 'destructive' }
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' };

    return (
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${
          config.variant === 'success' ? 'bg-green-500 animate-pulse' :
          config.variant === 'destructive' ? 'bg-red-500 animate-pulse' :
          config.color?.includes('orange') ? 'bg-orange-500 animate-pulse' :
          config.color?.includes('blue') ? 'bg-blue-500' :
          'bg-gray-400'
        }`} />
        <Badge variant={config.variant} className={config.color}>
          {config.label}
        </Badge>
      </div>
    );
  };

  const canAcceptPickup = (status: string) => {
    return ['PENDING_LABEL', 'LABEL_GENERATED', 'PAYMENT_CONFIRMED', 'PAID'].includes(status);
  };

  const handleViewDetails = (remessa: Remessa) => {
    setSelectedRemessa(remessa);
    setDetailsModalOpen(true);
  };

  const handleQuickAction = (remessaId: string, action: string) => {
    switch (action) {
      case 'accept_pickup':
        updateRemessaStatus(remessaId, 'COLETA_ACEITA');
        break;
      case 'complete_pickup':
        updateRemessaStatus(remessaId, 'COLETA_FINALIZADA');
        break;
      case 'complete_delivery':
        updateRemessaStatus(remessaId, 'ENTREGA_FINALIZADA');
        break;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount / 100);
  };

  const getStatusBadgeForDetails = (status: string) => {
    const statusConfig = {
      'PENDING_LABEL': { variant: 'secondary', label: 'Pendente' },
      'PENDING_DOCUMENT': { variant: 'destructive', label: 'Aguardando Documento' },
      'PENDING_PAYMENT': { variant: 'destructive', label: 'Aguardando Pagamento' },
      'PAYMENT_CONFIRMED': { variant: 'success', label: 'Pagamento Confirmado' },
      'PAGO_AGUARDANDO_ETIQUETA': { variant: 'secondary', label: 'Aguardando Etiqueta' },
      'LABEL_AVAILABLE': { variant: 'success', label: 'Etiqueta Disponível' },
      'IN_TRANSIT': { variant: 'default', label: 'Em Trânsito' },
      'DELIVERED': { variant: 'success', label: 'Entregue' },
      'PAID': { variant: 'success', label: 'Pago' },
      'COLETA_ACEITA': { variant: 'default', label: 'Coleta Aceita' },
      'COLETA_FINALIZADA': { variant: 'default', label: 'Coleta Finalizada' },
      'ENTREGA_FINALIZADA': { variant: 'success', label: 'Entrega Finalizada' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
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
        {/* Stats Cards - Mobile Optimized */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
            <CardContent className="p-3 text-center">
              <div className="w-8 h-8 mx-auto mb-2 flex items-center justify-center rounded-full bg-orange-500 text-white">
                <Clock className="h-4 w-4" />
              </div>
              <p className="text-lg font-bold text-orange-700 dark:text-orange-300">
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
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                {remessas.filter(r => ['COLETA_ACEITA', 'COLETA_FINALIZADA', 'EM_TRANSITO'].includes(r.status)).length}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Em Rota</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
            <CardContent className="p-3 text-center">
              <div className="w-8 h-8 mx-auto mb-2 flex items-center justify-center rounded-full bg-green-500 text-white">
                <CheckCircle className="h-4 w-4" />
              </div>
              <p className="text-lg font-bold text-green-700 dark:text-green-300">
                {remessas.filter(r => r.status === 'ENTREGA_FINALIZADA').length}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">Entregues</p>
            </CardContent>
          </Card>
        </div>

        {/* Remessas List - Mobile Optimized */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Minhas Remessas</h2>
              <p className="text-sm text-muted-foreground">
                {remessas.length} {remessas.length === 1 ? 'remessa' : 'remessas'} atribuída{remessas.length === 1 ? '' : 's'}
              </p>
            </div>
            {refreshing && (
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <Card key={n} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded w-1/3"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : remessas.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-muted">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-2">Nenhuma remessa atribuída</h3>
                <p className="text-sm text-muted-foreground">
                  Aguarde novas remessas serem designadas para você.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {remessas.map((remessa) => {
                const canAccept = canAcceptPickup(remessa.status);
                
                return (
                  <Card 
                    key={remessa.id} 
                    className="hover:shadow-md transition-all duration-200 active:scale-95"
                    onClick={() => handleViewDetails(remessa)}
                  >
                    <CardContent className="p-4">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></div>
                          <span className="font-semibold truncate">
                            {remessa.tracking_code || `ID${remessa.id.slice(0, 8).toUpperCase()}`}
                          </span>
                        </div>
                        {getStatusBadge(remessa.status)}
                      </div>

                      {/* Content */}
                      <div className="space-y-3">
                        {/* Route Info */}
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <User className="w-3 h-3" />
                            <span className="truncate">{remessa.sender_address?.name || 'Remetente'}</span>
                          </div>
                          <div className="text-muted-foreground">→</div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{remessa.recipient_address?.name || 'Destinatário'}</span>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            <span>{remessa.weight}kg</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(remessa.created_at), 'dd/MM HH:mm', { locale: ptBR })}</span>
                          </div>
                          {remessa.selected_option === 'express' && (
                            <Badge variant="outline" className="text-xs">
                              Expresso
                            </Badge>
                          )}
                        </div>

                        {/* Quick Actions */}
                        {canAccept && (
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickAction(remessa.id, 'accept_pickup');
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Aceitar Coleta
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Enhanced Remessa Details Modal */}
        <RemessaDetalhes
          isOpen={detailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          remessa={selectedRemessa}
          onUpdateStatus={updateRemessaStatus}
        />
      </main>
    </div>
  );
};

export default MotoristaDashboard;