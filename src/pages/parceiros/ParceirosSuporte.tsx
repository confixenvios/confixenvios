import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MessageSquare, Plus, Clock, CheckCircle, AlertCircle, Send, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  updated_at: string;
}

interface TicketMessage {
  id: string;
  message: string;
  is_from_support: boolean;
  created_at: string;
}

interface CarrierPartner {
  id: string;
  email: string;
  company_name: string;
}

const ParceirosSuporte = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [partner, setPartner] = useState<CarrierPartner | null>(null);
  
  // New ticket form
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const partnerData = sessionStorage.getItem('carrier_partner');
    if (partnerData) {
      setPartner(JSON.parse(partnerData));
    }
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const partnerData = sessionStorage.getItem('carrier_partner');
      if (!partnerData) return;
      
      const partner = JSON.parse(partnerData);
      
      // Para parceiros, buscamos tickets criados com o email do parceiro
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filtrar tickets do parceiro (podemos usar uma coluna específica futuramente)
      setTickets(data || []);
    } catch (error) {
      console.error('Erro ao carregar tickets:', error);
      toast.error('Erro ao carregar tickets');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const handleSelectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    loadMessages(ticket.id);
    setShowNewTicket(false);
  };

  const handleCreateTicket = async () => {
    if (!newSubject.trim() || !newDescription.trim() || !newCategory) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSubmitting(true);
    try {
      // Gerar número do ticket
      const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;
      
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          ticket_number: ticketNumber,
          subject: newSubject,
          description: newDescription,
          category: newCategory as any,
          priority: newPriority as any,
          status: 'open' as any,
          user_id: partner?.id || '00000000-0000-0000-0000-000000000000'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Ticket criado com sucesso!');
      setNewSubject('');
      setNewDescription('');
      setNewCategory('');
      setNewPriority('medium');
      setShowNewTicket(false);
      loadTickets();
      
      if (data) {
        handleSelectTicket(data);
      }
    } catch (error) {
      console.error('Erro ao criar ticket:', error);
      toast.error('Erro ao criar ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    try {
      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          message: newMessage,
          is_from_support: false,
          user_id: partner?.id || '00000000-0000-0000-0000-000000000000'
        });

      if (error) throw error;

      setNewMessage('');
      loadMessages(selectedTicket.id);
      toast.success('Mensagem enviada!');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      open: { label: 'Aberto', variant: 'default' },
      in_progress: { label: 'Em Andamento', variant: 'secondary' },
      resolved: { label: 'Resolvido', variant: 'outline' },
      closed: { label: 'Fechado', variant: 'outline' }
    };
    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { label: string; className: string }> = {
      low: { label: 'Baixa', className: 'bg-green-100 text-green-700' },
      medium: { label: 'Média', className: 'bg-yellow-100 text-yellow-700' },
      high: { label: 'Alta', className: 'bg-orange-100 text-orange-700' },
      urgent: { label: 'Urgente', className: 'bg-red-100 text-red-700' }
    };
    const config = priorityConfig[priority] || { label: priority, className: 'bg-gray-100 text-gray-700' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>{config.label}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Suporte</h1>
          <p className="text-muted-foreground">Gerencie seus tickets de suporte</p>
        </div>
        <Button onClick={() => { setShowNewTicket(true); setSelectedTicket(null); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Tickets */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Meus Tickets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum ticket encontrado
              </p>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => handleSelectTicket(ticket)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:border-primary ${
                    selectedTicket?.id === ticket.id ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground">#{ticket.ticket_number}</p>
                    </div>
                    {getStatusBadge(ticket.status)}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {getPriorityBadge(ticket.priority)}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(ticket.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Detalhes do Ticket ou Novo Ticket */}
        <Card className="lg:col-span-2">
          {showNewTicket ? (
            <>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowNewTicket(false)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle className="text-lg">Novo Ticket</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Assunto *</Label>
                  <Input
                    id="subject"
                    placeholder="Descreva brevemente o problema"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoria *</Label>
                    <Select value={newCategory} onValueChange={setNewCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shipping">Envio</SelectItem>
                        <SelectItem value="billing">Faturamento</SelectItem>
                        <SelectItem value="technical">Técnico</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select value={newPriority} onValueChange={setNewPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição *</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva detalhadamente o problema ou solicitação"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={6}
                  />
                </div>
                
                <Button onClick={handleCreateTicket} disabled={submitting} className="w-full">
                  {submitting ? 'Criando...' : 'Criar Ticket'}
                </Button>
              </CardContent>
            </>
          ) : selectedTicket ? (
            <>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{selectedTicket.subject}</CardTitle>
                    <p className="text-sm text-muted-foreground">#{selectedTicket.ticket_number}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPriorityBadge(selectedTicket.priority)}
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Descrição original */}
                <div className="p-4 bg-muted/30 border-b">
                  <p className="text-sm text-muted-foreground mb-1">Descrição:</p>
                  <p className="text-sm">{selectedTicket.description}</p>
                </div>
                
                {/* Mensagens */}
                <div className="h-[300px] overflow-y-auto p-4 space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.is_from_support ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          msg.is_from_support
                            ? 'bg-muted'
                            : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <p className={`text-xs mt-1 ${msg.is_from_support ? 'text-muted-foreground' : 'text-primary-foreground/70'}`}>
                          {format(new Date(msg.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-8">
                      Nenhuma mensagem ainda
                    </p>
                  )}
                </div>
                
                {/* Input de mensagem */}
                {selectedTicket.status !== 'closed' && (
                  <div className="p-4 border-t flex gap-2">
                    <Input
                      placeholder="Digite sua mensagem..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage} size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-[400px] text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Selecione um ticket ou crie um novo</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ParceirosSuporte;
