import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Car, Truck, BarChart3, Search, FileDown, Package, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface B2BShipment {
  id: string;
  tracking_code: string;
  status: string;
  created_at: string;
  total_volumes: number;
  total_weight: number;
  delivery_date: string | null;
  type: 'local';
}

interface NationalShipment {
  id: string;
  tracking_code: string;
  status: string;
  created_at: string;
  weight: number;
  type: 'nacional';
}

type Shipment = B2BShipment | NationalShipment;

const PainelRelatorios = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'todos' | 'local' | 'nacional'>('todos');
  const [b2bShipments, setB2BShipments] = useState<B2BShipment[]>([]);
  const [nationalShipments, setNationalShipments] = useState<NationalShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

      // Load B2B shipments
      const { data: clientData } = await supabase
        .from('b2b_clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (clientData) {
        const { data: b2bData } = await supabase
          .from('b2b_shipments')
          .select('id, tracking_code, status, created_at, total_volumes, total_weight, delivery_date')
          .eq('b2b_client_id', clientData.id)
          .order('created_at', { ascending: false });

        setB2BShipments((b2bData || []).map(s => ({ ...s, type: 'local' as const })));
      }

      // Load national shipments
      const { data: nationalData } = await supabase
        .from('shipments')
        .select('id, tracking_code, status, created_at, weight')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setNationalShipments((nationalData || []).map(s => ({ ...s, type: 'nacional' as const })));
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending_payment: { label: 'Aguardando Pagamento', variant: 'outline' },
      paid: { label: 'Pago', variant: 'secondary' },
      processing: { label: 'Processando', variant: 'secondary' },
      collected: { label: 'Coletado', variant: 'secondary' },
      in_transit: { label: 'Em Trânsito', variant: 'default' },
      out_for_delivery: { label: 'Saiu para Entrega', variant: 'default' },
      delivered: { label: 'Entregue', variant: 'default' },
      cancelled: { label: 'Cancelado', variant: 'destructive' },
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const exportToExcel = () => {
    const data = getFilteredShipments().map(s => ({
      'Código': s.tracking_code || '-',
      'Tipo': s.type === 'local' ? 'Local' : 'Nacional',
      'Status': s.status,
      'Data': format(new Date(s.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      'Peso': s.type === 'local' ? (s as B2BShipment).total_weight : (s as NationalShipment).weight,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    XLSX.writeFile(wb, `relatorio_envios_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Relatório exportado!');
  };

  const filteredShipments = getFilteredShipments();

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Relatórios
          </h1>
          <p className="text-muted-foreground">Visualize relatórios de todos os seus envios</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'todos' | 'local' | 'nacional')}>
          <TabsList>
            <TabsTrigger value="todos">Todos ({b2bShipments.length + nationalShipments.length})</TabsTrigger>
            <TabsTrigger value="local" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Local ({b2bShipments.length})
            </TabsTrigger>
            <TabsTrigger value="nacional" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Nacional ({nationalShipments.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredShipments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Nenhum envio encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredShipments.map((shipment) => (
            <Card key={shipment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {shipment.type === 'local' ? (
                      <div className="p-2 rounded-full bg-green-100">
                        <Car className="h-4 w-4 text-green-600" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-full bg-blue-100">
                        <Truck className="h-4 w-4 text-blue-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">{shipment.tracking_code || 'Sem código'}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(shipment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={shipment.type === 'local' ? 'text-green-600 border-green-200' : 'text-blue-600 border-blue-200'}>
                      {shipment.type === 'local' ? 'Local' : 'Nacional'}
                    </Badge>
                    {getStatusBadge(shipment.status)}
                    <span className="text-sm text-muted-foreground">
                      {shipment.type === 'local' 
                        ? `${(shipment as B2BShipment).total_weight}kg` 
                        : `${(shipment as NationalShipment).weight}kg`
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PainelRelatorios;
