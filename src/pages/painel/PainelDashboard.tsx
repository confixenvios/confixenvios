import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

      {/* Main Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {/* Card Novo Envio Expresso */}
        <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl group cursor-pointer" onClick={() => navigate('/painel/expresso/novo-envio')}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg">
                <Car className="h-8 w-8 text-white" />
              </div>
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">
                Expresso
              </Badge>
            </div>
            <CardTitle className="text-2xl mt-4 group-hover:text-primary transition-colors">
              Envio Expresso
            </CardTitle>
            <CardDescription className="text-base">
              Coleta no seu endereço, múltiplos volumes, entregas rápidas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground mb-4">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Coleta agendada no seu endereço
              </li>
              <li className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Múltiplos volumes por remessa
              </li>
              <li className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Etiquetas individuais por volume
              </li>
            </ul>
            <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-lg group-hover:scale-[1.02] transition-transform">
              <Plus className="mr-2 h-5 w-5" />
              Novo Envio Expresso
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>

        {/* Card Novo Envio Convencional */}
        <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl group cursor-pointer" onClick={() => navigate('/painel/convencional/cotacoes')}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Truck className="h-8 w-8 text-white" />
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                Nacional
              </Badge>
            </div>
            <CardTitle className="text-2xl mt-4 group-hover:text-primary transition-colors">
              Envio Nacional
            </CardTitle>
            <CardDescription className="text-base">
              Faça cotação, pague e gere sua etiqueta para postar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground mb-4">
              <li className="flex items-center gap-2">
                <Search className="h-4 w-4 text-blue-600" />
                Compare preços de transportadoras
              </li>
              <li className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Pague online com PIX ou Cartão
              </li>
              <li className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                Poste em agência ou agende coleta
              </li>
            </ul>
            <Button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg group-hover:scale-[1.02] transition-transform">
              <Plus className="mr-2 h-5 w-5" />
              Nova Cotação
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </div>

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
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-primary/5 hover:border-primary">
              <Link to="/painel/expresso/envios">
                <Package className="h-5 w-5 text-orange-500" />
                <span className="text-sm">Envios Expresso</span>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-primary/5 hover:border-primary">
              <Link to="/painel/convencional/remessas">
                <Package className="h-5 w-5 text-blue-500" />
                <span className="text-sm">Remessas</span>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-primary/5 hover:border-primary">
              <Link to="/painel/convencional/rastreamento">
                <Search className="h-5 w-5 text-primary" />
                <span className="text-sm">Rastrear</span>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-primary/5 hover:border-primary">
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
