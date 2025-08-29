import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  Package, 
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Shipment {
  id: string;
  tracking_code: string;
  status: string;
  created_at: string;
  quote_data: any;
  label_pdf_url?: string;
  cte_key?: string;
}

const Etiquetas = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadShipments();
    }
  }, [user]);

  const loadShipments = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShipments(data || []);
    } catch (error) {
      console.error('Error loading shipments:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar suas remessas.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_DOCUMENT':
        return <Badge variant="destructive">Aguardando Documento</Badge>;
      case 'PENDING_PAYMENT':
        return <Badge variant="destructive">Aguardando Pagamento</Badge>;
      case 'PAYMENT_CONFIRMED':
        return <Badge className="bg-info text-info-foreground">Pagamento Confirmado</Badge>;
      case 'AWAITING_LABEL':
        return <Badge variant="secondary">Aguardando Etiqueta</Badge>;
      case 'LABEL_AVAILABLE':
        return <Badge className="bg-success text-success-foreground">Etiqueta Disponível</Badge>;
      case 'SHIPPED':
        return <Badge className="bg-primary text-primary-foreground">Enviado</Badge>;
      case 'DELIVERED':
        return <Badge className="bg-success text-success-foreground">Entregue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING_DOCUMENT':
      case 'PENDING_PAYMENT':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'PAYMENT_CONFIRMED':
      case 'AWAITING_LABEL':
        return <Clock className="h-5 w-5 text-warning" />;
      case 'LABEL_AVAILABLE':
      case 'SHIPPED':
      case 'DELIVERED':
        return <CheckCircle className="h-5 w-5 text-success" />;
      default:
        return <Package className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const handleDownloadLabel = async (shipment: Shipment) => {
    if (!shipment.label_pdf_url) {
      toast({
        title: "Erro",
        description: "URL da etiqueta não encontrada.",
        variant: "destructive"
      });
      return;
    }

    try {
      // In a real implementation, you would fetch the PDF and trigger download
      window.open(shipment.label_pdf_url, '_blank');
      
      toast({
        title: "Sucesso",
        description: "Etiqueta baixada com sucesso!"
      });
    } catch (error) {
      console.error('Error downloading label:', error);
      toast({
        title: "Erro",
        description: "Não foi possível baixar a etiqueta.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Etiquetas</h1>
        <p className="text-muted-foreground">
          Gerencie e baixe as etiquetas de suas remessas
        </p>
      </div>

      {/* Shipments List */}
      {shipments.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12">
            <div className="text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Você ainda não possui remessas
              </p>
              <Button onClick={() => window.location.href = '/dashboard'}>
                Fazer primeira cotação
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {shipments.map((shipment) => (
            <Card key={shipment.id} className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {getStatusIcon(shipment.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">
                          {shipment.tracking_code || 'Sem código'}
                        </h3>
                        {getStatusBadge(shipment.status)}
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Criado em: {new Date(shipment.created_at).toLocaleString('pt-BR')}</p>
                        {shipment.cte_key && (
                          <p>CTe: {shipment.cte_key}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {shipment.status === 'LABEL_AVAILABLE' && shipment.label_pdf_url && (
                      <Button 
                        onClick={() => handleDownloadLabel(shipment)}
                        size="sm"
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Baixar Etiqueta
                      </Button>
                    )}
                    
                    {shipment.status === 'AWAITING_LABEL' && (
                      <div className="text-sm text-muted-foreground text-right">
                        <p>Aguardando sistema</p>
                        <p>externo processar</p>
                      </div>
                    )}
                    
                    {['PENDING_DOCUMENT', 'PENDING_PAYMENT'].includes(shipment.status) && (
                      <div className="text-sm text-muted-foreground text-right">
                        <p>Complete o processo</p>
                        <p>para gerar etiqueta</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Etiquetas;