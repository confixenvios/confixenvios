import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Package, MapPin, Calendar, Download, Filter, TrendingUp, CheckCircle, FileText, User } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MotoristaSession {
  id: string;
  nome: string;
  email: string;
  status: string;
}

interface RemessaEntregue {
  id: string;
  tracking_code: string;
  status: string;
  created_at: string;
  updated_at: string;
  weight: number;
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
  quote_data: any;
  payment_data: any;
}

const MotoristaRelatorios = () => {
  const navigate = useNavigate();
  const [motoristaSession, setMotoristaSession] = useState<MotoristaSession | null>(null);
  const [remessasEntregues, setRemessasEntregues] = useState<RemessaEntregue[]>([]);
  const [filteredRemessas, setFilteredRemessas] = useState<RemessaEntregue[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('este_mes');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Check motorista session
    const sessionData = localStorage.getItem('motorista_session');
    if (!sessionData) {
      navigate('/motorista/auth');
      return;
    }

    const session = JSON.parse(sessionData);
    setMotoristaSession(session);
    loadRemessasEntregues(session.id);
  }, [navigate]);

  useEffect(() => {
    applyFilters();
  }, [remessasEntregues, dateFilter, customStartDate, customEndDate, searchTerm]);

  const loadRemessasEntregues = async (motoristaId: string) => {
    try {
      setLoading(true);
      console.log('🔄 Carregando entregas do motorista:', motoristaId);
      
      // Buscar diretamente da tabela já que RLS está desabilitado
      const { data: shipments, error } = await supabase
        .from('shipments')
        .select(`
          id,
          tracking_code,
          status,
          created_at,
          updated_at,
          weight,
          quote_data,
          payment_data,
          sender_address:addresses!shipments_sender_address_id_fkey(
            id, name, cep, street, number, complement, neighborhood, city, state
          ),
          recipient_address:addresses!shipments_recipient_address_id_fkey(
            id, name, cep, street, number, complement, neighborhood, city, state
          )
        `)
        .eq('motorista_id', motoristaId)
        .eq('status', 'ENTREGA_FINALIZADA')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ Erro na query:', error);
        throw error;
      }
      
      console.log('✅ Entregas encontradas:', shipments?.length || 0, shipments);
      
      const entregues = (shipments || []).map((item: any) => ({
        ...item,
        sender_address: item.sender_address || {},
        recipient_address: item.recipient_address || {}
      }));
      
      setRemessasEntregues(entregues);
    } catch (error) {
      console.error('Erro ao carregar entregas:', error);
      toast.error('Erro ao carregar relatório de entregas');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...remessasEntregues];

    // Filtro por data
    if (dateFilter !== 'personalizado') {
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      switch (dateFilter) {
        case 'esta_semana':
          startDate = startOfWeek(now, { locale: ptBR });
          endDate = endOfWeek(now, { locale: ptBR });
          break;
        case 'este_mes':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'mes_passado':
          const lastMonth = subMonths(now, 1);
          startDate = startOfMonth(lastMonth);
          endDate = endOfMonth(lastMonth);
          break;
        case 'este_ano':
          startDate = startOfYear(now);
          endDate = endOfYear(now);
          break;
        default:
          startDate = new Date(0);
          endDate = new Date();
      }

      filtered = filtered.filter(remessa => {
        const deliveryDate = new Date(remessa.updated_at);
        return deliveryDate >= startDate && deliveryDate <= endDate;
      });
    } else if (customStartDate && customEndDate) {
      const startDate = new Date(customStartDate);
      const endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999); // Include the entire end date

      filtered = filtered.filter(remessa => {
        const deliveryDate = new Date(remessa.updated_at);
        return deliveryDate >= startDate && deliveryDate <= endDate;
      });
    }

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(remessa =>
        remessa.tracking_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        remessa.sender_address?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        remessa.recipient_address?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Ordenar por data de entrega (mais recente primeiro)
    filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    setFilteredRemessas(filtered);
  };

  const getDateRangeLabel = () => {
    switch (dateFilter) {
      case 'esta_semana': return 'Esta Semana';
      case 'este_mes': return 'Este Mês';
      case 'mes_passado': return 'Mês Passado';
      case 'este_ano': return 'Este Ano';
      case 'personalizado': return 'Período Personalizado';
      default: return 'Todas';
    }
  };

  const calculateStats = () => {
    const totalEntregas = filteredRemessas.length;
    const totalKg = filteredRemessas.reduce((sum, remessa) => sum + (remessa.weight || 0), 0);
    
    // Calcular valor total baseado no quote_data ou payment_data
    const totalValor = filteredRemessas.reduce((sum, remessa) => {
      let valor = 0;
      if (remessa.payment_data?.amount) {
        valor = remessa.payment_data.amount / 100; // Se estiver em centavos
      } else if (remessa.quote_data?.deliveryDetails?.totalPrice) {
        valor = remessa.quote_data.deliveryDetails.totalPrice;
      }
      return sum + valor;
    }, 0);

    return { totalEntregas, totalKg, totalValor };
  };

  const stats = calculateStats();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const exportData = () => {
    if (filteredRemessas.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const csvHeader = 'Código,Data Entrega,Remetente,Destinatário,Peso (kg),Cidade Origem,Cidade Destino\n';
    const csvData = filteredRemessas.map(remessa => 
      `${remessa.tracking_code || remessa.id.slice(0, 8)},${format(new Date(remessa.updated_at), 'dd/MM/yyyy HH:mm')},${remessa.sender_address?.name || ''},${remessa.recipient_address?.name || ''},${remessa.weight},${remessa.sender_address?.city || ''} - ${remessa.sender_address?.state || ''},${remessa.recipient_address?.city || ''} - ${remessa.recipient_address?.state || ''}`
    ).join('\n');

    const blob = new Blob([csvHeader + csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `entregas_${getDateRangeLabel().replace(' ', '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Relatório exportado com sucesso!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background/80 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-8 w-32 bg-muted rounded mx-auto mb-4"></div>
          <div className="h-4 w-24 bg-muted rounded mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/motorista/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-semibold text-lg">Relatório de Entregas</h1>
                <p className="text-sm text-muted-foreground">
                  {getDateRangeLabel()} • {filteredRemessas.length} entregas
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={exportData} disabled={filteredRemessas.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {stats.totalEntregas}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">Total de Entregas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {stats.totalKg.toFixed(1)}kg
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">Peso Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {formatCurrency(stats.totalValor)}
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-400">Valor Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Período</label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="esta_semana">Esta Semana</SelectItem>
                    <SelectItem value="este_mes">Este Mês</SelectItem>
                    <SelectItem value="mes_passado">Mês Passado</SelectItem>
                    <SelectItem value="este_ano">Este Ano</SelectItem>
                    <SelectItem value="personalizado">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dateFilter === 'personalizado' && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Data Início</label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Data Fim</label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">Buscar</label>
                <Input
                  placeholder="Código ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Remessas List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Entregas Realizadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredRemessas.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Nenhuma entrega encontrada</p>
                <p className="text-sm text-muted-foreground">
                  Tente ajustar os filtros ou realize algumas entregas primeiro.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRemessas.map((remessa) => (
                  <Card key={remessa.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span className="font-semibold">
                            {remessa.tracking_code || `ID${remessa.id.slice(0, 8).toUpperCase()}`}
                          </span>
                        </div>
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Entregue
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <User className="w-3 h-3" />
                            <span>{remessa.sender_address?.name || 'Remetente'}</span>
                          </div>
                          <span className="text-muted-foreground">→</span>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{remessa.recipient_address?.name || 'Destinatário'}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              <span>{remessa.weight}kg</span>
                            </div>
                            <div>
                              {remessa.sender_address?.city} - {remessa.sender_address?.state} → {remessa.recipient_address?.city} - {remessa.recipient_address?.state}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(remessa.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MotoristaRelatorios;