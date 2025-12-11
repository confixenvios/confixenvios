import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  Search,
  Truck,
  MapPin,
  Calendar,
  User,
  LogOut,
  Eye,
  CheckCircle
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { RemessaVisualizacao } from '@/components/motorista/RemessaVisualizacao';

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
  observations?: string | null;
  b2b_client?: {
    company_name: string;
  };
}

interface CdUser {
  id: string;
  nome: string;
  email: string;
  status: string;
  telefone: string;
}

const CdDashboard = () => {
  const navigate = useNavigate();
  const [cdUser, setCdUser] = useState<CdUser | null>(null);
  const [shipments, setShipments] = useState<B2BShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'disponiveis' | 'emrota' | 'entregues'>('disponiveis');
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('cd_user');
    if (!userData) {
      navigate('/cd');
      return;
    }
    setCdUser(JSON.parse(userData));
    loadShipments();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('cd_user');
    toast.success('Logout realizado com sucesso');
    navigate('/cd');
  };

  const loadShipments = async () => {
    try {
      setLoading(true);

      // Carregar apenas remessas B2B-2 (fase de entrega)
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
          observations,
          b2b_clients(company_name)
        `)
        .in('status', ['B2B_COLETA_FINALIZADA', 'B2B_ENTREGA_ACEITA', 'ENTREGUE'])
        .order('created_at', { ascending: false });

      if (b2bError) throw b2bError;

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

      const mappedShipments = (b2bData || []).map(s => ({
        ...s,
        motorista_nome: s.motorista_id ? motoristasMap[s.motorista_id] : undefined,
        b2b_client: s.b2b_clients as any
      }));

      setShipments(mappedShipments);
    } catch (error) {
      console.error('Erro ao carregar remessas:', error);
      toast.error('Erro ao carregar remessas');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      'B2B_COLETA_FINALIZADA': { label: 'Disponível', className: 'bg-red-500 text-white hover:bg-red-600' },
      'B2B_ENTREGA_ACEITA': { label: 'Em Rota', className: 'bg-purple-500 text-white hover:bg-purple-600' },
      'ENTREGUE': { label: 'Entregue', className: 'bg-green-500 text-white hover:bg-green-600' }
    };

    const config = statusConfig[status] || { label: status, className: '' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  // Remessas disponíveis para entrega (sem motorista atribuído)
  const availableShipments = shipments.filter(s => 
    s.status === 'B2B_COLETA_FINALIZADA' && !s.motorista_id
  );

  // Remessas em rota de entrega (com motorista atribuído, mas não entregues)
  const inRouteShipments = shipments.filter(s => 
    s.status === 'B2B_ENTREGA_ACEITA' ||
    (s.status === 'B2B_COLETA_FINALIZADA' && s.motorista_id)
  );

  // Remessas entregues (finalizadas completamente)
  const deliveredShipments = shipments.filter(s => 
    s.status === 'ENTREGUE'
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

  const handleViewDetails = (shipment: B2BShipment) => {
    // Parsear observations para obter dados completos
    let parsedObservations: any = null;
    try {
      if (shipment.observations) {
        parsedObservations = typeof shipment.observations === 'string' 
          ? JSON.parse(shipment.observations) 
          : shipment.observations;
      }
    } catch (e) {
      console.log('Erro ao parsear observations:', e);
    }

    // Calcular peso total a partir dos volume_weights
    const volumeWeights = parsedObservations?.volume_weights || [];
    const totalWeight = volumeWeights.reduce((acc: number, w: number) => acc + (w || 0), 0);

    // Construir volumes com pesos reais
    const volumes = volumeWeights.length > 0
      ? volumeWeights.map((weight: number, index: number) => ({
          volumeNumber: index + 1,
          weight: weight,
          peso: weight
        }))
      : Array.from({ length: shipment.volume_count || 1 }, (_, i) => ({
          volumeNumber: i + 1,
          weight: 0,
          peso: 0
        }));

    // Converter para formato esperado pelo RemessaVisualizacao
    const mappedRemessa = {
      id: shipment.id,
      tracking_code: shipment.tracking_code,
      status: shipment.status,
      created_at: shipment.created_at,
      weight: totalWeight,
      format: 'box',
      selected_option: 'standard',
      motorista_id: shipment.motorista_id,
      observations: shipment.observations,
      quote_data: {
        merchandiseDetails: {
          volumes: volumes
        }
      },
      recipient_address: {
        name: shipment.recipient_name,
        city: shipment.recipient_city,
        state: shipment.recipient_state
      },
      sender_address: {
        name: shipment.b2b_client?.company_name
      }
    };
    setSelectedShipment(mappedRemessa);
    setShowDetails(true);
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
              
              {shipment.recipient_city && shipment.recipient_state && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{shipment.recipient_city}/{shipment.recipient_state}</span>
                </div>
              )}
              
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetails(shipment)}
            className="ml-2"
          >
            <Eye className="h-4 w-4 mr-1" />
            Detalhes
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (!cdUser) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center space-x-2 mb-6">
            <Package className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Centro de Distribuição</h1>
          </div>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Carregando remessas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Centro de Distribuição</h1>
              <p className="text-sm text-muted-foreground">Olá, {cdUser.nome}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-6">
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
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'disponiveis' | 'emrota' | 'entregues')}>
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="disponiveis" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span>Disponíveis</span>
              <Badge variant="secondary">{filterShipments(availableShipments).length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="emrota" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              <span>Em Rota</span>
              <Badge variant="secondary">{filterShipments(inRouteShipments).length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="entregues" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Entregues</span>
              <Badge variant="secondary">{filterShipments(deliveredShipments).length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="disponiveis" className="mt-4 space-y-4">
            {filterShipments(availableShipments).length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhuma remessa disponível para entrega
                </CardContent>
              </Card>
            ) : (
              filterShipments(availableShipments).map(renderShipmentCard)
            )}
          </TabsContent>

          <TabsContent value="emrota" className="mt-4 space-y-4">
            {filterShipments(inRouteShipments).length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhuma remessa em rota de entrega
                </CardContent>
              </Card>
            ) : (
              filterShipments(inRouteShipments).map(renderShipmentCard)
            )}
          </TabsContent>

          <TabsContent value="entregues" className="mt-4 space-y-4">
            {filterShipments(deliveredShipments).length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhuma remessa entregue
                </CardContent>
              </Card>
            ) : (
              filterShipments(deliveredShipments).map(renderShipmentCard)
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal de Detalhes (modo visualização apenas) */}
      <RemessaVisualizacao
        isOpen={showDetails}
        onClose={() => {
          setShowDetails(false);
          setSelectedShipment(null);
        }}
        remessa={selectedShipment}
      />
    </div>
  );
};

export default CdDashboard;
