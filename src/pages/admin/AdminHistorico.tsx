import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Search, Package, Users, FileText, Activity } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';

interface HistoryItem {
  id: string;
  type: 'shipment' | 'client' | 'payment' | 'label';
  title: string;
  description: string;
  timestamp: string;
  client?: string;
  status?: string;
}

const AdminHistorico = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      // Buscar remessas recentes
      const { data: shipmentsData } = await supabase
        .from('shipments')
        .select('id, tracking_code, status, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(50);

      // Buscar novos clientes
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      const historyItems: HistoryItem[] = [];

      // Adicionar remessas ao histórico
      if (shipmentsData) {
        for (const shipment of shipmentsData) {
          let clientName = 'Cliente Anônimo';
          
          if (shipment.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name, last_name, email')
              .eq('id', shipment.user_id)
              .single();
            
            if (profile) {
              clientName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || 'Cliente Anônimo';
            }
          }

          historyItems.push({
            id: `shipment-${shipment.id}`,
            type: 'shipment',
            title: `Nova remessa criada`,
            description: `Remessa ${shipment.tracking_code || `ID${shipment.id.slice(0, 8).toUpperCase()}`} - Status: ${shipment.status}`,
            timestamp: shipment.created_at,
            client: clientName,
            status: shipment.status
          });
        }
      }

      // Adicionar novos clientes ao histórico
      profilesData?.forEach(profile => {
        historyItems.push({
          id: `client-${profile.id}`,
          type: 'client',
          title: 'Novo cliente registrado',
          description: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || 'Cliente',
          timestamp: profile.created_at,
          client: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || 'Cliente'
        });
      });

      // Ordenar por data
      historyItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setHistory(historyItems);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'shipment': return <Package className="h-4 w-4" />;
      case 'client': return <Users className="h-4 w-4" />;
      case 'payment': return <FileText className="h-4 w-4" />;
      case 'label': return <FileText className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'shipment': return 'bg-primary text-primary-foreground';
      case 'client': return 'bg-success text-success-foreground';
      case 'payment': return 'bg-warning text-warning-foreground';
      case 'label': return 'bg-info text-info-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'shipment': return 'Remessa';
      case 'client': return 'Cliente';
      case 'payment': return 'Pagamento';
      case 'label': return 'Etiqueta';
      default: return 'Atividade';
    }
  };

  const filteredHistory = history.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.client?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center">
          <History className="mr-3 h-8 w-8 text-primary" />
          Histórico Geral
        </h1>
        <p className="text-muted-foreground mt-2">
          Histórico completo de operações do sistema
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar no histórico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="shipment">Remessas</SelectItem>
                  <SelectItem value="client">Clientes</SelectItem>
                  <SelectItem value="payment">Pagamentos</SelectItem>
                  <SelectItem value="label">Etiquetas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Histórico de Operações</span>
            <Badge variant="secondary">{filteredHistory.length} itens</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Carregando histórico...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum item encontrado no histórico</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((item, index) => (
                <div key={item.id} className="flex items-start space-x-4 p-4 border border-border rounded-lg">
                  <div className={`p-2 rounded-full ${getTypeColor(item.type)}`}>
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground">{item.title}</h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(item.type)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.timestamp).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    {item.client && (
                      <p className="text-xs text-muted-foreground">
                        Cliente: {item.client}
                      </p>
                    )}
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

export default AdminHistorico;