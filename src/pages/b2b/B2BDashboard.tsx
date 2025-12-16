import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Plus, Eye, Loader2, ChevronDown, History, MapPin, User, Phone, FileText, Printer, Download, Search
 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import B2BStatusBadge from '@/components/b2b/B2BStatusBadge';
import B2BVolumeStatusHistory from '@/components/b2b/B2BVolumeStatusHistory';
import B2BLabelGenerator from '@/components/b2b/B2BLabelGenerator';
import B2BAllLabelsGenerator from '@/components/b2b/B2BAllLabelsGenerator';

interface B2BClient {
  id: string;
  company_name: string;
  email: string;
  phone: string | null;
  cnpj: string | null;
}

interface B2BVolume {
  id: string;
  eti_code: string;
  volume_number: number;
  weight: number;
  status: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_document: string | null;
  recipient_cep: string;
  recipient_street: string;
  recipient_number: string;
  recipient_complement: string | null;
  recipient_neighborhood: string;
  recipient_city: string;
  recipient_state: string;
  created_at: string;
  b2b_shipment_id: string;
  shipment?: {
    tracking_code: string;
    delivery_date: string;
    pickup_address_id: string | null;
  };
}

interface B2BShipment {
  id: string;
  tracking_code: string;
  status: string;
  created_at: string;
  total_volumes: number;
  delivery_date: string | null;
  total_weight: number;
  pickup_address?: {
    name: string;
    contact_name: string;
    contact_phone: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
  } | null;
}

