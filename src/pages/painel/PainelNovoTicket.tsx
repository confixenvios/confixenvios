import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";
import { Link } from "react-router-dom";

const SUBJECT_OPTIONS = [
  { value: "insucesso_entrega", label: "Insucesso na Entrega" },
  { value: "fora_prazo", label: "Entrega Fora do Prazo" },
  { value: "avaria", label: "Avaria de Produto" },
  { value: "duvida_outros", label: "Dúvida / Outros" },
];

const PainelNovoTicket = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const [subject, setSubject] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Build description with order number if provided
      const fullDescription = orderNumber.trim() 
        ? `Número do Pedido: ${orderNumber.trim()}\n\n${description}`
        : description;

      const { error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          subject,
          description: fullDescription,
          category: "general" as any,
          priority: "medium" as any,
        } as any);

      if (error) throw error;

      toast.success("Ticket criado com sucesso!");
      navigate("/painel/suporte");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar ticket");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <Link
        to="/painel/suporte"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos tickets
      </Link>

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
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o assunto" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.label}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderNumber">
                Número do Pedido <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="orderNumber"
                placeholder="Ex: CFX-123456"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
              />
            </div>

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
                onClick={() => navigate("/painel/suporte")}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="flex-1" 
                disabled={isLoading || !subject.trim() || !description.trim()}
              >
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
    </div>
  );
};

export default PainelNovoTicket;