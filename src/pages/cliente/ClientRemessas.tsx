import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Plus, Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import TestAbacateWebhook from "@/components/TestAbacateWebhook";
import { Skeleton } from "@/components/ui/skeleton";

interface Shipment {
  id: string;
  tracking_code: string;
  status: string;
  weight: number;
  created_at: string;
  label_pdf_url: string | null;
  sender_address: {
    name: string;
    city: string;
    state: string;
  };
  recipient_address: {
    name: string;
    city: string;
    state: string;
  };
  payment_data?: any;
}

const ClientRemessas = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadShipments();
    }
  }, [user]);

  const loadShipments = async () => {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          id,
          tracking_code,
          status,
          weight,
          created_at,
          label_pdf_url,
          sender_address:addresses!sender_address_id (
            name,
            city,
            state
          ),
          recipient_address:addresses!recipient_address_id (
            name,
            city,
            state
          ),
          payment_data
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShipments(data || []);
    } catch (error) {
      console.error('Error loading shipments:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar suas remessas.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'PENDING_LABEL': { variant: 'secondary', label: 'Pendente' },
      'PAYMENT_CONFIRMED': { variant: 'default', label: 'Pagamento Confirmado' },
      'PAGO_AGUARDANDO_ETIQUETA': { variant: 'default', label: 'Aguardando Etiqueta' },
      'LABEL_AVAILABLE': { variant: 'success', label: 'Etiqueta Disponível' },
      'IN_TRANSIT': { variant: 'default', label: 'Em Trânsito' },
      'DELIVERED': { variant: 'success', label: 'Entregue' },
      'PAID': { variant: 'success', label: 'PAGO' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
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

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex flex-col space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-80" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Minhas Remessas</h1>
        <p className="text-muted-foreground">
          Gerencie todas as suas remessas em um só lugar
        </p>
      </div>

      {/* Componente de teste temporário */}
      <TestAbacateWebhook />

      <Card className="border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="w-5 h-5" />
            <span>Suas Remessas</span>
          </CardTitle>
          <CardDescription>
            {shipments.length > 0 
              ? `${shipments.length} remessa${shipments.length > 1 ? 's' : ''} encontrada${shipments.length > 1 ? 's' : ''}`
              : "Nenhuma remessa encontrada"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shipments.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-muted-foreground mb-6" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma remessa encontrada</h3>
              <p className="text-muted-foreground mb-6">
                Você ainda não criou nenhuma remessa. Comece fazendo uma cotação.
              </p>
              <Button asChild>
                <Link to="/cliente/cotacoes">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Cotação
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {shipments.map((shipment) => (
                <Card key={shipment.id} className="border-border/30">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-lg">
                            {shipment.tracking_code || `REF-${shipment.id.slice(0, 8)}`}
                          </h3>
                          {getStatusBadge(shipment.status)}
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(shipment.created_at)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="font-medium text-muted-foreground">Remetente</p>
                        <p className="font-medium">{shipment.sender_address?.name}</p>
                        <div className="flex items-center text-muted-foreground">
                          <MapPin className="w-3 h-3 mr-1" />
                          {shipment.sender_address?.city} - {shipment.sender_address?.state}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="font-medium text-muted-foreground">Destinatário</p>
                        <p className="font-medium">{shipment.recipient_address?.name}</p>
                        <div className="flex items-center text-muted-foreground">
                          <MapPin className="w-3 h-3 mr-1" />
                          {shipment.recipient_address?.city} - {shipment.recipient_address?.state}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="font-medium text-muted-foreground">Detalhes</p>
                        <p className="font-medium">{shipment.weight}kg</p>
                        {shipment.payment_data?.amount && (
                          <p className="text-muted-foreground">
                            {formatCurrency(shipment.payment_data.amount)}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientRemessas;