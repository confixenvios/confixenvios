import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  History, 
  Search, 
  Calendar,
  Package,
  Clock,
  ArrowUpDown,
  Filter,
  FileText,
  CreditCard,
  Truck,
  Plus
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";

interface HistoryItem {
  id: string;
  type: 'shipment' | 'payment' | 'label' | 'tracking';
  title: string;
  description: string;
  status: string;
  date: string;
  value?: number;
  tracking_code?: string;
  metadata?: any;
}

interface ShipmentData {
  id: string;
  tracking_code: string;
  status: string;
  created_at: string;
  weight: number;
  quote_data: any;
  payment_data: any;
  label_pdf_url: string | null;
  sender_address: {
    name: string;
    city: string;
    state: string;
  } | null;
  recipient_address: {
    name: string;
    city: string;
    state: string;
  } | null;
}

const ClientHistorico = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: shipmentsData, error } = await supabase
        .from('shipments')
        .select(`
          id,
          tracking_code,
          status,
          created_at,
          weight,
          quote_data,
          payment_data,
          label_pdf_url,
          sender_address:addresses!sender_address_id(name, city, state),
          recipient_address:addresses!recipient_address_id(name, city, state)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading history:', error);
        toast({
          title: "Erro ao carregar histórico",
          description: "Não foi possível carregar o histórico.",
          variant: "destructive"
        });
        return;
      }

      // Transform shipments data into history items
      const items: HistoryItem[] = [];
      
      shipmentsData?.forEach((shipment: ShipmentData) => {
        // Shipment creation
        items.push({
          id: `${shipment.id}-created`,
          type: 'shipment',
          title: 'Remessa criada',
          description: `Remessa para ${shipment.recipient_address?.name || 'destinatário'} em ${shipment.recipient_address?.city || 'cidade não informada'}`,
          status: 'CREATED',
          date: shipment.created_at,
          tracking_code: shipment.tracking_code,
          value: shipment.quote_data?.price,
          metadata: { weight: shipment.weight }
        });

        // Payment related events
        if (shipment.payment_data || shipment.status === 'PAID') {
          const paymentValue = shipment.payment_data?.pixData?.amount ? 
            (shipment.payment_data.pixData.amount / 100) : 
            (shipment.quote_data?.amount || shipment.quote_data?.price || 0);
          
          items.push({
            id: `${shipment.id}-payment`,
            type: 'payment',
            title: 'Pagamento processado',
            description: `Pagamento de R$ ${paymentValue.toFixed(2)} processado`,
            status: 'CONFIRMED',
            date: shipment.created_at,
            tracking_code: shipment.tracking_code,
            value: paymentValue
          });
        }

        // Label generation
        if (shipment.label_pdf_url) {
          items.push({
            id: `${shipment.id}-label`,
            type: 'label',
            title: 'Etiqueta gerada',
            description: `Etiqueta disponível para impressão`,
            status: 'AVAILABLE',
            date: shipment.created_at,
            tracking_code: shipment.tracking_code,
            metadata: { pdf_url: shipment.label_pdf_url }
          });
        }

        // Status updates (simulated based on current status)
        if (['DELIVERED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(shipment.status)) {
          items.push({
            id: `${shipment.id}-tracking`,
            type: 'tracking',
            title: getTrackingTitle(shipment.status),
            description: getTrackingDescription(shipment.status),
            status: shipment.status,
            date: shipment.created_at,
            tracking_code: shipment.tracking_code
          });
        }
      });

      // Sort items by date
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setHistoryItems(items);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrackingTitle = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'Remessa entregue';
      case 'IN_TRANSIT': return 'Remessa em trânsito';
      case 'OUT_FOR_DELIVERY': return 'Saiu para entrega';
      default: return 'Atualização de status';
    }
  };

  const getTrackingDescription = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'Remessa foi entregue com sucesso';
      case 'IN_TRANSIT': return 'Remessa está em trânsito para o destino';
      case 'OUT_FOR_DELIVERY': return 'Remessa saiu para entrega';
      default: return 'Status da remessa foi atualizado';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'shipment': return <Package className="w-4 h-4" />;
      case 'payment': return <CreditCard className="w-4 h-4" />;
      case 'label': return <FileText className="w-4 h-4" />;
      case 'tracking': return <Truck className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (type: string, status: string) => {
    if (type === 'payment') {
      return status === 'CONFIRMED' 
        ? <Badge className="bg-success text-success-foreground">Pago</Badge>
        : <Badge variant="destructive">Pendente</Badge>;
    }
    
    if (type === 'tracking') {
      switch (status) {
        case 'DELIVERED':
          return <Badge className="bg-success text-success-foreground">Entregue</Badge>;
        case 'IN_TRANSIT':
          return <Badge className="bg-info text-info-foreground">Em Trânsito</Badge>;
        case 'OUT_FOR_DELIVERY':
          return <Badge className="bg-warning text-warning-foreground">Saiu para Entrega</Badge>;
        default:
          return <Badge variant="secondary">{status}</Badge>;
      }
    }
    
    if (type === 'label') {
      return <Badge className="bg-success text-success-foreground">Disponível</Badge>;
    }
    
    return <Badge variant="secondary">Criado</Badge>;
  };

  const filteredItems = historyItems.filter(item => {
    const matchesSearch = !searchTerm || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tracking_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    
    return matchesSearch && matchesType;
  }).sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const typeStats = {
    shipment: historyItems.filter(i => i.type === 'shipment').length,
    payment: historyItems.filter(i => i.type === 'payment').length,
    label: historyItems.filter(i => i.type === 'label').length,
    tracking: historyItems.filter(i => i.type === 'tracking').length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center">
          <History className="mr-3 h-8 w-8 text-primary" />
          Histórico
        </h1>
        <p className="text-muted-foreground">
          Acompanhe todas as atividades e movimentações das suas remessas
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Remessas</p>
                <p className="text-xl font-bold text-foreground">{loading ? '...' : typeStats.shipment}</p>
              </div>
              <Package className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Pagamentos</p>
                <p className="text-xl font-bold text-foreground">{loading ? '...' : typeStats.payment}</p>
              </div>
              <CreditCard className="w-6 h-6 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Etiquetas</p>
                <p className="text-xl font-bold text-foreground">{loading ? '...' : typeStats.label}</p>
              </div>
              <FileText className="w-6 h-6 text-info" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Rastreamentos</p>
                <p className="text-xl font-bold text-foreground">{loading ? '...' : typeStats.tracking}</p>
              </div>
              <Truck className="w-6 h-6 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar no histórico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de atividade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="shipment">Remessas</SelectItem>
                  <SelectItem value="payment">Pagamentos</SelectItem>
                  <SelectItem value="label">Etiquetas</SelectItem>
                  <SelectItem value="tracking">Rastreamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-2"
            >
              <ArrowUpDown className="w-4 h-4" />
              {sortOrder === 'desc' ? 'Mais recente' : 'Mais antigo'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History Timeline */}
      <Card className="border-border/50 shadow-card">
        <CardHeader>
          <CardTitle>Linha do Tempo</CardTitle>
          <CardDescription>
            {filteredItems.length === 0 && !loading 
              ? "Nenhuma atividade encontrada"
              : `${filteredItems.length} atividade(s) encontrada(s)`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-muted animate-pulse rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
                    <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma atividade encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || typeFilter !== 'all' 
                  ? "Tente ajustar os filtros de pesquisa"
                  : "Suas atividades aparecerão aqui conforme você usar o sistema"
                }
              </p>
              <Button asChild>
                <Link to="/cliente/cotacoes">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Cotação
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredItems.map((item, index) => (
                <div key={item.id} className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                    {getTypeIcon(item.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium text-foreground">{item.title}</h4>
                        {getStatusBadge(item.type, item.status)}
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(item.date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center space-x-4">
                        {item.tracking_code && (
                          <span className="font-mono">#{item.tracking_code}</span>
                        )}
                        {item.value && (
                          <span className="font-medium text-success">R$ {item.value.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientHistorico;