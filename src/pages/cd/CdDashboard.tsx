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
  CheckCircle,
  ClipboardCheck,
  Boxes,
  SplitSquareVertical
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { RemessaVisualizacao } from '@/components/motorista/RemessaVisualizacao';
import { EtiValidationModal } from '@/components/cd/EtiValidationModal';
import { DestrincharModal } from '@/components/cd/DestrincharModal';

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
  is_volume?: boolean;
  parent_shipment_id?: string | null;
  volume_eti_code?: string | null;
  volume_number?: number | null;
  volume_weight?: number | null;
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

type TabType = 'remessas' | 'disponiveis' | 'volumes' | 'entregues';

const CdDashboard = () => {
  const navigate = useNavigate();
  const [cdUser, setCdUser] = useState<CdUser | null>(null);
  const [b2b1Shipments, setB2b1Shipments] = useState<B2BShipment[]>([]); // B2B-1: Remessas em coleta ou chegando
  const [cdShipments, setCdShipments] = useState<B2BShipment[]>([]); // Remessas no CD (prontas p/ destrinchar)
  const [volumes, setVolumes] = useState<B2BShipment[]>([]); // B2B-2: Volumes desmembrados
  const [deliveredShipments, setDeliveredShipments] = useState<B2BShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('remessas');
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Modal de conferência de chegada (B2B_COLETA_FINALIZADA → B2B_NO_CD)
  const [etiModalOpen, setEtiModalOpen] = useState(false);
  const [selectedB2B1Shipment, setSelectedB2B1Shipment] = useState<B2BShipment | null>(null);
  
  // Modal de desmembramento (B2B_NO_CD → B2B_VOLUME_DISPONIVEL)
  const [destrincharModalOpen, setDestrincharModalOpen] = useState(false);
  const [selectedCdShipment, setSelectedCdShipment] = useState<B2BShipment | null>(null);

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

      // B2B-0: Remessas em coleta (motorista aceitou, a caminho do CD)
      const { data: b2b0Data, error: b2b0Error } = await supabase
        .from('b2b_shipments')
        .select(`
          id, tracking_code, status, created_at,
          recipient_name, recipient_city, recipient_state,
          volume_count, motorista_id, observations,
          is_volume, parent_shipment_id, volume_eti_code, volume_number, volume_weight,
          b2b_clients(company_name)
        `)
        .in('status', ['B2B_COLETA_PENDENTE', 'B2B_COLETA_ACEITA'])
        .eq('is_volume', false)
        .order('created_at', { ascending: false });

      if (b2b0Error) throw b2b0Error;

      // B2B-1: Remessas no CD (prontas para desmembrar)
      const { data: b2b1Data, error: b2b1Error } = await supabase
        .from('b2b_shipments')
        .select(`
          id, tracking_code, status, created_at,
          recipient_name, recipient_city, recipient_state,
          volume_count, motorista_id, observations,
          is_volume, parent_shipment_id, volume_eti_code, volume_number, volume_weight,
          b2b_clients(company_name)
        `)
        .eq('status', 'B2B_NO_CD')
        .eq('is_volume', false)
        .order('created_at', { ascending: false });

      if (b2b1Error) throw b2b1Error;

      // B2B-2: Volumes desmembrados (prontos para entrega)
      const { data: volumesData, error: volumesError } = await supabase
        .from('b2b_shipments')
        .select(`
          id, tracking_code, status, created_at,
          recipient_name, recipient_city, recipient_state,
          volume_count, motorista_id, observations,
          is_volume, parent_shipment_id, volume_eti_code, volume_number, volume_weight,
          b2b_clients(company_name)
        `)
        .eq('is_volume', true)
        .in('status', ['B2B_VOLUME_DISPONIVEL', 'B2B_VOLUME_ACEITO'])
        .order('created_at', { ascending: false });

      if (volumesError) throw volumesError;

      // Entregues
      const { data: deliveredData, error: deliveredError } = await supabase
        .from('b2b_shipments')
        .select(`
          id, tracking_code, status, created_at,
          recipient_name, recipient_city, recipient_state,
          volume_count, motorista_id, observations,
          is_volume, parent_shipment_id, volume_eti_code, volume_number, volume_weight,
          b2b_clients(company_name)
        `)
        .eq('status', 'ENTREGUE')
        .order('created_at', { ascending: false })
        .limit(50);

      if (deliveredError) throw deliveredError;

      // Buscar nomes dos motoristas
      const allShipments = [...(b2b0Data || []), ...(b2b1Data || []), ...(volumesData || []), ...(deliveredData || [])];
      const motoristaIds = [...new Set(allShipments.filter(s => s.motorista_id).map(s => s.motorista_id))];
      
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

      const mapShipment = (s: any) => ({
        ...s,
        motorista_nome: s.motorista_id ? motoristasMap[s.motorista_id] : undefined,
        b2b_client: s.b2b_clients as any
      });

      setB2b1Shipments((b2b0Data || []).map(mapShipment));
      setCdShipments((b2b1Data || []).map(mapShipment));
      setVolumes((volumesData || []).map(mapShipment));
      setDeliveredShipments((deliveredData || []).map(mapShipment));
    } catch (error) {
      console.error('Erro ao carregar remessas:', error);
      toast.error('Erro ao carregar remessas');
    } finally {
      setLoading(false);
    }
  };

  // Conferir chegada no CD (B2B_COLETA_FINALIZADA → B2B_NO_CD)
  const handleOpenConferirChegada = (shipment: B2BShipment) => {
    setSelectedB2B1Shipment(shipment);
    setEtiModalOpen(true);
  };

  const handleConfirmarChegada = async () => {
    if (!selectedB2B1Shipment) return;
    
    try {
      // Atualizar status para B2B_NO_CD (interno)
      const { error } = await supabase
        .from('b2b_shipments')
        .update({ 
          status: 'B2B_NO_CD',
          motorista_id: null // Libera o motorista B2B-1
        })
        .eq('id', selectedB2B1Shipment.id);

      if (error) throw error;

      // Registrar no histórico
      await supabase.from('shipment_status_history').insert({
        b2b_shipment_id: selectedB2B1Shipment.id,
        status: 'B2B_NO_CD',
        observacoes: `Conferência de chegada realizada pelo CD - ${cdUser?.nome}`
      });

      toast.success('Chegada confirmada! Remessa movida para Disponíveis.');
      setEtiModalOpen(false);
      setSelectedB2B1Shipment(null);
      loadShipments();
    } catch (error) {
      console.error('Erro ao confirmar chegada:', error);
      toast.error('Erro ao confirmar chegada');
    }
  };

  // Desmembrar remessa (B2B_NO_CD → B2B_VOLUME_DISPONIVEL)
  const handleOpenDestrinchar = (shipment: B2BShipment) => {
    setSelectedCdShipment(shipment);
    setDestrincharModalOpen(true);
  };

  const handleDestrincharComplete = () => {
    setDestrincharModalOpen(false);
    setSelectedCdShipment(null);
    loadShipments();
  };

  const getStatusBadge = (status: string, isVolume?: boolean) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      'B2B_COLETA_PENDENTE': { label: 'Aguardando Coleta', className: 'bg-amber-500 text-white hover:bg-amber-600' },
      'B2B_COLETA_ACEITA': { label: 'Em Trânsito', className: 'bg-blue-500 text-white hover:bg-blue-600' },
      'B2B_NO_CD': { label: 'No CD', className: 'bg-orange-500 text-white hover:bg-orange-600' },
      'B2B_VOLUME_DISPONIVEL': { label: 'Disponível', className: 'bg-purple-500 text-white hover:bg-purple-600' },
      'B2B_VOLUME_ACEITO': { label: 'Em Rota', className: 'bg-indigo-500 text-white hover:bg-indigo-600' },
      'ENTREGUE': { label: 'Entregue', className: 'bg-green-500 text-white hover:bg-green-600' }
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-500 text-white' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const filterShipments = (list: B2BShipment[]) => {
    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(s => 
      s.tracking_code?.toLowerCase().includes(term) ||
      s.recipient_name?.toLowerCase().includes(term) ||
      s.recipient_city?.toLowerCase().includes(term) ||
      s.b2b_client?.company_name?.toLowerCase().includes(term) ||
      s.motorista_nome?.toLowerCase().includes(term) ||
      s.volume_eti_code?.toLowerCase().includes(term)
    );
  };

  const handleViewDetails = (shipment: B2BShipment) => {
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

    const volumeWeights = parsedObservations?.volume_weights || [];
    const totalWeight = shipment.is_volume 
      ? (shipment.volume_weight || 0)
      : volumeWeights.reduce((acc: number, w: number) => acc + (w || 0), 0);

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
      is_volume: shipment.is_volume,
      volume_eti_code: shipment.volume_eti_code,
      volume_number: shipment.volume_number,
      quote_data: {
        merchandiseDetails: { volumes }
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

  const getCardColor = (status: string) => {
    const colors: Record<string, string> = {
      'B2B_COLETA_PENDENTE': 'border-amber-500/50 bg-amber-50/30',
      'B2B_COLETA_ACEITA': 'border-blue-500/50 bg-blue-50/30',
      'B2B_NO_CD': 'border-orange-500/50 bg-orange-50/30',
      'B2B_VOLUME_DISPONIVEL': 'border-purple-500/50 bg-purple-50/30',
      'B2B_VOLUME_ACEITO': 'border-indigo-500/50 bg-indigo-50/30',
      'ENTREGUE': 'border-green-500/50 bg-green-50/30'
    };
    return colors[status] || 'border-border/50';
  };

  const getVehicleType = (shipment: B2BShipment) => {
    try {
      if (shipment.observations) {
        const parsed = typeof shipment.observations === 'string' 
          ? JSON.parse(shipment.observations) 
          : shipment.observations;
        return parsed?.vehicle_type || null;
      }
    } catch (e) {}
    return null;
  };

  const renderShipmentCard = (shipment: B2BShipment, actions?: React.ReactNode) => {
    const vehicleType = getVehicleType(shipment);
    
    return (
      <Card key={shipment.id} className={getCardColor(shipment.status)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-medium text-foreground">
                  {shipment.is_volume ? shipment.volume_eti_code : shipment.tracking_code || 'Sem código'}
                </span>
                {getStatusBadge(shipment.status, shipment.is_volume)}
                {shipment.is_volume && (
                  <Badge variant="outline" className="text-xs">
                    Volume {shipment.volume_number}
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-1 text-foreground font-medium">
                  <User className="h-3 w-3" />
                  <span>{shipment.b2b_client?.company_name || 'Cliente não identificado'}</span>
                </div>
                
                {shipment.recipient_city && shipment.recipient_state && (
                  <div className="flex items-center gap-1 text-foreground font-medium">
                    <MapPin className="h-3 w-3" />
                    <span>{shipment.recipient_city}/{shipment.recipient_state}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-1 text-foreground font-medium">
                  <Package className="h-3 w-3" />
                  <span>
                    {shipment.is_volume 
                      ? `${shipment.volume_weight?.toFixed(1) || 0}kg`
                      : `${shipment.volume_count || 1} volume(s)`
                    }
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-foreground font-medium whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(shipment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                  </div>
                  {vehicleType && (
                    <span className="text-muted-foreground whitespace-nowrap">| {vehicleType}</span>
                  )}
                </div>
              </div>

              {shipment.motorista_nome && (
                <div className="flex items-center gap-1 text-sm text-primary">
                  <Truck className="h-3 w-3" />
                  <span className="font-medium">Motorista: {shipment.motorista_nome}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 ml-2">
              <Button variant="outline" size="sm" onClick={() => handleViewDetails(shipment)}>
                <Eye className="h-4 w-4 mr-1" />
                Detalhes
              </Button>
              {actions}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

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
                placeholder="Buscar por código, cliente, destino, ETI ou motorista..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
          <TabsList className="grid w-full grid-cols-4 max-w-3xl">
            <TabsTrigger 
              value="remessas" 
              className="flex items-center gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-white"
            >
              <ClipboardCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Remessas</span>
              <Badge variant="secondary" className="bg-amber-100 text-amber-700">{filterShipments(b2b1Shipments).length}</Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="disponiveis" 
              className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white"
            >
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Disponíveis</span>
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">{filterShipments(cdShipments).length}</Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="volumes" 
              className="flex items-center gap-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white"
            >
              <Boxes className="h-4 w-4" />
              <span className="hidden sm:inline">Volumes</span>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">{filterShipments(volumes).length}</Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="entregues" 
              className="flex items-center gap-2 data-[state=active]:bg-green-500 data-[state=active]:text-white"
            >
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Entregues</span>
              <Badge variant="secondary" className="bg-green-100 text-green-700">{filterShipments(deliveredShipments).length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* B2B-1: Remessas (em coleta, a caminho do CD) */}
          <TabsContent value="remessas" className="mt-6 space-y-4">
            {filterShipments(b2b1Shipments).length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Nenhuma remessa em trânsito para o CD</p>
                </CardContent>
              </Card>
            ) : (
              filterShipments(b2b1Shipments).map((shipment) =>
                renderShipmentCard(shipment, 
                  shipment.status === 'B2B_COLETA_ACEITA' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleOpenConferirChegada(shipment)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Conferir Chegada
                    </Button>
                  )
                )
              )
            )}
          </TabsContent>

          {/* Disponíveis (no CD, prontas para desmembrar) */}
          <TabsContent value="disponiveis" className="mt-6 space-y-4">
            {filterShipments(cdShipments).length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Nenhuma remessa disponível para desmembramento</p>
                </CardContent>
              </Card>
            ) : (
              filterShipments(cdShipments).map((shipment) =>
                renderShipmentCard(shipment,
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleOpenDestrinchar(shipment)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <SplitSquareVertical className="h-4 w-4 mr-1" />
                    Destrinchar
                  </Button>
                )
              )
            )}
          </TabsContent>

          {/* B2B-2: Volumes desmembrados */}
          <TabsContent value="volumes" className="mt-6 space-y-4">
            {filterShipments(volumes).length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Boxes className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Nenhum volume desmembrado aguardando entrega</p>
                </CardContent>
              </Card>
            ) : (
              filterShipments(volumes).map((volume) => renderShipmentCard(volume))
            )}
          </TabsContent>

          {/* Entregues */}
          <TabsContent value="entregues" className="mt-6 space-y-4">
            {filterShipments(deliveredShipments).length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Nenhuma entrega finalizada</p>
                </CardContent>
              </Card>
            ) : (
              filterShipments(deliveredShipments).map((shipment) => renderShipmentCard(shipment))
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal de visualização de detalhes */}
      {selectedShipment && (
        <RemessaVisualizacao
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          remessa={selectedShipment}
        />
      )}

      {/* Modal de conferência de chegada (ETI validation) */}
      {selectedB2B1Shipment && (
        <EtiValidationModal
          open={etiModalOpen}
          onClose={() => {
            setEtiModalOpen(false);
            setSelectedB2B1Shipment(null);
          }}
          shipmentId={selectedB2B1Shipment.id}
          volumeCount={selectedB2B1Shipment.volume_count || 1}
          onFinalize={handleConfirmarChegada}
        />
      )}

      {/* Modal de desmembramento */}
      {selectedCdShipment && (
        <DestrincharModal
          open={destrincharModalOpen}
          onClose={() => {
            setDestrincharModalOpen(false);
            setSelectedCdShipment(null);
          }}
          shipment={selectedCdShipment}
          onComplete={handleDestrincharComplete}
        />
      )}
    </div>
  );
};

export default CdDashboard;
