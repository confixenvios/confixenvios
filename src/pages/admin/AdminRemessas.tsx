import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Package, Eye, Download, Filter, UserPlus, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Shipment {
  id: string;
  tracking_code: string | null;
  client_name: string;
  sender_address: {
    cep: string;
    city: string;
    state: string;
  } | null;
  recipient_address: {
    cep: string;
    city: string;
    state: string;
  } | null;
  weight: number;
  quote_data: any;
  payment_data: any;
  status: string;
  created_at: string;
  label_pdf_url: string | null;
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
          quote_data,
          payment_data,
          status,
          created_at,
          label_pdf_url,
          user_id,
          motorista_id,
          sender_address:addresses!shipments_sender_address_id_fkey(cep, city, state),
          recipient_address:addresses!shipments_recipient_address_id_fkey(cep, city, state),
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
            client_name: clientProfile 
              ? `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim() || clientProfile.email || 'Cliente Anônimo'
              : 'Cliente Anônimo',
            sender_address: shipment.sender_address,
            recipient_address: shipment.recipient_address,
            weight: shipment.weight,
            quote_data: shipment.quote_data,
            payment_data: shipment.payment_data,
            status: shipment.status,
            created_at: shipment.created_at,
            label_pdf_url: shipment.label_pdf_url,
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
      'PENDING_LABEL': { label: 'Aguardando Etiqueta', variant: 'destructive' as const },
      'PENDING_DOCUMENT': { label: 'Aguardando Documento', variant: 'destructive' as const },
      'PAID': { label: 'Pago', variant: 'default' as const },
      'COLETA_ACEITA': { label: 'Coleta Aceita', variant: 'default' as const },
      'COLETA_FINALIZADA': { label: 'Coleta Finalizada', variant: 'default' as const },
      'IN_TRANSIT': { label: 'Em Trânsito', variant: 'default' as const },
      'ENTREGA_FINALIZADA': { label: 'Entrega Finalizada', variant: 'secondary' as const },
      'DELIVERED': { label: 'Entregue', variant: 'secondary' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'outline' as const };
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const handleViewShipment = (shipment: Shipment) => {
    toast({
      title: "Detalhes da Remessa",
      description: `Visualizando remessa ${shipment.tracking_code || 'N/A'}`,
    });
  };

  const handleDownloadLabel = (shipment: Shipment) => {
    toast({
      title: "Download iniciado",
      description: `Baixando etiqueta para ${shipment.tracking_code || 'N/A'}`,
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
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Origem → Destino</TableHead>
                    <TableHead>Peso</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShipments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="text-muted-foreground">
                          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Nenhuma remessa encontrada</p>
                          <p className="text-sm">Tente ajustar os filtros</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredShipments.map((shipment) => (
                      <TableRow key={shipment.id}>
                        <TableCell className="font-medium font-mono">
                          {shipment.tracking_code || 'N/A'}
                        </TableCell>
                        <TableCell>{shipment.client_name}</TableCell>
                        <TableCell className="text-sm">
                          <div className="space-y-1">
                            <div>{shipment.sender_address?.cep || 'N/A'}</div>
                            <div className="text-muted-foreground">↓</div>
                            <div>{shipment.recipient_address?.cep || 'N/A'}</div>
                          </div>
                        </TableCell>
                        <TableCell>{shipment.weight}kg</TableCell>
                        <TableCell className="font-medium">
                          R$ {getQuoteValue(shipment.quote_data).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(shipment.status)}
                        </TableCell>
                        <TableCell>
                          {shipment.motoristas ? (
                            <div>
                              <p className="font-medium text-sm">{shipment.motoristas.nome}</p>
                              <p className="text-xs text-muted-foreground">{shipment.motoristas.telefone}</p>
                            </div>
                          ) : (
                            <Badge variant="outline">Não designado</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(shipment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewShipment(shipment as any)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDownloadLabel(shipment as any)}
                              disabled={!shipment.label_pdf_url}
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
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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
    </div>
  );
};

export default AdminRemessas;