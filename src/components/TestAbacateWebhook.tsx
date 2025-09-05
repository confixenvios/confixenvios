import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TestTube, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const TestAbacateWebhook = () => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testWebhook = async () => {
    setTesting(true);
    setResult(null);
    
    try {
      console.log('🧪 Testando webhook do Abacate Pay...');
      
      // Buscar uma cotação temporária existente para o teste
      const { data: tempQuote } = await supabase
        .from('temp_quotes')
        .select('*')
        .eq('status', 'pending_payment')
        .limit(1)
        .maybeSingle();
      
      if (!tempQuote) {
        toast.error('Nenhuma cotação pendente encontrada para teste');
        return;
      }
      
      // Payload de teste simulando webhook do Abacate Pay
      const webhookPayload = {
        event: 'billing.paid',
        data: {
          pixQrCode: {
            id: 'pix_char_test_' + Date.now(),
            status: 'PAID',
            amount: 100, // R$ 1,00 em centavos
            metadata: {
              externalId: tempQuote.external_id,
              userId: tempQuote.user_id
            },
            customer: {
              metadata: {
                name: 'Teste Cliente',
                email: 'teste@exemplo.com'
              }
            }
          }
        }
      };

      console.log('📤 Enviando payload de teste:', webhookPayload);
      
      // Chamar webhook manualmente
      const webhookUrl = `https://dhznyjtisfdxzbnzinab.supabase.co/functions/v1/abacate-webhook`;
      console.log('🔗 URL do webhook:', webhookUrl);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      });
      
      const responseData = await response.json();
      console.log('📥 Resposta do webhook:', responseData);
      
      setResult({
        success: response.ok,
        status: response.status,
        data: responseData,
        webhookUrl
      });
      
      if (response.ok) {
        toast.success('✅ Webhook testado com sucesso!');
      } else {
        toast.error(`❌ Erro no webhook: ${responseData.error || 'Erro desconhecido'}`);
      }
      
    } catch (error) {
      console.error('💥 Erro no teste do webhook:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      toast.error('Erro no teste do webhook');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5 text-primary" />
          Teste do Webhook Abacate Pay
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testWebhook}
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Testando Webhook...
            </>
          ) : (
            <>
              <TestTube className="h-4 w-4 mr-2" />
              Testar Webhook Manual
            </>
          )}
        </Button>
        
        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <Badge variant={result.success ? "default" : "destructive"}>
                {result.success ? 'Sucesso' : 'Erro'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Status: {result.status || 'N/A'}
              </span>
            </div>
            
            {result.webhookUrl && (
              <div className="text-xs text-muted-foreground">
                <strong>URL:</strong> {result.webhookUrl}
              </div>
            )}
            
            <div className="bg-muted p-3 rounded-lg">
              <pre className="text-xs overflow-auto max-h-40">
                {JSON.stringify(result.data || result.error, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TestAbacateWebhook;