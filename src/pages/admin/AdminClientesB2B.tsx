import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, Users, Package, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface B2BClient {
  id: string;
  company_name: string;
  email: string;
  phone: string | null;
  cnpj: string | null;
  is_active: boolean;
  created_at: string;
  _count?: {
    shipments: number;
  };
}

const AdminClientesB2B = () => {
  const [clients, setClients] = useState<B2BClient[]>([]);
  const [filteredClients, setFilteredClients] = useState<B2BClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    const filtered = clients.filter(client =>
      client.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.cnpj && client.cnpj.includes(searchTerm))
    );
    setFilteredClients(filtered);
  }, [searchTerm, clients]);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('b2b_clients')
        .select(`
          *,
          b2b_shipments(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const clientsWithCount = data.map(client => ({
        ...client,
        _count: {
          shipments: client.b2b_shipments?.[0]?.count || 0
        }
      }));

      setClients(clientsWithCount);
      setFilteredClients(clientsWithCount);
    } catch (error: any) {
      toast.error('Erro ao carregar clientes B2B');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    try {
      const { data: shipmentsData, error } = await supabase
        .from('b2b_shipments')
        .select(`
          *,
          b2b_clients(company_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const exportData = shipmentsData.map(shipment => ({
        'Cliente': shipment.b2b_clients?.company_name || '',
        'E-mail': shipment.b2b_clients?.email || '',
        'Código Rastreio': shipment.tracking_code,
        'Data': format(new Date(shipment.created_at), 'dd/MM/yyyy'),
        'Tipo de Entrega': shipment.delivery_type === 'mesmo_dia' ? 'Mesmo Dia' : 'Próximo Dia',
        'Destinatário': shipment.recipient_name,
        'Endereço': `${shipment.recipient_street}, ${shipment.recipient_number} - ${shipment.recipient_neighborhood}`,
        'Cidade': shipment.recipient_city,
        'Estado': shipment.recipient_state,
        'Status': shipment.status,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Remessas B2B');
      
      const fileName = `remessas-b2b-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast.success('Relatório exportado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao exportar relatório');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <Package className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Clientes Expresso</h1>
          <p className="text-muted-foreground">Gerencie os clientes do módulo Expresso</p>
        </div>
        <Button onClick={exportToExcel}>
          <FileDown className="mr-2 h-4 w-4" />
          Exportar Relatório
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
            <p className="text-xs text-muted-foreground">clientes cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients.filter(c => c.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground">com acesso ativo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Remessas</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients.reduce((sum, c) => sum + (c._count?.shipments || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">remessas cadastradas</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Lista de Clientes</CardTitle>
              <CardDescription>
                <Input
                  placeholder="Buscar por nome, e-mail ou CNPJ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-md"
                />
              </CardDescription>
            </div>
            <Button onClick={() => window.location.href = '/admin/clientes-b2b/novo'}>
              <Building2 className="mr-2 h-4 w-4" />
              Novo Cliente B2B
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum cliente encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{client.company_name}</h3>
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">
                        B2B Expresso
                      </Badge>
                      {client.is_active ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><strong>E-mail:</strong> {client.email}</p>
                      {client.phone && <p><strong>Telefone:</strong> {client.phone}</p>}
                      {client.cnpj && <p><strong>CNPJ:</strong> {client.cnpj}</p>}
                      <p><strong>Remessas:</strong> {client._count?.shipments || 0}</p>
                      <p className="text-xs">
                        Cadastrado em {format(new Date(client.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
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

export default AdminClientesB2B;
