import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, Plus, Edit, Trash2, Webhook, MessageSquare, CreditCard, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Integration {
  id: string;
  type: 'tms' | 'payment' | 'email' | 'whatsapp';
  name: string;
  url: string;
  secret?: string;
  active: boolean;
  description: string;
  icon: any;
}

const Integracoes = () => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);

  // Mock data for demo
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: "1",
      type: "tms",
      name: "Sistema TMS Principal",
      url: "https://api.tms.exemplo.com/webhook",
      secret: "tms_secret_123",
      active: true,
      description: "Integração com sistema de gerenciamento de transporte",
      icon: Truck
    },
    {
      id: "2", 
      type: "payment",
      name: "Gateway de Pagamento",
      url: "https://api.pagamento.exemplo.com/webhook",
      secret: "pay_secret_456",
      active: true,
      description: "Processamento de pagamentos PIX e cartão",
      icon: CreditCard
    },
    {
      id: "3",
      type: "whatsapp",
      name: "WhatsApp Business",
      url: "https://api.whatsapp.exemplo.com/webhook",
      secret: "wa_secret_789",
      active: false,
      description: "Notificações via WhatsApp para clientes",
      icon: MessageSquare
    }
  ]);

  const [formData, setFormData] = useState({
    type: "tms" as 'tms' | 'payment' | 'email' | 'whatsapp',
    name: "",
    url: "",
    secret: "",
    active: true,
    description: ""
  });

  const integrationTypes = [
    { value: "tms", label: "TMS - Transporte", icon: Truck },
    { value: "payment", label: "Pagamento", icon: CreditCard },
    { value: "email", label: "E-mail", icon: MessageSquare },
    { value: "whatsapp", label: "WhatsApp", icon: MessageSquare }
  ];

  const handleSave = () => {
    if (!formData.name || !formData.url) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome e URL",
        variant: "destructive"
      });
      return;
    }

    if (editingIntegration) {
      // Update existing
      setIntegrations(prev => prev.map(integration => 
        integration.id === editingIntegration.id 
          ? { ...integration, ...formData, Icon: integrationTypes.find(t => t.value === formData.type)?.icon || Webhook }
          : integration
      ));
      
      toast({
        title: "Integração atualizada!",
        description: `${formData.name} foi atualizada com sucesso`,
      });
    } else {
      // Create new
      const newIntegration: Integration = {
        id: Date.now().toString(),
        ...formData,
        icon: integrationTypes.find(t => t.value === formData.type)?.icon || Webhook
      };
      
      setIntegrations(prev => [...prev, newIntegration]);
      
      toast({
        title: "Integração criada!",
        description: `${formData.name} foi configurada com sucesso`,
      });
    }

    // Reset form
    setFormData({
      type: "tms",
      name: "",
      url: "",
      secret: "",
      active: true,
      description: ""
    });
    setEditingIntegration(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (integration: Integration) => {
    setEditingIntegration(integration);
    setFormData({
      type: integration.type,
      name: integration.name,
      url: integration.url,
      secret: integration.secret || "",
      active: integration.active,
      description: integration.description
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (integration: Integration) => {
    setIntegrations(prev => prev.filter(i => i.id !== integration.id));
    toast({
      title: "Integração removida",
      description: `${integration.name} foi removida`,
    });
  };

  const toggleIntegration = (integration: Integration) => {
    setIntegrations(prev => prev.map(i => 
      i.id === integration.id 
        ? { ...i, active: !i.active }
        : i
    ));
    
    toast({
      title: integration.active ? "Integração desativada" : "Integração ativada",
      description: `${integration.name} foi ${integration.active ? 'desativada' : 'ativada'}`,
    });
  };

  const testWebhook = async (integration: Integration) => {
    toast({
      title: "Testando webhook...",
      description: `Enviando teste para ${integration.name}`,
    });

    // Simulate webhook test
    setTimeout(() => {
      toast({
        title: "Teste concluído!",
        description: "Webhook respondeu com sucesso (200 OK)",
      });
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integrações</h1>
          <p className="text-muted-foreground">
            Configure webhooks e integrações externas
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Nova Integração
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>
                {editingIntegration ? 'Editar' : 'Criar'} Integração
              </DialogTitle>
              <DialogDescription>
                Configure uma nova integração via webhook
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Integração *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Sistema TMS Principal"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="url">URL do Webhook *</Label>
                <Input
                  id="url" 
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://api.exemplo.com/webhook"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="secret">Secret (Opcional)</Label>
                <Input
                  id="secret"
                  type="password"
                  value={formData.secret}
                  onChange={(e) => setFormData(prev => ({ ...prev, secret: e.target.value }))}
                  placeholder="Chave secreta para autenticação"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o propósito desta integração..."
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                />
                <Label htmlFor="active">Ativar integração</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {editingIntegration ? 'Atualizar' : 'Criar'} Integração
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => {
          const IconComponent = integration.icon;
          
          return (
            <Card key={integration.id} className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <Badge variant={integration.active ? "default" : "secondary"}>
                        {integration.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {integration.description}
                </p>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">URL:</span>
                    <p className="text-muted-foreground break-all font-mono">
                      {integration.url}
                    </p>
                  </div>
                  {integration.secret && (
                    <div>
                      <span className="font-medium">Secret:</span>
                      <p className="text-muted-foreground font-mono">
                        •••••••••••••
                      </p>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(integration)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(integration)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => testWebhook(integration)}
                      disabled={!integration.active}
                    >
                      <Webhook className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Switch
                    checked={integration.active}
                    onCheckedChange={() => toggleIntegration(integration)}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-primary">
            <Settings className="h-5 w-5" />
            <span>Como funcionam as integrações</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <strong>Webhooks automáticos:</strong> Sempre que uma cotação é feita, enviamos os dados para todas as integrações ativas.
          </p>
          <p>
            <strong>Retorno do TMS:</strong> Quando o sistema externo processar a cotação, ele deve retornar os dados da etiqueta.
          </p>
          <p>
            <strong>Segurança:</strong> Use o campo "Secret" para validar que os webhooks vêm realmente do seu sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Integracoes;