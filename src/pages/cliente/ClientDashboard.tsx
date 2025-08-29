import QuoteForm from "@/components/QuoteForm";
import EmailConfirmationBanner from "@/components/EmailConfirmationBanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calculator, 
  Package, 
  FileText, 
  Search,
  ArrowRight,
  TrendingUp,
  Clock
} from "lucide-react";
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ClientStats {
  totalShipments: number;
  pendingShipments: number;
  deliveredShipments: number;
  recentShipments: any[];
}

const ClientDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ClientStats>({
    totalShipments: 0,
    pendingShipments: 0,
    deliveredShipments: 0,
    recentShipments: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadClientStats();
    }
  }, [user]);

  const loadClientStats = async () => {
    if (!user) return;
    
    try {
      // Total shipments
      const { count: totalCount } = await supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Pending shipments  
      const { count: pendingCount } = await supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['PENDING_DOCUMENT', 'PENDING_PAYMENT', 'PENDING_LABEL', 'PAYMENT_CONFIRMED', 'AWAITING_LABEL']);

      // Delivered shipments
      const { count: deliveredCount } = await supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'DELIVERED');

      // Recent shipments
      const { data: recentShipments } = await supabase
        .from('shipments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      setStats({
        totalShipments: totalCount || 0,
        pendingShipments: pendingCount || 0,
        deliveredShipments: deliveredCount || 0,
        recentShipments: recentShipments || []
      });
    } catch (error) {
      console.error('Error loading client stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_LABEL':
        return <Badge variant="destructive">Aguardando Etiqueta</Badge>;
      case 'PENDING_DOCUMENT':
        return <Badge variant="destructive">Aguardando Documento</Badge>;
      case 'PENDING_PAYMENT':
        return <Badge variant="destructive">Aguardando Pagamento</Badge>;
      case 'PAYMENT_CONFIRMED':
        return <Badge className="bg-info text-info-foreground">Pagamento Confirmado</Badge>;
      case 'AWAITING_LABEL':
        return <Badge variant="secondary">Aguardando Etiqueta</Badge>;
      case 'LABEL_AVAILABLE':
        return <Badge className="bg-success text-success-foreground">Etiqueta Disponível</Badge>;
      case 'PAID':
        return <Badge className="bg-success text-success-foreground">Pago</Badge>;
      case 'DELIVERED':
        return <Badge className="bg-success text-success-foreground">Entregue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Email Confirmation Banner */}
      <EmailConfirmationBanner />
      
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Nova Cotação</h1>
        <p className="text-muted-foreground">
          Calcule o frete para sua remessa de forma rápida e segura
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-border/50 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total de Remessas</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? '...' : stats.totalShipments}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Pendentes</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? '...' : stats.pendingShipments}
                </p>
              </div>
              <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Entregues</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? '...' : stats.deliveredShipments}
                </p>
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quote Form */}
      <Card className="border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="w-5 h-5" />
            <span>Calcular Frete</span>
          </CardTitle>
          <CardDescription>
            Preencha os dados abaixo para calcular o valor do frete
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QuoteForm />
        </CardContent>
      </Card>

      {/* Quick Access & Recent Shipments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Access */}
        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ArrowRight className="w-5 h-5" />
              <span>Ações Rápidas</span>
            </CardTitle>
            <CardDescription>
              Acesse rapidamente suas funcionalidades
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full justify-start">
              <Link to="/dashboard/remessas">
                <Package className="w-4 h-4 mr-2" />
                Ver Minhas Remessas
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/dashboard/etiquetas">
                <FileText className="w-4 h-4 mr-2" />
                Baixar Etiquetas
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/dashboard/rastreio">
                <Search className="w-4 h-4 mr-2" />
                Rastrear Encomenda
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Shipments */}
        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Package className="w-5 h-5" />
                <span>Remessas Recentes</span>
              </span>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard/remessas">
                  Ver todas
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : stats.recentShipments.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Você ainda não possui remessas
                </p>
                <Button asChild size="sm">
                  <Link to="/">
                    Fazer primeira cotação
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recentShipments.map((shipment) => (
                  <div key={shipment.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-sm">
                          {shipment.tracking_code || 'Sem código'}
                        </span>
                        {getStatusBadge(shipment.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(shipment.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        R$ {shipment.quote_data?.price || '0,00'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientDashboard;