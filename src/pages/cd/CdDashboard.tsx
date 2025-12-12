import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Package, Truck, CheckCircle, LogOut, MapPin, RefreshCw, Search, Route } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CdUser {
  id: string;
  nome: string;
  email: string;
}

interface B2BShipment {
  id: string;
  tracking_code: string;
  status: string;
  created_at: string;
  recipient_name: string | null;
  recipient_phone: string | null;
  recipient_cep: string | null;
  recipient_city: string | null;
  recipient_state: string | null;
  recipient_street: string | null;
  recipient_number: string | null;
  recipient_neighborhood: string | null;
  volume_count: number | null;
  volume_weight: number | null;
  volume_eti_code: string | null;
}

const CdDashboard = () => {
  const navigate = useNavigate();
  const [cdUser, setCdUser] = useState<CdUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<B2BShipment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('em_transito');
  
  const [arrivalModalOpen, setArrivalModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<B2BShipment | null>(null);
  const [etiInput, setEtiInput] = useState('');
  const [validating, setValidating] = useState(false);

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchEtiInput, setSearchEtiInput] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedUser = localStorage.getItem('cd_user');
      if (!storedUser) {
        navigate('/cd/auth');
        return;
      }
      setCdUser(JSON.parse(storedUser));
      await loadShipments();
    } catch (error) {
      navigate('/cd/auth');
    } finally {
      setLoading(false);
    }
  };

  const loadShipments = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('b2b_shipments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setShipments(data || []);
    } catch (error) {
      toast.error('Erro ao carregar remessas');
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cd_user');
    navigate('/cd/auth');
  };

  const handleRegisterArrival = async () => {
    if (!selectedShipment || !etiInput.trim()) return;
    setValidating(true);
    try {
      const expectedEti = selectedShipment.volume_eti_code?.replace('ETI-', '').padStart(4, '0');
      if (expectedEti !== etiInput.padStart(4, '0')) {
        toast.error('Código ETI incorreto');
        return;
      }
      await supabase.from('b2b_shipments').update({ status: 'NO_CD' }).eq('id', selectedShipment.id);
      toast.success('Chegada registrada!');
      setArrivalModalOpen(false);
      setEtiInput('');
      await loadShipments();
    } catch (error) {
      toast.error('Erro ao registrar chegada');
    } finally {
      setValidating(false);
    }
  };

  const handleSendToRoute = async () => {
    if (!searchEtiInput.trim()) return;
    setSearching(true);
    try {
      const shipment = shipments.find(s => 
        s.volume_eti_code?.replace('ETI-', '').padStart(4, '0') === searchEtiInput.padStart(4, '0') && s.status === 'NO_CD'
      );
      if (!shipment) {
        toast.error('Remessa não encontrada no CD');
        return;
      }
      await supabase.from('b2b_shipments').update({ status: 'EM_ROTA' }).eq('id', shipment.id);
      toast.success(`${shipment.tracking_code} enviada para rota!`);
      setSearchModalOpen(false);
      setSearchEtiInput('');
      await loadShipments();
    } catch (error) {
      toast.error('Erro ao enviar');
    } finally {
      setSearching(false);
    }
  };

  const emTransito = shipments.filter(s => ['PENDENTE_COLETA', 'EM_TRANSITO'].includes(s.status));
  const noCd = shipments.filter(s => s.status === 'NO_CD');
  const emRota = shipments.filter(s => s.status === 'EM_ROTA');
  const entregues = shipments.filter(s => s.status === 'ENTREGUE');

  const renderCard = (s: B2BShipment, showArrival = false) => (
    <Card key={s.id} className="mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between mb-2">
          <div>
            <h3 className="font-mono font-medium">{s.tracking_code}</h3>
            {s.volume_eti_code && <Badge variant="outline" className="bg-purple-50">{s.volume_eti_code}</Badge>}
          </div>
          <Badge className={s.status === 'ENTREGUE' ? 'bg-green-500' : s.status === 'EM_ROTA' ? 'bg-blue-500' : s.status === 'NO_CD' ? 'bg-purple-500' : 'bg-orange-500'}>
            {s.status === 'PENDENTE_COLETA' ? 'Em Trânsito' : s.status.replace('_', ' ')}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          <MapPin className="h-3 w-3 inline mr-1" />
          {s.recipient_name} - {s.recipient_city}/{s.recipient_state}
        </div>
        {showArrival && (
          <Button size="sm" className="w-full mt-3 bg-purple-600" onClick={() => { setSelectedShipment(s); setArrivalModalOpen(true); }}>
            <CheckCircle className="h-4 w-4 mr-2" />Registrar Chegada
          </Button>
        )}
      </CardContent>
    </Card>
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse">Carregando...</div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-purple-600" />
            <div><h1 className="font-semibold">Centro de Distribuição</h1><p className="text-sm text-muted-foreground">{cdUser?.nome}</p></div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadShipments}><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /></Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-4 gap-3 mb-4">
          <Card><CardContent className="p-3 text-center"><Truck className="h-5 w-5 mx-auto text-orange-500" /><p className="text-2xl font-bold">{emTransito.length}</p><p className="text-xs">Em Trânsito</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><Package className="h-5 w-5 mx-auto text-purple-500" /><p className="text-2xl font-bold">{noCd.length}</p><p className="text-xs">No CD</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><Route className="h-5 w-5 mx-auto text-blue-500" /><p className="text-2xl font-bold">{emRota.length}</p><p className="text-xs">Em Rota</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><CheckCircle className="h-5 w-5 mx-auto text-green-500" /><p className="text-2xl font-bold">{entregues.length}</p><p className="text-xs">Entregues</p></CardContent></Card>
        </div>

        <Button className="w-full mb-4 bg-blue-600" onClick={() => setSearchModalOpen(true)}><Search className="h-4 w-4 mr-2" />Enviar Volume para Rota</Button>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="em_transito">Em Trânsito</TabsTrigger>
            <TabsTrigger value="no_cd">No CD</TabsTrigger>
            <TabsTrigger value="em_rota">Em Rota</TabsTrigger>
            <TabsTrigger value="entregues">Entregues</TabsTrigger>
          </TabsList>
          <TabsContent value="em_transito">{emTransito.length ? emTransito.map(s => renderCard(s, true)) : <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma remessa</CardContent></Card>}</TabsContent>
          <TabsContent value="no_cd">{noCd.length ? noCd.map(s => renderCard(s)) : <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma remessa</CardContent></Card>}</TabsContent>
          <TabsContent value="em_rota">{emRota.length ? emRota.map(s => renderCard(s)) : <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma remessa</CardContent></Card>}</TabsContent>
          <TabsContent value="entregues">{entregues.length ? entregues.map(s => renderCard(s)) : <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma remessa</CardContent></Card>}</TabsContent>
        </Tabs>
      </main>

      <Dialog open={arrivalModalOpen} onOpenChange={setArrivalModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Chegada</DialogTitle></DialogHeader>
          <p className="text-sm">Remessa: <span className="font-mono">{selectedShipment?.tracking_code}</span></p>
          <Input placeholder="0001" value={etiInput} onChange={e => setEtiInput(e.target.value.replace(/\D/g, '').slice(0, 4))} className="text-center text-2xl font-mono" />
          <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => setArrivalModalOpen(false)}>Cancelar</Button><Button className="flex-1 bg-purple-600" onClick={handleRegisterArrival} disabled={validating}>{validating ? '...' : 'Confirmar'}</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={searchModalOpen} onOpenChange={setSearchModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enviar para Rota</DialogTitle></DialogHeader>
          <Input placeholder="0001" value={searchEtiInput} onChange={e => setSearchEtiInput(e.target.value.replace(/\D/g, '').slice(0, 4))} className="text-center text-2xl font-mono" />
          <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => setSearchModalOpen(false)}>Cancelar</Button><Button className="flex-1 bg-blue-600" onClick={handleSendToRoute} disabled={searching}>{searching ? '...' : 'Enviar'}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CdDashboard;
