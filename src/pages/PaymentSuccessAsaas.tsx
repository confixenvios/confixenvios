import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Package, ArrowRight, Loader2 } from "lucide-react";
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
  
  const externalReference = searchParams.get('externalReference');
  
  const [isProcessing, setIsProcessing] = useState(true);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [shipmentCreated, setShipmentCreated] = useState(false);
  const [webhookDispatched, setWebhookDispatched] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processPaymentAndCreateShipment = async () => {
      try {
        if (!externalReference) {
          console.log('No externalReference provided');
          setError('Referência de pagamento não encontrada');
          setIsProcessing(false);
          return;
        }

        console.log('Processing payment for externalReference:', externalReference);

        // 1. Find the temp_quote with this externalReference
        const { data: tempQuote, error: quoteError } = await supabase
          .from('temp_quotes')
          .select('*')
          .eq('external_id', externalReference)
          .single();

        if (quoteError || !tempQuote) {
          console.error('Temp quote not found:', quoteError);
          setError('Cotação não encontrada');
          setIsProcessing(false);
          return;
        }

        console.log('Found temp_quote:', tempQuote.id, 'status:', tempQuote.status);

        // 2. Check if payment is confirmed (by webhook or already processed)
        if (!['payment_confirmed', 'processed', 'processing'].includes(tempQuote.status)) {
          // Payment not yet confirmed by webhook, wait a bit and retry
          console.log('Payment not yet confirmed, waiting...');
          
          // Poll for payment confirmation (max 30 seconds)
          let attempts = 0;
          const maxAttempts = 10;
          
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const { data: updatedQuote } = await supabase
              .from('temp_quotes')
              .select('status')
              .eq('external_id', externalReference)
              .single();
            
            if (updatedQuote && ['payment_confirmed', 'processed', 'processing'].includes(updatedQuote.status)) {
              console.log('Payment confirmed!');
              break;
            }
            
            attempts++;
            console.log(`Waiting for payment confirmation... attempt ${attempts}/${maxAttempts}`);
          }
          
          // Re-fetch the quote
          const { data: refreshedQuote } = await supabase
            .from('temp_quotes')
            .select('*')
            .eq('external_id', externalReference)
            .single();
          
          if (!refreshedQuote || !['payment_confirmed', 'processed', 'processing'].includes(refreshedQuote.status)) {
            console.log('Payment still not confirmed after waiting');
            setError('Aguardando confirmação do pagamento. Atualize a página em alguns segundos.');
            setIsProcessing(false);
            return;
          }
          
          // Use refreshed quote
          Object.assign(tempQuote, refreshedQuote);
        }

        setPaymentConfirmed(true);

        // 3. Check if shipment already exists by externalReference (primary duplicate check)
        const { data: existingShipmentByRef } = await supabase
          .from('shipments')
          .select('*')
          .contains('quote_data', { externalReference: externalReference })
          .limit(1)
          .maybeSingle();
        
        if (existingShipmentByRef) {
          console.log('Shipment already exists for this payment:', existingShipmentByRef.tracking_code);
          setTrackingCode(existingShipmentByRef.tracking_code || '');
          setPaymentConfirmed(true);
          setShipmentCreated(true);
          setWebhookDispatched(true);
          setIsProcessing(false);
          return;
        }

        // 4. Also check temp_quote status
        if (tempQuote.status === 'processed' || tempQuote.status === 'processing') {
          console.log('Quote already processed or processing, checking for existing shipment...');
          
          // Wait a bit and recheck for shipment (may be in progress)
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const { data: shipmentCheck } = await supabase
            .from('shipments')
            .select('*')
            .contains('quote_data', { externalReference: externalReference })
            .limit(1)
            .maybeSingle();
          
          if (shipmentCheck) {
            setTrackingCode(shipmentCheck.tracking_code || '');
            setShipmentCreated(true);
            setWebhookDispatched(true);
          }
          
          setIsProcessing(false);
          return;
        }

        // 5. Lock the quote BEFORE creating shipment (atomic operation)
        const { data: lockResult, error: lockError } = await supabase
          .from('temp_quotes')
          .update({ status: 'processing', updated_at: new Date().toISOString() })
          .eq('id', tempQuote.id)
          .eq('status', 'payment_confirmed')
          .select('id')
          .maybeSingle();

        if (lockError || !lockResult) {
          console.log('Could not acquire lock, another process is handling this');
          // Wait and check if shipment was created by another process
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const { data: shipmentByOther } = await supabase
            .from('shipments')
            .select('*')
            .contains('quote_data', { externalReference: externalReference })
            .limit(1)
            .maybeSingle();
          
          if (shipmentByOther) {
            setTrackingCode(shipmentByOther.tracking_code || '');
            setPaymentConfirmed(true);
            setShipmentCreated(true);
            setWebhookDispatched(true);
          }
          
          setIsProcessing(false);
          return;
        }
        
        console.log('Lock acquired, proceeding to create shipment');

        // 5. Extract data from temp_quote
        const senderData = tempQuote.sender_data as any;
        const recipientData = tempQuote.recipient_data as any;
        const packageData = tempQuote.package_data as any;
        const quoteOptions = tempQuote.quote_options as any;
        const userId = tempQuote.user_id;

        console.log('Creating shipment with data:', { senderData, recipientData, packageData });

        // 6. Create sender address
        const { data: senderAddress, error: senderError } = await supabase
          .from('addresses')
          .insert([{
            name: senderData.name || 'Remetente',
            street: senderData.street || '',
            number: senderData.number || '',
            complement: senderData.complement || null,
            neighborhood: senderData.neighborhood || '',
            city: senderData.city || '',
            state: senderData.state || '',
            cep: senderData.cep || '',
            address_type: 'sender',
            user_id: userId
          }])
          .select()
          .single();

        if (senderError) {
          console.error('Error creating sender address:', senderError);
          throw new Error('Erro ao criar endereço do remetente');
        }

        // 7. Create recipient address
        const { data: recipientAddress, error: recipientError } = await supabase
          .from('addresses')
          .insert([{
            name: recipientData.name || 'Destinatário',
            street: recipientData.street || '',
            number: recipientData.number || '',
            complement: recipientData.complement || null,
            neighborhood: recipientData.neighborhood || '',
            city: recipientData.city || '',
            state: recipientData.state || '',
            cep: recipientData.cep || '',
            address_type: 'recipient',
            user_id: userId
          }])
          .select()
          .single();

        if (recipientError) {
          console.error('Error creating recipient address:', recipientError);
          throw new Error('Erro ao criar endereço do destinatário');
        }

        // 8. Generate tracking code
        const newTrackingCode = `CFX${new Date().getFullYear()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        // 9. Create shipment
        const shipmentData = {
          user_id: userId,
          tracking_code: newTrackingCode,
          sender_address_id: senderAddress.id,
          recipient_address_id: recipientAddress.id,
          quote_data: {
            ...quoteOptions,
            externalReference: externalReference,
            paymentConfirmed: true,
            paymentProvider: 'asaas'
          },
          selected_option: quoteOptions?.selectedOption || 'standard',
          pickup_option: quoteOptions?.pickupOption || 'dropoff',
          weight: packageData?.weight || 1,
          length: packageData?.length || 20,
          width: packageData?.width || 20,
          height: packageData?.height || 20,
          format: packageData?.format || 'caixa',
          status: 'PAID',
          payment_data: {
            method: quoteOptions?.paymentMethod || 'asaas',
            status: 'paid',
            paymentId: quoteOptions?.paymentId,
            externalReference: externalReference,
            amount: quoteOptions?.paymentAmount || quoteOptions?.totalPrice,
            paidAt: quoteOptions?.paymentConfirmedAt || new Date().toISOString(),
            provider: 'asaas'
          }
        };

        const { data: newShipment, error: shipmentError } = await supabase
          .from('shipments')
          .insert([shipmentData])
          .select()
          .single();

        if (shipmentError) {
          console.error('Error creating shipment:', shipmentError);
          throw new Error('Erro ao criar remessa');
        }

        console.log('Shipment created:', newShipment.id);
        setTrackingCode(newTrackingCode);
        setShipmentCreated(true);

        // 10. Update temp_quote to processed
        await supabase
          .from('temp_quotes')
          .update({ status: 'processed', updated_at: new Date().toISOString() })
          .eq('id', tempQuote.id);

        // 11. Create status history
        await supabase
          .from('shipment_status_history')
          .insert([{
            shipment_id: newShipment.id,
            status: 'PAID',
            observacoes: 'Pagamento confirmado via Asaas. Remessa criada com sucesso.'
          }]);

        // 12. Save sender if applicable
        if (senderData) {
          try {
            await saveApprovedSender(senderData, true);
            console.log('Sender saved successfully');
          } catch (e) {
            console.error('Error saving sender:', e);
          }
        }

        // 13. Dispatch webhook to N8N for label generation
        const webhookPayload = {
          event: 'shipment.created',
          shipmentId: newShipment.id,
          trackingCode: newTrackingCode,
          paymentData: {
            method: 'asaas',
            externalReference: externalReference,
            amount: quoteOptions?.paymentAmount || quoteOptions?.totalPrice,
            status: 'paid'
          },
          senderData: {
            name: senderData.name,
            document: senderData.document,
            email: senderData.email,
            phone: senderData.phone,
            cep: senderData.cep,
            street: senderData.street,
            number: senderData.number,
            complement: senderData.complement,
            neighborhood: senderData.neighborhood,
            city: senderData.city,
            state: senderData.state
          },
          recipientData: {
            name: recipientData.name,
            document: recipientData.document,
            email: recipientData.email,
            phone: recipientData.phone,
            cep: recipientData.cep,
            street: recipientData.street,
            number: recipientData.number,
            complement: recipientData.complement,
            neighborhood: recipientData.neighborhood,
            city: recipientData.city,
            state: recipientData.state
          },
          packageData: packageData,
          quoteOptions: quoteOptions
        };

        try {
          const { data: webhookResult, error: webhookError } = await supabase.functions
            .invoke('webhook-dispatch', {
              body: webhookPayload
            });

          if (webhookError) {
            console.error('Webhook dispatch error:', webhookError);
          } else {
            console.log('Webhook dispatched successfully:', webhookResult);
            setWebhookDispatched(true);
          }
        } catch (webhookErr) {
          console.error('Error dispatching webhook:', webhookErr);
        }

        toast({
          title: "Sucesso!",
          description: "Sua remessa foi criada com sucesso!",
        });

      } catch (err: any) {
        console.error('Error processing payment:', err);
        setError(err.message || 'Erro ao processar pagamento');
        toast({
          title: "Erro",
          description: err.message || "Houve um problema ao processar seu pagamento.",
          variant: "destructive"
        });
      } finally {
        setIsProcessing(false);
      }
    };

    processPaymentAndCreateShipment();
  }, [externalReference, navigate, toast, saveApprovedSender]);

  const handleGoToDashboard = () => {
    navigate('/cliente/remessas');
  };

  if (error && !paymentConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background/80 p-4 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            {isProcessing ? (
              <div className="p-4 bg-primary/10 rounded-full">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              </div>
            ) : (
              <div className="p-4 bg-green-500/10 rounded-full">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {isProcessing ? "Processando Pagamento..." : "Pagamento Realizado com Sucesso!"}
          </h1>
          <p className="text-muted-foreground">
            {isProcessing ? "Aguarde enquanto criamos sua remessa" : "Sua remessa foi criada e está pronta"}
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
              <span className="text-muted-foreground">Pagamento Asaas</span>
              <Badge variant="default" className={paymentConfirmed ? "bg-green-500" : ""}>
                {paymentConfirmed ? "Confirmado" : "Verificando..."}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Remessa</span>
              <Badge variant={shipmentCreated ? "default" : "secondary"} 
                     className={shipmentCreated ? "bg-green-500" : ""}>
                {isProcessing ? "Criando..." : shipmentCreated ? "Criada" : "Aguardando"}
              </Badge>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Webhook N8n</span>
              <Badge variant={webhookDispatched ? "default" : "secondary"} 
                     className={webhookDispatched ? "bg-green-500" : ""}>
                {webhookDispatched ? "Enviado" : "Pendente"}
              </Badge>
            </div>

            {externalReference && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Referência</span>
                <span className="text-sm font-mono">{externalReference.slice(-12)}</span>
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
               <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${paymentConfirmed ? 'bg-green-500' : 'bg-primary/10'}`}>
                 <span className={`text-xs font-semibold ${paymentConfirmed ? 'text-white' : 'text-primary'}`}>1</span>
               </div>
               <div>
                 <p className="font-medium">Pagamento Confirmado</p>
                 <p className="text-sm text-muted-foreground">
                   Seu pagamento via Asaas foi processado com sucesso
                 </p>
               </div>
             </div>
             
             <div className="flex items-start gap-3">
               <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${shipmentCreated ? 'bg-green-500' : 'bg-primary/10'}`}>
                 <span className={`text-xs font-semibold ${shipmentCreated ? 'text-white' : 'text-primary'}`}>2</span>
               </div>
               <div>
                 <p className="font-medium">Remessa Criada</p>
                 <p className="text-sm text-muted-foreground">
                   {shipmentCreated ? "Sua remessa foi registrada no sistema" : "Criando sua remessa..."}
                 </p>
               </div>
             </div>
             
             <div className="flex items-start gap-3">
               <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${webhookDispatched ? 'bg-green-500' : 'bg-primary/10'}`}>
                 <span className={`text-xs font-semibold ${webhookDispatched ? 'text-white' : 'text-primary'}`}>3</span>
               </div>
               <div>
                 <p className="font-medium">Geração da Etiqueta</p>
                 <p className="text-sm text-muted-foreground">
                   {webhookDispatched ? "Dados enviados para geração da etiqueta" : "Aguardando envio para o sistema externo"}
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
            disabled={isProcessing}
          >
            Ver Minhas Remessas
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessAsaas;