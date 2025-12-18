import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Users, 
  Search, 
  Package, 
  Calendar,
  MapPin,
  Phone,
  Mail,
  Filter,
  Eye,
  ChevronDown,
  ChevronRight,
  Crown,
  Trash2,
  AlertTriangle,
  Check,
  X
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

interface ClientData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  inscricao_estadual: string | null;
  created_at: string;
  updated_at: string;
  status: string;
  is_b2b: boolean;
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
  const [filterBy, setFilterBy] = useState<'all' | 'active' | 'inactive' | 'pending' | 'b2b'>('all');
  const [deletingClient, setDeletingClient] = useState<string | null>(null);
  const { toast } = useToast();

  // Count pending approvals
  const pendingApprovals = clients.filter(c => c.status === 'pendente').length;

  useEffect(() => {
    loadClients();
  }, []);

  // Helper functions - defined before being used
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

  const loadClients = async () => {
    try {
      // Buscar usernames de motoristas para excluí-los da lista de clientes
      const { data: motoristasData } = await supabase
        .from('motoristas')
        .select('username');
      
      const motoristaUsernames = new Set((motoristasData || []).map(m => m.username.toLowerCase()));

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
          inscricao_estadual,
          created_at,
          updated_at,
          status,
          is_b2b
        `)
        .order('created_at', { ascending: false });

      if (!profilesData) return;

      // Filtrar clientes que NÃO são motoristas (não temos como comparar pois motoristas usam username, não email)
      // Então simplesmente usamos todos os perfis
      const filteredProfiles = profilesData;

      // Para cada cliente, buscar estatísticas detalhadas de envios (convencionais + B2B)
      const clientsWithStats = await Promise.all(
        filteredProfiles.map(async (profile) => {
          // ========== REMESSAS CONVENCIONAIS ==========
          // Contar envios totais convencionais
          const { count: conventionalShipmentCount } = await supabase
            .from('shipments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          // Contar envios bem-sucedidos convencionais
          const { count: conventionalSuccessfulCount } = await supabase
            .from('shipments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .in('status', ['DELIVERED', 'PAGO_AGUARDANDO_ETIQUETA', 'PAYMENT_CONFIRMED', 'ENTREGUE', 'ENTREGA_FINALIZADA']);

          // Contar envios pendentes convencionais
          const { count: conventionalPendingCount } = await supabase
            .from('shipments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .in('status', ['PENDING_LABEL', 'PENDING_PAYMENT', 'PENDING_DOCUMENT', 'PENDENTE']);

          // Buscar último envio convencional
          const { data: lastConventionalShipment } = await supabase
            .from('shipments')
            .select('created_at')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // ========== REMESSAS B2B ==========
          // Buscar b2b_client vinculado ao user_id
          const { data: b2bClient } = await supabase
            .from('b2b_clients')
            .select('id')
            .eq('user_id', profile.id)
            .single();

          let b2bShipmentCount = 0;
          let b2bSuccessfulCount = 0;
          let b2bPendingCount = 0;
          let lastB2BShipment: { created_at: string } | null = null;
          let b2bTotalValue = 0;

          if (b2bClient) {
            // Contar envios B2B totais
            const { count: b2bCount } = await supabase
              .from('b2b_shipments')
              .select('*', { count: 'exact', head: true })
              .eq('b2b_client_id', b2bClient.id);
            b2bShipmentCount = b2bCount || 0;

            // Contar envios B2B bem-sucedidos (ENTREGUE, CONCLUIDO)
            const { count: b2bSuccessCount } = await supabase
              .from('b2b_shipments')
              .select('*', { count: 'exact', head: true })
              .eq('b2b_client_id', b2bClient.id)
              .in('status', ['ENTREGUE', 'CONCLUIDO', 'PAGO']);
            b2bSuccessfulCount = b2bSuccessCount || 0;

            // Contar envios B2B pendentes
            const { count: b2bPendingCount_ } = await supabase
              .from('b2b_shipments')
              .select('*', { count: 'exact', head: true })
              .eq('b2b_client_id', b2bClient.id)
              .in('status', ['PENDENTE', 'AGUARDANDO_PAGAMENTO', 'AGUARDANDO_ACEITE_COLETA']);
            b2bPendingCount = b2bPendingCount_ || 0;

            // Buscar último envio B2B
            const { data: lastB2B } = await supabase
              .from('b2b_shipments')
              .select('created_at')
              .eq('b2b_client_id', b2bClient.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            lastB2BShipment = lastB2B;

            // Calcular valor total B2B
            const { data: b2bShipmentsValue } = await supabase
              .from('b2b_shipments')
              .select('total_price')
              .eq('b2b_client_id', b2bClient.id);
            b2bTotalValue = (b2bShipmentsValue || []).reduce((acc, s) => acc + (Number(s.total_price) || 0), 0);
          }

          // ========== COMBINAR ESTATÍSTICAS ==========
          const totalShipmentCount = (conventionalShipmentCount || 0) + b2bShipmentCount;
          const totalSuccessfulCount = (conventionalSuccessfulCount || 0) + b2bSuccessfulCount;
          const totalPendingCount = (conventionalPendingCount || 0) + b2bPendingCount;

          // Determinar último envio (o mais recente entre convencional e B2B)
          let lastShipmentDate: string | null = null;
          if (lastConventionalShipment?.created_at && lastB2BShipment?.created_at) {
            lastShipmentDate = new Date(lastConventionalShipment.created_at) > new Date(lastB2BShipment.created_at) 
              ? lastConventionalShipment.created_at 
              : lastB2BShipment.created_at;
          } else {
            lastShipmentDate = lastConventionalShipment?.created_at || lastB2BShipment?.created_at || null;
          }

          // Buscar envios recentes convencionais com endereços para histórico completo
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

          return {
            ...profile,
            document: profile.document || null,
            updated_at: profile.updated_at || profile.created_at,
            status: profile.status || 'pendente',
            is_b2b: profile.is_b2b || false,
            shipment_count: totalShipmentCount,
            successful_shipments: totalSuccessfulCount,
            pending_shipments: totalPendingCount,
            last_shipment: lastShipmentDate,
            total_value: b2bTotalValue,
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

  const handleApproveClient = async (clientId: string, approve: boolean) => {
    try {
      const newStatus = approve ? 'aprovado' : 'rejeitado';
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', clientId);

      if (error) throw error;

      setClients(prev => prev.map(client => 
        client.id === clientId ? { ...client, status: newStatus } : client
      ));

      toast({
        title: approve ? "Cliente aprovado" : "Cliente rejeitado",
        description: approve 
          ? "O cliente agora pode acessar a plataforma."
          : "O acesso do cliente foi rejeitado.",
      });
    } catch (error) {
      console.error('Error updating client status:', error);
      toast({
        title: "Erro ao atualizar status",
        description: "Ocorreu um erro ao tentar atualizar o status do cliente.",
        variant: "destructive",
      });
    }
  };

  const handleToggleB2B = async (clientId: string, enableB2B: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_b2b: enableB2B })
        .eq('id', clientId);

      if (error) throw error;

      // If enabling B2B, also create/update b2b_clients record
      if (enableB2B) {
        const client = clients.find(c => c.id === clientId);
        if (client) {
          // Check if b2b_clients record exists
          const { data: existingB2B } = await supabase
            .from('b2b_clients')
            .select('id')
            .eq('user_id', clientId)
            .single();

          if (!existingB2B) {
            // Create new b2b_clients record
            await supabase.from('b2b_clients').insert({
              user_id: clientId,
              company_name: getClientName(client),
              email: client.email || '',
              phone: client.phone || '',
              cnpj: client.document || '',
              is_active: true
            });
          } else {
            // Update existing record
            await supabase
              .from('b2b_clients')
              .update({ is_active: true })
              .eq('user_id', clientId);
          }
        }
      }

      setClients(prev => prev.map(client => 
        client.id === clientId ? { ...client, is_b2b: enableB2B } : client
      ));

      toast({
        title: enableB2B ? "B2B habilitado" : "B2B desabilitado",
        description: enableB2B 
          ? "O cliente agora tem acesso ao B2B Express."
          : "O acesso B2B foi removido do cliente.",
      });
    } catch (error) {
      console.error('Error toggling B2B:', error);
      toast({
        title: "Erro ao atualizar B2B",
        description: "Ocorreu um erro ao tentar atualizar o acesso B2B.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClient = async (clientId: string, clientEmail: string | null) => {
    // Prevent deletion of master user
    if (clientEmail === 'grupoconfix@gmail.com') {
      toast({
        title: "Operação não permitida",
        description: "Não é possível excluir a conta master do sistema.",
        variant: "destructive",
      });
      return;
    }

    setDeletingClient(clientId);
    
    try {
      // Call RPC function to delete user
      const { error } = await supabase.rpc('delete_user_admin', {
        user_id_to_delete: clientId
      });
      
      if (error) {
        throw error;
      }
      
      // Remove client from local state
      setClients(prev => prev.filter(client => client.id !== clientId));
      
      toast({
        title: "Cliente excluído com sucesso",
        description: "O cadastro do cliente foi removido permanentemente do sistema.",
      });
      
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: "Erro ao excluir cliente",
        description: "Ocorreu um erro ao tentar excluir o cliente. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setDeletingClient(null);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const clientStatus = getClientStatus(client);
    let matchesFilter = true;
    
    if (filterBy === 'pending') {
      matchesFilter = client.status === 'pendente';
    } else if (filterBy === 'b2b') {
      matchesFilter = client.is_b2b === true;
    } else if (filterBy === 'active') {
      matchesFilter = clientStatus !== 'Inativo' && client.status === 'aprovado';
    } else if (filterBy === 'inactive') {
      matchesFilter = clientStatus === 'Inativo';
    }

    return matchesSearch && matchesFilter;
  });

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
          <h2 className="text-2xl font-bold text-foreground">Gerenciamento de Clientes</h2>
        </div>
        <div className="flex items-center gap-2">
          {pendingApprovals > 0 && (
            <Badge variant="destructive" className="text-sm">
              {pendingApprovals} pendente{pendingApprovals > 1 ? 's' : ''}
            </Badge>
          )}
          <Badge variant="secondary" className="text-sm">
            {filteredClients.length} clientes
          </Badge>
        </div>
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
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterBy === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterBy('all')}
              >
                Todos
              </Button>
              <Button
                variant={filterBy === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterBy('pending')}
                className={filterBy !== 'pending' && pendingApprovals > 0 ? 'border-warning text-warning' : ''}
              >
                Pendentes {pendingApprovals > 0 && `(${pendingApprovals})`}
              </Button>
              <Button
                variant={filterBy === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterBy('active')}
              >
                Aprovados
              </Button>
              <Button
                variant={filterBy === 'b2b' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterBy('b2b')}
              >
                B2B
              </Button>
              <Button
                variant={filterBy === 'inactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterBy('inactive')}
              >
                Inativos
              </Button>
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
                      {client.status === 'pendente' && (
                        <Badge variant="destructive" className="text-xs">
                          Aguardando Aprovação
                        </Badge>
                      )}
                      {client.status === 'aprovado' && (
                        <Badge className={`text-xs ${getStatusColor(getClientStatus(client))}`}>
                          {getClientStatus(client)}
                        </Badge>
                      )}
                      {client.is_b2b && (
                        <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-600">
                          B2B
                        </Badge>
                      )}
                      {isMasterUser(client) && (
                        <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                          Master
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-muted-foreground">
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
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Cliente desde: {formatDate(client.created_at)}
                      {client.last_shipment && (
                        <> • Último envio: {formatDate(client.last_shipment)}</>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-wrap gap-2">
                  {/* Approval Buttons */}
                  {client.status === 'pendente' && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApproveClient(client.id, true)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleApproveClient(client.id, false)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Rejeitar
                      </Button>
                    </>
                  )}

                  {/* B2B Toggle */}
                  {client.status === 'aprovado' && !isMasterUser(client) && (
                    <Button
                      variant={client.is_b2b ? "outline" : "secondary"}
                      size="sm"
                      onClick={() => handleToggleB2B(client.id, !client.is_b2b)}
                    >
                      {client.is_b2b ? 'Remover B2B' : 'Habilitar B2B'}
                    </Button>
                  )}

                  {/* Delete Button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isMasterUser(client) || deletingClient === client.id}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        {deletingClient === client.id ? (
                          <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center space-x-2">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                          <span>Confirmar Exclusão</span>
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                          <p>
                            Tem certeza que deseja excluir permanentemente o cadastro de{' '}
                            <strong>{getClientName(client)}</strong>?
                          </p>
                          <div className="p-3 bg-destructive/10 rounded-lg text-sm">
                            <p className="font-medium text-destructive mb-2">⚠️ Esta ação é irreversível!</p>
                            <ul className="text-muted-foreground space-y-1 text-xs">
                              <li>• Todos os dados do cliente serão removidos</li>
                              <li>• Histórico de {client.shipment_count} remessas será mantido</li>
                              <li>• O cliente não conseguirá mais fazer login</li>
                            </ul>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteClient(client.id, client.email)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir Cliente
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Expand Button */}
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