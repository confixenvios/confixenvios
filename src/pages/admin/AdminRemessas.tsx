import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Search, Package, Eye, Download, Filter, UserPlus, Truck, Calendar, MapPin, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ShipmentDetailsModal } from '@/components/admin/ShipmentDetailsModal';

interface Shipment {
  id: string;
  tracking_code: string | null;
  client_name: string;
  user_id?: string;
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
  } | null;
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
  } | null;
  weight: number;
  length: number;
  width: number;
  height: number;
  format: string;
  selected_option: string;
  pickup_option: string;
  quote_data: any;
  payment_data: any;
  status: string;
  created_at: string;
  label_pdf_url: string | null;
  cte_key: string | null;
  motoristas?: {
    nome: string;
    telefone: string;
    email: string;
  };
}

interface Motorista {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  status: string;
}

const AdminRemessas = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<string | null>(null);
  const [selectedShipmentDetails, setSelectedShipmentDetails] = useState<Shipment | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  useEffect(() => {
    loadShipments();
    loadMotoristas();
  }, []);

  const loadShipments = async () => {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          id,
          tracking_code,
          weight,
          length,
          width,
          height,
          format,
          selected_option,
          pickup_option,
          quote_data,
          payment_data,
          status,
          created_at,
          label_pdf_url,
          cte_key,
          user_id,
          motorista_id,
          sender_address:addresses!shipments_sender_address_id_fkey(
            name,
            street,
            number,
            neighborhood,
            city,
            state,
            cep,
            complement,
            reference
          ),
          recipient_address:addresses!shipments_recipient_address_id_fkey(
            name,
            street,
            number,
            neighborhood,
            city,
            state,
            cep,
            complement,
            reference
          ),
          motoristas(nome, telefone, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match expected format
      const shipmentsWithDetails = await Promise.all(
        (data || []).map(async (shipment) => {
          // Get client profile if user_id exists
          let clientProfile = null;
          if (shipment.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name, last_name, email')
              .eq('id', shipment.user_id)
              .maybeSingle();
            clientProfile = profile;
          }

          return {
            id: shipment.id,
            tracking_code: shipment.tracking_code,
            user_id: shipment.user_id,
            client_name: clientProfile 
              ? `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim() || clientProfile.email || 'Cliente Anônimo'
              : 'Cliente Anônimo',
            sender_address: shipment.sender_address,
            recipient_address: shipment.recipient_address,
            weight: shipment.weight,
            length: shipment.length,
            width: shipment.width,
            height: shipment.height,
            format: shipment.format,
            selected_option: shipment.selected_option,
            pickup_option: shipment.pickup_option,
            quote_data: shipment.quote_data,
            payment_data: shipment.payment_data,
            status: shipment.status,
            created_at: shipment.created_at,
            label_pdf_url: shipment.label_pdf_url,
            cte_key: shipment.cte_key,
            motoristas: shipment.motoristas
          };
        })
      );

      setShipments(shipmentsWithDetails);
    } catch (error) {
      console.error('Error loading shipments:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar remessas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMotoristas = async () => {
    try {
      const { data, error } = await supabase
        .from('motoristas')
        .select('*')
        .eq('status', 'ativo')
        .order('nome');

      if (error) throw error;
      setMotoristas(data || []);
    } catch (error) {
      console.error('Erro ao carregar motoristas:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'PENDING_LABEL': { label: 'Pendente', variant: 'secondary' as const },
      'PENDING_DOCUMENT': { label: 'Aguardando Documento', variant: 'destructive' as const },
      'PENDING_PAYMENT': { label: 'Aguardando Pagamento', variant: 'destructive' as const },
      'PAYMENT_CONFIRMED': { label: 'Pagamento Confirmado', variant: 'success' as const },
      'PAID': { label: 'Pago', variant: 'success' as const },
      'PAGO_AGUARDANDO_ETIQUETA': { label: 'Aguardando Etiqueta', variant: 'secondary' as const },
      'COLETA_ACEITA': { label: 'Coleta Aceita', variant: 'default' as const },
      'COLETA_FINALIZADA': { label: 'Coleta Finalizada', variant: 'default' as const },
      'LABEL_AVAILABLE': { label: 'Etiqueta Disponível', variant: 'success' as const },
      'IN_TRANSIT': { label: 'Em Trânsito', variant: 'default' as const },
      'ENTREGA_FINALIZADA': { label: 'Entrega Finalizada', variant: 'success' as const },
      'DELIVERED': { label: 'Entregue', variant: 'success' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'outline' as const };
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const handleViewShipment = (shipment: Shipment) => {
    setSelectedShipmentDetails(shipment);
    setDetailsModalOpen(true);
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
      'PAGO_AGUARDANDO_ETIQUETA': { variant: 'default', label: 'Aguardando Etiqueta' },
      'LABEL_AVAILABLE': { variant: 'default', label: 'Etiqueta Disponível' },
      'IN_TRANSIT': { variant: 'default', label: 'Em Trânsito' },
      'DELIVERED': { variant: 'secondary', label: 'Entregue' },
      'PAID': { variant: 'default', label: 'Pago' },
      'COLETA_ACEITA': { variant: 'default', label: 'Coleta Aceita' },
      'COLETA_FINALIZADA': { variant: 'default', label: 'Coleta Finalizada' },
      'ENTREGA_FINALIZADA': { variant: 'secondary', label: 'Entrega Finalizada' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const handleDownloadLabel = (shipment: Shipment) => {
    toast({
      title: "Download iniciado",
      description: `Baixando etiqueta para ${shipment.tracking_code || `ID${shipment.id.slice(0, 8).toUpperCase()}`}`,
    });
  };

  const handleAssignMotorista = async (motoristaId: string) => {
    if (!selectedShipment) return;

    try {
      const { error } = await supabase
        .from('shipments')
        .update({ motorista_id: motoristaId })
        .eq('id', selectedShipment);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Motorista designado com sucesso!",
      });
      setShowAssignDialog(false);
      setSelectedShipment(null);
      loadShipments();
    } catch (error) {
      console.error('Erro ao designar motorista:', error);
      toast({
        title: "Erro",
        description: "Erro ao designar motorista",
        variant: "destructive"
      });
    }
  };

  const getQuoteValue = (quoteData: any) => {
    if (quoteData?.selectedQuote?.price) {
      return parseFloat(quoteData.selectedQuote.price);
    }
    return 0;
  };

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = (shipment.tracking_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          shipment.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ?? false;
    const matchesStatus = statusFilter === "all" || shipment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Remessas</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie todas as remessas do sistema
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-primary">
            {filteredShipments.length} remessas
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Código ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="PENDING_LABEL">Aguardando Etiqueta</SelectItem>
                  <SelectItem value="PENDING_DOCUMENT">Aguardando Documento</SelectItem>
                  <SelectItem value="PAID">Pago</SelectItem>
                  <SelectItem value="COLETA_ACEITA">Coleta Aceita</SelectItem>
                  <SelectItem value="COLETA_FINALIZADA">Coleta Finalizada</SelectItem>
                  <SelectItem value="IN_TRANSIT">Em Trânsito</SelectItem>
                  <SelectItem value="ENTREGA_FINALIZADA">Entrega Finalizada</SelectItem>
                  <SelectItem value="DELIVERED">Entregue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Lista de Remessas</span>
          </CardTitle>
          <CardDescription>
            Todas as remessas registradas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Carregando remessas...</p>
            </div>
          ) : filteredShipments.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma remessa encontrada</p>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredShipments.map((shipment) => (
                <Card key={shipment.id} className="border-border/50 hover:shadow-lg hover:border-primary/20 transition-all duration-300">
                  <CardContent className="p-0">
                    {/* Header com código e ações */}
                    <div className="flex items-center justify-between p-4 pb-2 border-b border-border/30">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base">
                            {shipment.tracking_code || `ID${shipment.id.slice(0, 8).toUpperCase()}`}
                          </h3>
                          <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <Calendar className="w-3 h-3 mr-1" />
                            {format(new Date(shipment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(shipment.status)}
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewShipment(shipment)}
                            className="h-8 w-8 p-0 hover:bg-primary/10"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDownloadLabel(shipment as any)}
                            disabled={!shipment.label_pdf_url}
                            className="h-8 w-8 p-0 hover:bg-primary/10"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedShipment(shipment.id);
                              setShowAssignDialog(true);
                            }}
                            className="h-8 w-8 p-0 hover:bg-primary/10"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Conteúdo principal em grid */}
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Cliente */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cliente</span>
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{shipment.client_name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {shipment.user_id ? 'Cadastrado' : 'Anônimo'}
                            </p>
                          </div>
                        </div>

                        {/* Origem → Destino */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rota</span>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2 text-xs">
                              <span className="font-medium">
                                {shipment.sender_address?.city || 'Goiânia'} - {shipment.sender_address?.state || 'GO'}
                              </span>
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              <span className="font-medium">
                                {shipment.recipient_address?.city || 'N/A'} - {shipment.recipient_address?.state || 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                              <span>{shipment.sender_address?.cep || 'N/A'} → {shipment.recipient_address?.cep || 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Motorista */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Motorista</span>
                          </div>
                          <div>
                            {shipment.motoristas ? (
                              <div>
                                <p className="font-semibold text-sm">{shipment.motoristas.nome}</p>
                                <p className="text-xs text-muted-foreground">{shipment.motoristas.telefone}</p>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-xs">Não designado</Badge>
                            )}
                          </div>
                        </div>

                        {/* Valor e Informações */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor</span>
                          </div>
                          <div>
                            <p className="font-bold text-lg text-primary">
                              R$ {getQuoteValue(shipment.quote_data).toFixed(2).replace('.', ',')}
                            </p>
                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                              <Package className="w-3 h-3 mr-1" />
                              {shipment.weight}kg • {shipment.format}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Motorista Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Designar Motorista</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione um motorista para esta remessa:
            </p>
            <div className="space-y-2">
              {motoristas.map((motorista) => (
                <Button
                  key={motorista.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleAssignMotorista(motorista.id)}
                >
                  <Truck className="h-4 w-4 mr-2" />
                  <div className="text-left">
                    <p className="font-medium">{motorista.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {motorista.telefone} • {motorista.email}
                    </p>
                  </div>
                </Button>
              ))}
              {motoristas.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum motorista ativo disponível
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes da Remessa */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Detalhes da Remessa - {selectedShipmentDetails?.tracking_code || `ID${selectedShipmentDetails?.id.slice(0, 8).toUpperCase()}`}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            {selectedShipmentDetails && (
              <div className="space-y-6">
                {/* Informações Gerais */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Informações Gerais</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Código de Rastreamento</p>
                      <p className="font-medium">{selectedShipmentDetails.tracking_code || `ID${selectedShipmentDetails.id.slice(0, 8).toUpperCase()}`}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <div className="mt-1">{getStatusBadgeForDetails(selectedShipmentDetails.status)}</div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Data de Criação</p>
                      <p className="font-medium">{formatDate(selectedShipmentDetails.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tipo de Serviço</p>
                      <p className="font-medium">{selectedShipmentDetails.selected_option === 'standard' ? 'Econômico' : 'Expresso'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Opção de Coleta</p>
                      <p className="font-medium">{selectedShipmentDetails.pickup_option === 'dropoff' ? 'Entrega no Hub' : 'Coleta no Local'}</p>
                    </div>
                    {selectedShipmentDetails.cte_key && (
                      <div>
                        <p className="text-muted-foreground">Chave CTE</p>
                        <p className="font-medium font-mono text-xs">{selectedShipmentDetails.cte_key}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground">Cliente</p>
                      <p className="font-medium">{selectedShipmentDetails.client_name}</p>
                    </div>
                    {selectedShipmentDetails.motoristas && (
                      <div>
                        <p className="text-muted-foreground">Motorista</p>
                        <p className="font-medium">{selectedShipmentDetails.motoristas.nome}</p>
                        <p className="text-xs text-muted-foreground">{selectedShipmentDetails.motoristas.telefone}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Dados do Remetente */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Dados do Remetente</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Nome</p>
                      <p className="font-medium">{selectedShipmentDetails.sender_address?.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">CEP</p>
                      <p className="font-medium">{selectedShipmentDetails.sender_address?.cep}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Endereço</p>
                      <p className="font-medium">
                        {selectedShipmentDetails.sender_address?.street}, {selectedShipmentDetails.sender_address?.number}
                        {selectedShipmentDetails.sender_address?.complement && `, ${selectedShipmentDetails.sender_address.complement}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Bairro</p>
                      <p className="font-medium">{selectedShipmentDetails.sender_address?.neighborhood}</p>
                    </div>
                     <div>
                       <p className="text-muted-foreground">Cidade/Estado</p>
                       <p className="font-medium">
                         {selectedShipmentDetails.sender_address?.city && selectedShipmentDetails.sender_address?.city !== 'A definir' ? 
                           `${selectedShipmentDetails.sender_address.city} - ${selectedShipmentDetails.sender_address.state}` : 
                           selectedShipmentDetails.quote_data?.senderData?.city ? 
                             `${selectedShipmentDetails.quote_data.senderData.city} - ${selectedShipmentDetails.quote_data.senderData.state}` :
                             'Goiânia - GO'
                         }
                       </p>
                     </div>
                    {selectedShipmentDetails.sender_address?.reference && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Referência</p>
                        <p className="font-medium">{selectedShipmentDetails.sender_address.reference}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Dados do Destinatário */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Dados do Destinatário</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Nome</p>
                      <p className="font-medium">{selectedShipmentDetails.recipient_address?.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">CEP</p>
                      <p className="font-medium">{selectedShipmentDetails.recipient_address?.cep}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Endereço</p>
                      <p className="font-medium">
                        {selectedShipmentDetails.recipient_address?.street}, {selectedShipmentDetails.recipient_address?.number}
                        {selectedShipmentDetails.recipient_address?.complement && `, ${selectedShipmentDetails.recipient_address.complement}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Bairro</p>
                      <p className="font-medium">{selectedShipmentDetails.recipient_address?.neighborhood}</p>
                    </div>
                     <div>
                       <p className="text-muted-foreground">Cidade/Estado</p>
                       <p className="font-medium">
                         {selectedShipmentDetails.recipient_address?.city && selectedShipmentDetails.recipient_address?.city !== 'A definir' ? 
                           `${selectedShipmentDetails.recipient_address.city} - ${selectedShipmentDetails.recipient_address.state}` : 
                           selectedShipmentDetails.quote_data?.recipientData?.city ? 
                             `${selectedShipmentDetails.quote_data.recipientData.city} - ${selectedShipmentDetails.quote_data.recipientData.state}` :
                             selectedShipmentDetails.quote_data?.shippingQuote?.zoneName || 'N/A'
                         }
                       </p>
                     </div>
                    {selectedShipmentDetails.recipient_address?.reference && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Referência</p>
                        <p className="font-medium">{selectedShipmentDetails.recipient_address.reference}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Dados do Pacote */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Dados do Pacote</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Peso</p>
                      <p className="font-medium">{selectedShipmentDetails.weight}kg</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Comprimento</p>
                      <p className="font-medium">{selectedShipmentDetails.length}cm</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Largura</p>
                      <p className="font-medium">{selectedShipmentDetails.width}cm</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Altura</p>
                      <p className="font-medium">{selectedShipmentDetails.height}cm</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Formato</p>
                      <p className="font-medium capitalize">{selectedShipmentDetails.format}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Dados de Pagamento */}
                {selectedShipmentDetails.payment_data && (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Dados de Pagamento</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Método de Pagamento</p>
                          <p className="font-medium">{selectedShipmentDetails.payment_data.method?.toUpperCase()}</p>
                        </div>
                        {selectedShipmentDetails.payment_data.amount && (
                          <div>
                            <p className="text-muted-foreground">Valor Pago</p>
                            <p className="font-medium">{formatCurrency(selectedShipmentDetails.payment_data.amount)}</p>
                          </div>
                        )}
                        {selectedShipmentDetails.payment_data.paidAt && (
                          <div>
                            <p className="text-muted-foreground">Data do Pagamento</p>
                            <p className="font-medium">{formatDate(selectedShipmentDetails.payment_data.paidAt)}</p>
                          </div>
                        )}
                        {selectedShipmentDetails.payment_data.status && (
                          <div>
                            <p className="text-muted-foreground">Status do Pagamento</p>
                            <p className="font-medium">{selectedShipmentDetails.payment_data.status === 'paid' ? 'PAGO' : selectedShipmentDetails.payment_data.status}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Dados da Cotação */}
                {selectedShipmentDetails.quote_data && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Dados da Cotação</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedShipmentDetails.quote_data.shippingQuote && (
                        <>
                          <div>
                            <p className="text-muted-foreground">Zona de Entrega</p>
                            <p className="font-medium">{selectedShipmentDetails.quote_data.shippingQuote.zoneName} ({selectedShipmentDetails.quote_data.shippingQuote.zone})</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Prazo Econômico</p>
                            <p className="font-medium">{selectedShipmentDetails.quote_data.shippingQuote.economicDays} dias</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Prazo Expresso</p>
                            <p className="font-medium">{selectedShipmentDetails.quote_data.shippingQuote.expressDays} dias</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Preço Original</p>
                            <p className="font-medium">R$ {selectedShipmentDetails.quote_data.shippingQuote.economicPrice.toFixed(2).replace('.', ',')}</p>
                          </div>
                        </>
                      )}
                      {selectedShipmentDetails.quote_data.totalMerchandiseValue && (
                        <div>
                          <p className="text-muted-foreground">Valor da Mercadoria</p>
                          <p className="font-medium">R$ {selectedShipmentDetails.quote_data.totalMerchandiseValue.toFixed(2).replace('.', ',')}</p>
                         </div>
                       )}
                     </div>
                   </div>
                 )}
               </div>
             )}
           </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes da Remessa - Novo Componente */}
      <ShipmentDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        shipment={selectedShipmentDetails}
      />
    </div>
  );
};

export default AdminRemessas;