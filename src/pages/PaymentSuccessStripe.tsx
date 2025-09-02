import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Package, ArrowRight, Clock } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PaymentSuccessStripe = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [isProcessing, setIsProcessing] = useState(true);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [webhookDispatched, setWebhookDispatched] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');

  useEffect(() => {
    const processStripePaymentSuccess = async () => {
      try {
        if (!sessionId) {
          console.log('No session ID provided');
          navigate('/');
          return;
        }

        // Get shipment data from session storage
        const shipmentData = JSON.parse(sessionStorage.getItem('currentShipment') || '{}');
        const documentData = JSON.parse(sessionStorage.getItem('documentData') || '{}');
        
        console.log('Processing Stripe payment success for session:', sessionId);
        console.log('Shipment data:', shipmentData);
        
        if (!shipmentData || !shipmentData.id) {
          console.log('No shipment data found in session storage');
          toast({
            title: "Erro",
            description: "Dados do envio não encontrados. Redirecionando...",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        // Update shipment status to paid
        const { data: shipment, error: updateError } = await supabase
          .from('shipments')
          .update({
            status: 'PAYMENT_CONFIRMED',
            payment_data: {
              method: 'STRIPE',
              session_id: sessionId,
              amount: shipmentData.quoteData?.shippingQuote?.economicPrice || 0,
              status: 'PAID'
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', shipmentData.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        setTrackingCode(shipment?.tracking_code || '');
        setPaymentConfirmed(true);

        // Dispatch webhook to N8n with consolidated data
        const webhookPayload = {
          shipmentId: shipmentData.id,
          paymentData: {
            method: 'STRIPE',
            session_id: sessionId,
            amount: shipmentData.quoteData?.shippingQuote?.economicPrice || 0,
            status: 'PAID'
          },
          documentData,
          selectedQuote: shipmentData.quoteData,
          shipmentData
        };

        console.log('Dispatching webhook with payload:', webhookPayload);

        const { data: webhookResult, error: webhookError } = await supabase.functions
          .invoke('webhook-dispatch', {
            body: webhookPayload
          });

        if (webhookError) {
          console.error('Webhook dispatch error:', webhookError);
          toast({
            title: "Atenção",
            description: "Pagamento confirmado, mas houve problema na comunicação com o sistema N8n.",
            variant: "destructive"
          });
        } else {
          console.log('Webhook dispatched successfully to N8n:', webhookResult);
          setWebhookDispatched(true);
          toast({
            title: "Sucesso",
            description: "Pagamento confirmado e dados enviados para o N8n!",
          });
        }

        // Clean up session storage
        sessionStorage.removeItem('currentShipment');
        sessionStorage.removeItem('documentData');

      } catch (error) {
        console.error('Error processing Stripe payment success:', error);
        toast({
          title: "Erro",
          description: "Houve um problema ao processar seu pagamento. Entre em contato conosco.",
          variant: "destructive"
        });
      } finally {
        setIsProcessing(false);
      }
    };

    processStripePaymentSuccess();
  }, [sessionId, navigate, toast]);

  const handleGoToDashboard = () => {
    navigate('/');
  };

  const handleTrackShipment = () => {
    navigate('/rastreamento');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-green-500/10 rounded-full">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Pagamento Realizado com Sucesso!
          </h1>
          <p className="text-muted-foreground">
            Seus dados foram enviados para o N8n para processamento
          </p>
        </div>

        {/* Payment Status */}
        <Card className="border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Status do Processamento
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

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Pagamento Stripe</span>
              <Badge variant="default" className="bg-green-500">
                {paymentConfirmed ? "Confirmado" : "Processando..."}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Webhook N8n</span>
              <Badge variant={webhookDispatched ? "default" : "secondary"} 
                     className={webhookDispatched ? "bg-green-500" : ""}>
                {isProcessing ? "Enviando..." : webhookDispatched ? "Enviado" : "Aguardando"}
              </Badge>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status da Remessa</span>
              <Badge variant="secondary">
                {isProcessing ? "Processando..." : "Pago - Aguardando Etiqueta"}
              </Badge>
            </div>

            {sessionId && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Session ID</span>
                <span className="text-sm font-mono">{sessionId.slice(-12)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Próximos Passos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
             <div className="flex items-start gap-3">
               <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                 <span className="text-xs font-semibold text-primary">1</span>
               </div>
               <div>
                 <p className="font-medium">Pagamento Confirmado</p>
                 <p className="text-sm text-muted-foreground">
                   Seu pagamento via Stripe foi processado com sucesso
                 </p>
               </div>
             </div>
             
             <div className="flex items-start gap-3">
               <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                 <span className="text-xs font-semibold text-primary">2</span>
               </div>
               <div>
                 <p className="font-medium">Dados Enviados para N8n</p>
                 <p className="text-sm text-muted-foreground">
                   {webhookDispatched ? "Dados enviados com sucesso para processamento" : "Enviando dados consolidados..."}
                 </p>
               </div>
             </div>
             
             <div className="flex items-start gap-3">
               <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                 <span className="text-xs font-semibold text-primary">3</span>
               </div>
               <div>
                 <p className="font-medium">Geração da Etiqueta</p>
                 <p className="text-sm text-muted-foreground">
                   O sistema externo processará seus dados e gerará a etiqueta de envio
                 </p>
               </div>
             </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid gap-3">
          <Button 
            onClick={handleGoToDashboard}
            className="w-full h-12 text-base font-semibold"
          >
            Voltar ao Início
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          
          <Button 
            variant="outline"
            onClick={handleTrackShipment}
            className="w-full h-12 text-base"
          >
            Rastrear Envio
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessStripe;