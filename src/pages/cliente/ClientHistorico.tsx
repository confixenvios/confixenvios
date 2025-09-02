import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const ClientHistorico = () => {
  const { user } = useAuth();
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadHistoryData();
    }
  }, [user]);

  const loadHistoryData = async () => {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          id,
          tracking_code,
          status,
          created_at,
          sender_address:addresses!sender_address_id (name, city, state),
          recipient_address:addresses!recipient_address_id (name, city, state)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShipments(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'PENDING_DOCUMENT': { variant: 'destructive', label: 'Aguardando Documento' },
      'PENDING_PAYMENT': { variant: 'destructive', label: 'Aguardando Pagamento' },
      'PAYMENT_CONFIRMED': { variant: 'default', label: 'Pagamento Confirmado' },
      'PAGO_AGUARDANDO_ETIQUETA': { variant: 'secondary', label: 'Aguardando Etiqueta' },
      'LABEL_AVAILABLE': { variant: 'success', label: 'Etiqueta Disponível' },
      'DELIVERED': { variant: 'success', label: 'Entregue' }
    };
    const config = statusMap[status as keyof typeof statusMap] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex flex-col space-y-2">
          <div className="h-8 bg-muted animate-pulse rounded w-48" />
          <div className="h-4 bg-muted animate-pulse rounded w-72" />
        </div>
        <Card className="border-border/50 shadow-card">
          <CardContent className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Histórico</h1>
        <p className="text-muted-foreground">
          Visualize o histórico completo das suas remessas
        </p>
      </div>

      <Card className="border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Histórico de Remessas</span>
          </CardTitle>
          <CardDescription>
            {shipments.length > 0 
              ? `${shipments.length} remessa${shipments.length > 1 ? 's' : ''} no histórico`
              : "Nenhuma remessa encontrada"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shipments.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 mx-auto text-muted-foreground mb-6" />
              <h3 className="text-lg font-semibold mb-2">Histórico vazio</h3>
              <p className="text-muted-foreground">
                Seu histórico de remessas aparecerá aqui conforme você for utilizando o sistema.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {shipments.map((shipment) => (
                <div key={shipment.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-medium">
                        {shipment.tracking_code || `REF-${shipment.id.slice(0, 8)}`}
                      </span>
                      {getStatusBadge(shipment.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>{new Date(shipment.created_at).toLocaleDateString('pt-BR')}</p>
                      {shipment.sender_address && shipment.recipient_address && (
                        <p>{shipment.sender_address.city} → {shipment.recipient_address.city}</p>
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

export default ClientHistorico;