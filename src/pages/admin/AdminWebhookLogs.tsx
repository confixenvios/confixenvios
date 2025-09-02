import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Search, 
  RefreshCw, 
  Filter,
  Calendar,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

interface WebhookLog {
  id: string;
  shipment_id: string;
  event_type: string;
  payload: any;
  response_status: number;
  response_body: any;
  created_at: string;
  source_ip?: string;
  user_agent?: string;
}

const AdminWebhookLogs = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      
      // Load real webhook logs from database
      const { data: webhookLogs, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setLogs(webhookLogs || []);
    } catch (error) {
      console.error('Error loading webhook logs:', error);
      toast({
        title: "Erro ao carregar logs",
        description: "Não foi possível carregar os logs de webhook.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) {
      return (
        <Badge className="bg-success text-success-foreground">
          <CheckCircle className="w-3 h-3 mr-1" />
          {status}
        </Badge>
      );
    } else if (status >= 400 && status < 500) {
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          {status}
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary">
          <Clock className="w-3 h-3 mr-1" />
          {status}
        </Badge>
      );
    }
  };

  const getEventTypeBadge = (eventType: string) => {
    switch (eventType) {
      case 'shipment_label_ready':
        return <Badge variant="outline">Etiqueta Pronta</Badge>;
      case 'shipment_confirmed':
        return <Badge variant="outline">Remessa Confirmada</Badge>;
      default:
        return <Badge variant="secondary">{eventType}</Badge>;
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.shipment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.source_ip && log.source_ip.includes(searchTerm));
    
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'success' && log.response_status >= 200 && log.response_status < 300) ||
      (statusFilter === 'error' && log.response_status >= 400);
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Logs de Webhooks</h1>
        <p className="text-muted-foreground">
          Histórico de todas as chamadas recebidas no endpoint de integração TMS
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por ID da remessa, tipo de evento ou IP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                Todos
              </Button>
              <Button
                variant={statusFilter === 'success' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('success')}
                className="text-success hover:text-success"
              >
                Sucesso
              </Button>
              <Button
                variant={statusFilter === 'error' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('error')}
                className="text-destructive hover:text-destructive"
              >
                Erro
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadLogs}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Logs de Integração</span>
            </span>
            <Badge variant="secondary">
              {filteredLogs.length} {filteredLogs.length === 1 ? 'registro' : 'registros'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum log encontrado</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Nenhum log corresponde aos filtros aplicados.' 
                  : 'Nenhuma chamada de webhook foi registrada ainda.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <Card key={log.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {log.shipment_id}
                          </Badge>
                          {getEventTypeBadge(log.event_type)}
                          {getStatusBadge(log.response_status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground mb-1">Payload Recebido:</p>
                            <pre className="bg-muted p-2 rounded text-xs overflow-x-auto max-h-24">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Resposta:</p>
                            <pre className="bg-muted p-2 rounded text-xs overflow-x-auto max-h-24">
                              {JSON.stringify(log.response_body, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right lg:min-w-0 lg:w-48">
                        <div className="flex items-center justify-end space-x-2 mb-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {new Date(log.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        
                        {log.source_ip && (
                          <p className="text-xs text-muted-foreground mb-1">
                            IP: {log.source_ip}
                          </p>
                        )}
                        
                        {log.payload?.labelPdfUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="text-xs"
                          >
                            <a href={log.payload.labelPdfUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Ver Etiqueta
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Logs são mantidos por 30 dias para auditoria
            </span>
            <Button variant="ghost" size="sm" asChild>
              <a href="/admin/docs-integracao">
                <FileText className="w-4 h-4 mr-1" />
                Ver Documentação
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWebhookLogs;