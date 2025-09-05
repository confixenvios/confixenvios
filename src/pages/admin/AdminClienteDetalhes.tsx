import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft,
  User, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  Package,
  TrendingUp,
  Edit,
  Save,
  X,
  Crown,
  FileText
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ClientDetails {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  created_at: string;
  shipment_count: number;
  total_value: number;
  last_shipment: string | null;
  addresses: Array<{
    id: string;
    name: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
    complement?: string;
    reference?: string;
  }>;
  shipments: Array<{
    id: string;
    tracking_code: string | null;
    status: string;
    created_at: string;
    quote_data: any;
    sender_address: any;
    recipient_address: any;
  }>;
}

const AdminClienteDetalhes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    document: ''
  });

  useEffect(() => {
    if (id) {
      loadClientDetails();
    }
  }, [id]);

  const loadClientDetails = async () => {
    try {
      // Buscar dados do cliente
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (!profile) {
        toast({
          title: "Erro",
          description: "Cliente não encontrado",
          variant: "destructive"
        });
        navigate('/admin/clientes');
        return;
      }

      // Buscar endereços
      const { data: addresses } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', id);

      // Buscar envios
      const { data: shipments } = await supabase
        .from('shipments')
        .select(`
          *,
          sender_address:addresses!shipments_sender_address_id_fkey(*),
          recipient_address:addresses!shipments_recipient_address_id_fkey(*)
        `)
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      // Calcular estatísticas
      const shipmentCount = shipments?.length || 0;
      const totalValue = shipments?.reduce((sum, shipment) => {
        const quoteData = shipment.quote_data as any;
        if (quoteData?.selectedQuote?.price) {
          return sum + parseFloat(quoteData.selectedQuote.price);
        }
        return sum;
      }, 0) || 0;

      const lastShipment = shipments?.[0]?.created_at || null;

      const clientDetails: ClientDetails = {
        ...profile,
        shipment_count: shipmentCount,
        total_value: totalValue,
        last_shipment: lastShipment,
        addresses: addresses || [],
        shipments: shipments || []
      };

      setClient(clientDetails);
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        document: profile.document || ''
      });
    } catch (error) {
      console.error('Error loading client details:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes do cliente",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Dados do cliente atualizados com sucesso"
      });

      setEditing(false);
      loadClientDetails();
    } catch (error) {
      console.error('Error updating client:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar dados do cliente",
        variant: "destructive"
      });
    }
  };

  const getClientStatus = (client: ClientDetails) => {
    if (client.shipment_count === 0) return 'Inativo';
    
    const lastShipment = client.last_shipment ? new Date(client.last_shipment) : null;
    const daysSinceLastShipment = lastShipment 
      ? Math.floor((Date.now() - lastShipment.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    if (daysSinceLastShipment === null) return 'Inativo';
    if (daysSinceLastShipment <= 7) return 'Muito Ativo';
    if (daysSinceLastShipment <= 30) return 'Ativo';
    return 'Pouco Ativo';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Muito Ativo': return 'bg-success text-success-foreground';
      case 'Ativo': return 'bg-primary text-primary-foreground';
      case 'Pouco Ativo': return 'bg-warning text-warning-foreground';
      case 'Inativo': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getClientInitials = (client: ClientDetails) => {
    if (client.first_name && client.last_name) {
      return `${client.first_name.charAt(0)}${client.last_name.charAt(0)}`.toUpperCase();
    }
    if (client.first_name) {
      return client.first_name.charAt(0).toUpperCase();
    }
    if (client.email) {
      return client.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getClientName = (client: ClientDetails) => {
    if (client.first_name && client.last_name) {
      return `${client.first_name} ${client.last_name}`;
    }
    if (client.first_name) {
      return client.first_name;
    }
    return client.email || 'Cliente';
  };

  const isMasterUser = (client: ClientDetails) => {
    return client.email === 'grupoconfix@gmail.com';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getShipmentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': return 'bg-success text-success-foreground';
      case 'in_transit': return 'bg-primary text-primary-foreground';
      case 'pending_label': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Carregando detalhes do cliente...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Cliente não encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/admin/clientes')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar aos Clientes
          </Button>
          <div className="flex items-center space-x-2">
            <User className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              Detalhes do Cliente
            </h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar Cliente
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Info Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {getClientInitials(client)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center space-x-2">
                    <CardTitle className="text-xl flex items-center space-x-2">
                      <span>{getClientName(client)}</span>
                      {isMasterUser(client) && (
                        <Crown className="h-5 w-5 text-amber-500" />
                      )}
                    </CardTitle>
                    <Badge className={`${getStatusColor(getClientStatus(client))}`}>
                      {getClientStatus(client)}
                    </Badge>
                    {isMasterUser(client) && (
                      <Badge variant="outline" className="border-amber-500 text-amber-600">
                        Master
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    Cliente desde {formatDate(client.created_at)}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  {editing ? (
                    <Input
                      value={formData.first_name}
                      onChange={(e) => setFormData(prev => ({...prev, first_name: e.target.value}))}
                      placeholder="Nome"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{client.first_name || 'Não informado'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Sobrenome</Label>
                  {editing ? (
                    <Input
                      value={formData.last_name}
                      onChange={(e) => setFormData(prev => ({...prev, last_name: e.target.value}))}
                      placeholder="Sobrenome"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{client.last_name || 'Não informado'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>E-mail</Label>
                  {editing ? (
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                      placeholder="E-mail"
                    />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{client.email || 'Não informado'}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Telefone</Label>
                  {editing ? (
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))}
                      placeholder="Telefone"
                    />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{client.phone || 'Não informado'}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>CPF/CNPJ</Label>
                  {editing ? (
                    <Input
                      value={formData.document}
                      onChange={(e) => setFormData(prev => ({...prev, document: e.target.value}))}
                      placeholder="CPF/CNPJ"
                    />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{client.document || 'Não informado'}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Addresses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Endereços Cadastrados</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {client.addresses.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum endereço cadastrado
                </p>
              ) : (
                <div className="space-y-4">
                  {client.addresses.map((address) => (
                    <div key={address.id} className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-foreground">{address.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {address.street}, {address.number}
                            {address.complement && ` - ${address.complement}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {address.neighborhood}, {address.city} - {address.state}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            CEP: {address.cep}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stats & Recent Activity */}
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{client.shipment_count}</p>
                    <p className="text-sm text-muted-foreground">Total de Envios</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(client.total_value)}</p>
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-warning" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {client.last_shipment ? formatDate(client.last_shipment) : 'Nunca'}
                    </p>
                    <p className="text-sm text-muted-foreground">Último Envio</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Shipment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Histórico de Remessas</span>
          </CardTitle>
          <CardDescription>
            Histórico completo de envios realizados pelo cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {client.shipments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma remessa encontrada
            </p>
          ) : (
            <div className="space-y-4">
              {client.shipments.map((shipment) => (
                <div key={shipment.id} className="p-4 border border-border/50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm font-medium">
                          {shipment.tracking_code || `ID${shipment.id.slice(0, 8).toUpperCase()}`}
                        </span>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getShipmentStatusColor(shipment.status)}`}
                        >
                          {shipment.status}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        <p>Data: {formatDate(shipment.created_at)}</p>
                        {shipment.quote_data?.selectedQuote?.price && (
                          <p>Valor: {formatCurrency(parseFloat(shipment.quote_data.selectedQuote.price))}</p>
                        )}
                      </div>

                      {shipment.sender_address && shipment.recipient_address && (
                        <div className="text-xs text-muted-foreground">
                          <p><strong>De:</strong> {shipment.sender_address.city} - {shipment.sender_address.state}</p>
                          <p><strong>Para:</strong> {shipment.recipient_address.city} - {shipment.recipient_address.state}</p>
                        </div>
                      )}
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

export default AdminClienteDetalhes;