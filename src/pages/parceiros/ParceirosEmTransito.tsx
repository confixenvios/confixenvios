import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Package, 
  Search,
  MapPin,
  Truck,
  RefreshCw,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

interface CarrierPartner {
  id: string;
  company_name: string;
}

interface Shipment {
  id: string;
  tracking_code: string;
  carrier_order_id: string | null;
  status: string;
  created_at: string;
  weight: number;
  recipient_city: string;
  recipient_state: string;
  recipient_name: string;
  sender_city: string;
  sender_state: string;
}

const ParceirosEmTransito = () => {
  const { partner } = useOutletContext<{ partner: CarrierPartner }>();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadShipments();
  }, []);

  const loadShipments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          id,
          tracking_code,
          carrier_order_id,
          status,
          created_at,
          weight,
          recipient_address_id,
          sender_address_id,
          pricing_table_name
        `)
        .ilike('pricing_table_name', '%jadlog%')
        .in('status', ['in_transit', 'accepted', 'shipped'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const shipmentsWithAddresses: Shipment[] = [];
      
      for (const shipment of data || []) {
        const [recipientRes, senderRes] = await Promise.all([
          supabase.from('addresses').select('city, state, name').eq('id', shipment.recipient_address_id).single(),
          supabase.from('addresses').select('city, state').eq('id', shipment.sender_address_id).single()
        ]);

        shipmentsWithAddresses.push({
          id: shipment.id,
          tracking_code: shipment.tracking_code || 'N/A',
          carrier_order_id: shipment.carrier_order_id,
          status: shipment.status,
          created_at: shipment.created_at,
          weight: shipment.weight,
          recipient_city: recipientRes.data?.city || 'N/A',
          recipient_state: recipientRes.data?.state || 'N/A',
          recipient_name: recipientRes.data?.name || 'N/A',
          sender_city: senderRes.data?.city || 'N/A',
          sender_state: senderRes.data?.state || 'N/A'
        });
      }

      setShipments(shipmentsWithAddresses);
    } catch (error) {
      console.error('Error loading shipments:', error);
      toast.error('Erro ao carregar entregas');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredShipments = shipments.filter(s => 
    s.tracking_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.carrier_order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.recipient_city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Em Trânsito</h1>
          <p className="text-muted-foreground">
            Entregas em transporte - {partner?.company_name}
          </p>
        </div>
        <Button onClick={loadShipments} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-500" />
                Em Trânsito ({filteredShipments.length})
              </CardTitle>
              <CardDescription>Entregas atualmente em transporte</CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, destinatário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : filteredShipments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma entrega em trânsito</p>
              <p className="text-sm">Não há entregas em transporte no momento</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Código Jadlog</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Peso</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShipments.map((shipment) => (
                    <TableRow key={shipment.id}>
                      <TableCell className="font-mono text-sm">{shipment.tracking_code}</TableCell>
                      <TableCell className="font-mono text-sm text-blue-600">
                        {shipment.carrier_order_id || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {shipment.sender_city}/{shipment.sender_state}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {shipment.recipient_city}/{shipment.recipient_state}
                        </div>
                      </TableCell>
                      <TableCell>{shipment.recipient_name}</TableCell>
                      <TableCell>{shipment.weight.toFixed(2)} kg</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(shipment.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-500">Em Trânsito</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ParceirosEmTransito;