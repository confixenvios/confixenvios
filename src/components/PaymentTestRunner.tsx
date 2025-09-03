import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, X, Clock, AlertTriangle, Wifi, Play } from "lucide-react";

interface TestStep {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  data?: any;
}

const PaymentTestRunner = () => {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState(null);
  const [steps, setSteps] = useState<TestStep[]>([
    { name: "Verificar integração ativa", status: 'pending' },
    { name: "Testar conectividade do webhook", status: 'pending' },
    { name: "Criar shipment de teste", status: 'pending' },
    { name: "Simular pagamento", status: 'pending' },
    { name: "Disparar webhook", status: 'pending' },
    { name: "Verificar resposta", status: 'pending' }
  ]);

  const updateStep = (index: number, status: TestStep['status'], message?: string, data?: any) => {
    setSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, status, message, data } : step
    ));
  };

  const testWebhookOnly = async () => {
    setIsTestingWebhook(true);
    setWebhookTestResult(null);
    
    try {
      const { data: result, error } = await supabase.functions.invoke('test-webhook-url');
      
      if (error) {
        throw error;
      }
      
      setWebhookTestResult(result);
      
      if (result.success) {
        toast({
          title: "Webhook Testado com Sucesso!",
          description: `Status ${result.response.status}: Endpoint está respondendo`,
        });
      } else {
        toast({
          title: "Problemas no Webhook Detectados",
          description: `Status ${result.response.status}: ${result.analysis.possibleIssues[0] || 'Verificar configuração'}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao testar webhook:', error);
      toast({
        title: "Erro no Teste do Webhook",
        description: `Falha: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const testWebhookConnectivity = async (webhookUrl: string) => {
    try {
      // Fazer uma requisição HEAD para verificar se o endpoint está acessível
      const response = await fetch(webhookUrl, {
        method: 'HEAD',
        mode: 'no-cors' // Para evitar problemas de CORS
      });
      return { accessible: true, status: response.status };
    } catch (error) {
      return { accessible: false, error: error.message };
    }
  };

  const runFullTest = async () => {
    setIsRunning(true);
    
    try {
      // Passo 1: Verificar integração ativa
      updateStep(0, 'running');
      const { data: integration, error: integrationError } = await supabase
        .from('integrations')
        .select('*')
        .eq('active', true)
        .single();

      if (integrationError || !integration) {
        updateStep(0, 'error', `Nenhuma integração ativa encontrada: ${integrationError?.message}`);
        return;
      }

      updateStep(0, 'success', `Integração encontrada: ${integration.name}`, integration);

      // Passo 2: Testar conectividade do webhook
      updateStep(1, 'running');
      const connectivityTest = await testWebhookConnectivity(integration.webhook_url);
      
      if (!connectivityTest.accessible) {
        updateStep(1, 'error', `URL não acessível: ${connectivityTest.error}`);
        // Continuar mesmo com erro de conectividade para testar o resto
      } else {
        updateStep(1, 'success', `Webhook URL acessível`);
      }

      // Passo 3: Criar shipment de teste
      updateStep(2, 'running');
      
      // Criar endereços de teste
      const testSenderAddress = {
        name: "TESTE REMETENTE",
        cep: "74900-000", 
        street: "Rua de Teste",
        number: "123",
        complement: "Apto 1",
        neighborhood: "Centro",
        city: "Goiânia", 
        state: "GO",
        address_type: "sender"
      };

      const testRecipientAddress = {
        name: "TESTE DESTINATARIO", 
        cep: "01310-100",
        street: "Av Paulista", 
        number: "456",
        complement: "",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP", 
        address_type: "recipient"
      };

      const { data: senderAddr, error: senderError } = await supabase
        .from('addresses')
        .insert(testSenderAddress)
        .select()
        .single();

      if (senderError) {
        updateStep(2, 'error', `Erro ao criar endereço remetente: ${senderError.message}`);
        return;
      }

      const { data: recipientAddr, error: recipientError } = await supabase
        .from('addresses') 
        .insert(testRecipientAddress)
        .select()
        .single();

      if (recipientError) {
        updateStep(2, 'error', `Erro ao criar endereço destinatário: ${recipientError.message}`);
        return;
      }

      // Criar shipment de teste
      const testShipment = {
        sender_address_id: senderAddr.id,
        recipient_address_id: recipientAddr.id,
        weight: 1,
        length: 20,
        width: 15, 
        height: 10,
        format: "caixa",
        selected_option: "standard",
        pickup_option: "dropoff",
        status: "PENDING_PAYMENT",
        quote_data: {
          originCep: "74900-000",
          destinyCep: "01310-100", 
          weight: "1",
          length: "20", 
          width: "15",
          height: "10",
          format: "caixa",
          quantity: "1",
          unitValue: "100",
          totalMerchandiseValue: 100,
          shippingQuote: {
            economicPrice: 15.50,
            expressPrice: 24.80,
            economicDays: 5,
            expressDays: 2,
            zone: "SP.01",
            zoneName: "São Paulo Capital"
          },
          calculatedAt: new Date().toISOString()
        }
      };

      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .insert(testShipment)
        .select()
        .single();

      if (shipmentError) {
        updateStep(2, 'error', `Erro ao criar shipment: ${shipmentError.message}`);
        return;
      }

      updateStep(2, 'success', `Shipment criado com ID: ${shipment.id}`, shipment);

      // Passo 4: Simular pagamento
      updateStep(3, 'running'); 
      const paymentData = {
        method: 'TEST_PAYMENT',
        amount: 15.50,
        status: 'PAID',
        session_id: `test_session_${Date.now()}`,
        confirmed_at: new Date().toISOString()
      };

      const { error: paymentError } = await supabase
        .from('shipments')
        .update({
          status: 'PAYMENT_CONFIRMED',
          payment_data: paymentData,
          updated_at: new Date().toISOString()
        })
        .eq('id', shipment.id);

      if (paymentError) {
        updateStep(3, 'error', `Erro ao simular pagamento: ${paymentError.message}`);
        return;
      }

      updateStep(3, 'success', `Pagamento simulado com sucesso`);

      // Passo 5: Disparar webhook
      updateStep(4, 'running');
      
      const webhookPayload = {
        shipmentId: shipment.id,
        paymentData: paymentData,
        documentData: {
          documentType: 'declaration',
          merchandiseDescription: 'Teste de mercadoria para validação'
        },
        selectedQuote: {
          completeQuoteData: testShipment.quote_data,
          totalPrice: 15.50,
          option: 'standard'
        },
        shipmentData: {
          id: shipment.id,
          quoteData: testShipment.quote_data,
          weight: 1,
          totalPrice: 15.50,
          senderData: {
            name: "TESTE REMETENTE",
            document: "12345678901", 
            phone: "(62) 99999-9999",
            email: "teste@exemplo.com"
          },
          recipientData: {
            name: "TESTE DESTINATARIO",
            document: "98765432100",
            phone: "(11) 88888-8888", 
            email: "destinatario@exemplo.com"
          }
        }
      };

      const { data: webhookResult, error: webhookError } = await supabase.functions
        .invoke('webhook-dispatch', {
          body: webhookPayload
        });

      if (webhookError) {
        updateStep(4, 'error', `Erro ao disparar webhook: ${webhookError.message}`);
        updateStep(5, 'error', 'Não foi possível verificar resposta');
        return;
      }

      updateStep(4, 'success', `Webhook disparado`);

      // Passo 6: Verificar resposta  
      updateStep(5, 'running');
      
      if (webhookResult?.success) {
        updateStep(5, 'success', `Webhook processado - Status: ${webhookResult.webhookStatus}`, webhookResult);
        
        toast({
          title: "Teste Concluído!",
          description: "Todo o processo de pagamento e webhook funcionou corretamente.",
        });
      } else {
        updateStep(5, 'error', `Webhook falhou - Resposta: ${JSON.stringify(webhookResult)}`);
        
        toast({
          title: "Teste Parcialmente Bem-sucedido", 
          description: "O processo funcionou, mas houve problemas no webhook.",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Erro durante o teste:', error);
      toast({
        title: "Erro no Teste",
        description: `Falha durante execução: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStepIcon = (status: TestStep['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <X className="h-4 w-4 text-red-500" />;
      case 'running': return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const getStepBadge = (status: TestStep['status']) => {
    switch (status) {
      case 'success': return <Badge className="bg-green-500">Sucesso</Badge>;
      case 'error': return <Badge variant="destructive">Erro</Badge>; 
      case 'running': return <Badge className="bg-blue-500">Executando</Badge>;
      default: return <Badge variant="outline">Pendente</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Teste Completo de Pagamento e Webhook
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
          <div>
            <p className="font-semibold">Validação do Sistema de Pagamentos</p>
            <p className="text-sm text-muted-foreground">
              Teste completo: criação de remessa → pagamento → webhook → resposta
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={testWebhookOnly} 
              disabled={isTestingWebhook}
              variant="outline"
              size="sm"
              className="min-w-32"
            >
              <Wifi className="h-4 w-4 mr-2" />
              {isTestingWebhook ? 'Testando...' : 'Testar Webhook'}
            </Button>
            <Button 
              onClick={runFullTest} 
              disabled={isRunning}
              className="min-w-32"
            >
              <Play className="h-4 w-4 mr-2" />
              {isRunning ? 'Testando...' : 'Teste Completo'}
            </Button>
          </div>
        </div>

        {/* Resultado do teste do webhook */}
        {webhookTestResult && (
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                Resultado do Teste de Webhook
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Integração:</p>
                  <p className="text-sm text-muted-foreground">{webhookTestResult.integration?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status HTTP:</p>
                  <Badge variant={webhookTestResult.success ? "default" : "destructive"}>
                    {webhookTestResult.response?.status || 'N/A'}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium">URL:</p>
                <p className="text-xs text-muted-foreground font-mono break-all">
                  {webhookTestResult.integration?.url}
                </p>
              </div>

              {webhookTestResult.analysis?.possibleIssues?.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                  <p className="text-sm font-medium text-amber-800">Problemas Identificados:</p>
                  <ul className="text-sm text-amber-700 mt-1 space-y-1">
                    {webhookTestResult.analysis.possibleIssues.map((issue, idx) => (
                      <li key={idx}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {webhookTestResult.response?.body && (
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    Ver resposta completa do servidor
                  </summary>
                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto max-h-40">
                    {webhookTestResult.response.body}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="flex-shrink-0">
                {getStepIcon(step.status)}
              </div>
              
              <div className="flex-grow">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{step.name}</span>
                  {getStepBadge(step.status)}
                </div>
                
                {step.message && (
                  <p className={`text-sm mt-1 ${
                    step.status === 'error' ? 'text-red-600' : 'text-muted-foreground'
                  }`}>
                    {step.message}
                  </p>
                )}
                
                {step.data && step.status === 'success' && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      Ver dados detalhados
                    </summary>
                    <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                      {JSON.stringify(step.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-amber-800">Informações do Teste:</p>
              <ul className="mt-1 space-y-1 text-amber-700">
                <li>• Este teste cria dados reais no banco de dados</li>
                <li>• O webhook será disparado para a URL configurada</li>
                <li>• Dados de teste serão criados com prefixo "TESTE"</li>
                <li>• Erro 404 no webhook indica que a URL não existe ou está inativa</li>
              </ul>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};

export default PaymentTestRunner;