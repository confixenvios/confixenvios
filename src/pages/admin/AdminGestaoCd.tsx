import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  Search,
  Truck,
  MapPin,
  Calendar,
  User
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface B2BShipment {
  id: string;
  tracking_code: string | null;
  status: string;
  created_at: string;
  recipient_name: string | null;
  recipient_city: string | null;
  recipient_state: string | null;
  volume_count: number | null;
  motorista_id: string | null;
  motorista_nome?: string;
  b2b_client?: {
    company_name: string;
  };
}

const AdminGestaoCd = () => {
  const [shipments, setShipments] = useState<B2BShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'b2b0' | 'b2b2'>('b2b0');

  useEffect(() => {
    loadShipments();
  }, []);

  const loadShipments = async () => {
    try {
      setLoading(true);

      // Buscar todas as remessas B2B
      const { data: b2bData, error: b2bError } = await supabase
        .from('b2b_shipments')
        .select(`
          id,
          tracking_code,
          status,
          created_at,
          recipient_name,
          recipient_city,
          recipient_state,
          volume_count,
          motorista_id,
          b2b_clients(company_name)
        `)
        .order('created_at', { ascending: false });

      if (b2bError) throw b2bError;

      // Buscar nomes dos motoristas
      const motoristaIds = [...new Set((b2bData || []).filter(s => s.motorista_id).map(s => s.motorista_id))];
      
      let motoristasMap: Record<string, string> = {};
      if (motoristaIds.length > 0) {
        const { data: motoristasData } = await supabase
          .from('motoristas')
          .select('id, nome')
          .in('id', motoristaIds);

        if (motoristasData) {
          motoristasMap = motoristasData.reduce((acc, m) => {
            acc[m.id] = m.nome;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Mapear dados com nomes de motoristas
      const mappedShipments = (b2bData || []).map(s => ({
        ...s,
        motorista_nome: s.motorista_id ? motoristasMap[s.motorista_id] : undefined,
        b2b_client: s.b2b_clients as any
      }));

      setShipments(mappedShipments);
    } catch (error) {
      console.error('Erro ao carregar remessas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'PENDENTE': { label: 'Pendente', variant: 'secondary' },
      'ACEITA': { label: 'Aceita', variant: 'default' },
      'B2B_COLETA_FINALIZADA': { label: 'Coleta Finalizada', variant: 'default' },
      'B2B_ENTREGA_ACEITA': { label: 'Entrega Aceita', variant: 'default' },
      'ENTREGUE': { label: 'Entregue', variant: 'default' },
      'CANCELADO': { label: 'Cancelado', variant: 'destructive' }
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Filtrar remessas B2B-0 (Coleta) - status antes de B2B_COLETA_FINALIZADA
  const b2b0Shipments = shipments.filter(s => 
    ['PENDENTE', 'ACEITA'].includes(s.status) ||
    (s.status === 'B2B_COLETA_FINALIZADA')
  );

  // Filtrar remessas B2B-2 (Entrega) - status após coleta finalizada
  const b2b2Shipments = shipments.filter(s => 
    ['B2B_COLETA_FINALIZADA', 'B2B_ENTREGA_ACEITA', 'ENTREGUE'].includes(s.status)
  );

  const filterShipments = (list: B2BShipment[]) => {
    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(s => 
      s.tracking_code?.toLowerCase().includes(term) ||
      s.recipient_name?.toLowerCase().includes(term) ||
      s.recipient_city?.toLowerCase().includes(term) ||
      s.b2b_client?.company_name?.toLowerCase().includes(term) ||
      s.motorista_nome?.toLowerCase().includes(term)
    );
  };

  const renderShipmentCard = (shipment: B2BShipment) => (
    <Card key={shipment.id} className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium text-primary">
                {shipment.tracking_code || 'Sem código'}
              </span>
              {getStatusBadge(shipment.status)}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{shipment.b2b_client?.company_name || 'Cliente não identificado'}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>
                  {shipment.recipient_city && shipment.recipient_state 
                    ? `${shipment.recipient_city}/${shipment.recipient_state}`
                    : 'Destino não informado'
                  }
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                <span>{shipment.volume_count || 1} volume(s)</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(shipment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
              </div>
            </div>

            {shipment.motorista_nome && (
              <div className="flex items-center gap-1 text-sm">
                <Truck className="h-3 w-3 text-primary" />
                <span className="text-primary font-medium">Motorista: {shipment.motorista_nome}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Package className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Gestão CD</h1>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Carregando remessas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Package className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Gestão CD</h1>
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-600 rounded-lg">
            <span className="font-medium">B2B-0</span>
            <span>=</span>
            <span>Coleta</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-600 rounded-lg">
            <span className="font-medium">B2B-2</span>
            <span>=</span>
            <span>Entrega</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, cliente, destino ou motorista..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'b2b0' | 'b2b2')}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="b2b0" className="flex items-center gap-2">
            <span>B2B-0 (Coleta)</span>
            <Badge variant="secondary">{filterShipments(b2b0Shipments).length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="b2b2" className="flex items-center gap-2">
            <span>B2B-2 (Entrega)</span>
            <Badge variant="secondary">{filterShipments(b2b2Shipments).length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="b2b0" className="mt-4 space-y-4">
          {filterShipments(b2b0Shipments).length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhuma remessa B2B-0 (Coleta) encontrada
              </CardContent>
            </Card>
          ) : (
            filterShipments(b2b0Shipments).map(renderShipmentCard)
          )}
        </TabsContent>

        <TabsContent value="b2b2" className="mt-4 space-y-4">
          {filterShipments(b2b2Shipments).length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhuma remessa B2B-2 (Entrega) encontrada
              </CardContent>
            </Card>
          ) : (
            filterShipments(b2b2Shipments).map(renderShipmentCard)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminGestaoCd;
