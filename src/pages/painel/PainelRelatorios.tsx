import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Car, 
  Truck, 
  BarChart3, 
  Search, 
  Package, 
  Clock, 
  CheckCircle2,
  XCircle,
  Timer,
  TrendingUp,
  ArrowRight,
  Calendar,
  MapPin,
  Navigation
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import CarrierTrackingModal from '@/components/cliente/CarrierTrackingModal';

interface B2BVolume {
  recipient_city: string;
  recipient_state: string;
  recipient_street: string;
  recipient_number: string;
}

interface B2BShipment {
  id: string;
  tracking_code: string;
  status: string;
  created_at: string;
  total_volumes: number;
  total_weight: number;
  delivery_date: string | null;
  type: 'local';
  destination_city?: string;
  destination_state?: string;
  destination_address?: string;
}

interface NationalShipment {
  id: string;
  tracking_code: string;
  status: string;
  created_at: string;
  weight: number;
  type: 'nacional';
  destination_city?: string;
  destination_state?: string;
  destination_address?: string;
}

type Shipment = B2BShipment | NationalShipment;

const PainelRelatorios = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'todos' | 'local' | 'nacional'>('todos');
  const [b2bShipments, setB2BShipments] = useState<B2BShipment[]>([]);
  const [nationalShipments, setNationalShipments] = useState<NationalShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Tracking modal state
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [currentTrackingCode, setCurrentTrackingCode] = useState('');

  const handleNationalTracking = async (trackingCode: string) => {
    if (!trackingCode) {
      toast.error('Código de rastreio não disponível');
      return;
    }

    setCurrentTrackingCode(trackingCode);
    setTrackingModalOpen(true);
    setTrackingLoading(true);
    setTrackingError(null);
    setTrackingData(null);

    try {
      const response = await fetch('https://n8n.grupoconfix.com/webhook-test/47827545-77ca-4e68-8b43-9c50467a3f55', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trackingCode }),
      });

      if (!response.ok) {
        throw new Error('Erro ao consultar rastreamento');
      }

      const data = await response.json();
      setTrackingData(data);
    } catch (error) {
      console.error('Erro ao buscar rastreio:', error);
      setTrackingError('Não foi possível consultar o rastreamento. Tente novamente.');
    } finally {
      setTrackingLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Load B2B shipments with volumes for address info
      const { data: clientData } = await supabase
        .from('b2b_clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (clientData) {
        const { data: b2bData } = await supabase
          .from('b2b_shipments')
          .select(`
            id, tracking_code, status, created_at, total_volumes, total_weight, delivery_date,
            b2b_volumes(recipient_city, recipient_state, recipient_street, recipient_number)
          `)
          .eq('b2b_client_id', clientData.id)
          .order('created_at', { ascending: false });

        setB2BShipments((b2bData || []).map(s => {
          const firstVolume = (s.b2b_volumes as B2BVolume[] | null)?.[0];
          return {
            id: s.id,
            tracking_code: s.tracking_code,
            status: s.status,
            created_at: s.created_at,
            total_volumes: s.total_volumes,
            total_weight: s.total_weight,
            delivery_date: s.delivery_date,
            type: 'local' as const,
            destination_city: firstVolume?.recipient_city,
            destination_state: firstVolume?.recipient_state,
            destination_address: firstVolume ? `${firstVolume.recipient_street}, ${firstVolume.recipient_number}` : undefined
          };
        }));
      }

      // Load national shipments with recipient address
      const { data: nationalData } = await supabase
        .from('shipments')
        .select(`
          id, tracking_code, status, created_at, weight,
          recipient_address:addresses!recipient_address_id(city, state, street, number)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setNationalShipments((nationalData || []).map(s => {
        const addr = s.recipient_address as { city: string; state: string; street: string; number: string } | null;
        return {
          id: s.id,
          tracking_code: s.tracking_code,
          status: s.status,
          created_at: s.created_at,
          weight: s.weight,
          type: 'nacional' as const,
          destination_city: addr?.city,
          destination_state: addr?.state,
          destination_address: addr ? `${addr.street}, ${addr.number}` : undefined
        };
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredShipments = () => {
    let shipments: Shipment[] = [];
    
    if (activeTab === 'todos' || activeTab === 'local') {
      shipments = [...shipments, ...b2bShipments];
    }
    if (activeTab === 'todos' || activeTab === 'nacional') {
      shipments = [...shipments, ...nationalShipments];
    }

    if (searchTerm) {
      shipments = shipments.filter(s => 
        s.tracking_code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return shipments.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  };

  const getStatusConfig = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
      pending_payment: { 
        label: 'Aguardando Pagamento', 
        color: 'text-amber-700', 
        bgColor: 'bg-amber-50 border-amber-200',
        icon: <Timer className="h-4 w-4" />
      },
      paid: { 
        label: 'Pago', 
        color: 'text-emerald-700', 
        bgColor: 'bg-emerald-50 border-emerald-200',
        icon: <CheckCircle2 className="h-4 w-4" />
      },
      PAYMENT_CONFIRMED: { 
        label: 'Pagamento Confirmado', 
        color: 'text-emerald-700', 
        bgColor: 'bg-emerald-50 border-emerald-200',
        icon: <CheckCircle2 className="h-4 w-4" />
      },
      PAGO_AGUARDANDO_ETIQUETA: { 
        label: 'Aguardando Etiqueta', 
        color: 'text-blue-700', 
        bgColor: 'bg-blue-50 border-blue-200',
        icon: <Package className="h-4 w-4" />
      },
      processing: { 
        label: 'Processando', 
        color: 'text-blue-700', 
        bgColor: 'bg-blue-50 border-blue-200',
        icon: <Package className="h-4 w-4" />
      },
      collected: { 
        label: 'Coletado', 
        color: 'text-indigo-700', 
        bgColor: 'bg-indigo-50 border-indigo-200',
        icon: <Package className="h-4 w-4" />
      },
      in_transit: { 
        label: 'Em Trânsito', 
        color: 'text-purple-700', 
        bgColor: 'bg-purple-50 border-purple-200',
        icon: <Truck className="h-4 w-4" />
      },
      out_for_delivery: { 
        label: 'Saiu para Entrega', 
        color: 'text-orange-700', 
        bgColor: 'bg-orange-50 border-orange-200',
        icon: <Truck className="h-4 w-4" />
      },
      delivered: { 
        label: 'Entregue', 
        color: 'text-green-700', 
        bgColor: 'bg-green-50 border-green-200',
        icon: <CheckCircle2 className="h-4 w-4" />
      },
      cancelled: { 
        label: 'Cancelado', 
        color: 'text-red-700', 
        bgColor: 'bg-red-50 border-red-200',
        icon: <XCircle className="h-4 w-4" />
      },
      PENDENTE: { 
        label: 'Pendente', 
        color: 'text-amber-700', 
        bgColor: 'bg-amber-50 border-amber-200',
        icon: <Timer className="h-4 w-4" />
      },
    };

    return statusMap[status] || { 
      label: status, 
      color: 'text-gray-700', 
      bgColor: 'bg-gray-50 border-gray-200',
      icon: <Package className="h-4 w-4" />
    };
  };

  const filteredShipments = getFilteredShipments();
  const allShipments = [...b2bShipments, ...nationalShipments];
  
  // Calculate stats - combining processing + in_transit into "Em Trânsito"
  const stats = {
    total: allShipments.length,
    local: b2bShipments.length,
    nacional: nationalShipments.length,
    delivered: allShipments.filter(s => s.status === 'delivered' || s.status === 'DELIVERED').length,
    inTransit: allShipments.filter(s => 
      s.status === 'in_transit' || s.status === 'IN_TRANSIT' || 
      s.status === 'out_for_delivery' || s.status === 'collected' ||
      s.status === 'pending_payment' || s.status === 'PENDENTE' || 
      s.status === 'PAGO_AGUARDANDO_ETIQUETA' || s.status === 'paid' ||
      s.status === 'PAYMENT_CONFIRMED' || s.status === 'processing'
    ).length,
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="relative">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-8 w-8 animate-pulse text-primary" />
            </div>
          </div>
          <p className="text-muted-foreground font-medium">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gradient-to-b from-background to-muted/20 min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Relatórios</h1>
            <p className="text-muted-foreground text-sm md:text-base">Acompanhe todos os seus envios em um só lugar</p>
          </div>
        </div>
      </div>

      {/* Stats Cards - 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-white to-slate-50 overflow-hidden group hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground mb-1">Total de Envios</p>
                <p className="text-2xl md:text-3xl font-bold text-foreground">{stats.total}</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-600 font-medium">{stats.local} locais</span>
              <span>•</span>
              <span className="text-blue-600 font-medium">{stats.nacional} nacionais</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-white overflow-hidden group hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-emerald-600 mb-1">Entregues</p>
                <p className="text-2xl md:text-3xl font-bold text-emerald-700">{stats.delivered}</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6 text-emerald-600" />
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-emerald-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-white overflow-hidden group hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-purple-600 mb-1">Em Trânsito</p>
                <p className="text-2xl md:text-3xl font-bold text-purple-700">{stats.inTransit}</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Truck className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-purple-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-400 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.total > 0 ? (stats.inTransit / stats.total) * 100 : 0}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'todos' | 'local' | 'nacional')} className="w-full lg:w-auto">
              <TabsList className="bg-muted/50 p-1 h-auto">
                <TabsTrigger 
                  value="todos" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Todos ({stats.total})
                </TabsTrigger>
                <TabsTrigger 
                  value="local" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2"
                >
                  <Car className="h-4 w-4 mr-2 text-emerald-600" />
                  Local ({stats.local})
                </TabsTrigger>
                <TabsTrigger 
                  value="nacional" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2"
                >
                  <Truck className="h-4 w-4 mr-2 text-blue-600" />
                  Nacional ({stats.nacional})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-full lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código de rastreio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-muted/30 border-0 focus-visible:ring-primary/20"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipments List */}
      {filteredShipments.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-16 text-center">
            <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Package className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum envio encontrado</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              {searchTerm 
                ? `Não encontramos envios com o código "${searchTerm}"`
                : 'Você ainda não possui envios registrados nesta categoria'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredShipments.map((shipment, index) => {
            const statusConfig = getStatusConfig(shipment.status);
            const isLocal = shipment.type === 'local';
            
            return (
              <Card 
                key={shipment.id} 
                className="border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    {/* Type indicator bar */}
                    <div className={`w-1.5 ${isLocal ? 'bg-gradient-to-b from-emerald-400 to-emerald-500' : 'bg-gradient-to-b from-blue-400 to-blue-500'}`} />
                    
                    <div className="flex-1 p-4 md:p-5">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Left side - Icon and info */}
                        <div className="flex items-start gap-4">
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${isLocal ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                            {isLocal ? (
                              <Car className="h-6 w-6 text-emerald-600" />
                            ) : (
                              <Truck className="h-6 w-6 text-blue-600" />
                            )}
                          </div>
                          
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-foreground text-base md:text-lg">
                                {shipment.tracking_code || 'Sem código'}
                              </h3>
                              <Badge 
                                variant="outline" 
                                className={`text-xs font-medium ${isLocal ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-blue-600 border-blue-200 bg-blue-50'}`}
                              >
                                {isLocal ? 'Local' : 'Nacional'}
                              </Badge>
                            </div>
                            
                            {/* Address info */}
                            {(shipment.destination_city || shipment.destination_address) && (
                              <div className="flex items-center gap-1.5 mt-1.5 text-sm text-foreground">
                                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span className="truncate">
                                  {shipment.destination_address && (
                                    <span className="text-muted-foreground">{shipment.destination_address} - </span>
                                  )}
                                  <span className="font-medium">{shipment.destination_city}</span>
                                  {shipment.destination_state && (
                                    <span className="text-muted-foreground">/{shipment.destination_state}</span>
                                  )}
                                </span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>{format(new Date(shipment.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{format(new Date(shipment.created_at), 'HH:mm', { locale: ptBR })}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right side - Status and weight */}
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${statusConfig.bgColor} ${statusConfig.color}`}>
                            {statusConfig.icon}
                            <span className="text-sm font-medium hidden md:inline">{statusConfig.label}</span>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-lg font-bold text-foreground">
                              {isLocal 
                                ? `${(shipment as B2BShipment).total_weight}kg` 
                                : `${(shipment as NationalShipment).weight}kg`
                              }
                            </p>
                            {isLocal && (
                              <p className="text-xs text-muted-foreground">
                                {(shipment as B2BShipment).total_volumes} volume(s)
                              </p>
                            )}
                          </div>

                          {!isLocal && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNationalTracking(shipment.tracking_code);
                              }}
                              className="gap-2 text-primary border-primary/30 hover:bg-primary/10"
                            >
                              <Navigation className="h-4 w-4" />
                              <span className="hidden md:inline">Rastrear</span>
                            </Button>
                          )}

                          <ArrowRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all hidden md:block" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Results count */}
      {filteredShipments.length > 0 && (
        <div className="text-center text-sm text-muted-foreground py-4">
          Mostrando <span className="font-semibold text-foreground">{filteredShipments.length}</span> envio(s)
        </div>
      )}

      {/* Carrier Tracking Modal */}
      <CarrierTrackingModal
        isOpen={trackingModalOpen}
        onClose={() => setTrackingModalOpen(false)}
        trackingData={trackingData}
        loading={trackingLoading}
        error={trackingError}
        trackingCode={currentTrackingCode}
      />
    </div>
  );
};

export default PainelRelatorios;
