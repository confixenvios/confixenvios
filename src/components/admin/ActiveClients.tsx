import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  Search, 
  Package, 
  Calendar,
  MapPin,
  Phone,
  Mail,
  TrendingUp,
  Filter,
  Eye,
  ChevronDown,
  ChevronRight,
  Crown
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';

interface ClientData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  created_at: string;
  updated_at: string;
  shipment_count: number;
  last_shipment: string | null;
  total_value: number;
  successful_shipments: number;
  pending_shipments: number;
  recent_shipments: Array<{
    id: string;
    tracking_code: string | null;
    status: string;
    created_at: string;
    quote_data: any;
    sender_address: any;
    recipient_address: any;
    weight: number;
    format: string;
  }>;
  addresses_used: Array<{
    cep: string;
    city: string;
    state: string;
    address_type: string;
  }>;
}

const ActiveClients = () => {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [filterBy, setFilterBy] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      // Buscar clientes com estatísticas completas
      const { data: profilesData } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          document,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (!profilesData) return;

      // Para cada cliente, buscar estatísticas detalhadas de envios
      const clientsWithStats = await Promise.all(
        profilesData.map(async (profile) => {
          // Contar envios totais
          const { count: shipmentCount } = await supabase
            .from('shipments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          // Contar envios bem-sucedidos
          const { count: successfulCount } = await supabase
            .from('shipments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .in('status', ['DELIVERED', 'PAGO_AGUARDANDO_ETIQUETA', 'PAYMENT_CONFIRMED']);

          // Contar envios pendentes
          const { count: pendingCount } = await supabase
            .from('shipments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .in('status', ['PENDING_LABEL', 'PENDING_PAYMENT', 'PENDING_DOCUMENT']);

          // Buscar último envio
          const { data: lastShipment } = await supabase
            .from('shipments')
            .select('created_at')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Buscar envios recentes com endereços para histórico completo
          const { data: recentShipments } = await supabase
            .from('shipments')
            .select(`
              id,
              tracking_code,
              status,
              created_at,
              quote_data,
              weight,
              format,
              sender_address:addresses!sender_address_id(
                cep,
                city,
                state,
                street,
                number,
                neighborhood
              ),
              recipient_address:addresses!recipient_address_id(
                cep,
                city,
                state,
                street,
                number,
                neighborhood
              )
            `)
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(10);

          // Buscar endereços únicos utilizados pelo cliente
          const { data: addressesData } = await supabase
            .from('addresses')
            .select('cep, city, state, address_type')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false });

          // Remover duplicatas de endereços
          const uniqueAddresses = addressesData ? 
            addressesData.reduce((acc: any[], current) => {
              const exists = acc.find(addr => addr.cep === current.cep && addr.address_type === current.address_type);
              if (!exists) {
                acc.push(current);
              }
              return acc;
            }, []).slice(0, 5) : [];

          // Calcular valor total dos envios
          let totalValue = 0;
          if (recentShipments) {
            totalValue = recentShipments.reduce((sum, shipment) => {
              const quoteData = shipment.quote_data as any;
              
              // Tentar diferentes caminhos para encontrar o preço
              let price = 0;
              if (quoteData?.selectedQuote?.price) {
                price = parseFloat(quoteData.selectedQuote.price);
              } else if (quoteData?.totalPrice) {
                price = parseFloat(quoteData.totalPrice);
              } else if (quoteData?.shippingQuote?.economicPrice) {
                price = parseFloat(quoteData.shippingQuote.economicPrice);
              }
              
              return sum + price;
            }, 0);
          }

          return {
            ...profile,
            document: profile.document || null,
            updated_at: profile.updated_at || profile.created_at,
            shipment_count: shipmentCount || 0,
            successful_shipments: successfulCount || 0,
            pending_shipments: pendingCount || 0,
            last_shipment: lastShipment?.created_at || null,
            total_value: totalValue,
            recent_shipments: recentShipments || [],
            addresses_used: uniqueAddresses
          };
        })
      );

      setClients(clientsWithStats);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const clientStatus = getClientStatus(client);
    const matchesFilter = filterBy === 'all' || 
      (filterBy === 'active' && clientStatus !== 'Inativo') ||
      (filterBy === 'inactive' && clientStatus === 'Inativo');

    return matchesSearch && matchesFilter;
  });

  const getClientStatus = (client: ClientData) => {
    // Se não tem nenhuma remessa criada, é inativo
    if (client.shipment_count === 0) return 'Inativo';
    
    // Se tem remessas, considerar ativo baseado na última atividade
    const lastShipment = client.last_shipment ? new Date(client.last_shipment) : null;
    const daysSinceLastShipment = lastShipment 
      ? Math.floor((Date.now() - lastShipment.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Se tem remessas mas não conseguimos determinar a data, considerar ativo
    if (daysSinceLastShipment === null) return 'Ativo';
    
    // Classificar baseado na última atividade
    if (daysSinceLastShipment <= 7) return 'Muito Ativo';
    if (daysSinceLastShipment <= 30) return 'Ativo';
    if (daysSinceLastShipment <= 90) return 'Pouco Ativo';
    return 'Inativo'; // Mais de 90 dias sem atividade
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

  const getClientInitials = (client: ClientData) => {
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

  const getClientName = (client: ClientData) => {
    if (client.first_name && client.last_name) {
      return `${client.first_name} ${client.last_name}`;
    }
    if (client.first_name) {
      return client.first_name;
    }
    return client.email || 'Cliente';
  };

  const isMasterUser = (client: ClientData) => {
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
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Clientes Ativos</h2>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Carregando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Clientes Ativos</h2>
        </div>
        <Badge variant="secondary" className="text-sm">
          {filteredClients.length} clientes
        </Badge>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {(['all', 'active', 'inactive'] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={filterBy === filter ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterBy(filter)}
                >
                  {filter === 'all' && 'Todos'}
                  {filter === 'active' && 'Ativos'}
                  {filter === 'inactive' && 'Inativos'}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients List */}
      <div className="space-y-4">
        {filteredClients.map((client) => (
          <Card key={client.id} className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex space-x-4 flex-1">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getClientInitials(client)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-foreground flex items-center space-x-2">
                        <span>{getClientName(client)}</span>
                        {isMasterUser(client) && (
                          <Crown className="h-4 w-4 text-amber-500" />
                        )}
                      </h3>
                      <Badge className={`text-xs ${getStatusColor(getClientStatus(client))}`}>
                        {getClientStatus(client)}
                      </Badge>
                      {isMasterUser(client) && (
                        <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                          Master
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      {client.email && (
                        <div className="flex items-center space-x-1">
                          <Mail className="h-3 w-3" />
                          <span>{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Package className="h-3 w-3" />
                        <span>{client.shipment_count} envios</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>{formatCurrency(client.total_value)}</span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Cliente desde: {formatDate(client.created_at)}
                      {client.last_shipment && (
                        <> • Último envio: {formatDate(client.last_shipment)}</>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedClient(
                    expandedClient === client.id ? null : client.id
                  )}
                >
                  {expandedClient === client.id ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {expandedClient === client.id && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-6">
                    
                    {/* Informações Pessoais Detalhadas */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>Dados de Cadastro</span>
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/30 rounded-lg">
                        {/* Informações Pessoais */}
                        <div className="space-y-4">
                          <h5 className="font-medium text-sm text-muted-foreground border-b pb-2">
                            INFORMAÇÕES PESSOAIS
                          </h5>
                          
                          <div className="space-y-3">
                            <div>
                              <span className="text-xs font-medium text-muted-foreground block">Nome Completo</span>
                              <div className="text-sm font-medium">
                                {getClientName(client)}
                              </div>
                            </div>
                            
                            <div>
                              <span className="text-xs font-medium text-muted-foreground block">E-mail</span>
                              <div className="text-sm font-mono">
                                {client.email || 'Não informado'}
                              </div>
                            </div>
                            
                            <div>
                              <span className="text-xs font-medium text-muted-foreground block">Telefone</span>
                              <div className="text-sm">
                                {client.phone || 'Não informado'}
                              </div>
                            </div>
                            
                            {client.document && (
                              <div>
                                <span className="text-xs font-medium text-muted-foreground block">CPF/CNPJ</span>
                                <div className="text-sm font-mono">{client.document}</div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Informações da Conta */}
                        <div className="space-y-4">
                          <h5 className="font-medium text-sm text-muted-foreground border-b pb-2">
                            INFORMAÇÕES DA CONTA
                          </h5>
                          
                          <div className="space-y-3">
                            <div>
                              <span className="text-xs font-medium text-muted-foreground block">Data de Cadastro</span>
                              <div className="text-sm">{formatDate(client.created_at)}</div>
                            </div>
                            
                            <div>
                              <span className="text-xs font-medium text-muted-foreground block">Última Atualização</span>
                              <div className="text-sm">{formatDate(client.updated_at)}</div>
                            </div>
                            
                            <div>
                              <span className="text-xs font-medium text-muted-foreground block">Status da Conta</span>
                              <Badge className={`text-xs ${getStatusColor(getClientStatus(client))}`}>
                                {getClientStatus(client)}
                              </Badge>
                            </div>
                            
                            {isMasterUser(client) && (
                              <div>
                                <span className="text-xs font-medium text-muted-foreground block">Tipo de Conta</span>
                                <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Conta Master
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Resumo de Atividade */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="text-center">
                          <div className="text-lg font-bold text-primary">{client.shipment_count}</div>
                          <div className="text-xs text-muted-foreground">Total de Remessas</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-lg font-bold text-success">{client.successful_shipments}</div>
                          <div className="text-xs text-muted-foreground">Bem-sucedidas</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-lg font-bold text-warning">{client.pending_shipments}</div>
                          <div className="text-xs text-muted-foreground">Pendentes</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-lg font-bold text-primary">{formatCurrency(client.total_value)}</div>
                          <div className="text-xs text-muted-foreground">Valor Total</div>
                        </div>
                      </div>
                    </div>

                    {/* Endereços Utilizados */}
                    {client.addresses_used.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-foreground flex items-center space-x-2">
                          <MapPin className="h-4 w-4" />
                          <span>Endereços Utilizados</span>
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {client.addresses_used.map((address, index) => (
                            <div key={index} className="p-3 bg-muted/30 rounded-lg">
                              <div className="flex items-center justify-between mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {address.address_type === 'sender' ? 'Remetente' : 'Destinatário'}
                                </Badge>
                                <span className="text-xs text-muted-foreground font-mono">
                                  {address.cep}
                                </span>
                              </div>
                              <div className="text-sm font-medium">
                                {address.city}, {address.state}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Histórico Detalhado de Envios */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground flex items-center space-x-2">
                        <Package className="h-4 w-4" />
                        <span>Histórico Detalhado de Envios</span>
                      </h4>

                      {client.recent_shipments.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          Nenhum envio realizado ainda
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {client.recent_shipments.map((shipment) => (
                            <div 
                              key={shipment.id} 
                              className="p-4 bg-muted/30 rounded-lg border border-border/30"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono text-sm font-medium">
                                    {shipment.tracking_code || 'N/A'}
                                  </span>
                                  <Badge 
                                    variant="secondary" 
                                    className={`text-xs ${getShipmentStatusColor(shipment.status)}`}
                                  >
                                    {shipment.status}
                                  </Badge>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => window.open(`/admin/clientes/${client.id}`, '_blank')}>
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-muted-foreground">
                                <div>
                                  <span className="font-medium">Data:</span> {formatDate(shipment.created_at)}
                                </div>
                                
                                {shipment.weight && (
                                  <div>
                                    <span className="font-medium">Peso:</span> {shipment.weight}kg
                                  </div>
                                )}
                                
                                {shipment.format && (
                                  <div>
                                    <span className="font-medium">Formato:</span> {shipment.format}
                                  </div>
                                )}
                                
                                {shipment.quote_data?.selectedQuote?.price && (
                                  <div>
                                    <span className="font-medium">Valor:</span> {formatCurrency(parseFloat(shipment.quote_data.selectedQuote.price))}
                                  </div>
                                )}
                              </div>
                              
                              {/* Endereços do Envio */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-border/30">
                                {shipment.sender_address && (
                                  <div className="space-y-1">
                                    <span className="text-xs font-medium text-muted-foreground">Origem:</span>
                                    <div className="text-xs">
                                      {shipment.sender_address.city}, {shipment.sender_address.state}
                                      <span className="font-mono ml-1">({shipment.sender_address.cep})</span>
                                    </div>
                                  </div>
                                )}
                                
                                {shipment.recipient_address && (
                                  <div className="space-y-1">
                                    <span className="text-xs font-medium text-muted-foreground">Destino:</span>
                                    <div className="text-xs">
                                      {shipment.recipient_address.city}, {shipment.recipient_address.state}
                                      <span className="font-mono ml-1">({shipment.recipient_address.cep})</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredClients.length === 0 && !loading && (
        <Card className="border-border/50">
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Nenhum cliente encontrado com esse filtro' : 'Nenhum cliente encontrado'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ActiveClients;