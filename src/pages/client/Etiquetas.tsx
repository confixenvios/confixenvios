import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, Package, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface LabelStatus {
  id: string;
  trackingCode: string;
  origin: string;
  destination: string;
  weight: string;
  value: number;
  labelStatus: 'PENDING' | 'APPROVED' | 'ERROR';
  createdAt: string;
  approvedAt?: string;
  downloadCount: number;
}

const Etiquetas = () => {
  const { toast } = useToast();

  // Mock data for demo
  const mockLabels: LabelStatus[] = [
    {
      id: "1",
      trackingCode: "TRK-2024ABC123",
      origin: "01310-100",
      destination: "04567-890",
      weight: "2.5kg",
      value: 55.80,
      labelStatus: "APPROVED",
      createdAt: "2024-01-28T10:30:00",
      approvedAt: "2024-01-28T11:15:00",
      downloadCount: 2
    },
    {
      id: "2", 
      trackingCode: "TRK-2024XYZ789",
      origin: "01310-100",
      destination: "30112-000",
      weight: "1.2kg",
      value: 45.50,
      labelStatus: "APPROVED",
      createdAt: "2024-01-25T14:15:00",
      approvedAt: "2024-01-25T14:45:00",
      downloadCount: 1
    },
    {
      id: "3",
      trackingCode: "TRK-2024DEF456",
      origin: "01310-100",
      destination: "80010-000",
      weight: "3.8kg",
      value: 75.20,
      labelStatus: "PENDING",
      createdAt: "2024-01-29T09:20:00",
      downloadCount: 0
    },
    {
      id: "4",
      trackingCode: "TRK-2024GHI789",
      origin: "01310-100",
      destination: "40020-110",
      weight: "0.8kg",
      value: 35.90,
      labelStatus: "ERROR",
      createdAt: "2024-01-27T16:45:00",
      downloadCount: 0
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'PENDING': { 
        label: 'Aguardando Aprovação', 
        variant: 'destructive' as const,
        icon: Clock
      },
      'APPROVED': { 
        label: 'Etiqueta Disponível', 
        variant: 'default' as const,
        icon: CheckCircle
      },
      'ERROR': { 
        label: 'Erro no Processamento', 
        variant: 'destructive' as const,
        icon: AlertCircle
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const IconComponent = config.icon;
    
    return (
      <div className="flex items-center space-x-2">
        <IconComponent className="h-4 w-4" />
        <Badge variant={config.variant}>
          {config.label}
        </Badge>
      </div>
    );
  };

  const handleDownloadLabel = (label: LabelStatus) => {
    if (label.labelStatus !== 'APPROVED') {
      toast({
        title: "Etiqueta não disponível",
        description: "A etiqueta ainda não foi aprovada pelo sistema TMS",
        variant: "destructive"
      });
      return;
    }

    // Simulate PDF download
    toast({
      title: "Download iniciado!",
      description: `Baixando etiqueta para ${label.trackingCode}`,
    });

    // In a real app, this would trigger the actual PDF download
    setTimeout(() => {
      toast({
        title: "Download concluído!",
        description: "Etiqueta salva na pasta de downloads",
      });
    }, 2000);
  };

  const approvedLabels = mockLabels.filter(l => l.labelStatus === 'APPROVED');
  const pendingLabels = mockLabels.filter(l => l.labelStatus === 'PENDING');
  const errorLabels = mockLabels.filter(l => l.labelStatus === 'ERROR');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Etiquetas</h1>
          <p className="text-muted-foreground">
            Baixe as etiquetas das suas remessas aprovadas
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-primary">
            {mockLabels.length} etiquetas
          </Badge>
          <Button asChild className="bg-gradient-primary">
            <Link to="/#quote-form">
              <Package className="h-4 w-4 mr-2" />
              Nova Cotação
            </Link>
          </Button>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-sm font-medium">Disponíveis</span>
            </div>
            <p className="text-2xl font-bold text-success mt-1">
              {approvedLabels.length}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium">Aguardando</span>
            </div>
            <p className="text-2xl font-bold text-warning mt-1">
              {pendingLabels.length}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">Com Erro</span>
            </div>
            <p className="text-2xl font-bold text-destructive mt-1">
              {errorLabels.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Process Info */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-primary text-lg">
            <FileText className="h-5 w-5" />
            <span>Como funciona o processo</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">1</div>
            <div>
              <p className="font-medium">Pagamento Aprovado</p>
              <p className="text-muted-foreground">Após o pagamento, enviamos automaticamente os dados para o sistema TMS</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-warning text-warning-foreground rounded-full flex items-center justify-center text-xs font-bold">2</div>
            <div>
              <p className="font-medium">Aguardando Aprovação</p>
              <p className="text-muted-foreground">O sistema TMS processa a solicitação e gera a etiqueta oficial</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-success text-success-foreground rounded-full flex items-center justify-center text-xs font-bold">3</div>
            <div>
              <p className="font-medium">Etiqueta Disponível</p>
              <p className="text-muted-foreground">Você pode baixar e imprimir a etiqueta em formato PDF</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Labels Table */}
      <Card>
        <CardHeader>
          <CardTitle>Suas Etiquetas</CardTitle>
          <CardDescription>
            Status e downloads das etiquetas de envio
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
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockLabels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma etiqueta encontrada</p>
                        <p className="text-sm mb-4">Faça sua primeira cotação para gerar etiquetas</p>
                        <Button asChild size="sm">
                          <Link to="/#quote-form">
                            Fazer Cotação
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  mockLabels.map((label) => (
                    <TableRow key={label.id}>
                      <TableCell className="font-medium font-mono">
                        {label.trackingCode}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="space-y-1">
                          <div>{label.origin}</div>
                          <div className="text-muted-foreground">↓</div>
                          <div>{label.destination}</div>
                        </div>
                      </TableCell>
                      <TableCell>{label.weight}</TableCell>
                      <TableCell className="font-medium">
                        R$ {label.value.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(label.labelStatus)}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>
                          <p>{new Date(label.createdAt).toLocaleDateString('pt-BR')}</p>
                          {label.approvedAt && (
                            <p className="text-xs text-muted-foreground">
                              Aprovada: {new Date(label.approvedAt).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant={label.labelStatus === 'APPROVED' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => handleDownloadLabel(label)}
                            disabled={label.labelStatus !== 'APPROVED'}
                            className={label.labelStatus === 'APPROVED' ? 'bg-gradient-primary' : ''}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            {label.labelStatus === 'APPROVED' ? 'Baixar PDF' : 'Indisponível'}
                          </Button>
                          {label.downloadCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {label.downloadCount}x
                            </span>
                          )}
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

export default Etiquetas;