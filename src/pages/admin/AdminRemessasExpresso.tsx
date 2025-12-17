import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Package, Eye, Calendar as CalendarIcon, MapPin, User, Phone, Loader2, Download, MessageCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import B2BLabelGenerator from '@/components/b2b/B2BLabelGenerator';
import B2BVolumeStatusHistory from '@/components/b2b/B2BVolumeStatusHistory';

interface B2BVolume {
  id: string;
  eti_code: string;
  volume_number: number;
  weight: number;
  status: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_document: string | null;
  recipient_cep: string;
  recipient_street: string;
  recipient_number: string;
  recipient_complement: string | null;
  recipient_neighborhood: string;
  recipient_city: string;
  recipient_state: string;
  created_at: string;
  b2b_shipment_id: string;
  shipment?: {
    tracking_code: string;
    delivery_date: string;
    status: string;
    b2b_clients?: {
      company_name: string;
      email: string;
      phone: string | null;
    };
  };
}

const AdminRemessasExpresso = () => {
  const { toast } = useToast();
  const [volumes, setVolumes] = useState<B2BVolume[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [selectedVolume, setSelectedVolume] = useState<B2BVolume | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labelVolume, setLabelVolume] = useState<B2BVolume | null>(null);
  const [sendingWhatsapp, setSendingWhatsapp] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadVolumes();
  }, []);

  const loadVolumes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('b2b_volumes')
        .select(`
          *,
          shipment:b2b_shipments(
            tracking_code, 
            delivery_date, 
            status,
            b2b_clients(company_name, email, phone)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVolumes(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar volumes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar volumes B2B",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'AGUARDANDO_ACEITE_COLETA': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'COLETA_ACEITA': 'bg-orange-100 text-orange-800 border-orange-300',
      'COLETADO': 'bg-sky-100 text-sky-800 border-sky-300',
      'EM_TRANSITO': 'bg-blue-100 text-blue-800 border-blue-300',
      'EM_TRIAGEM': 'bg-purple-100 text-purple-800 border-purple-300',
      'AGUARDANDO_ACEITE_EXPEDICAO': 'bg-indigo-100 text-indigo-800 border-indigo-300',
      'EXPEDIDO': 'bg-cyan-100 text-cyan-800 border-cyan-300',
      'NO_CD': 'bg-violet-100 text-violet-800 border-violet-300',
      'EM_ROTA': 'bg-blue-100 text-blue-800 border-blue-300',
      'ENTREGUE': 'bg-green-600 text-white border-green-600',
      'CONCLUIDO': 'bg-green-600 text-white border-green-600',
      'DEVOLUCAO': 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'AGUARDANDO_ACEITE_COLETA': 'Aguardando Aceite Coleta',
      'COLETA_ACEITA': 'Coleta Aceita',
      'COLETADO': 'Coletado',
      'EM_TRANSITO': 'Em Trânsito',
      'EM_TRIAGEM': 'Em Triagem',
      'AGUARDANDO_ACEITE_EXPEDICAO': 'Aguardando Aceite Expedição',
      'EXPEDIDO': 'Expedido',
      'NO_CD': 'No CD',
      'EM_ROTA': 'Em Rota',
      'ENTREGUE': 'Concluído',
      'CONCLUIDO': 'Concluído',
      'DEVOLUCAO': 'Devolução',
    };
    return labels[status] || status;
  };

  const handleViewDetails = (volume: B2BVolume) => {
    setSelectedVolume(volume);
    setShowDetailsModal(true);
  };

  const handlePrintLabel = (volume: B2BVolume) => {
    setLabelVolume(volume);
    setShowLabelModal(true);
  };

  const handleSendWhatsApp = async (volume: B2BVolume) => {
    if (!volume.shipment) return;
    
    setSendingWhatsapp(prev => ({ ...prev, [volume.id]: true }));
    
    try {
      const { data: b2bShipment, error } = await supabase
        .from('b2b_shipments')
        .select('*, b2b_clients(*)')
        .eq('tracking_code', volume.shipment.tracking_code)
        .maybeSingle();

      if (error || !b2bShipment) throw new Error('Remessa não encontrada');

      let observations: any = {};
      if (b2bShipment.observations) {
        try {
          observations = typeof b2bShipment.observations === 'string' 
            ? JSON.parse(b2bShipment.observations) 
            : b2bShipment.observations;
        } catch (e) {}
      }

      const clientData = b2bShipment.b2b_clients as any || {};
      const pickupAddress = observations.pickup_address || null;

      const webhookPayload = {
        b2b_shipment_id: b2bShipment.id,
        tracking_code: b2bShipment.tracking_code,
        volume_eti_code: volume.eti_code,
        volume_id: volume.id,
        status: volume.status,
        created_at: b2bShipment.created_at,
        delivery_date: b2bShipment.delivery_date,
        volume_count: b2bShipment.total_volumes,
        client_id: clientData?.id,
        client_company_name: clientData?.company_name,
        client_cnpj: clientData?.cnpj,
        client_email: clientData?.email,
        client_phone: clientData?.phone,
        pickup_address: pickupAddress,
        recipient_name: volume.recipient_name,
        recipient_phone: volume.recipient_phone,
        recipient_address: `${volume.recipient_street}, ${volume.recipient_number} - ${volume.recipient_neighborhood}, ${volume.recipient_city}/${volume.recipient_state}`,
        recipient_cep: volume.recipient_cep,
        webhook_sent_at: new Date().toISOString()
      };

      const response = await fetch('https://n8n.grupoconfix.com/webhook-test/disparo-wpp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      toast({
        title: "WhatsApp enviado",
        description: `Dados do volume ${volume.eti_code} enviados`,
      });
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar dados para WhatsApp",
        variant: "destructive"
      });
    } finally {
      setSendingWhatsapp(prev => ({ ...prev, [volume.id]: false }));
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const filteredVolumes = useMemo(() => {
    return volumes.filter(volume => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' || 
        volume.eti_code.toLowerCase().includes(searchLower) ||
        volume.recipient_name.toLowerCase().includes(searchLower) ||
        volume.shipment?.tracking_code?.toLowerCase().includes(searchLower) ||
        volume.shipment?.b2b_clients?.company_name?.toLowerCase().includes(searchLower);
      
      const matchesStatus = statusFilter === 'all' || volume.status === statusFilter;
      
      const volumeDate = new Date(volume.created_at);
      const matchesDateFrom = !dateFrom || volumeDate >= dateFrom;
      const matchesDateTo = !dateTo || volumeDate <= new Date(dateTo.getTime() + 86400000);
      
      return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
    });
  }, [volumes, searchTerm, statusFilter, dateFrom, dateTo]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando volumes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Remessas Expresso</h1>
          <p className="text-muted-foreground">Gerencie todos os volumes B2B Express</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {filteredVolumes.length} volume{filteredVolumes.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Filtros */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ETI, cliente ou código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="AGUARDANDO_ACEITE_COLETA">Aguardando Aceite Coleta</SelectItem>
                  <SelectItem value="COLETA_ACEITA">Coleta Aceita</SelectItem>
                  <SelectItem value="COLETADO">Coletado</SelectItem>
                  <SelectItem value="EM_TRIAGEM">Em Triagem</SelectItem>
                  <SelectItem value="AGUARDANDO_ACEITE_EXPEDICAO">Aguardando Expedição</SelectItem>
                  <SelectItem value="EXPEDIDO">Expedido</SelectItem>
                  <SelectItem value="EM_ROTA">Em Rota</SelectItem>
                  <SelectItem value="ENTREGUE">Entregue</SelectItem>
                  <SelectItem value="DEVOLUCAO">Devolução</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Data Inicial</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Data Final</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">&nbsp;</label>
              <Button variant="outline" onClick={clearFilters} className="w-full">
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Volumes */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Lista de Volumes
          </CardTitle>
          <CardDescription>Todos os volumes B2B Express do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredVolumes.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum volume encontrado</p>
              {(searchTerm || statusFilter !== 'all' || dateFrom || dateTo) && (
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  Limpar Filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredVolumes.map((volume) => (
                <div
                  key={volume.id}
                  className="p-4 border-0 rounded-xl shadow-md hover:shadow-lg transition-all bg-white overflow-hidden"
                >
                  {/* Status bar on top */}
                  <div className={`h-1 -mx-4 -mt-4 mb-4 ${volume.status === 'CONCLUIDO' || volume.status === 'ENTREGUE' ? 'bg-emerald-500' : volume.status === 'DEVOLUCAO' ? 'bg-red-500' : 'bg-primary'}`} />
                  
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-foreground">{volume.eti_code}</span>
                      {volume.shipment && (
                        <Badge variant="secondary" className="text-xs font-mono bg-slate-100 text-slate-600">
                          {volume.shipment.tracking_code}
                        </Badge>
                      )}
                      {volume.shipment?.b2b_clients?.company_name && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {volume.shipment.b2b_clients.company_name}
                        </Badge>
                      )}
                    </div>
                    <Badge className={`text-xs font-medium border ${getStatusColor(volume.status)}`}>
                      {getStatusLabel(volume.status)}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <p className="font-medium flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {volume.recipient_name}
                    </p>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {volume.recipient_phone}
                    </p>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {volume.recipient_street}, {volume.recipient_number} - {volume.recipient_neighborhood}, {volume.recipient_city}/{volume.recipient_state}
                    </p>
                    {volume.shipment?.delivery_date && (
                      <p className="text-foreground font-medium">
                        Previsão: {format(new Date(volume.shipment.delivery_date + 'T12:00:00'), 'dd/MM/yyyy')}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(volume)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Detalhes
                    </Button>
                    <Button variant="default" size="sm" onClick={() => handlePrintLabel(volume)} className="bg-primary hover:bg-primary/90">
                      <Download className="h-4 w-4 mr-1" />
                      Etiqueta
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleSendWhatsApp(volume)}
                      disabled={sendingWhatsapp[volume.id]}
                      className="text-green-600 border-green-200 hover:bg-green-50"
                    >
                      {sendingWhatsapp[volume.id] ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <MessageCircle className="h-4 w-4 mr-1" />
                      )}
                      WhatsApp
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>Detalhes do Volume</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[calc(85vh-100px)] px-6 py-4">
            {selectedVolume && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Código ETI</p>
                    <p className="font-mono font-semibold">{selectedVolume.eti_code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rastreio</p>
                    <p className="font-mono font-semibold">{selectedVolume.shipment?.tracking_code || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={getStatusColor(selectedVolume.status)}>
                      {getStatusLabel(selectedVolume.status)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Peso</p>
                    <p className="font-semibold">{selectedVolume.weight} kg</p>
                  </div>
                </div>

                {selectedVolume.shipment?.b2b_clients && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">Cliente B2B</p>
                    <p className="font-semibold text-blue-900">{selectedVolume.shipment.b2b_clients.company_name}</p>
                    <p className="text-sm text-blue-700">{selectedVolume.shipment.b2b_clients.email}</p>
                  </div>
                )}

                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-600 mb-2">Destinatário</p>
                  <p className="font-semibold">{selectedVolume.recipient_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedVolume.recipient_phone}</p>
                  {selectedVolume.recipient_document && (
                    <p className="text-sm text-muted-foreground">Doc: {selectedVolume.recipient_document}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedVolume.recipient_street}, {selectedVolume.recipient_number}
                    {selectedVolume.recipient_complement && ` - ${selectedVolume.recipient_complement}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedVolume.recipient_neighborhood}, {selectedVolume.recipient_city}/{selectedVolume.recipient_state}
                  </p>
                  <p className="text-sm text-muted-foreground">CEP: {selectedVolume.recipient_cep}</p>
                </div>

                {selectedVolume.shipment?.delivery_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Previsão de Entrega</p>
                    <p className="font-semibold">
                      {format(new Date(selectedVolume.shipment.delivery_date + 'T12:00:00'), 'dd/MM/yyyy')}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground">Criado em</p>
                  <p className="font-semibold">
                    {format(new Date(selectedVolume.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-3">Histórico de Status</p>
                  <B2BVolumeStatusHistory volumeId={selectedVolume.id} />
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal de Etiqueta */}
      <Dialog open={showLabelModal} onOpenChange={setShowLabelModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Etiqueta do Volume</DialogTitle>
          </DialogHeader>
          {labelVolume && (
            <B2BLabelGenerator 
              volume={labelVolume}
              shipment={labelVolume.shipment ? {
                id: labelVolume.b2b_shipment_id,
                tracking_code: labelVolume.shipment.tracking_code,
                delivery_date: labelVolume.shipment.delivery_date
              } : undefined}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRemessasExpresso;
