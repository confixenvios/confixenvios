import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, FileDown, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface B2BShipment {
  id: string;
  tracking_code: string;
  recipient_name: string;
  recipient_city: string;
  recipient_state: string;
  delivery_type: string;
  status: string;
  created_at: string;
  recipient_street: string;
  recipient_number: string;
  recipient_neighborhood: string;
  recipient_phone: string;
}

const B2BRelatorios = () => {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<B2BShipment[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<B2BShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadShipments();
  }, []);

  useEffect(() => {
    const filtered = shipments.filter(shipment =>
      shipment.tracking_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.recipient_city.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredShipments(filtered);
  }, [searchTerm, shipments]);

  const loadShipments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/b2b-expresso');
        return;
      }

      const { data: clientData } = await supabase
        .from('b2b_clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!clientData) {
        toast.error('Cliente não encontrado');
        navigate('/b2b-expresso');
        return;
      }

      const { data: shipmentsData, error } = await supabase
        .from('b2b_shipments')
        .select('*')
        .eq('b2b_client_id', clientData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShipments(shipmentsData || []);
      setFilteredShipments(shipmentsData || []);
    } catch (error: any) {
      toast.error('Erro ao carregar envios');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const exportData = filteredShipments.map(shipment => ({
      'Código de Rastreio': shipment.tracking_code,
      'Data': format(new Date(shipment.created_at), 'dd/MM/yyyy HH:mm'),
      'Destinatário': shipment.recipient_name || '-',
      'Telefone': shipment.recipient_phone || '-',
      'Endereço': shipment.recipient_street 
        ? `${shipment.recipient_street}, ${shipment.recipient_number} - ${shipment.recipient_neighborhood}`
        : '-',
      'Cidade': shipment.recipient_city || '-',
      'Estado': shipment.recipient_state || '-',
      'Tipo de Entrega': shipment.delivery_type 
        ? (shipment.delivery_type === 'mesmo_dia' ? 'Mesmo Dia' : 'Próximo Dia')
        : '-',
      'Status': getStatusLabel(shipment.status),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Envios');
    
    const fileName = `relatorio-envios-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    toast.success('Relatório exportado com sucesso!');
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDENTE: 'Pendente',
      EM_TRANSITO: 'Em Trânsito',
      CONCLUIDA: 'Concluída',
      CANCELADA: 'Cancelada',
    };
    return labels[status] || status;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      PENDENTE: { variant: 'secondary', label: 'Pendente' },
      EM_TRANSITO: { variant: 'default', label: 'Em Trânsito' },
      CONCLUIDA: { variant: 'outline', label: 'Concluída' },
      CANCELADA: { variant: 'destructive', label: 'Cancelada' },
    };
    const config = variants[status] || variants.PENDENTE;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getDeliveryTypeLabel = (type: string) => {
    return type === 'mesmo_dia' ? 'Mesmo Dia' : 'Próximo Dia';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Package className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Visualize e exporte seus envios</p>
        </div>
        <Button onClick={exportToExcel} disabled={filteredShipments.length === 0}>
          <FileDown className="mr-2 h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Todos os Envios</CardTitle>
            <CardDescription>
              {filteredShipments.length} envio(s) encontrado(s)
            </CardDescription>
          </div>
            <div className="w-64">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, nome ou cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
        {filteredShipments.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Nenhum envio encontrado' : 'Nenhum envio cadastrado ainda'}
            </p>
          </div>
          ) : (
            <div className="space-y-4">
              {filteredShipments.map((shipment) => (
                <div
                  key={shipment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-mono text-sm font-semibold">{shipment.tracking_code}</p>
                      {getStatusBadge(shipment.status)}
                      <Badge variant="outline" className="text-xs">
                        {getDeliveryTypeLabel(shipment.delivery_type)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <strong>{shipment.recipient_name}</strong> - {shipment.recipient_city}/{shipment.recipient_state}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(shipment.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </p>
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

export default B2BRelatorios;
