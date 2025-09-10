import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Copy, ExternalLink, FileText, Search, Calendar, Eye, RefreshCw } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CteEmission {
  id: string;
  shipment_id: string | null;
  remessa_id: string;
  chave_cte: string;
  uuid_cte: string;
  serie: string;
  numero_cte: string;
  status: string;
  motivo: string | null;
  modelo: string;
  epec: boolean;
  xml_url: string | null;
  dacte_url: string | null;
  payload_bruto: any;
  created_at: string;
  updated_at: string;
}

const statusColors = {
  aprovado: 'success',
  reprovado: 'destructive',
  cancelado: 'secondary',
  processando: 'default',
  contingencia: 'outline'
} as const;

const statusLabels = {
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  cancelado: 'Cancelado',
  processando: 'Processando',
  contingencia: 'Contingência'
} as const;

const AdminCte = () => {
  const [emissions, setEmissions] = useState<CteEmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedPayload, setSelectedPayload] = useState<any>(null);

  const fetchEmissions = async () => {
    setLoading(true);
    try {
      let query = supabase.from('cte_emissoes').select('*');

      // Aplicar filtros
      if (searchTerm) {
        query = query.or(`chave_cte.ilike.%${searchTerm}%,uuid_cte::text.ilike.%${searchTerm}%,remessa_id.ilike.%${searchTerm}%`);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (dateFrom) {
        query = query.gte('created_at', startOfDay(new Date(dateFrom)).toISOString());
      }

      if (dateTo) {
        query = query.lte('created_at', endOfDay(new Date(dateTo)).toISOString());
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) {
        toast({
          title: "Erro ao carregar CT-e",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      setEmissions(data || []);
    } catch (error) {
      console.error('Erro ao buscar emissões:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Ocorreu um erro inesperado",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmissions();
  }, [searchTerm, statusFilter, dateFrom, dateTo]);

  // Polling para atualizações em tempo real (a cada 15 segundos)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchEmissions();
    }, 15000);

    return () => clearInterval(interval);
  }, [searchTerm, statusFilter, dateFrom, dateTo]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copiado!",
        description: "Chave CT-e copiada para a área de transferência",
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar a chave",
        variant: "destructive"
      });
    }
  };

  const truncateMiddle = (str: string, maxLength: number = 32) => {
    if (str.length <= maxLength) return str;
    const half = Math.floor(maxLength / 2);
    return `${str.slice(0, half)}...${str.slice(-half)}`;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">CT-e Emissões</h1>
          <p className="text-muted-foreground">
            Gerencie as emissões de Conhecimento de Transporte eletrônico
          </p>
        </div>
        <Button onClick={fetchEmissions} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
          <CardDescription>
            Filtre as emissões por chave, UUID, remessa, status ou data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por chave, UUID ou remessa"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter || 'all'} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="reprovado">Reprovado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
                <SelectItem value="processando">Processando</SelectItem>
                <SelectItem value="contingencia">Contingência</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                placeholder="Data inicial"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                placeholder="Data final"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="pl-9"
              />
            </div>

            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Remessa</TableHead>
                  <TableHead>Chave CT-e</TableHead>
                  <TableHead>UUID</TableHead>
                  <TableHead>Série</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>EPEC</TableHead>
                  <TableHead>Documentos</TableHead>
                  <TableHead>Atualizado</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : emissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8">
                      Nenhuma emissão encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  emissions.map((emission) => (
                    <TableRow key={emission.id}>
                      <TableCell>
                        <Button variant="link" className="p-0 h-auto">
                          {emission.remessa_id}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm">
                            {truncateMiddle(emission.chave_cte)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(emission.chave_cte)}
                            className="h-6 w-6"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {emission.uuid_cte.split('-')[0]}...
                        </span>
                      </TableCell>
                      <TableCell>{emission.serie}</TableCell>
                      <TableCell>{emission.numero_cte}</TableCell>
                      <TableCell>
                        <Badge variant={statusColors[emission.status as keyof typeof statusColors] || 'default'}>
                          {statusLabels[emission.status as keyof typeof statusLabels] || emission.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {emission.motivo ? (
                          <span className="text-sm">{emission.motivo}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{emission.modelo}</TableCell>
                      <TableCell>
                        <Badge variant={emission.epec ? 'success' : 'secondary'}>
                          {emission.epec ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {emission.xml_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                console.log('Abrindo XML:', emission.xml_url);
                                window.open(emission.xml_url, '_blank');
                              }}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              XML
                            </Button>
                          )}
                          {emission.dacte_url && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  console.log('Abrindo DACTE:', emission.dacte_url);
                                  window.open(emission.dacte_url, '_blank');
                                }}
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                DACTE
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(emission.dacte_url);
                                  toast({
                                    title: "Copiado!",
                                    description: "Link do DACTE copiado para a área de transferência",
                                  });
                                }}
                                title="Copiar link do DACTE"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(emission.updated_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedPayload(emission.payload_bruto)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Detalhes
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                            <DialogHeader>
                              <DialogTitle>Payload Bruto - CT-e {emission.numero_cte}</DialogTitle>
                              <DialogDescription>
                                Dados completos recebidos do webhook do n8n
                              </DialogDescription>
                            </DialogHeader>
                            <div className="bg-muted rounded-lg p-4">
                              <pre className="text-sm overflow-auto">
                                {JSON.stringify(emission.payload_bruto, null, 2)}
                              </pre>
                            </div>
                          </DialogContent>
                        </Dialog>
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

export default AdminCte;