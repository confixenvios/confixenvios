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
        // Get session_id from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const stripeSessionId = urlParams.get('session_id');

        console.log('PaymentSuccess - Session ID encontrado:', stripeSessionId);

        if (!stripeSessionId) {
          console.error('PaymentSuccess - Session ID não encontrado na URL');
          toast({
            title: "Erro",
            description: "Session ID não encontrado. Redirecionando...",
            variant: "destructive"
          });
          navigate('/cliente/dashboard');
          return;
        }

        // Primeiro, tentar encontrar o shipment pelo session_id no banco
        let shipment = null;
        let paymentData = null;
        let shipmentData = null;
        let documentData = null;
        let selectedQuote = null;

        // Buscar shipment que tenha esse session_id nos payment_data
        const { data: shipments, error: searchError } = await supabase
          .from('shipments')
          .select('*')
          .contains('payment_data', { session_id: stripeSessionId })
          .order('created_at', { ascending: false })
          .limit(1);

        if (searchError) {
          console.error('PaymentSuccess - Erro ao buscar shipment:', searchError);
        }

        if (shipments && shipments.length > 0) {
          shipment = shipments[0];
          console.log('PaymentSuccess - Shipment encontrado no banco:', shipment.id);
        } else {
          // Se não encontrou no banco, tentar localStorage/sessionStorage
          console.log('PaymentSuccess - Tentando recuperar dados do storage');
          
          // Try to get data from sessionStorage first, then localStorage as fallback
          paymentData = JSON.parse(sessionStorage.getItem('paymentData') || '{}');
          let shipmentId = sessionStorage.getItem('paymentShipmentId');
          shipmentData = JSON.parse(sessionStorage.getItem('currentShipment') || '{}');
          documentData = JSON.parse(sessionStorage.getItem('documentData') || '{}');
          selectedQuote = JSON.parse(sessionStorage.getItem('selectedQuote') || '{}');

          // Fallback to localStorage if sessionStorage is empty
          if (!shipmentData.id && !shipmentId) {
            console.log('PaymentSuccess - Tentando recuperar dados do localStorage');
            shipmentData = JSON.parse(localStorage.getItem('currentShipment_backup') || '{}');
            const savedStripeSession = localStorage.getItem('shipmentData_stripe_session');
            
            if (stripeSessionId && savedStripeSession === stripeSessionId) {
              console.log('PaymentSuccess - Dados recuperados do localStorage com sucesso');
              paymentData = {
                method: 'stripe_checkout',
                session_id: stripeSessionId,
                amount: shipmentData.totalPrice || 0
              };
              shipmentId = shipmentData.id;
            }
          }

          // Se ainda não temos dados suficientes, tentar buscar qualquer shipment recente
          if (!shipmentId && !shipmentData.id) {
            console.log('PaymentSuccess - Buscando shipment mais recente...');
            const { data: recentShipments } = await supabase
              .from('shipments')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(5);

            if (recentShipments && recentShipments.length > 0) {
              // Procurar por um shipment que ainda não tenha payment_data ou que esteja pendente
              const candidateShipment = recentShipments.find(s => 
                !s.payment_data || 
                s.status === 'PENDING_PAYMENT' ||
                s.status === 'PENDING_DOCUMENT'
              );

              if (candidateShipment) {
                shipment = candidateShipment;
                console.log('PaymentSuccess - Usando shipment candidato:', shipment.id);
              }
            }
          } else {
            // Buscar shipment específico
            const finalShipmentId = shipmentId || shipmentData.id;
            const { data: foundShipment } = await supabase
              .from('shipments')
              .select('*')
              .eq('id', finalShipmentId)
              .single();

            if (foundShipment) {
              shipment = foundShipment;
            }
          }
        }

        if (!shipment) {
          console.error('PaymentSuccess - Nenhum shipment encontrado');
          toast({
            title: "Erro",
            description: `Dados do envio não encontrados após o pagamento. Por favor, entre em contato com o suporte informando o Session ID: ${stripeSessionId}`,
            variant: "destructive"
          });
          navigate('/cliente/dashboard');
          return;
        }

        console.log('PaymentSuccess - Processando shipment:', shipment.id);

        // Preparar dados de pagamento se não existirem
        if (!paymentData) {
          paymentData = {
            method: 'stripe_checkout',
            session_id: stripeSessionId,
            amount: shipment.quote_data?.totalPrice || 0,
            confirmed_at: new Date().toISOString()
          };
        }

        // First update the shipment with payment data and status
        const { data: updatedShipment, error: updateError } = await supabase
          .from('shipments')
          .update({
            status: 'PAYMENT_CONFIRMED',
            payment_data: paymentData,
            updated_at: new Date().toISOString()
          })
          .eq('id', shipment.id)
          .select()
          .single();

        if (updateError) {
          console.error('PaymentSuccess - Erro ao atualizar shipment:', updateError);
          throw updateError;
        }

        setTrackingCode(updatedShipment?.tracking_code || '');

        // Preparar dados para webhook usando dados do banco ou storage
        const completePayload = {
          shipmentId: shipment.id,
          paymentData,
          documentData: documentData || {},
          selectedQuote: selectedQuote || shipment.quote_data || {},
          shipmentData: shipmentData || {
            id: shipment.id,
            quoteData: shipment.quote_data,
            weight: shipment.weight,
            totalPrice: paymentData.amount
          }
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
            description: "Pagamento confirmado e dados enviados para processamento!",
          });
        }

        setShipmentStatus('PAGO_AGUARDANDO_ETIQUETA');
        
        // Clean up both session and local storage
        sessionStorage.clear();
        localStorage.removeItem('currentShipment_backup');
        localStorage.removeItem('shipmentData_stripe_session');
        
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