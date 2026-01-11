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
  DollarSign,
  Filter,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Interface para volume B2B (local)
interface B2BVolume {
  id: string;
  eti_code: string;
  status: string;
  created_at: string;
  weight: number;
  volume_number: number;
  b2b_shipment_id: string;
  tracking_code: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_city: string;
  recipient_state: string;
  recipient_street: string;
  recipient_number: string;
  recipient_neighborhood: string;
  recipient_cep: string;
  recipient_document: string | null;
  type: 'local';
  delivery_date: string | null;
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
  recipient_name?: string;
  recipient_phone?: string;
  recipient_cep?: string;
  quote_data?: {
    price?: number;
    delivery_days?: number;
  };
}

type Shipment = B2BVolume | NationalShipment;

const PainelRelatorios = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'todos' | 'local' | 'nacional'>('todos');
  const [b2bVolumes, setB2BVolumes] = useState<B2BVolume[]>([]);
  const [nationalShipments, setNationalShipments] = useState<NationalShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalFreightPaid, setTotalFreightPaid] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedItem, setSelectedItem] = useState<Shipment | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

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

      // Load B2B volumes (individual ETI codes) - not shipments
      const { data: clientData } = await supabase
        .from('b2b_clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (clientData) {
        const { data: shipmentsData } = await supabase
          .from('b2b_shipments')
          .select('id, tracking_code, delivery_date')
          .eq('b2b_client_id', clientData.id);

        if (shipmentsData && shipmentsData.length > 0) {
          const shipmentIds = shipmentsData.map(s => s.id);
          const shipmentMap = new Map(shipmentsData.map(s => [s.id, s]));

          const { data: volumesData } = await supabase
            .from('b2b_volumes')
            .select('*')
            .in('b2b_shipment_id', shipmentIds)
            .order('created_at', { ascending: false });

          setB2BVolumes((volumesData || []).map(v => {
            const shipment = shipmentMap.get(v.b2b_shipment_id);
            return {
              id: v.id,
              eti_code: v.eti_code,
              status: v.status,
              created_at: v.created_at,
              weight: v.weight,
              volume_number: v.volume_number,
              b2b_shipment_id: v.b2b_shipment_id,
              tracking_code: shipment?.tracking_code || '',
              recipient_name: v.recipient_name,
              recipient_phone: v.recipient_phone,
              recipient_city: v.recipient_city,
              recipient_state: v.recipient_state,
              recipient_street: v.recipient_street,
              recipient_number: v.recipient_number,
              recipient_neighborhood: v.recipient_neighborhood,
              recipient_cep: v.recipient_cep,
              recipient_document: v.recipient_document,
              type: 'local' as const,
              delivery_date: shipment?.delivery_date || null
            };
          }));
        }
      }

      // Load national shipments with recipient address and payment data
      const { data: nationalData } = await supabase
        .from('shipments')
        .select(`
          id, tracking_code, status, created_at, weight, payment_data, quote_data,
          recipient_address:addresses!recipient_address_id(city, state, street, number, cep, name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Calculate total freight paid from national shipments
      let totalPaid = 0;
      (nationalData || []).forEach(s => {
        const paymentData = s.payment_data as { amount?: number; total?: number } | null;
        if (paymentData) {
          const amount = paymentData.amount || paymentData.total || 0;
          totalPaid += amount > 100 ? amount / 100 : amount;
        }
      });
      setTotalFreightPaid(totalPaid);

      setNationalShipments((nationalData || []).map(s => {
        const addr = s.recipient_address as { city: string; state: string; street: string; number: string; cep: string; name: string } | null;
        const quoteData = s.quote_data as { price?: number; delivery_days?: number } | null;
        return {
          id: s.id,
          tracking_code: s.tracking_code,
          status: s.status,
          created_at: s.created_at,
          weight: s.weight,
          type: 'nacional' as const,
          destination_city: addr?.city,
          destination_state: addr?.state,
          destination_address: addr ? `${addr.street}, ${addr.number}` : undefined,
          recipient_name: addr?.name,
          recipient_phone: undefined,
          recipient_cep: addr?.cep,
          quote_data: quoteData || undefined
        };
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredShipments = () => {
    let items: Shipment[] = [];
    
    if (activeTab === 'todos' || activeTab === 'local') {
      items = [...items, ...b2bVolumes];
    }
    if (activeTab === 'todos' || activeTab === 'nacional') {
      items = [...items, ...nationalShipments];
    }

    // Filter by search term
    if (searchTerm) {
      items = items.filter(s => {
        if (s.type === 'local') {
          return s.eti_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 s.tracking_code?.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return s.tracking_code?.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Filter by date range
    if (startDate || endDate) {
      items = items.filter(s => {
        const itemDate = new Date(s.created_at);
        if (startDate && endDate) {
          return isWithinInterval(itemDate, {
            start: startOfDay(parseISO(startDate)),
            end: endOfDay(parseISO(endDate))
          });
        }
        if (startDate) {
          return itemDate >= startOfDay(parseISO(startDate));
        }
        if (endDate) {
          return itemDate <= endOfDay(parseISO(endDate));
        }
        return true;
      });
    }

    return items.sort((a, b) => 
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
      AGUARDANDO_ACEITE_COLETA: { 
        label: 'Aguardando Aceite Coleta', 
        color: 'text-amber-700', 
        bgColor: 'bg-amber-50 border-amber-200',
        icon: <Timer className="h-4 w-4" />
      },
      COLETA_ACEITA: { 
        label: 'Coleta Aceita', 
        color: 'text-blue-700', 
        bgColor: 'bg-blue-50 border-blue-200',
        icon: <Package className="h-4 w-4" />
      },
      AGUARDANDO_ACEITE_EXPEDICAO: { 
        label: 'Aguardando Expedição', 
        color: 'text-indigo-700', 
        bgColor: 'bg-indigo-50 border-indigo-200',
        icon: <Package className="h-4 w-4" />
      },
      EM_TRANSITO: { 
        label: 'Em Trânsito', 
        color: 'text-purple-700', 
        bgColor: 'bg-purple-50 border-purple-200',
        icon: <Truck className="h-4 w-4" />
      },
      SAIU_PARA_ENTREGA: { 
        label: 'Saiu para Entrega', 
        color: 'text-orange-700', 
        bgColor: 'bg-orange-50 border-orange-200',
        icon: <Truck className="h-4 w-4" />
      },
      CONCLUIDO: { 
        label: 'Entregue', 
        color: 'text-green-700', 
        bgColor: 'bg-green-50 border-green-200',
        icon: <CheckCircle2 className="h-4 w-4" />
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
  
  // Calculate stats based on volumes for local (not shipments)
  const localDelivered = b2bVolumes.filter(v => v.status === 'CONCLUIDO').length;
  const nationalDelivered = nationalShipments.filter(s => s.status === 'delivered' || s.status === 'DELIVERED').length;
  
  const localInTransit = b2bVolumes.filter(v => 
    v.status !== 'CONCLUIDO' && v.status !== 'CANCELADO'
  ).length;
  const nationalInTransit = nationalShipments.filter(s => 
    s.status === 'in_transit' || s.status === 'IN_TRANSIT' || 
    s.status === 'out_for_delivery' || s.status === 'collected' ||
    s.status === 'pending_payment' || s.status === 'PENDENTE' || 
    s.status === 'PAGO_AGUARDANDO_ETIQUETA' || s.status === 'paid' ||
    s.status === 'PAYMENT_CONFIRMED' || s.status === 'processing'
  ).length;

  const stats = {
    total: b2bVolumes.length + nationalShipments.length,
    local: b2bVolumes.length,
    nacional: nationalShipments.length,
    delivered: localDelivered + nationalDelivered,
    inTransit: localInTransit + nationalInTransit,
  };

  const openDetails = (item: Shipment) => {
    setSelectedItem(item);
    setDetailsOpen(true);
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
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
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 bg-gradient-to-b from-background to-muted/20 min-h-screen pb-24 overflow-x-hidden w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center gap-3 w-full">
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25 shrink-0">
            <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-3xl font-bold text-foreground">Relatórios</h1>
            <p className="text-muted-foreground text-xs md:text-base truncate">Acompanhe todos os seus envios em um só lugar</p>
          </div>
        </div>
      </div>

      {/* Stats Cards - 2x2 on mobile, 4 columns on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-white to-slate-50 overflow-hidden group hover:shadow-lg transition-all duration-300">
          <CardContent className="p-3 md:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-1 truncate">Total de Envios</p>
                <p className="text-xl md:text-3xl font-bold text-foreground">{stats.total}</p>
              </div>
              <div className="h-8 w-8 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="h-4 w-4 md:h-6 md:w-6 text-primary" />
              </div>
            </div>
            <div className="mt-2 md:mt-3 flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
              <TrendingUp className="h-3 w-3 text-emerald-500 shrink-0" />
              <span className="text-emerald-600 font-medium">{stats.local} locais</span>
              <span>•</span>
              <span className="text-blue-600 font-medium">{stats.nacional} nacionais</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-white overflow-hidden group hover:shadow-lg transition-all duration-300">
          <CardContent className="p-3 md:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-amber-600 mb-1 truncate">Total Frete Contratado</p>
                <p className="text-lg md:text-3xl font-bold text-amber-700 truncate">
                  {totalFreightPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <div className="h-8 w-8 md:h-12 md:w-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <DollarSign className="h-4 w-4 md:h-6 md:w-6 text-amber-600" />
              </div>
            </div>
            <div className="mt-2 md:mt-3 text-xs text-muted-foreground truncate">
              Soma de todos os pagamentos PIX
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-white overflow-hidden group hover:shadow-lg transition-all duration-300">
          <CardContent className="p-3 md:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-emerald-600 mb-1">Entregues</p>
                <p className="text-xl md:text-3xl font-bold text-emerald-700">{stats.delivered}</p>
              </div>
              <div className="h-8 w-8 md:h-12 md:w-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4 md:h-6 md:w-6 text-emerald-600" />
              </div>
            </div>
            <div className="mt-2 md:mt-3 h-1.5 bg-emerald-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-white overflow-hidden group hover:shadow-lg transition-all duration-300">
          <CardContent className="p-3 md:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-purple-600 mb-1">Em Trânsito</p>
                <p className="text-xl md:text-3xl font-bold text-purple-700">{stats.inTransit}</p>
              </div>
              <div className="h-8 w-8 md:h-12 md:w-12 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                <Truck className="h-4 w-4 md:h-6 md:w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-2 md:mt-3 h-1.5 bg-purple-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-400 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.total > 0 ? (stats.inTransit / stats.total) * 100 : 0}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card className="border-0 shadow-md overflow-hidden w-full">
        <CardContent className="p-3 md:p-4 w-full">
          <div className="flex flex-col gap-3 w-full">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'todos' | 'local' | 'nacional')} className="w-full">
              <TabsList className="bg-muted/50 p-1 h-auto w-full grid grid-cols-3">
                <TabsTrigger 
                  value="todos" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-1 py-2 text-[10px] sm:text-sm truncate"
                >
                  <span className="hidden sm:inline">Locais e Nacionais ({stats.total})</span>
                  <span className="sm:hidden">Todos ({stats.total})</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="local" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-1 py-2 text-[10px] sm:text-sm"
                >
                  Locais ({stats.local})
                </TabsTrigger>
                <TabsTrigger 
                  value="nacional" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-1 py-2 text-[10px] sm:text-sm"
                >
                  Nacionais ({stats.nacional})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Date filters - stacked on mobile */}
            <div className="flex items-center gap-2 w-full">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
              <div className="flex-1 min-w-0">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-muted/30 border-0 focus-visible:ring-primary/20 text-xs sm:text-sm w-full"
                  placeholder="Data início"
                />
              </div>
              <span className="text-muted-foreground text-xs sm:text-sm shrink-0">até</span>
              <div className="flex-1 min-w-0">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-muted/30 border-0 focus-visible:ring-primary/20 text-xs sm:text-sm w-full"
                  placeholder="Data fim"
                />
              </div>
            </div>

            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={activeTab === 'local' ? "Buscar por ETI ou código..." : "Buscar por código de rastreio..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-muted/30 border-0 focus-visible:ring-primary/20 w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipments List */}
      {filteredShipments.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 md:py-16 text-center">
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">Nenhum envio encontrado</h3>
            <p className="text-muted-foreground text-xs md:text-sm max-w-md mx-auto px-4">
              {searchTerm 
                ? `Não encontramos envios com o código "${searchTerm}"`
                : 'Você ainda não possui envios registrados nesta categoria'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 md:space-y-3 w-full">
          {filteredShipments.map((item, index) => {
            const statusConfig = getStatusConfig(item.status);
            const isLocal = item.type === 'local';
            
            return (
              <Card 
                key={item.id} 
                className="border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group cursor-pointer w-full"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => openDetails(item)}
              >
                <CardContent className="p-0 w-full">
                  <div className="flex items-stretch w-full">
                    {/* Type indicator bar */}
                    <div className={`w-1 md:w-1.5 shrink-0 ${isLocal ? 'bg-gradient-to-b from-emerald-400 to-emerald-500' : 'bg-gradient-to-b from-blue-400 to-blue-500'}`} />
                    
                    <div className="flex-1 p-3 md:p-5 min-w-0 overflow-hidden">
                      <div className="flex flex-col gap-3">
                        {/* Top row - Icon, title and type */}
                        <div className="flex items-start gap-3 min-w-0 w-full">
                          <div className={`h-10 w-10 md:h-12 md:w-12 rounded-xl flex items-center justify-center shrink-0 ${isLocal ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                            {isLocal ? (
                              <Car className="h-5 w-5 md:h-6 md:w-6 text-emerald-600" />
                            ) : (
                              <Truck className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                            )}
                          </div>
                          
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-foreground text-sm md:text-lg truncate max-w-[150px] sm:max-w-none">
                                {isLocal ? (item as B2BVolume).eti_code : item.tracking_code || 'Sem código'}
                              </h3>
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] sm:text-xs font-medium shrink-0 ${isLocal ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-blue-600 border-blue-200 bg-blue-50'}`}
                              >
                                {isLocal ? 'Local' : 'Nacional'}
                              </Badge>
                            </div>
                            
                            {/* Address info */}
                            <div className="flex items-center gap-1.5 mt-1 text-xs md:text-sm text-foreground">
                              <MapPin className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary shrink-0" />
                              <span className="truncate">
                                {isLocal ? (
                                  <>
                                    <span className="font-medium">{(item as B2BVolume).recipient_city}</span>
                                    <span className="text-muted-foreground">/{(item as B2BVolume).recipient_state}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="font-medium">{(item as NationalShipment).destination_city}</span>
                                    {(item as NationalShipment).destination_state && (
                                      <span className="text-muted-foreground">/{(item as NationalShipment).destination_state}</span>
                                    )}
                                  </>
                                )}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 md:gap-4 mt-1.5 md:mt-2 text-xs md:text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 md:h-3.5 md:w-3.5 shrink-0" />
                                <span>{format(new Date(item.created_at), "dd/MM/yy", { locale: ptBR })}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 md:h-3.5 md:w-3.5 shrink-0" />
                                <span>{format(new Date(item.created_at), 'HH:mm', { locale: ptBR })}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bottom row - Status, weight and action */}
                        <div className="flex items-center justify-between gap-2 pl-0 md:pl-14">
                          <Badge 
                            variant="outline" 
                            className={`${statusConfig.bgColor} ${statusConfig.color} border text-[10px] sm:text-xs shrink-0 max-w-[140px] sm:max-w-none truncate`}
                          >
                            {statusConfig.label}
                          </Badge>
                          
                          <div className="flex items-center gap-2">
                            <p className="text-sm md:text-lg font-bold text-foreground shrink-0">
                              {item.weight}kg
                            </p>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetails(item);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
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
        <div className="text-center text-xs md:text-sm text-muted-foreground py-4">
          Mostrando <span className="font-semibold text-foreground">{filteredShipments.length}</span> envio(s)
        </div>
      )}

      {/* Details Modal - WITHOUT download label button */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>
              {selectedItem?.type === 'local' ? 'Detalhes do Volume' : 'Detalhes do Envio'}
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {selectedItem.type === 'local' ? 'Código ETI' : 'Código de Rastreio'}
                  </p>
                  <p className="font-semibold">
                    {selectedItem.type === 'local' 
                      ? (selectedItem as B2BVolume).eti_code 
                      : selectedItem.tracking_code || '-'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge 
                    variant="outline" 
                    className={`${getStatusConfig(selectedItem.status).bgColor} ${getStatusConfig(selectedItem.status).color} border mt-1`}
                  >
                    {getStatusConfig(selectedItem.status).label}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Criado em</p>
                  <p className="font-medium">{format(new Date(selectedItem.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Peso</p>
                  <p className="font-medium">{selectedItem.weight} kg</p>
                </div>
              </div>

              {selectedItem.type === 'local' && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Código do Pedido</p>
                  <p className="font-medium">{(selectedItem as B2BVolume).tracking_code}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-sm font-medium flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4" />
                  Destinatário
                </p>
                <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                  {selectedItem.type === 'local' ? (
                    <>
                      <p className="font-medium">{(selectedItem as B2BVolume).recipient_name}</p>
                      <p className="text-muted-foreground">{(selectedItem as B2BVolume).recipient_phone}</p>
                      <p className="text-muted-foreground">
                        {(selectedItem as B2BVolume).recipient_street}, {(selectedItem as B2BVolume).recipient_number}
                        {(selectedItem as B2BVolume).recipient_neighborhood && ` - ${(selectedItem as B2BVolume).recipient_neighborhood}`}
                      </p>
                      <p className="text-muted-foreground">
                        {(selectedItem as B2BVolume).recipient_city}/{(selectedItem as B2BVolume).recipient_state} - CEP: {(selectedItem as B2BVolume).recipient_cep}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">{(selectedItem as NationalShipment).recipient_name || '-'}</p>
                      <p className="text-muted-foreground">
                        {(selectedItem as NationalShipment).destination_address}
                      </p>
                      <p className="text-muted-foreground">
                        {(selectedItem as NationalShipment).destination_city}/{(selectedItem as NationalShipment).destination_state}
                        {(selectedItem as NationalShipment).recipient_cep && ` - CEP: ${(selectedItem as NationalShipment).recipient_cep}`}
                      </p>
                    </>
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

export default PainelRelatorios;
