import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText, 
  Download, 
  Search, 
  Package, 
  Calendar,
  Filter,
  Eye,
  Printer,
  Plus
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";

interface Shipment {
  id: string;
  tracking_code: string;
  status: string;
  label_pdf_url: string | null;
  created_at: string;
  weight: number;
  sender_address: {
    name: string;
    city: string;
    state: string;
  } | null;
  recipient_address: {
    name: string;
    city: string;
    state: string;
  } | null;
  quote_data: any;
}

const ClientEtiquetas = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      loadShipments();
    }
  }, [user]);

  const loadShipments = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: shipmentsData, error } = await supabase
        .from('shipments')
        .select(`
          id,
          tracking_code,
          status,
          label_pdf_url,
          created_at,
          weight,
          quote_data,
          sender_address:addresses!sender_address_id(name, city, state),
          recipient_address:addresses!recipient_address_id(name, city, state)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading shipments:', error);
        toast({
          title: "Erro ao carregar etiquetas",
          description: "Não foi possível carregar suas etiquetas.",
          variant: "destructive"
        });
      } else {
        setShipments(shipmentsData || []);
      }
    } catch (error) {
      console.error('Error loading shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LABEL_AVAILABLE':
        return <Badge className="bg-success text-success-foreground">Etiqueta Disponível</Badge>;
      case 'PAID':
        return <Badge className="bg-success text-success-foreground">Pago</Badge>;
      case 'DELIVERED':
        return <Badge className="bg-success text-success-foreground">Entregue</Badge>;
      case 'PENDING_LABEL':
        return <Badge variant="destructive">Aguardando Etiqueta</Badge>;
      case 'PENDING_PAYMENT':
        return <Badge variant="destructive">Aguardando Pagamento</Badge>;
      case 'PAYMENT_CONFIRMED':
        return <Badge className="bg-info text-info-foreground">Pagamento Confirmado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleDownloadLabel = async (shipment: Shipment) => {
    if (!shipment.label_pdf_url) {
      toast({
        title: "Etiqueta não disponível",
        description: "A etiqueta ainda não foi gerada para esta remessa.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Open the PDF URL in a new tab for download
      window.open(shipment.label_pdf_url, '_blank');
      
      toast({
        title: "Download iniciado",
        description: "A etiqueta está sendo baixada.",
      });
    } catch (error) {
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar a etiqueta.",
        variant: "destructive"
      });
    }
  };

  const handleViewLabel = (shipment: Shipment) => {
    if (!shipment.label_pdf_url) {
      toast({
        title: "Etiqueta não disponível",
        description: "A etiqueta ainda não foi gerada para esta remessa.",
        variant: "destructive"
      });
      return;
    }

    window.open(shipment.label_pdf_url, '_blank');
  };

  const handlePrintLabel = (shipment: Shipment) => {
    if (!shipment.label_pdf_url) {
      toast({
        title: "Etiqueta não disponível",
        description: "A etiqueta ainda não foi gerada para esta remessa.",
        variant: "destructive"
      });
      return;
    }

    // Open PDF in new window and trigger print
    const printWindow = window.open(shipment.label_pdf_url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = !searchTerm || 
      shipment.tracking_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.sender_address?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.recipient_address?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'available' && shipment.label_pdf_url) ||
      (statusFilter === 'unavailable' && !shipment.label_pdf_url) ||
      shipment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const availableLabelsCount = shipments.filter(s => s.label_pdf_url).length;
  const pendingLabelsCount = shipments.filter(s => !s.label_pdf_url).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center">
          <FileText className="mr-3 h-8 w-8 text-primary" />
          Etiquetas
        </h1>
        <p className="text-muted-foreground">
          Visualize, baixe e imprima as etiquetas das suas remessas
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/50 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total de Remessas</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? '...' : shipments.length}
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
                <p className="text-sm font-medium text-muted-foreground mb-1">Etiquetas Disponíveis</p>
                <p className="text-2xl font-bold text-success">
                  {loading ? '...' : availableLabelsCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Aguardando Etiqueta</p>
                <p className="text-2xl font-bold text-warning">
                  {loading ? '...' : pendingLabelsCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código de rastreamento ou nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status da etiqueta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="available">Disponíveis</SelectItem>
                  <SelectItem value="unavailable">Indisponíveis</SelectItem>
                  <SelectItem value="LABEL_AVAILABLE">Etiqueta Disponível</SelectItem>
                  <SelectItem value="PENDING_LABEL">Aguardando Etiqueta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipments List */}
      <Card className="border-border/50 shadow-card">
        <CardHeader>
          <CardTitle>Suas Etiquetas</CardTitle>
          <CardDescription>
            {filteredShipments.length === 0 && !loading 
              ? "Nenhuma remessa encontrada"
              : `${filteredShipments.length} remessa(s) encontrada(s)`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : filteredShipments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma remessa encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? "Tente ajustar os filtros de pesquisa"
                  : "Você ainda não possui remessas com etiquetas"
                }
              </p>
              <Button asChild>
                <Link to="/cliente/cotacoes">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Cotação
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredShipments.map((shipment) => (
                <div key={shipment.id} className="border border-border rounded-lg p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-foreground">
                          {shipment.tracking_code || `ID${shipment.id.slice(0, 8).toUpperCase()}`}
                        </h4>
                        {getStatusBadge(shipment.status)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="space-y-1">
                          <p><strong>Remetente:</strong> {shipment.sender_address?.name || 'N/A'}</p>
                          <p><strong>Destinatário:</strong> {shipment.recipient_address?.name || 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                          <p><strong>Peso:</strong> {shipment.weight}kg</p>
                          <p className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(shipment.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      {shipment.label_pdf_url ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewLabel(shipment)}
                            className="flex items-center"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Visualizar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrintLabel(shipment)}
                            className="flex items-center"
                          >
                            <Printer className="w-4 h-4 mr-2" />
                            Imprimir
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleDownloadLabel(shipment)}
                            className="flex items-center"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Baixar
                          </Button>
                        </>
                      ) : (
                        <Alert className="max-w-sm">
                          <AlertDescription className="text-xs">
                            Etiqueta será gerada após confirmação do pagamento
                          </AlertDescription>
                        </Alert>
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

export default ClientEtiquetas;