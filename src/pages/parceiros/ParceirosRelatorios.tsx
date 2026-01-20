import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PeriodFilterComponent, { 
  PeriodFilter, 
  getDateRangeFromPeriod, 
  getPeriodLabel 
} from '@/components/parceiros/PeriodFilter';
import { 
  BarChart3, 
  Download, 
  TrendingUp,
  Package,
  Truck,
  CheckCircle,
  Clock,
  FileText
} from 'lucide-react';

interface CarrierPartner {
  id: string;
  company_name: string;
}

interface ReportStats {
  total: number;
  pending: number;
  delivered: number;
  totalValue: number;
}

const ParceirosRelatorios = () => {
  const { partner } = useOutletContext<{ partner: CarrierPartner }>();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReportStats>({
    total: 0,
    pending: 0,
    delivered: 0,
    totalValue: 0
  });

  // Period filter states
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });

  useEffect(() => {
    if (partner) {
      loadReportData();
    }
  }, [partner, periodFilter, customDateRange]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRangeFromPeriod(periodFilter, customDateRange);
      
      const { data: allShipments, error } = await supabase
        .from('shipments')
        .select(`id, status, quote_data, created_at`)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter shipments that have jadlog as selectedCarrier
      const shipments = allShipments?.filter(s => {
        const quoteData = s.quote_data as any;
        const selectedCarrier = quoteData?.deliveryDetails?.selectedCarrier || 
                                quoteData?.selectedCarrier;
        return selectedCarrier?.toLowerCase() === 'jadlog';
      }) || [];

      const pending = shipments.filter(s => 
        s.status !== 'delivered' && s.status !== 'cancelled'
      ).length;
      const delivered = shipments.filter(s => s.status === 'delivered').length;
      
      const totalValue = shipments.reduce((sum, s) => {
        const quoteData = s.quote_data as any;
        const price = quoteData?.deliveryDetails?.totalPrice || 
                      quoteData?.deliveryDetails?.shippingPrice || 
                      quoteData?.quoteData?.shippingQuote?.jadlog?.preco_total ||
                      0;
        return sum + Number(price);
      }, 0);

      setStats({
        total: shipments.length,
        pending,
        delivered,
        totalValue
      });
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    // TODO: Implement CSV export
    console.log('Export CSV for period:', getPeriodLabel(periodFilter, customDateRange));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">
            Relatórios e análises - {partner?.company_name}
          </p>
        </div>
        
        {/* Period Filter */}
        <PeriodFilterComponent
          value={periodFilter}
          onChange={setPeriodFilter}
          customRange={customDateRange}
          onCustomRangeChange={setCustomDateRange}
        />
      </div>

      {/* Stats Summary for Selected Period */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '-' : stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Em Processo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{loading ? '-' : stats.pending}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Entregues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{loading ? '-' : stats.delivered}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Valor Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {loading ? '-' : stats.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Entregas por Período
            </CardTitle>
            <CardDescription>
              Relatório detalhado de todas as entregas do período selecionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Performance
            </CardTitle>
            <CardDescription>
              Métricas de desempenho e tempo de entrega
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-amber-500" />
              Entregas Pendentes
            </CardTitle>
            <CardDescription>
              Lista de entregas ainda não finalizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            Gráficos e Análises
          </CardTitle>
          <CardDescription>Visualização detalhada dos dados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Em Desenvolvimento</p>
            <p className="text-sm">Gráficos interativos estarão disponíveis em breve</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParceirosRelatorios;
