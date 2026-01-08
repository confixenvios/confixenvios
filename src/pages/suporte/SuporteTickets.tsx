import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, Ticket, Clock, CheckCircle2, AlertCircle, LogOut, User } from "lucide-react";
import { Link } from "react-router-dom";
import logoConfix from "@/assets/logo-confix-envios.png";
import { formatDistanceToNow } from "date-fns";
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
  created_at: string;
  updated_at: string;
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
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const priorityLabels: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

const SuporteTickets = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    loadTickets();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/suporte");
      return;
    }
    setUserEmail(user.email || null);
  };

  const loadTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar tickets");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/suporte");
  };

  const filteredTickets = tickets.filter(
    (ticket) =>
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSlaBadge = (ticket: SupportTicket) => {
    if (!ticket.sla_due_at || ticket.status === "resolved" || ticket.status === "closed") {
      return null;
    }

    const now = new Date();
    const slaDue = new Date(ticket.sla_due_at);
    const hoursRemaining = (slaDue.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursRemaining < 0) {
      return <Badge variant="destructive" className="text-xs">SLA Expirado</Badge>;
    } else if (hoursRemaining < 4) {
      return <Badge className="bg-orange-500 text-xs">SLA: {Math.ceil(hoursRemaining)}h restantes</Badge>;
    }
    return null;
  };

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === "open" || t.status === "pending" || t.status === "in_progress").length,
    resolved: tickets.filter(t => t.status === "resolved" || t.status === "closed").length,
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoConfix} alt="Confix Envios" className="h-8" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{userEmail}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Meus Tickets</h1>
            <p className="text-muted-foreground">Gerencie seus chamados de suporte</p>
          </div>
          <Button onClick={() => navigate("/suporte/novo-ticket")}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Ticket
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Ticket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total de Tickets</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-full">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.open}</p>
                <p className="text-sm text-muted-foreground">Em Aberto</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.resolved}</p>
                <p className="text-sm text-muted-foreground">Resolvidos</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por assunto ou número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tickets List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando tickets...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum ticket encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? "Tente buscar com outros termos" : "Você ainda não abriu nenhum ticket"}
              </p>
              {!searchTerm && (
                <Button onClick={() => navigate("/suporte/novo-ticket")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Abrir primeiro ticket
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => (
              <Card
                key={ticket.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/suporte/ticket/${ticket.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono text-muted-foreground">
                          #{ticket.ticket_number}
                        </span>
                        <Badge className={statusColors[ticket.status]}>
                          {statusLabels[ticket.status]}
                        </Badge>
                        <Badge className={priorityColors[ticket.priority]}>
                          {priorityLabels[ticket.priority]}
                        </Badge>
                        {getSlaBadge(ticket)}
                      </div>
                      <h3 className="font-medium truncate">{ticket.subject}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {ticket.description}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground text-right">
                      <p>
                        {formatDistanceToNow(new Date(ticket.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default SuporteTickets;
