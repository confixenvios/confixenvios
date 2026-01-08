import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Send, Clock, AlertCircle, User, Headphones } from "lucide-react";
import { Link } from "react-router-dom";
import logoConfix from "@/assets/logo-confix-envios.png";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  sla_due_at: string | null;
  first_response_at: string | null;
  created_at: string;
  updated_at: string;
}

interface TicketMessage {
  id: string;
  message: string;
  is_from_support: boolean;
  created_at: string;
  user_id: string;
}

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-purple-100 text-purple-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
  open: "Aberto",
  pending: "Pendente",
  in_progress: "Em Andamento",
  resolved: "Resolvido",
  closed: "Fechado",
};

const priorityColors: Record<string, string> = {
  low: "border-gray-300",
  medium: "border-blue-400",
  high: "border-orange-400",
  urgent: "border-red-500",
};

const categoryLabels: Record<string, string> = {
  technical: "Suporte Técnico",
  billing: "Faturamento",
  general: "Dúvidas Gerais",
  feedback: "Sugestões",
  complaint: "Reclamações",
};

const SuporteTicketDetalhes = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (id) {
      loadTicket();
      loadMessages();
    }
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/suporte");
      return;
    }
    setUserId(user.id);
  };

  const loadTicket = async () => {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setTicket(data);
    } catch (error) {
      toast.error("Erro ao carregar ticket");
      navigate("/suporte/tickets");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userId || !id) return;

    setIsSending(true);
    try {
      const { error } = await supabase.from("ticket_messages").insert({
        ticket_id: id,
        user_id: userId,
        message: newMessage.trim(),
        is_from_support: false,
      });

      if (error) throw error;

      // Update ticket status to pending if it was resolved
      if (ticket?.status === "resolved") {
        await supabase
          .from("support_tickets")
          .update({ status: "pending" })
          .eq("id", id);
        loadTicket();
      }

      setNewMessage("");
      loadMessages();
      toast.success("Mensagem enviada!");
    } catch (error: any) {
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsSending(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!id) return;

    try {
      await supabase
        .from("support_tickets")
        .update({ status: "closed", closed_at: new Date().toISOString() })
        .eq("id", id);

      toast.success("Ticket fechado com sucesso!");
      loadTicket();
    } catch (error) {
      toast.error("Erro ao fechar ticket");
    }
  };

  const getSlaBadge = () => {
    if (!ticket?.sla_due_at || ticket.status === "resolved" || ticket.status === "closed") {
      return null;
    }

    const now = new Date();
    const slaDue = new Date(ticket.sla_due_at);
    const hoursRemaining = (slaDue.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursRemaining < 0) {
      return (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">SLA Expirado</span>
        </div>
      );
    } else if (hoursRemaining < 4) {
      return (
        <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-2 rounded-lg">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">SLA: {Math.ceil(hoursRemaining)}h restantes</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg">
        <Clock className="h-4 w-4" />
        <span className="text-sm font-medium">
          SLA: {format(slaDue, "dd/MM 'às' HH:mm", { locale: ptBR })}
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!ticket) return null;

  const isTicketClosed = ticket.status === "closed";

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoConfix} alt="Confix Envios" className="h-8" />
          </Link>
          <Link
            to="/suporte/tickets"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar aos tickets
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl flex flex-col">
        {/* Ticket Header */}
        <Card className={`mb-6 border-l-4 ${priorityColors[ticket.priority]}`}>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-mono text-muted-foreground">
                    #{ticket.ticket_number}
                  </span>
                  <Badge className={statusColors[ticket.status]}>
                    {statusLabels[ticket.status]}
                  </Badge>
                  <Badge variant="outline">{categoryLabels[ticket.category]}</Badge>
                </div>
                <CardTitle className="text-xl">{ticket.subject}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Criado em {format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              {getSlaBadge()}
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <h3 className="text-lg font-semibold mb-4">Conversa</h3>

          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p>Nenhuma mensagem ainda. Aguarde uma resposta do suporte.</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.is_from_support ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-lg ${
                      msg.is_from_support
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`p-1.5 rounded-full ${
                          msg.is_from_support ? "bg-primary/20" : "bg-muted-foreground/20"
                        }`}
                      >
                        {msg.is_from_support ? (
                          <Headphones className="h-3 w-3 text-primary" />
                        ) : (
                          <User className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {msg.is_from_support ? "Suporte" : "Você"} •{" "}
                        {formatDistanceToNow(new Date(msg.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Form */}
          {isTicketClosed ? (
            <div className="bg-muted/50 p-4 rounded-lg text-center">
              <p className="text-muted-foreground">Este ticket foi fechado.</p>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="space-y-4">
              <Textarea
                placeholder="Digite sua mensagem..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={3}
                maxLength={2000}
              />
              <div className="flex justify-between items-center">
                {ticket.status === "resolved" && (
                  <Button type="button" variant="outline" onClick={handleCloseTicket}>
                    Fechar Ticket
                  </Button>
                )}
                <div className="flex-1" />
                <Button type="submit" disabled={isSending || !newMessage.trim()}>
                  {isSending ? (
                    "Enviando..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default SuporteTicketDetalhes;
