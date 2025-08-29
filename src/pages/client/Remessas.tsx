import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Package, Eye, Download, MapPin, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface UserShipment {
  id: string;
  trackingCode: string;
  origin: string;
  destination: string;
  weight: string;
  value: number;
  status: 'PENDING_LABEL' | 'PENDING_DOCUMENT' | 'PAID' | 'IN_TRANSIT' | 'DELIVERED';
  estimatedDelivery: string;
  createdAt: string;
}

const RemessasCliente = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Mock data for demo - user's shipments
  const mockShipments: UserShipment[] = [
    {
      id: "1",
      trackingCode: "TRK-2024ABC123",
      origin: "01310-100",
      destination: "04567-890",
      weight: "2.5kg",
      value: 55.80,
      status: "IN_TRANSIT",
      estimatedDelivery: "29/01/2024",
      createdAt: "2024-01-28T10:30:00"
    },
    {
      id: "2", 
      trackingCode: "TRK-2024XYZ789",
      origin: "01310-100",
      destination: "30112-000",
      weight: "1.2kg",
      value: 45.50,
      status: "DELIVERED",
      estimatedDelivery: "27/01/2024",
      createdAt: "2024-01-25T14:15:00"
    },
    {
      id: "3",
      trackingCode: "TRK-2024DEF456",
      origin: "01310-100",
      destination: "80010-000",
      weight: "3.8kg",
      value: 75.20,
      status: "PENDING_DOCUMENT",
      estimatedDelivery: "31/01/2024",
      createdAt: "2024-01-29T09:20:00"
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'PENDING_LABEL': { label: 'Aguardando Etiqueta', variant: 'destructive' as const },
      'PENDING_DOCUMENT': { label: 'Aguardando Documento', variant: 'destructive' as const },
      'PAID': { label: 'Pago', variant: 'default' as const },
      'IN_TRANSIT': { label: 'Em Trânsito', variant: 'default' as const },
      'DELIVERED': { label: 'Entregue', variant: 'secondary' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const handleTrackShipment = (trackingCode: string) => {
    window.open(`/rastreio/${trackingCode}`, '_blank');
  };

  const handleDownloadLabel = (shipment: UserShipment) => {
    if (shipment.status === 'PENDING_LABEL' || shipment.status === 'PENDING_DOCUMENT') {
      toast({
        title: "Etiqueta não disponível",
        description: "A etiqueta será liberada após o pagamento e processamento",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Download iniciado",
      description: `Baixando etiqueta para ${shipment.trackingCode}`,
    });
  };

  const filteredShipments = mockShipments.filter(shipment => {
    const matchesSearch = shipment.trackingCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || shipment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Minhas Remessas</h1>
          <p className="text-muted-foreground">
            Acompanhe todas as suas remessas e downloads
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-primary">
            {filteredShipments.length} remessas
          </Badge>
          <Button asChild className="bg-gradient-primary">
            <Link to="/#quote-form">
              <Package className="h-4 w-4 mr-2" />
              Nova Cotação
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold text-primary mt-1">
              {mockShipments.length}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium">Em Trânsito</span>
            </div>
            <p className="text-2xl font-bold text-warning mt-1">
              {mockShipments.filter(s => s.status === 'IN_TRANSIT').length}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-success" />
              <span className="text-sm font-medium">Entregues</span>
            </div>
            <p className="text-2xl font-bold text-success mt-1">
              {mockShipments.filter(s => s.status === 'DELIVERED').length}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">Pendentes</span>
            </div>
            <p className="text-2xl font-bold text-destructive mt-1">
              {mockShipments.filter(s => s.status.includes('PENDING')).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Código de rastreamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="PENDING_LABEL">Aguardando Etiqueta</SelectItem>
                  <SelectItem value="PENDING_DOCUMENT">Aguardando Documento</SelectItem>
                  <SelectItem value="PAID">Pago</SelectItem>
                  <SelectItem value="IN_TRANSIT">Em Trânsito</SelectItem>
                  <SelectItem value="DELIVERED">Entregue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Suas Remessas</CardTitle>
          <CardDescription>
            Histórico completo de todos os seus envios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Origem → Destino</TableHead>
                  <TableHead>Peso</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Previsão</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShipments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma remessa encontrada</p>
                        <p className="text-sm mb-4">Que tal fazer sua primeira cotação?</p>
                        <Button asChild size="sm">
                          <Link to="/#quote-form">
                            Fazer Cotação
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredShipments.map((shipment) => (
                    <TableRow key={shipment.id}>
                      <TableCell className="font-medium font-mono">
                        {shipment.trackingCode}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="space-y-1">
                          <div>{shipment.origin}</div>
                          <div className="text-muted-foreground">↓</div>
                          <div>{shipment.destination}</div>
                        </div>
                      </TableCell>
                      <TableCell>{shipment.weight}</TableCell>
                      <TableCell className="font-medium">
                        R$ {shipment.value.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(shipment.status)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {shipment.estimatedDelivery}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTrackShipment(shipment.trackingCode)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDownloadLabel(shipment)}
                            disabled={shipment.status === 'PENDING_LABEL' || shipment.status === 'PENDING_DOCUMENT'}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RemessasCliente;