import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, FileText, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSavedSenders } from "@/hooks/useSavedSenders";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { saveApprovedSender } = useSavedSenders();
  const [isProcessing, setIsProcessing] = useState(true);
  const [shipmentStatus, setShipmentStatus] = useState('PAYMENT_CONFIRMED');
  const [trackingCode, setTrackingCode] = useState('');

  useEffect(() => {
    const processPaymentAndWebhook = async () => {
      try {
        const paymentData = JSON.parse(sessionStorage.getItem('paymentData') || '{}');
        const shipmentId = sessionStorage.getItem('paymentShipmentId');
        const shipmentData = JSON.parse(sessionStorage.getItem('currentShipment') || '{}');
        const documentData = JSON.parse(sessionStorage.getItem('documentData') || '{}');
        const selectedQuote = JSON.parse(sessionStorage.getItem('selectedQuote') || '{}');

        if (!shipmentId || !paymentData.method) {
          navigate('/cliente/dashboard');
          return;
        }

        // First update the shipment with payment data and status
        const { data: shipment, error: updateError } = await supabase
          .from('shipments')
          .update({
            status: 'PAYMENT_CONFIRMED',
            payment_data: paymentData,
            updated_at: new Date().toISOString()
          })
          .eq('id', shipmentId)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        setTrackingCode(shipment?.tracking_code || '');

        // Salvar remetente automaticamente após pagamento aprovado
        if (shipmentData.senderData) {
          try {
            console.log('Salvando remetente aprovado:', shipmentData.senderData);
            const senderSaved = await saveApprovedSender(shipmentData.senderData, true);
            if (senderSaved) {
              console.log('Remetente salvo com sucesso como padrão');
            }
          } catch (error) {
            console.error('Erro ao salvar remetente aprovado:', error);
            // Não bloquear o fluxo por erro no salvamento do remetente
          }
        }

        // Prepare complete data payload for webhook
        const completePayload = {
          shipmentId: shipmentId,
          paymentData,
          documentData,
          selectedQuote,
          shipmentData
        };

        // Dispatch webhook to external TMS system with all collected data
        const { data: webhookResult, error: webhookError } = await supabase.functions
          .invoke('webhook-dispatch', {
            body: completePayload
          });

        if (webhookError) {
          console.error('Webhook dispatch error:', webhookError);
          toast({
            title: "Atenção",
            description: "Pagamento confirmado, mas houve problema na comunicação com o sistema de etiquetas.",
            variant: "destructive"
          });
        } else {
          console.log('Webhook dispatched successfully:', webhookResult);
          toast({
            title: "Sucesso",
            description: "Todos os dados foram enviados para processamento no n8n.",
          });
        }

        setShipmentStatus('PAGO_AGUARDANDO_ETIQUETA');
        
        // Clean up session storage
        sessionStorage.removeItem('paymentData');
        sessionStorage.removeItem('paymentShipmentId');
        sessionStorage.removeItem('currentShipment');
        sessionStorage.removeItem('documentData');
        sessionStorage.removeItem('selectedQuote');
        
      } catch (error) {
        console.error('Error processing payment:', error);
        toast({
          title: "Erro",
          description: "Houve um problema ao processar seu pagamento. Entre em contato conosco.",
          variant: "destructive"
        });
      } finally {
        setIsProcessing(false);
      }
    };

    processPaymentAndWebhook();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80 p-4">
      <div className="max-w-2xl mx-auto py-12">
        
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Pagamento Confirmado!
          </h1>
          <p className="text-muted-foreground">
            Sua remessa está sendo processada
          </p>
        </div>

        {/* Status Card */}
        <Card className="border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Status da Remessa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {trackingCode && (
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Código de Rastreamento:</span>
                <span className="font-mono text-sm bg-background px-2 py-1 rounded">
                  {trackingCode}
                </span>
              </div>
            )}

            <div className="space-y-3">
              {/* Payment Confirmed */}
              <div className="flex items-center gap-3 p-3 bg-success/5 border border-success/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium text-success">Pagamento Confirmado</p>
                  <p className="text-sm text-muted-foreground">
                    Seu pagamento foi processado com sucesso
                  </p>
                </div>
              </div>

              {/* Label Generation */}
              <div className={`flex items-center gap-3 p-3 rounded-lg ${
                isProcessing ? 'bg-warning/5 border border-warning/20' : 
                shipmentStatus === 'PAGO_AGUARDANDO_ETIQUETA' ? 'bg-warning/5 border border-warning/20' : 
                'bg-success/5 border border-success/20'
              }`}>
                {isProcessing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-warning" />
                ) : shipmentStatus === 'PAGO_AGUARDANDO_ETIQUETA' ? (
                  <Clock className="h-5 w-5 text-warning" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-success" />
                )}
                <div>
                  <p className={`font-medium ${
                    isProcessing ? 'text-warning' : 
                    shipmentStatus === 'PAGO_AGUARDANDO_ETIQUETA' ? 'text-warning' : 
                    'text-success'
                  }`}>
                    {isProcessing ? 'Processando...' : 
                     shipmentStatus === 'PAGO_AGUARDANDO_ETIQUETA' ? 'Aguardando Geração da Etiqueta' : 
                     'Etiqueta Disponível'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isProcessing ? 'Enviando dados para o sistema de etiquetas...' :
                     shipmentStatus === 'PAGO_AGUARDANDO_ETIQUETA' ? 'Aguardando confirmação do sistema externo' :
                     'Sua etiqueta está pronta para download'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Próximos Passos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>• Aguarde a geração da etiqueta pelo sistema externo</p>
              <p>• Você será notificado quando a etiqueta estiver disponível</p>
              <p>• Acesse o painel do cliente para acompanhar o status</p>
              <p>• Baixe e imprima a etiqueta quando disponível</p>
            </div>
            
            <div className="flex gap-4 pt-4">
              <Button onClick={() => navigate('/cliente/dashboard')} className="flex-1">
                Ir para Dashboard
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/cliente/remessas')}
                className="flex-1"
              >
                Ver Remessas
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default PaymentSuccess;