import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Car, Truck, Plus, Package, ArrowRight, TrendingUp, 
  Clock, FileText, Search, BarChart3, MapPin
} from 'lucide-react';
import EmailConfirmationBanner from '@/components/EmailConfirmationBanner';

interface DashboardStats {
  totalConvencional: number;
  totalExpresso: number;
  pendingShipments: number;
  deliveredShipments: number;
}

const PainelDashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalConvencional: 0,
    totalExpresso: 0,
    pendingShipments: 0,
    deliveredShipments: 0
  });
  const [loading, setLoading] = useState(true);
  const [showQuoteTypeModal, setShowQuoteTypeModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    try {
      // Stats de remessas convencionais
      const { count: convencionalCount } = await supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Stats de remessas B2B
      const { data: b2bClient } = await supabase
        .from('b2b_clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let expressoCount = 0;
      if (b2bClient) {
        const { count } = await supabase
          .from('b2b_shipments')
          .select('*', { count: 'exact', head: true })
          .eq('b2b_client_id', b2bClient.id);
        expressoCount = count || 0;
      }

      // Pendentes (convencional)
      const { count: pendingCount } = await supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['PENDING_DOCUMENT', 'PENDING_PAYMENT', 'PENDING_LABEL', 'PAYMENT_CONFIRMED', 'AWAITING_LABEL']);

      // Entregues (convencional)
      const { count: deliveredCount } = await supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'ENTREGA_FINALIZADA');

      setStats({
        totalConvencional: convencionalCount || 0,
        totalExpresso: expressoCount,
        pendingShipments: pendingCount || 0,
        deliveredShipments: deliveredCount || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.first_name) {
      return profile.first_name;
    }
    return user?.email?.split('@')[0] || 'Cliente';
  };

  return (
    <div className="p-6 space-y-8">
      <EmailConfirmationBanner />
      
      {/* Welcome Header */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Bem-vindo, {getDisplayName()}! 👋
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Escolha o tipo de envio que deseja realizar ou acompanhe suas remessas
        </p>
      </div>

      {/* Main Action Button */}
      <div className="flex justify-center max-w-5xl mx-auto">
        <Button 
          onClick={() => setShowQuoteTypeModal(true)}
          className="bg-primary hover:bg-primary/90 text-white text-lg px-10 py-6 h-auto shadow-lg"
        >
          Cotar frete
        </Button>
      </div>

      {/* Modal de seleção de tipo de cotação */}
      <Dialog open={showQuoteTypeModal} onOpenChange={setShowQuoteTypeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Escolha o tipo de envio</DialogTitle>
            <DialogDescription className="text-center">
              Selecione a modalidade de frete que deseja cotar
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <Button
              variant="outline"
              className="h-auto py-6 flex-col gap-3 border-2 hover:border-orange-500 hover:bg-orange-50"
              onClick={() => {
                setShowQuoteTypeModal(false);
                navigate('/painel/expresso/novo-envio');
              }}
            >
              <Car className="h-8 w-8 text-orange-500" />
              <div className="text-center">
                <p className="font-semibold text-foreground">Expresso</p>
                <p className="text-xs text-muted-foreground">Entrega rápida regional</p>
              </div>
            </Button>
            
            <Button
              variant="outline"
              className="h-auto py-6 flex-col gap-3 border-2 hover:border-blue-500 hover:bg-blue-50"
              onClick={() => {
                setShowQuoteTypeModal(false);
                navigate('/painel/convencional/cotacoes');
              }}
            >
              <Truck className="h-8 w-8 text-blue-500" />
              <div className="text-center">
                <p className="font-semibold text-foreground">Nacional</p>
                <p className="text-xs text-muted-foreground">Envio para todo Brasil</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
        <Card className="border-t-4 border-t-orange-500 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Envios Expresso</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? '...' : stats.totalExpresso}
                </p>
              </div>
              <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center">
                <Car className="w-5 h-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-blue-500 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Envios Nacional</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? '...' : stats.totalConvencional}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                <Truck className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-amber-500 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Pendentes</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? '...' : stats.pendingShipments}
                </p>
              </div>
              <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-green-500 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Entregues</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? '...' : stats.deliveredShipments}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <Card className="max-w-5xl mx-auto border-t-4 border-t-primary shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <ArrowRight className="w-5 h-5 text-primary" />
            Acesso Rápido
          </CardTitle>
          <CardDescription>
            Navegue rapidamente para outras funcionalidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-primary hover:text-white hover:border-primary [&_svg]:hover:text-white">
              <Link to="/painel/expresso/envios">
                <Package className="h-5 w-5 text-orange-500" />
                <span className="text-sm">Envios Expresso</span>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-primary hover:text-white hover:border-primary [&_svg]:hover:text-white">
              <Link to="/painel/convencional/remessas">
                <Package className="h-5 w-5 text-blue-500" />
                <span className="text-sm">Remessas</span>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-primary hover:text-white hover:border-primary [&_svg]:hover:text-white">
              <Link to="/painel/convencional/rastreamento">
                <Search className="h-5 w-5 text-primary" />
                <span className="text-sm">Rastrear</span>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-primary hover:text-white hover:border-primary [&_svg]:hover:text-white">
              <Link to="/painel/convencional/etiquetas">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-sm">Etiquetas</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PainelDashboard;
