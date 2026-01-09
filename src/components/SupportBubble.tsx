import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { X, Send, Ticket, Headphones, MessageCircle } from "lucide-react";

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
    <circle cx="12" cy="13" r="6" />
    {/* Headset band on top */}
    <path d="M3 13a9 9 0 0 1 18 0" />
    {/* Left earpiece */}
    <rect x="1" y="11" width="3" height="6" rx="1.5" />
    {/* Right earpiece */}
    <rect x="20" y="11" width="3" height="6" rx="1.5" />
    {/* Microphone arm */}
    <path d="M20 17v1.5a2 2 0 0 1-2 2h-4" />
    {/* Microphone */}
    <circle cx="13" cy="20.5" r="1.5" />
  </svg>
);

const faqItems = [
  {
    question: "Como faço para rastrear minha encomenda?",
    answer: "Você pode rastrear sua encomenda acessando a página de rastreamento e inserindo o código de rastreio que foi enviado por e-mail ou acessando seu painel de cliente."
  },
  {
    question: "Qual o prazo de entrega?",
    answer: "O prazo de entrega varia de acordo com a origem e destino do envio. Para envios expressos na região metropolitana, geralmente entregamos em até 24h. Para envios nacionais, o prazo pode variar de 2 a 10 dias úteis."
  },
  {
    question: "Como funciona o serviço de coleta?",
    answer: "Nosso serviço de coleta pode ser agendado no momento da criação do envio. Você escolhe a data e horário mais conveniente e nosso motorista vai até o endereço indicado para retirar a encomenda."
  },
  {
    question: "Posso alterar o endereço de entrega?",
    answer: "Sim, é possível alterar o endereço de entrega enquanto a encomenda ainda não foi despachada. Entre em contato com nosso suporte via WhatsApp ou abra um ticket no seu painel."
  },
  {
    question: "Como faço para cadastrar minha empresa?",
    answer: "Para cadastrar sua empresa, acesse a página de login e clique em 'Criar conta'. Preencha os dados solicitados e aguarde a aprovação do seu cadastro."
  },
  {
    question: "Quais formas de pagamento são aceitas?",
    answer: "Aceitamos pagamento via PIX, cartão de crédito e boleto bancário para clientes empresariais com cadastro aprovado."
  },
];

const WHATSAPP_NUMBER = "5562987333276";

const SupportBubble = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ticketCount, setTicketCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  // Ticket form
  const [subject, setSubject] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [description, setDescription] = useState("");

  // Hide only on admin pages
  const shouldHide = location.pathname.startsWith("/admin");

  useEffect(() => {
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
      setUserId(session?.user?.id || null);
      if (session?.user) {
        loadTicketCount(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsLoggedIn(!!user);
    setUserId(user?.id || null);

    if (user) {
      loadTicketCount(user.id);
    }
  };

  const loadTicketCount = async (uid: string) => {
    try {
      const { count } = await supabase
        .from("support_tickets")
        .select("*", { count: "exact", head: true })
        .eq("user_id", uid)
        .in("status", ["open", "pending", "in_progress"]);

      setTicketCount(count || 0);
    } catch (error) {
      console.error("Error loading ticket count:", error);
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim()) {
      toast.error("O assunto é obrigatório");
      return;
    }
    
    if (!description.trim()) {
      toast.error("A descrição é obrigatória");
      return;
    }

    setIsLoading(true);

    try {
      if (!userId) {
        toast.error("Faça login para abrir um ticket");
        navigate("/auth");
        return;
      }

      // Build description with order number if provided
      const fullDescription = orderNumber.trim() 
        ? `Número do Pedido: ${orderNumber.trim()}\n\n${description}`
        : description;

      const { error } = await supabase.from("support_tickets").insert({
        user_id: userId,
        subject,
        description: fullDescription,
        category: "general" as any,
        priority: "medium" as any,
      } as any);

      if (error) throw error;

      toast.success("Ticket criado com sucesso!");
      setSubject("");
      setOrderNumber("");
      setDescription("");
      loadTicketCount(userId);
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar ticket");
    } finally {
      setIsLoading(false);
    }
  };

  const openWhatsApp = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const url = isMobile 
      ? `https://wa.me/${WHATSAPP_NUMBER}`
      : `https://web.whatsapp.com/send?phone=${WHATSAPP_NUMBER}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (shouldHide) return null;

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
            <SupportAgentIcon className="h-8 w-8" />
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
        <Card className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 shadow-2xl border-2 animate-in slide-in-from-bottom-4 max-h-[80vh] overflow-hidden flex flex-col">
          <CardHeader className="pb-3 bg-primary text-primary-foreground rounded-t-lg flex-shrink-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Headphones className="h-5 w-5" />
              Central de Suporte
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4 overflow-y-auto flex-1">
            {isLoggedIn ? (
              <>
                {/* Quick Actions - My Tickets + WhatsApp */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-auto py-3 flex flex-col gap-1"
                    onClick={() => {
                      navigate("/painel/suporte");
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
                    className="h-auto py-3 flex flex-col gap-1 border-green-200 text-green-700 hover:bg-destructive hover:text-white hover:border-destructive"
                    onClick={openWhatsApp}
                  >
                    <MessageCircle className="h-5 w-5" />
                    <span className="text-xs">WhatsApp</span>
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Abrir novo ticket
                    </span>
                  </div>
                </div>

                {/* Ticket Form */}
                <form onSubmit={handleSubmitTicket} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="ticket-subject" className="text-xs">
                      Assunto <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="ticket-subject"
                      placeholder="Resumo do problema"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ticket-order" className="text-xs">
                      Número do Pedido <span className="text-muted-foreground">(opcional)</span>
                    </Label>
                    <Input
                      id="ticket-order"
                      placeholder="Ex: CFX-123456"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ticket-description" className="text-xs">
                      Descrição <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="ticket-description"
                      placeholder="Descreva seu problema detalhadamente..."
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
              <div className="space-y-4">
                {/* WhatsApp Contact */}
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={openWhatsApp}
                >
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Falar no WhatsApp
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Dúvidas frequentes
                    </span>
                  </div>
                </div>

                {/* FAQ */}
                <Accordion type="single" collapsible className="w-full">
                  {faqItems.slice(0, 4).map((item, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-sm text-left">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground text-center mb-3">
                    Para abrir um ticket de suporte, faça login
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      navigate("/auth");
                      setIsOpen(false);
                    }}
                  >
                    Fazer Login
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
