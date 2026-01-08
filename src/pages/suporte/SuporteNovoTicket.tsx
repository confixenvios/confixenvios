import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Send, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import logoConfix from "@/assets/logo-confix-envios.png";

interface SlaConfig {
  priority: string;
  first_response_hours: number;
  resolution_hours: number;
}

const categoryOptions = [
  { value: "technical", label: "Suporte Técnico" },
  { value: "billing", label: "Faturamento" },
  { value: "general", label: "Dúvidas Gerais" },
  { value: "feedback", label: "Sugestões" },
  { value: "complaint", label: "Reclamações" },
];

const priorityOptions = [
  { value: "low", label: "Baixa", description: "Questões gerais sem urgência" },
  { value: "medium", label: "Média", description: "Problemas que afetam parcialmente o serviço" },
  { value: "high", label: "Alta", description: "Problemas significativos que precisam de atenção rápida" },
  { value: "urgent", label: "Urgente", description: "Situações críticas que impedem o uso do serviço" },
];

const SuporteNovoTicket = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [slaConfigs, setSlaConfigs] = useState<SlaConfig[]>([]);

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("medium");

  useEffect(() => {
    checkAuth();
    loadSlaConfigs();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/suporte");
    }
  };

  const loadSlaConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from("sla_configs")
        .select("*");

      if (error) throw error;
      setSlaConfigs(data || []);
    } catch (error) {
      console.error("Erro ao carregar SLA configs:", error);
    }
  };

  const getSelectedSla = () => {
    const config = slaConfigs.find(c => c.priority === priority);
    if (!config) return null;
    return {
      firstResponse: config.first_response_hours,
      resolution: config.resolution_hours,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          subject,
          description,
          category: category as any,
          priority: priority as any,
        } as any);

      if (error) throw error;

      toast.success("Ticket criado com sucesso!");
      navigate("/suporte/tickets");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar ticket");
    } finally {
      setIsLoading(false);
    }
  };

  const sla = getSelectedSla();

  return (
    <div className="min-h-screen bg-muted/30">
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

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Abrir Novo Ticket</CardTitle>
            <CardDescription>
              Descreva seu problema ou dúvida em detalhes para que possamos ajudá-lo melhor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="subject">Assunto *</Label>
                <Input
                  id="subject"
                  placeholder="Resumo do seu problema ou dúvida"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  maxLength={200}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Prioridade *</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div>
                            <span>{option.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* SLA Info */}
              {sla && (
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">SLA para esta prioridade</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Primeira resposta</p>
                      <p className="font-medium">{sla.firstResponse} horas</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Resolução</p>
                      <p className="font-medium">{sla.resolution} horas</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva em detalhes o problema, incluindo passos para reproduzir, mensagens de erro, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={6}
                  maxLength={5000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {description.length}/5000 caracteres
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate("/suporte/tickets")}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? (
                    "Criando..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Criar Ticket
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SuporteNovoTicket;
