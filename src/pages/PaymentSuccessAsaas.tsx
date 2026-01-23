import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Package, ArrowRight, Clock } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSavedSenders } from "@/hooks/useSavedSenders";

const PaymentSuccessAsaas = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { saveApprovedSender } = useSavedSenders();
  const [searchParams] = useSearchParams();
  
  // Support both Stripe (session_id) and Asaas (externalReference) callbacks
  const sessionId = searchParams.get('session_id');
  const externalReference = searchParams.get('externalReference');
  const paymentId = sessionId || externalReference;
  
  const [isProcessing, setIsProcessing] = useState(true);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [webhookDispatched, setWebhookDispatched] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const [paymentSource, setPaymentSource] = useState<'stripe' | 'asaas'>('stripe');

  useEffect(() => {
    const processPaymentSuccess = async () => {
      try {
        if (!paymentId) {
          console.log('No payment ID provided');
          navigate('/');
          return;
        }

        // Detect payment source
        const isAsaas = !!externalReference;
        setPaymentSource(isAsaas ? 'asaas' : 'stripe');
        console.log(`Processing ${isAsaas ? 'Asaas' : 'Stripe'} payment success for:`, paymentId);

        // Get shipment data from session storage or backup in localStorage
        let shipmentData = JSON.parse(sessionStorage.getItem('currentShipment') || '{}');
        let documentData = JSON.parse(sessionStorage.getItem('documentData') || '{}');
        
        // If not found in sessionStorage, try localStorage backup
        if (!shipmentData || !shipmentData.id) {
          console.log('Shipment data not found in sessionStorage, trying localStorage backup');
          const backupShipmentData = localStorage.getItem('currentShipment_backup');
          if (backupShipmentData) {
            shipmentData = JSON.parse(backupShipmentData);
            console.log('Recovered shipment data from localStorage backup:', shipmentData);
          }
        }
        
        // For Asaas payments, first try to find temp_quote using externalReference
        let tempQuote = null;
        if (isAsaas && externalReference) {
          console.log('Looking for temp_quote with externalReference:', externalReference);
          const { data: tempQuotes, error: tempQuoteError } = await supabase
            .from('temp_quotes')
            .select('*')
            .eq('external_id', externalReference)
            .single();

          if (!tempQuoteError && tempQuotes) {
            tempQuote = tempQuotes;
            console.log('Found temp_quote:', tempQuote.id);
            
            // Update temp_quote status
            await supabase
              .from('temp_quotes')
              .update({ status: 'payment_confirmed' })
              .eq('id', tempQuote.id);
          }
        }
        
        // Try to find shipment in database
        let shipment = null;
        const { data: shipments, error: searchError } = await supabase
          .from('shipments')
          .select('*')
          .or(`payment_data->>session_id.eq.${paymentId},payment_data->>stripe_session_id.eq.${paymentId},payment_data->>external_reference.eq.${paymentId}`)
          .order('created_at', { ascending: false })
          .limit(1);

        if (searchError) {
          console.error('PaymentSuccess - Erro ao buscar shipment:', searchError);
        }

        if (shipments && shipments.length > 0) {
          shipment = shipments[0];
          console.log('PaymentSuccess - Shipment encontrado no banco:', shipment.id);
        } else if (shipmentData && shipmentData.id) {
          // Try to find by storage ID
          const { data: foundShipment } = await supabase
            .from('shipments')
            .select('*')
            .eq('id', shipmentData.id)
            .single();

          if (foundShipment) {
            shipment = foundShipment;
            console.log('PaymentSuccess - Shipment encontrado por ID do storage:', shipment.id);
          }
        }
        
        // If no shipment found but we have temp_quote (Asaas flow), show success anyway
        // The webhook will create the shipment
        if (!shipment && tempQuote) {
          console.log('No shipment yet, but temp_quote found - Asaas webhook will create shipment');
          setPaymentConfirmed(true);
          setTrackingCode('');
          toast({
            title: "Pagamento confirmado!",
            description: "Seu envio está sendo processado. Em breve você receberá a confirmação.",
          });
          setWebhookDispatched(true);
          
          // Clean up storage
          sessionStorage.removeItem('currentShipment');
          sessionStorage.removeItem('documentData');
          localStorage.removeItem('currentShipment_backup');
          
          setIsProcessing(false);
          return;
        }
        
        // Fallback search for pending shipments
        if (!shipment) {
          console.log('PaymentSuccess - Tentando busca alternativa...');
          const { data: fallbackShipments } = await supabase
            .from('shipments')
            .select('*')
            .in('status', ['PENDING_PAYMENT', 'PENDING_DOCUMENT'])
            .order('created_at', { ascending: false })
            .limit(3);

          if (fallbackShipments && fallbackShipments.length > 0) {
            shipment = fallbackShipments[0];
            console.log('PaymentSuccess - Usando shipment alternativo:', shipment.id);
            
            // Update with correct payment ID
            await supabase
              .from('shipments')
              .update({
                payment_data: {
                  ...shipment.payment_data,
                  session_id: paymentId,
                  external_reference: externalReference || null
                }
              })
              .eq('id', shipment.id);
          }
        }
        
        if (!shipment) {
          console.error('PaymentSuccess - Nenhum shipment encontrado para:', paymentId);
          toast({
            title: "Pagamento processado!",
            description: "Seu pagamento foi confirmado. O processamento do envio está em andamento.",
          });
          setPaymentConfirmed(true);
          setIsProcessing(false);
          return;
        }

        console.log('PaymentSuccess - Processando shipment:', shipment.id);

        // Update shipment status to paid
        const paymentMethod = isAsaas ? 'ASAAS' : 'STRIPE';
        const { data: updatedShipment, error: updateError } = await supabase
          .from('shipments')
          .update({
            status: 'PAYMENT_CONFIRMED',
            payment_data: {
              method: paymentMethod,
              session_id: paymentId,
              external_reference: externalReference || null,
              amount: shipment.quote_data?.shippingQuote?.economicPrice || shipment.quote_data?.totalPrice || 0,
              status: 'PAID'
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', shipment.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        setTrackingCode(updatedShipment?.tracking_code || '');
        setPaymentConfirmed(true);

        // Salvar remetente automaticamente após pagamento aprovado se houver dados
        const storedShipmentData = JSON.parse(sessionStorage.getItem('currentShipment') || localStorage.getItem('currentShipment_backup') || '{}');
        if (storedShipmentData.senderData) {
          try {
            console.log('Salvando remetente aprovado:', storedShipmentData.senderData);
            const senderSaved = await saveApprovedSender(storedShipmentData.senderData, true);
            if (senderSaved) {
              console.log('Remetente salvo com sucesso como padrão');
            }
          } catch (error) {
            console.error('Erro ao salvar remetente aprovado:', error);
            // Não bloquear o fluxo por erro no salvamento do remetente
          }
        }

        // Dispatch webhook to N8n with consolidated data
        const storedDocumentData = JSON.parse(sessionStorage.getItem('documentData') || '{}');
        const webhookPayload = {
          shipmentId: shipment.id,
          paymentData: {
            method: paymentMethod,
            payment_id: paymentId,
            external_reference: externalReference || null,
            amount: typeof updatedShipment.payment_data === 'object' && updatedShipment.payment_data !== null ? 
              (updatedShipment.payment_data as any).amount || 0 : 0,
            status: 'PAID'
          },
          documentData: storedDocumentData,
          selectedQuote: updatedShipment.quote_data || {},
          shipmentData: {
            id: shipment.id,
            quoteData: updatedShipment.quote_data,
            weight: shipment.weight,
            totalPrice: typeof updatedShipment.payment_data === 'object' && updatedShipment.payment_data !== null ? 
              (updatedShipment.payment_data as any).amount || 0 : 0,
            ...storedShipmentData
          }
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

        // Clean up session storage and localStorage backup
        sessionStorage.removeItem('currentShipment');
        sessionStorage.removeItem('documentData');
        localStorage.removeItem('currentShipment_backup');
        localStorage.removeItem('shipmentData_stripe_session');

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

    processPaymentSuccess();
  }, [paymentId, navigate, toast, externalReference]);

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
              <span className="text-muted-foreground">
                Pagamento {paymentSource === 'asaas' ? 'Asaas' : 'Stripe'}
              </span>
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

            {paymentId && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">ID do Pagamento</span>
                <span className="text-sm font-mono">{paymentId.slice(-12)}</span>
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
                   Seu pagamento via {paymentSource === 'asaas' ? 'Asaas' : 'Stripe'} foi processado com sucesso
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

export default PaymentSuccessAsaas;