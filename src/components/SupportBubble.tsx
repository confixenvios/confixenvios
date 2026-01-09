import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { X, Send, Ticket, ExternalLink, Headphones } from "lucide-react";

// Custom Support Agent Icon (head with headset)
const SupportAgentIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Head/Face circle */}
    <circle cx="12" cy="12" r="5" />
    {/* Headset band on top */}
    <path d="M4 12a8 8 0 0 1 16 0" />
    {/* Left earpiece */}
    <rect x="2" y="10" width="3" height="5" rx="1.5" />
    {/* Right earpiece */}
    <rect x="19" y="10" width="3" height="5" rx="1.5" />
    {/* Microphone arm */}
    <path d="M19 15v2a2 2 0 0 1-2 2h-3" />
    {/* Microphone */}
    <circle cx="13" cy="19" r="1" />
  </svg>
);

const categoryOptions = [
  { value: "technical", label: "Suporte Técnico" },
  { value: "billing", label: "Faturamento" },
  { value: "general", label: "Dúvidas Gerais" },
  { value: "feedback", label: "Sugestões" },
  { value: "complaint", label: "Reclamações" },
];

const SupportBubble = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ticketCount, setTicketCount] = useState(0);

  // Quick ticket form
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");

  // Hide on support pages
  const isSupportPage = location.pathname.startsWith("/suporte");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsLoggedIn(!!user);

    if (user) {
      loadTicketCount(user.id);
    }
  };

  const loadTicketCount = async (userId: string) => {
    try {
      const { count } = await supabase
        .from("support_tickets")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .in("status", ["open", "pending", "in_progress"]);

      setTicketCount(count || 0);
    } catch (error) {
      console.error("Error loading ticket count:", error);
    }
  };

  const handleQuickTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Faça login para abrir um ticket");
        navigate("/suporte");
        return;
      }

      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        subject,
        description,
        category: category as any,
        priority: "medium" as any,
      } as any);

      if (error) throw error;

      toast.success("Ticket criado com sucesso!");
      setSubject("");
      setDescription("");
      setCategory("general");
      setIsOpen(false);
      loadTicketCount(user.id);
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar ticket");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSupportPage) return null;

  return (
    <>
      {/* Bubble Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
          isOpen ? "bg-muted text-foreground rotate-90" : "bg-primary text-primary-foreground"
        }`}
        aria-label="Suporte"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <div className="relative">
            <SupportAgentIcon className="h-6 w-6" />
            {ticketCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {ticketCount}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Popup Card */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 shadow-2xl border-2 animate-in slide-in-from-bottom-4">
          <CardHeader className="pb-3 bg-primary text-primary-foreground rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Headphones className="h-5 w-5" />
              Central de Suporte
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {isLoggedIn ? (
              <>
                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-auto py-3 flex flex-col gap-1"
                    onClick={() => {
                      navigate("/suporte/tickets");
                      setIsOpen(false);
                    }}
                  >
                    <Ticket className="h-5 w-5" />
                    <span className="text-xs">Meus Tickets</span>
                    {ticketCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({ticketCount} abertos)
                      </span>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-3 flex flex-col gap-1"
                    onClick={() => {
                      navigate("/suporte/novo-ticket");
                      setIsOpen(false);
                    }}
                  >
                    <ExternalLink className="h-5 w-5" />
                    <span className="text-xs">Novo Ticket</span>
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      ou envie rápido
                    </span>
                  </div>
                </div>

                {/* Quick Ticket Form */}
                <form onSubmit={handleQuickTicket} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="quick-subject" className="text-xs">
                      Assunto
                    </Label>
                    <Input
                      id="quick-subject"
                      placeholder="Resumo do problema"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="quick-category" className="text-xs">
                      Categoria
                    </Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="quick-description" className="text-xs">
                      Descrição
                    </Label>
                    <Textarea
                      id="quick-description"
                      placeholder="Descreva seu problema..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || !subject.trim() || !description.trim()}
                  >
                    {isLoading ? (
                      "Enviando..."
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar Ticket
                      </>
                    )}
                  </Button>
                </form>
              </>
            ) : (
              <div className="text-center py-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Faça login para acessar o suporte e gerenciar seus tickets.
                </p>
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    onClick={() => {
                      navigate("/suporte");
                      setIsOpen(false);
                    }}
                  >
                    Acessar Suporte
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      navigate("/auth");
                      setIsOpen(false);
                    }}
                  >
                    Login / Cadastro
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default SupportBubble;
