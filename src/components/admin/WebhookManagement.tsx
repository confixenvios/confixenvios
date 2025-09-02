import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Webhook, 
  Plus, 
  Trash2, 
  Settings, 
  Globe, 
  CheckCircle,
  XCircle,
  Copy,
  Send,
  AlertCircle
} from "lucide-react";

interface Integration {
  id: string;
  name: string;
  webhook_url: string;
  secret_key?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const WebhookManagement = () => {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    webhook_url: '',
    secret_key: ''
  });
  const [testUrl, setTestUrl] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error loading integrations:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as integrações.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addWebhook = async () => {
    if (!newWebhook.name || !newWebhook.webhook_url) {
      toast({
        title: "Erro",
        description: "Nome e URL são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('integrations')
        .insert([{
          name: newWebhook.name,
          webhook_url: newWebhook.webhook_url,
          secret_key: newWebhook.secret_key || null,
          active: true
        }]);

      if (error) throw error;

      setNewWebhook({ name: '', webhook_url: '', secret_key: '' });
      loadIntegrations();
      
      toast({
        title: "Webhook Adicionado",
        description: "Webhook configurado com sucesso"
      });
    } catch (error) {
      console.error('Error adding webhook:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o webhook.",
        variant: "destructive"
      });
    }
  };

  const removeWebhook = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este webhook?')) return;

    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      loadIntegrations();
      toast({
        title: "Webhook Removido",
        description: "Webhook removido com sucesso"
      });
    } catch (error) {
      console.error('Error removing webhook:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o webhook.",
        variant: "destructive"
      });
    }
  };

  const toggleWebhook = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('integrations')
        .update({ active: !currentActive })
        .eq('id', id);

      if (error) throw error;

      loadIntegrations();
      toast({
        title: "Webhook Atualizado",
        description: `Webhook ${!currentActive ? 'ativado' : 'desativado'} com sucesso`
      });
    } catch (error) {
      console.error('Error toggling webhook:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o webhook.",
        variant: "destructive"
      });
    }
  };

  const testWebhook = async (url: string) => {
    setTesting(true);
    try {
      // Send consolidated webhook payload for testing
      const testPayload = {
        event: "shipment_confirmed",
        shipmentId: "test-" + Date.now(),
        clienteId: "TEST_CLIENT",
        status: "PAGO_AGUARDANDO_ETIQUETA",
        notificationType: "admin-only",
        adminNotification: true,

        remetente: {
          nome: "Loja Teste",
          cpfCnpj: "12345678901",
          telefone: "62999999999",
          email: "teste@loja.com",
          cep: "74345260",
          endereco: "Rua Teste",
          numero: "123",
          bairro: "Centro",
          cidade: "Goiânia",
          estado: "GO",
          referencia: ""
        },

        destinatario: {
          nome: "Cliente Teste",
          cpfCnpj: "98765432100",
          telefone: "11988887777",
          email: "cliente@teste.com",
          cep: "01307001",
          endereco: "Rua Destino",
          numero: "456",
          bairro: "Centro",
          cidade: "São Paulo",
          estado: "SP",
          referencia: ""
        },

        pacote: {
          pesoKg: 2.5,
          comprimentoCm: 30,
          larguraCm: 20,
          alturaCm: 15,
          formato: "CAIXA"
        },

        mercadoria: {
          quantidade: 1,
          valorUnitario: 50.00,
          valorTotal: 50.00,
          documentoFiscal: {
            tipo: "DECLARACAO_CONTEUDO",
            temNotaFiscal: false,
            chaveNfe: null
          }
        },

        pagamento: {
          metodo: "PIX",
          valor: 25.90,
          status: "PAID",
          dataPagamento: new Date().toISOString()
        }
      };

      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify(testPayload),
      });

      toast({
        title: "Teste Enviado",
        description: "Webhook consolidado de teste enviado. Verifique o destino para confirmar."
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Webhook className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Gestão de Webhooks</h2>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">Sistema de Webhook Consolidado</p>
              <div className="text-blue-700 dark:text-blue-300 space-y-1">
                <p>• Um único webhook com todas as informações da remessa é enviado após pagamento</p>
                <p>• Inclui dados do remetente, destinatário, pacote, mercadoria e pagamento</p>
                <p>• Sistema externo deve responder com etiqueta via endpoint de retorno</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add New Webhook */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Adicionar Webhook de Produção</span>
          </CardTitle>
          <CardDescription>
            Configure o webhook para seu sistema TMS/n8n de produção
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="webhook-name">Nome da Integração</Label>
              <Input
                id="webhook-name"
                placeholder="Ex: n8n Produção"
                value={newWebhook.name}
                onChange={(e) => setNewWebhook({...newWebhook, name: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="webhook-url">URL do Webhook</Label>
              <Input
                id="webhook-url"
                placeholder="https://sua-instancia.n8n.app/webhook/..."
                value={newWebhook.webhook_url}
                onChange={(e) => setNewWebhook({...newWebhook, webhook_url: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="secret-key">Chave Secreta (Opcional)</Label>
              <Input
                id="secret-key"
                type="password"
                placeholder="Token de autenticação"
                value={newWebhook.secret_key}
                onChange={(e) => setNewWebhook({...newWebhook, secret_key: e.target.value})}
              />
            </div>
          </div>

          <Button onClick={addWebhook} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Webhook
          </Button>
        </CardContent>
      </Card>

      {/* Quick Test */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Send className="h-5 w-5" />
            <span>Teste Rápido</span>
          </CardTitle>
          <CardDescription>
            Teste um webhook enviando o payload consolidado completo
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
            Gerencie suas integrações ativas ({integrations.length} configurada{integrations.length !== 1 ? 's' : ''})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {integrations.length === 0 ? (
            <div className="text-center py-8">
              <Webhook className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum webhook configurado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {integrations.map((integration) => (
                <div key={integration.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-foreground">{integration.name}</h4>
                        {integration.active ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Badge variant={integration.active ? "default" : "secondary"}>
                          {integration.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Globe className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground font-mono">
                          {integration.webhook_url}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(integration.webhook_url)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Criado em: {new Date(integration.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <Switch
                        checked={integration.active}
                        onCheckedChange={() => toggleWebhook(integration.id, integration.active)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => testWebhook(integration.webhook_url)}
                        disabled={testing}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeWebhook(integration.id)}
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