const B2BDashboard = () => {
  const navigate = useNavigate();
  const [client, setClient] = useState<B2BClient | null>(null);
  const [shipments, setShipments] = useState<B2BShipment[]>([]);
  const [volumes, setVolumes] = useState<B2BVolume[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState<B2BShipment | null>(null);
  const [selectedVolume, setSelectedVolume] = useState<B2BVolume | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showVolumeModal, setShowVolumeModal] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labelVolume, setLabelVolume] = useState<B2BVolume | null>(null);
  const [searchEti, setSearchEti] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'remessas' | 'volumes'>('remessas');

  useEffect(() => {
    loadClientData();
  }, []);

  const loadClientData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/b2b-expresso');
        return;
      }

      // Buscar dados do cliente
      const { data: clientData, error: clientError } = await supabase
        .from('b2b_clients')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (clientError || !clientData) {
        toast.error('Cliente não encontrado');
        await supabase.auth.signOut();
        navigate('/b2b-expresso');
        return;
      }

      setClient(clientData);

      // Buscar remessas com endereço de coleta
      const { data: shipmentsData, error: shipmentsError } = await supabase
        .from('b2b_shipments')
        .select(`
          id, tracking_code, status, created_at, total_volumes, delivery_date, total_weight,
          pickup_address:b2b_pickup_addresses(name, contact_name, contact_phone, street, number, neighborhood, city, state)
        `)
        .eq('b2b_client_id', clientData.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (shipmentsError) throw shipmentsError;
      setShipments(shipmentsData || []);

      // Buscar volumes
      const shipmentIds = (shipmentsData || []).map(s => s.id);
      if (shipmentIds.length > 0) {
        const { data: volumesData, error: volumesError } = await supabase
          .from('b2b_volumes')
          .select('*')
          .in('b2b_shipment_id', shipmentIds)
          .order('volume_number', { ascending: true });

        if (volumesError) throw volumesError;
        setVolumes(volumesData || []);
      }
    } catch (error: any) {
      toast.error('Erro ao carregar dados');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getShipmentVolumes = (shipmentId: string) => {
    return volumes.filter(v => v.b2b_shipment_id === shipmentId);
  };

  const handleShowDetails = (shipment: B2BShipment) => {
    setSelectedShipment(shipment);
    setShowDetailsModal(true);
  };

  const handleShowVolumeDetails = (volume: B2BVolume) => {
    setSelectedVolume(volume);
    setShowVolumeModal(true);
  };

  const handlePrintLabel = (volume: B2BVolume) => {
    setLabelVolume(volume);
    setShowLabelModal(true);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'AGUARDANDO_ACEITE_COLETA': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'COLETA_ACEITA': 'bg-orange-100 text-orange-800 border-orange-300',
      'COLETADO': 'bg-sky-100 text-sky-800 border-sky-300',
      'EM_TRANSITO': 'bg-blue-100 text-blue-800 border-blue-300',
      'EM_TRIAGEM': 'bg-purple-100 text-purple-800 border-purple-300',
      'AGUARDANDO_ACEITE_EXPEDICAO': 'bg-indigo-100 text-indigo-800 border-indigo-300',
      'EXPEDIDO': 'bg-cyan-100 text-cyan-800 border-cyan-300',
      'NO_CD': 'bg-violet-100 text-violet-800 border-violet-300',
      'EM_ROTA': 'bg-blue-100 text-blue-800 border-blue-300',
      'ENTREGUE': 'bg-green-600 text-white border-green-600',
      'CONCLUIDO': 'bg-green-600 text-white border-green-600',
      'DEVOLUCAO': 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'AGUARDANDO_ACEITE_COLETA': 'Aguardando Aceite Coleta',
      'COLETA_ACEITA': 'Coleta Aceita',
      'COLETADO': 'Coletado',
      'EM_TRANSITO': 'Em Trânsito',
      'EM_TRIAGEM': 'Em Triagem',
      'AGUARDANDO_ACEITE_EXPEDICAO': 'Aguardando Aceite Expedição',
      'EXPEDIDO': 'Expedido',
      'NO_CD': 'No CD',
      'EM_ROTA': 'Em Rota',
      'ENTREGUE': 'Concluído',
      'CONCLUIDO': 'Concluído',
      'DEVOLUCAO': 'Devolução',
    };
    return labels[status] || status;
  };

  // Verifica se todos os volumes de uma remessa estão concluídos
  const getShipmentDisplayStatus = (shipment: B2BShipment) => {
    const shipmentVolumes = getShipmentVolumes(shipment.id);
    if (shipmentVolumes.length === 0) return shipment.status;
    
    const allConcluded = shipmentVolumes.every(v => v.status === 'ENTREGUE' || v.status === 'CONCLUIDO');
    return allConcluded ? 'CONCLUIDO' : shipment.status;
  };

  // Filtra as remessas baseado na busca por ETI e status
  const filteredShipments = useMemo(() => {
    return shipments.filter(shipment => {
      const shipmentVolumes = getShipmentVolumes(shipment.id);
      const displayStatus = getShipmentDisplayStatus(shipment);
      
      // Filtro por ETI
      const matchesEti = searchEti === '' || 
        shipmentVolumes.some(v => v.eti_code.toLowerCase().includes(searchEti.toLowerCase())) ||
        shipment.tracking_code.toLowerCase().includes(searchEti.toLowerCase());
      
      // Filtro por status
      const matchesStatus = statusFilter === 'all' || displayStatus === statusFilter;
      
      return matchesEti && matchesStatus;
    });
  }, [shipments, volumes, searchEti, statusFilter]);

  // Filtra volumes individuais
  const filteredVolumes = useMemo(() => {
    return volumes.filter(volume => {
      // Filtro por ETI
      const matchesEti = searchEti === '' || 
        volume.eti_code.toLowerCase().includes(searchEti.toLowerCase());
      
      // Filtro por status
      const matchesStatus = statusFilter === 'all' || volume.status === statusFilter;
      
      return matchesEti && matchesStatus;
    });
  }, [volumes, searchEti, statusFilter]);

  // Busca a remessa de um volume
  const getVolumeShipment = (volume: B2BVolume) => {
    return shipments.find(s => s.id === volume.b2b_shipment_id);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Package className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <CardTitle>Envios Recentes</CardTitle>
              <CardDescription>Suas últimas solicitações de coleta</CardDescription>
            </div>
            <Button onClick={() => navigate('/b2b-expresso/nova-remessa')}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Envio
            </Button>
          </div>
          
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'remessas' | 'volumes')}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Visualizar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="remessas">Remessas</SelectItem>
                <SelectItem value="volumes">Volumes</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={viewMode === 'remessas' ? "Buscar por código B2B..." : "Buscar por ETI..."}
                value={searchEti}
                onChange={(e) => setSearchEti(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="AGUARDANDO_ACEITE_COLETA">Aguardando Aceite Coleta</SelectItem>
                <SelectItem value="COLETA_ACEITA">Coleta Aceita</SelectItem>
                <SelectItem value="COLETADO">Coletado</SelectItem>
                <SelectItem value="EM_TRIAGEM">Em Triagem</SelectItem>
                <SelectItem value="AGUARDANDO_ACEITE_EXPEDICAO">Aguardando Aceite Expedição</SelectItem>
                <SelectItem value="EXPEDIDO">Expedido</SelectItem>
                <SelectItem value="EM_ROTA">Em Rota</SelectItem>
                <SelectItem value="ENTREGUE">Entregue</SelectItem>
                <SelectItem value="DEVOLUCAO">Devolução</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {shipments.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">Nenhum envio cadastrado ainda</p>
              <Button onClick={() => navigate('/b2b-expresso/nova-remessa')}>
                <Plus className="mr-2 h-4 w-4" />
                Solicitar Primeira Coleta
              </Button>
            </div>
          ) : viewMode === 'remessas' ? (
            // Visualização por Remessas
            filteredShipments.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">Nenhuma remessa encontrada com os filtros aplicados</p>
                <Button variant="outline" onClick={() => { setSearchEti(''); setStatusFilter('all'); }}>
                  Limpar Filtros
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredShipments.map((shipment) => {
                  const shipmentVolumes = getShipmentVolumes(shipment.id);
                  return (
                    <div
                      key={shipment.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-mono text-sm font-semibold">{shipment.tracking_code}</p>
                          <Badge variant="outline" className="text-xs">
                            {shipment.total_volumes} volume(s)
                          </Badge>
                        </div>
                        <Badge variant="outline" className={`text-xs ${getStatusColor(getShipmentDisplayStatus(shipment))}`}>
                          {getStatusLabel(getShipmentDisplayStatus(shipment))}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-foreground font-medium">
                        {shipment.delivery_date 
                          ? `Previsão de Entrega: ${format(new Date(shipment.delivery_date + 'T12:00:00'), 'dd/MM/yyyy')}`
                          : 'Data de entrega não definida'}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                          ⚠️ Atenção: Por favor cole as etiquetas no produto
                        </p>
                        <B2BAllLabelsGenerator
                          volumes={shipmentVolumes}
                          shipment={{
                            id: shipment.id,
                            tracking_code: shipment.tracking_code,
                            delivery_date: shipment.delivery_date,
                            pickup_address: shipment.pickup_address
                          }}
                          companyName={client?.company_name}
                          companyDocument={client?.cnpj}
                          companyPhone={client?.phone}
                          buttonVariant="outline"
                          buttonSize="sm"
                          buttonClassName="h-7 text-xs"
                        />
                      </div>

                      {/* Volumes list */}
                      <Collapsible className="mt-3">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-full justify-between p-2 h-8 text-xs">
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              Ver {shipmentVolumes.length} Volume(s)
                            </span>
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2 border-t mt-2 space-y-2">
                          {shipmentVolumes.map((volume) => (
                            <div key={volume.id} className="p-3 bg-muted/50 rounded text-xs space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-mono font-semibold text-sm">{volume.eti_code}</span>
                                    <Badge variant="outline" className={`text-[10px] ${getStatusColor(volume.status)}`}>
                                      {getStatusLabel(volume.status)}
                                    </Badge>
                                  </div>
                                  <p className="text-muted-foreground">{volume.recipient_name}</p>
                                  <p className="text-muted-foreground">
                                    {shipment.delivery_date 
                                      ? `Previsão de Entrega: ${format(new Date(shipment.delivery_date + 'T12:00:00'), 'dd/MM/yyyy')}`
                                      : 'Previsão de Entrega não definida'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs flex-1"
                                  onClick={() => handleShowVolumeDetails(volume)}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Ver Detalhes
                                </Button>
                              </div>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                      
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShowDetails(shipment)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            // Visualização por Volumes
            filteredVolumes.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">Nenhum volume encontrado com os filtros aplicados</p>
                <Button variant="outline" onClick={() => { setSearchEti(''); setStatusFilter('all'); }}>
                  Limpar Filtros
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredVolumes.map((volume) => {
                  const volumeShipment = getVolumeShipment(volume);
                  return (
                    <div
                      key={volume.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-semibold">{volume.eti_code}</span>
                          {volumeShipment && (
                            <Badge variant="secondary" className="text-xs font-mono">
                              {volumeShipment.tracking_code}
                            </Badge>
                          )}
                        </div>
                        <Badge variant="outline" className={`text-xs ${getStatusColor(volume.status)}`}>
                          {getStatusLabel(volume.status)}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <p className="font-medium flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {volume.recipient_name}
                        </p>
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {volume.recipient_phone}
                        </p>
                        <p className="text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {volume.recipient_street}, {volume.recipient_number} - {volume.recipient_neighborhood}, {volume.recipient_city}/{volume.recipient_state}
                        </p>
                        {volumeShipment?.delivery_date && (
                          <p className="text-foreground font-medium">
                            Previsão: {format(new Date(volumeShipment.delivery_date + 'T12:00:00'), 'dd/MM/yyyy')}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShowVolumeDetails(volume)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes do Shipment */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>Detalhes do Pedido</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[calc(85vh-100px)] px-6 py-4">
          {selectedShipment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Código de Rastreio</p>
                  <p className="font-mono font-semibold">{selectedShipment.tracking_code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Volumes</p>
                  <p className="font-semibold">{selectedShipment.total_volumes || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Data de Entrega</p>
                  <p className="font-semibold">
                    {selectedShipment.delivery_date 
                      ? format(new Date(selectedShipment.delivery_date + 'T12:00:00'), 'dd/MM/yyyy')
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Peso Total</p>
                  <p className="font-semibold">{selectedShipment.total_weight} kg</p>
                </div>
              </div>

              {selectedShipment.pickup_address && (
                <>
                  <hr className="border-border" />
                  <h4 className="font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Endereço de Coleta
                  </h4>
                  <div className="text-sm bg-muted/50 p-3 rounded">
                    <p className="font-medium">{selectedShipment.pickup_address.name}</p>
                    <p>{selectedShipment.pickup_address.contact_name} - {selectedShipment.pickup_address.contact_phone}</p>
                    <p>{selectedShipment.pickup_address.street}, {selectedShipment.pickup_address.number}</p>
                    <p>{selectedShipment.pickup_address.neighborhood} - {selectedShipment.pickup_address.city}/{selectedShipment.pickup_address.state}</p>
                  </div>
                </>
              )}

              <hr className="border-border" />
              <h4 className="font-semibold">Volumes</h4>
              <div className="space-y-2">
                {getShipmentVolumes(selectedShipment.id).map((volume) => (
                  <div key={volume.id} className="p-3 border rounded text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-medium">{volume.eti_code}</span>
                      <Badge variant="outline" className={getStatusColor(volume.status)}>
                        {getStatusLabel(volume.status)}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">
                      <User className="h-3 w-3 inline mr-1" />
                      {volume.recipient_name}
                    </p>
                    <p className="text-muted-foreground">
                      <MapPin className="h-3 w-3 inline mr-1" />
                      {volume.recipient_city}/{volume.recipient_state}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes do Volume */}
      <Dialog open={showVolumeModal} onOpenChange={setShowVolumeModal}>
        <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>Detalhes do Volume</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[calc(85vh-100px)] px-6 py-4">
          {selectedVolume && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Código ETI</p>
                  <p className="font-mono text-xl font-bold">{selectedVolume.eti_code}</p>
                </div>
                <Badge variant="outline" className={getStatusColor(selectedVolume.status)}>
                  {getStatusLabel(selectedVolume.status)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Número do Volume</p>
                  <p className="font-semibold">{selectedVolume.volume_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Peso</p>
                  <p className="font-semibold">{selectedVolume.weight} kg</p>
                </div>
              </div>

              <hr className="border-border" />
              <h4 className="font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                Destinatário
              </h4>
              <div className="text-sm bg-muted/50 p-3 rounded space-y-1">
                <p className="font-medium">{selectedVolume.recipient_name}</p>
                <p className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {selectedVolume.recipient_phone}
                </p>
                {selectedVolume.recipient_document && (
                  <p className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {selectedVolume.recipient_document}
                  </p>
                )}
              </div>

              <h4 className="font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Endereço de Entrega
              </h4>
              <div className="text-sm bg-muted/50 p-3 rounded">
                <p>{selectedVolume.recipient_street}, {selectedVolume.recipient_number}</p>
                {selectedVolume.recipient_complement && <p>{selectedVolume.recipient_complement}</p>}
                <p>{selectedVolume.recipient_neighborhood}</p>
                <p>{selectedVolume.recipient_city}/{selectedVolume.recipient_state} - CEP: {selectedVolume.recipient_cep}</p>
              </div>

              <hr className="border-border" />
              <h4 className="font-semibold flex items-center gap-2">
                <History className="h-4 w-4" />
                Histórico de Status
              </h4>
              <B2BVolumeStatusHistory volumeId={selectedVolume.id} />

              <Button
                className="w-full"
                onClick={() => handlePrintLabel(selectedVolume)}
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimir Etiqueta
              </Button>
            </div>
          )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal de Etiqueta */}
      <Dialog open={showLabelModal} onOpenChange={setShowLabelModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Etiqueta do Volume</DialogTitle>
          </DialogHeader>
          {labelVolume && client && (
            <B2BLabelGenerator
              volume={labelVolume}
              shipment={shipments.find(s => s.id === labelVolume.b2b_shipment_id)}
              companyName={client.company_name}
              companyDocument={client.cnpj}
              companyPhone={client.phone}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default B2BDashboard;
