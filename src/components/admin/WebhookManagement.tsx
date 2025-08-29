import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Webhook, 
  Plus, 
  Trash2, 
  Settings, 
  Globe, 
  CheckCircle,
  XCircle,
  Copy,
  Send
} from "lucide-react";

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  lastTriggered?: Date;
}

const WebhookManagement = () => {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([
    {
      id: '1',
      name: 'Sistema CRM',
      url: 'https://hooks.zapier.com/hooks/catch/123456/abcdef/',
      events: ['shipment_created', 'shipment_delivered'],
      active: true,
      lastTriggered: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    },
    {
      id: '2', 
      name: 'Notificações Email',
      url: 'https://hooks.zapier.com/hooks/catch/789012/ghijkl/',
      events: ['shipment_created', 'shipment_updated'],
      active: false
    }
  ]);
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[]
  });
  const [testUrl, setTestUrl] = useState('');
  const [testing, setTesting] = useState(false);

  const availableEvents = [
    'shipment_created',
    'shipment_updated', 
    'shipment_delivered',
    'user_registered',
    'payment_completed'
  ];

  const addWebhook = () => {
    if (!newWebhook.name || !newWebhook.url) {
      toast({
        title: "Erro",
        description: "Nome e URL são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const webhook: WebhookConfig = {
      id: Date.now().toString(),
      ...newWebhook,
      active: true
    };

    setWebhooks([...webhooks, webhook]);
    setNewWebhook({ name: '', url: '', events: [] });
    
    toast({
      title: "Webhook Adicionado",
      description: "Webhook configurado com sucesso"
    });
  };

  const removeWebhook = (id: string) => {
    setWebhooks(webhooks.filter(w => w.id !== id));
    toast({
      title: "Webhook Removido",
      description: "Webhook removido com sucesso"
    });
  };

  const toggleWebhook = (id: string) => {
    setWebhooks(webhooks.map(w => 
      w.id === id ? { ...w, active: !w.active } : w
    ));
  };

  const testWebhook = async (url: string) => {
    setTesting(true);
    try {
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify({
          event: "webhook_test",
          timestamp: new Date().toISOString(),
          data: {
            message: "Teste de webhook do Confix Envios"
          }
        }),
      });

      toast({
        title: "Teste Enviado",
        description: "Webhook de teste enviado. Verifique o destino para confirmar o recebimento."
      });
    } catch (error) {
      toast({
        title: "Erro no Teste",
        description: "Falha ao enviar webhook de teste",
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "URL copiada para a área de transferência"
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Webhook className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Gestão de Webhooks</h2>
      </div>

      {/* Add New Webhook */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Adicionar Novo Webhook</span>
          </CardTitle>
          <CardDescription>
            Configure webhooks para integrar com sistemas externos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="webhook-name">Nome da Integração</Label>
              <Input
                id="webhook-name"
                placeholder="Ex: Sistema CRM"
                value={newWebhook.name}
                onChange={(e) => setNewWebhook({...newWebhook, name: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="webhook-url">URL do Webhook</Label>
              <Input
                id="webhook-url"
                placeholder="https://hooks.zapier.com/..."
                value={newWebhook.url}
                onChange={(e) => setNewWebhook({...newWebhook, url: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label>Eventos para Monitorar</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {availableEvents.map(event => (
                <Badge
                  key={event}
                  variant={newWebhook.events.includes(event) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    const events = newWebhook.events.includes(event)
                      ? newWebhook.events.filter(e => e !== event)
                      : [...newWebhook.events, event];
                    setNewWebhook({...newWebhook, events});
                  }}
                >
                  {event.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>

          <Button onClick={addWebhook} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Webhook
          </Button>
        </CardContent>
      </Card>

      {/* Webhook Test */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Send className="h-5 w-5" />
            <span>Testar Webhook</span>
          </CardTitle>
          <CardDescription>
            Envie um webhook de teste para verificar a configuração
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="URL do webhook para testar"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
            />
            <Button 
              onClick={() => testWebhook(testUrl)}
              disabled={!testUrl || testing}
            >
              {testing ? "Enviando..." : "Testar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Webhooks */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Webhooks Configurados</span>
          </CardTitle>
          <CardDescription>
            Gerencie suas integrações ativas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <div className="text-center py-8">
              <Webhook className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum webhook configurado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-foreground">{webhook.name}</h4>
                        {webhook.active ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Globe className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground font-mono">
                          {webhook.url}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(webhook.url)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {webhook.events.map(event => (
                          <Badge key={event} variant="secondary" className="text-xs">
                            {event.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>

                      {webhook.lastTriggered && (
                        <p className="text-xs text-muted-foreground">
                          Último disparo: {webhook.lastTriggered.toLocaleString('pt-BR')}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <Switch
                        checked={webhook.active}
                        onCheckedChange={() => toggleWebhook(webhook.id)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => testWebhook(webhook.url)}
                        disabled={testing}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeWebhook(webhook.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WebhookManagement;