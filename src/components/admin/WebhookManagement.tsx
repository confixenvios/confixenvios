import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { SecureIntegrationsService, SecureIntegration } from "@/services/secureIntegrationsService";
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
  AlertCircle,
  Shield
} from "lucide-react";

const WebhookManagement = () => {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<SecureIntegration[]>([]);
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
      const data = await SecureIntegrationsService.getSecureIntegrations();
      setIntegrations(data);
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
      await SecureIntegrationsService.createIntegration({
        name: newWebhook.name,
        webhook_url: newWebhook.webhook_url,
        secret_key: newWebhook.secret_key || undefined,
        active: true
      });

      setNewWebhook({ name: '', webhook_url: '', secret_key: '' });
      loadIntegrations();
      
      toast({
        title: "Webhook Adicionado",
        description: "Webhook configurado com sucesso e chave secreta criptografada"
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
      await SecureIntegrationsService.deleteIntegration(id);

      loadIntegrations();
      toast({
        title: "Webhook Removido",
        description: "Webhook e chaves secretas removidos com segurança"
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
      await SecureIntegrationsService.updateIntegration(id, { 
        active: !currentActive 
      });

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

  const testWebhook = async (integration: SecureIntegration) => {
    setTesting(true);
    try {
      // Test with the exact format from the specification
      const testPayload = {
        event: "shipment_created",
        shipmentId: "ID2025TEST" + Date.now(),
        clienteId: "TEST_CLIENT",
        status: "CRIADO",
        
        remetente: {
          nome: "João da Silva",
          cpf_cnpj: "12345678900",
          telefone: "62999999999",
          email: "joao@email.com",
          endereco: {
            cep: "74345-260",
            rua: "Rua X",
            numero: "123",
            bairro: "Centro",
            cidade: "Goiânia",
            estado: "GO",
            complemento: "Apto 101"
          }
        },
        
        destinatario: {
          nome: "Maria Oliveira",
          cpf_cnpj: "98765432100",
          telefone: "62988888888",
          email: "maria@email.com",
          endereco: {
            cep: "70295-500",
            rua: "Avenida Y",
            numero: "456",
            bairro: "Setor Sul",
            cidade: "Brasília",
            estado: "DF",
            complemento: "Casa"
          }
        },
        
        coleta: {
          tipo: "BALCÃO",
          local_coleta: "Endereço do remetente"
        },
        
        mercadoria: {
          quantidade: 2,
          valor_unitario: 150.00,
          valor_total: 300.00,
          descricao: "Caixas de eletrônicos"
        },
        
        pacote: {
          peso: 10.5,
          dimensoes: {
            comprimento: 40,
            largura: 30,
            altura: 20
          },
          formato: "Caixa"
        },
        
        documento_fiscal: {
          tipo: "DECLARACAO",
          chave_nfe: null,
          valor_declarado: 300.00
        },
        
        frete: {
          tipo: "Econômico",
          valor: 46.11,
          prazo: "3 dias úteis"
        }
      };

      const response = await SecureIntegrationsService.testWebhook(integration, testPayload);

      if (response.ok) {
        toast({
          title: "Teste Enviado",
          description: "Webhook consolidado de teste enviado com sucesso com autenticação segura."
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      toast({
        title: "Erro no Teste",
        description: `Falha ao enviar webhook de teste: ${error}`,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const testQuickWebhook = async (url: string) => {
    setTesting(true);
    try {
      const testPayload = {
        event: "shipment_confirmed",
        shipmentId: "test-" + Date.now(),
        clienteId: "TEST_CLIENT",
        status: "PAGO_AGUARDANDO_ETIQUETA"
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
        title: "Teste Rápido Enviado",
        description: "Webhook de teste básico enviado."
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

      {/* Security Info Card */}
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-green-900 dark:text-green-100">Sistema de Webhook Seguro</p>
              <div className="text-green-700 dark:text-green-300 space-y-1">
                <p>• Chaves secretas são criptografadas usando Supabase Vault</p>
                <p>• Acesso auditado com logs de segurança</p>
                <p>• Proteção contra compromisso de contas administrativas</p>
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
              onClick={() => testQuickWebhook(testUrl)}
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
                        onClick={() => testWebhook(integration)}
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