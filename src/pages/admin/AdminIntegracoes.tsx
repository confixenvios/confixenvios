import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Settings, 
  Plus, 
  Globe, 
  Key, 
  Trash2, 
  Edit2,
  TestTube,
  Link as LinkIcon,
  AlertTriangle
} from "lucide-react";
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Integration {
  id: string;
  name: string;
  webhook_url: string;
  secret_key?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const AdminIntegracoes = () => {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    webhook_url: '',
    secret_key: '',
    active: true
  });

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

  const handleSaveIntegration = async () => {
    try {
      if (editingIntegration) {
        // Update existing integration
        const { error } = await supabase
          .from('integrations')
          .update(formData)
          .eq('id', editingIntegration.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Integração atualizada com sucesso!"
        });
      } else {
        // Create new integration
        const { error } = await supabase
          .from('integrations')
          .insert([formData]);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Integração criada com sucesso!"
        });
      }

      setDialogOpen(false);
      setEditingIntegration(null);
      setFormData({ name: '', webhook_url: '', secret_key: '', active: true });
      loadIntegrations();
    } catch (error) {
      console.error('Error saving integration:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a integração.",
        variant: "destructive"
      });
    }
  };

  const handleEditIntegration = (integration: Integration) => {
    setEditingIntegration(integration);
    setFormData({
      name: integration.name,
      webhook_url: integration.webhook_url,
      secret_key: integration.secret_key || '',
      active: integration.active
    });
    setDialogOpen(true);
  };

  const handleDeleteIntegration = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta integração?')) return;

    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Integração excluída com sucesso!"
      });

      loadIntegrations();
    } catch (error) {
      console.error('Error deleting integration:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a integração.",
        variant: "destructive"
      });
    }
  };

  const handleTestIntegration = async (integration: Integration) => {
    try {
      // Create consolidated webhook payload matching the new system
      const testPayload = {
        event: "shipment_confirmed",
        shipmentId: "test-shipment-" + Date.now(),
        clienteId: "TEST_CLIENT",
        status: "PAGO_AGUARDANDO_ETIQUETA",

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
          referencia: "Próximo ao mercado"
        },

        destinatario: {
          nome: "João Teste",
          cpfCnpj: "98765432100",
          telefone: "11988887777",
          email: "joao@teste.com",
          cep: "01307001",
          endereco: "Rua Teste Destino",
          numero: "456",
          bairro: "Centro",
          cidade: "São Paulo",
          estado: "SP",
          referencia: "Apto 10"
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

      const response = await fetch(integration.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(integration.secret_key && { 'Authorization': `Bearer ${integration.secret_key}` })
        },
        body: JSON.stringify(testPayload)
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Webhook consolidado de teste enviado com sucesso!"
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error testing integration:', error);
      toast({
        title: "Erro no Teste",
        description: `Não foi possível testar o webhook: ${error}`,
        variant: "destructive"
      });
    }
  };

  const handleToggleActive = async (integration: Integration) => {
    try {
      const { error } = await supabase
        .from('integrations')
        .update({ active: !integration.active })
        .eq('id', integration.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Integração ${!integration.active ? 'ativada' : 'desativada'} com sucesso!`
      });

      loadIntegrations();
    } catch (error) {
      console.error('Error toggling integration:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status da integração.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integrações Webhook</h1>
          <p className="text-muted-foreground">
            Configure webhooks para sistemas externos (TMS)
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingIntegration(null);
              setFormData({ name: '', webhook_url: '', secret_key: '', active: true });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Integração
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingIntegration ? 'Editar' : 'Nova'} Integração
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da Integração</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Sistema TMS Principal"
                />
              </div>
              
              <div>
                <Label htmlFor="webhook_url">URL do Webhook</Label>
                <Input
                  id="webhook_url"
                  value={formData.webhook_url}
                  onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                  placeholder="https://api.exemplo.com/webhook"
                />
              </div>
              
              <div>
                <Label htmlFor="secret_key">Chave Secreta (Opcional)</Label>
                <Input
                  id="secret_key"
                  type="password"
                  value={formData.secret_key}
                  onChange={(e) => setFormData({ ...formData, secret_key: e.target.value })}
                  placeholder="Token de autenticação"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Ativo</Label>
              </div>
              
              <Button onClick={handleSaveIntegration} className="w-full">
                {editingIntegration ? 'Atualizar' : 'Criar'} Integração
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Warning Info */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">Fluxo do Webhook Consolidado:</p>
              <div className="text-blue-700 dark:text-blue-300 space-y-1">
                <p><strong>1.</strong> Cliente conclui pagamento → Sistema envia payload consolidado completo</p>
                <p><strong>2.</strong> Sistema externo (n8n/TMS) processa todos os dados</p>
                <p><strong>3.</strong> TMS retorna etiqueta via <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">/functions/v1/webhook-tms</code></p>
                <p><strong>4.</strong> Status atualizado para "ETIQUETA_DISPONIVEL"</p>
              </div>
              <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-900 rounded text-xs">
                <strong>Payload consolidado inclui:</strong> Remetente, Destinatário, Pacote, Mercadoria e Pagamento
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integrations List */}
      {integrations.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12">
            <div className="text-center">
              <Settings className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Nenhuma integração configurada
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {integrations.map((integration) => (
            <Card key={integration.id} className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <LinkIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{integration.name}</h3>
                        <Badge variant={integration.active ? "default" : "secondary"}>
                          {integration.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <Globe className="h-3 w-3" />
                          <span className="font-mono text-xs">{integration.webhook_url}</span>
                        </div>
                        {integration.secret_key && (
                          <div className="flex items-center gap-2">
                            <Key className="h-3 w-3" />
                            <span>Autenticação configurada</span>
                          </div>
                        )}
                        <p>Criado em: {new Date(integration.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  </div>
                  
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleTestIntegration(integration)}
                        className="text-xs"
                      >
                        <TestTube className="h-3 w-3 mr-1" />
                        Testar
                      </Button>
                      
                      <Switch 
                        checked={integration.active}
                        onCheckedChange={() => handleToggleActive(integration)}
                      />
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditIntegration(integration)}
                        className="text-xs"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteIntegration(integration.id)}
                        className="text-xs text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Excluir
                      </Button>
                    </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminIntegracoes;