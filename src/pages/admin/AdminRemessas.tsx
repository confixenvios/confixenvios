import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Package, Eye, Download, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Shipment {
  id: string;
  trackingCode: string;
  client: string;
  origin: string;
  destination: string;
  weight: string;
  value: number;
  status: 'PENDING_LABEL' | 'PENDING_DOCUMENT' | 'PAID' | 'IN_TRANSIT' | 'DELIVERED';
  createdAt: string;
}

const Remessas = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Mock data for demo
  const mockShipments: Shipment[] = [
    {
      id: "1",
      trackingCode: "TRK-2024ABC123",
      client: "João Silva",
      origin: "01310-100",
      destination: "04567-890",
      weight: "2.5kg",
      value: 55.80,
      status: "IN_TRANSIT",
      createdAt: "2024-01-28T10:30:00"
    },
    {
      id: "2", 
      trackingCode: "TRK-2024XYZ789",
      client: "Maria Santos",
      origin: "20040-020",
      destination: "30112-000",
      weight: "1.2kg",
      value: 45.50,
      status: "DELIVERED",
      createdAt: "2024-01-27T14:15:00"
    },
    {
      id: "3",
      trackingCode: "TRK-2024DEF456",
      client: "Pedro Oliveira", 
      origin: "90010-150",
      destination: "80010-000",
      weight: "3.8kg",
      value: 75.20,
      status: "PENDING_DOCUMENT",
      createdAt: "2024-01-29T09:20:00"
    },
    {
      id: "4",
      trackingCode: "TRK-2024GHI789",
      client: "Ana Costa",
      origin: "50070-110",
      destination: "40020-110",
      weight: "0.8kg", 
      value: 35.90,
      status: "PAID",
      createdAt: "2024-01-29T16:45:00"
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

  const handleViewShipment = (shipment: Shipment) => {
    toast({
      title: "Detalhes da Remessa",
      description: `Visualizando remessa ${shipment.trackingCode}`,
    });
  };

  const handleDownloadLabel = (shipment: Shipment) => {
    toast({
      title: "Download iniciado",
      description: `Baixando etiqueta para ${shipment.trackingCode}`,
    });
  };

  const filteredShipments = mockShipments.filter(shipment => {
    const matchesSearch = shipment.trackingCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shipment.client.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || shipment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Remessas</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie todas as remessas do sistema
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-primary">
            {filteredShipments.length} remessas
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Código ou cliente..."
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
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Lista de Remessas</span>
          </CardTitle>
          <CardDescription>
            Todas as remessas registradas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Origem → Destino</TableHead>
                  <TableHead>Peso</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShipments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma remessa encontrada</p>
                        <p className="text-sm">Tente ajustar os filtros</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredShipments.map((shipment) => (
                    <TableRow key={shipment.id}>
                      <TableCell className="font-medium font-mono">
                        {shipment.trackingCode}
                      </TableCell>
                      <TableCell>{shipment.client}</TableCell>
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
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(shipment.createdAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewShipment(shipment)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDownloadLabel(shipment)}
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

export default Remessas;