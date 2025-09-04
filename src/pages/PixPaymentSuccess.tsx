import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, FileText, Package, ArrowRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const PixPaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [shipmentStatus, setShipmentStatus] = useState('PAYMENT_CONFIRMED');
  const [trackingCode, setTrackingCode] = useState('');
  const [shipmentId, setShipmentId] = useState('');
  
  // Get payment data from location state
  const { paymentId, amount, shipmentData } = location.state || {};

  useEffect(() => {
    if (!paymentId || !shipmentData) {
      console.error('PixPaymentSuccess - Dados obrigatórios não encontrados');
      navigate('/cliente/dashboard');
      return;
    }

    processPixPaymentSuccess();
  }, [paymentId, shipmentData]);

  const processPixPaymentSuccess = async () => {
    try {
      setIsProcessing(true);
      console.log('🎉 PixPaymentSuccess - Processando sucesso do PIX:', paymentId);
      console.log('📋 Dados do shipment:', shipmentData);

      // Validar dados obrigatórios
      if (!user?.id) {
        console.error('❌ PixPaymentSuccess - user.id não encontrado:', user);
        throw new Error('Usuário não autenticado');
      }

      if (!shipmentData?.senderData || !shipmentData?.recipientData) {
        console.error('❌ PixPaymentSuccess - Dados de endereço faltando:', {
          senderData: !!shipmentData?.senderData,
          recipientData: !!shipmentData?.recipientData
        });
        throw new Error('Dados de endereço não encontrados');
      }

      // Primeiro, criar os endereços se necessário
      console.log('📍 Criando endereços...');
      
      // Criar endereço do remetente
      const senderAddress = {
        user_id: user.id,
        address_type: 'sender',
        name: shipmentData.senderData.name,
        cep: shipmentData.senderData.cep,
        street: shipmentData.senderData.street,
        number: shipmentData.senderData.number,
        complement: shipmentData.senderData.complement || '',
        neighborhood: shipmentData.senderData.neighborhood,
        city: shipmentData.senderData.city,
        state: shipmentData.senderData.state,
        reference: shipmentData.senderData.reference || ''
      };

      console.log('📤 Criando endereço do remetente:', senderAddress);
      
      const { data: senderAddressData, error: senderError } = await supabase
        .from('addresses')
        .insert(senderAddress)
        .select()
        .single();

      if (senderError) {
        console.error('❌ Erro ao criar endereço do remetente:', senderError);
        throw senderError;
      }

      console.log('✅ Endereço do remetente criado:', senderAddressData.id);

      // Criar endereço do destinatário
      const recipientAddress = {
        user_id: user.id,
        address_type: 'recipient',
        name: shipmentData.recipientData.name,
        cep: shipmentData.recipientData.cep,
        street: shipmentData.recipientData.street,
        number: shipmentData.recipientData.number,
        complement: shipmentData.recipientData.complement || '',
        neighborhood: shipmentData.recipientData.neighborhood,
        city: shipmentData.recipientData.city,
        state: shipmentData.recipientData.state,
        reference: shipmentData.recipientData.reference || ''
      };

      console.log('📥 Criando endereço do destinatário:', recipientAddress);

      const { data: recipientAddressData, error: recipientError } = await supabase
        .from('addresses')
        .insert(recipientAddress)
        .select()
        .single();

      if (recipientError) {
        console.error('❌ Erro ao criar endereço do destinatário:', recipientError);
        throw recipientError;
      }

      console.log('✅ Endereço do destinatário criado:', recipientAddressData.id);

      // Criar a remessa no banco de dados
      const shipmentToCreate = {
        user_id: user.id,
        sender_address_id: senderAddressData.id,
        recipient_address_id: recipientAddressData.id,
        weight: shipmentData.weight,
        length: shipmentData.dimensions?.length || shipmentData.length || 20,
        width: shipmentData.dimensions?.width || shipmentData.width || 15,
        height: shipmentData.dimensions?.height || shipmentData.height || 10,
        format: shipmentData.format || 'package',
        pickup_option: shipmentData.pickupOption || 'collection',
        selected_option: shipmentData.selectedOption,
        quote_data: {
          ...shipmentData.quoteData,
          totalPrice: amount
        },
        payment_data: {
          method: 'pix',
          payment_id: paymentId,
          amount: amount,
          confirmed_at: new Date().toISOString()
        },
        status: 'PAYMENT_CONFIRMED'
      };

      console.log('📦 Criando shipment:', shipmentToCreate);

      const { data: newShipment, error: shipmentError } = await supabase
        .from('shipments')
        .insert(shipmentToCreate)
        .select()
        .single();

      if (shipmentError) {
        console.error('❌ PixPaymentSuccess - Erro ao criar shipment:', shipmentError);
        throw shipmentError;
      }

      console.log('✅ PixPaymentSuccess - Shipment criado com sucesso:', newShipment.id);
      setShipmentId(newShipment.id);
      setTrackingCode(newShipment.tracking_code || '');

      // Preparar dados para webhook
      const webhookPayload = {
        shipmentId: newShipment.id,
        paymentData: {
          method: 'pix',
          payment_id: paymentId,
          amount: amount,
          confirmed_at: new Date().toISOString()
        },
        documentData: shipmentData.documentData || {},
        selectedQuote: shipmentData.quoteData || {},
        shipmentData: {
          ...shipmentData,
          id: newShipment.id,
          totalPrice: amount
        }
      };

      // Disparar webhook para o sistema externo
      console.log('🔗 Disparando webhook...');
      const { data: webhookResult, error: webhookError } = await supabase.functions
        .invoke('webhook-dispatch', {
          body: webhookPayload
        });

      if (webhookError) {
        console.error('❌ PixPaymentSuccess - Erro no webhook:', webhookError);
        toast({
          title: "Atenção",
          description: "Pagamento confirmado, mas houve problema na comunicação com o sistema de etiquetas.",
          variant: "destructive"
        });
      } else {
        console.log('✅ PixPaymentSuccess - Webhook enviado com sucesso:', webhookResult);
        toast({
          title: "Sucesso!",
          description: "Pagamento confirmado e remessa criada com sucesso!",
        });
      }

      setShipmentStatus('PAGO_AGUARDANDO_ETIQUETA');
      
    } catch (error) {
      console.error('💥 PixPaymentSuccess - Erro ao processar:', error);
      toast({
        title: "Erro",
        description: `Houve um problema ao processar sua remessa: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80 p-4">
      <div className="max-w-2xl mx-auto py-12">
        
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            PIX Pago com Sucesso!
          </h1>
          <p className="text-muted-foreground">
            Sua remessa foi criada e está sendo processada
          </p>
        </div>

        {/* Payment Confirmation */}
        <Card className="border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <CheckCircle className="h-5 w-5" />
              Pagamento Confirmado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-success/5 border border-success/20 rounded-lg">
              <div>
                <p className="font-medium text-success">PIX Processado</p>
                <p className="text-sm text-muted-foreground">
                  Valor pago: R$ {amount?.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">ID do Pagamento</p>
                <p className="font-mono text-xs bg-background px-2 py-1 rounded">
                  {paymentId}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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
                  <p className="font-medium text-success">Pagamento PIX Confirmado</p>
                  <p className="text-sm text-muted-foreground">
                    PIX processado instantaneamente
                  </p>
                </div>
              </div>

              {/* Remessa Created */}
              <div className="flex items-center gap-3 p-3 bg-success/5 border border-success/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium text-success">Remessa Criada</p>
                  <p className="text-sm text-muted-foreground">
                    Sua remessa foi registrada no sistema
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
              <p>• ✅ Pagamento PIX confirmado instantaneamente</p>
              <p>• ✅ Remessa criada no sistema</p>
              <p>• ⏳ Aguardando geração da etiqueta pelo sistema externo</p>
              <p>• 📧 Você será notificado quando a etiqueta estiver disponível</p>
              <p>• 📦 Acesse suas remessas para acompanhar o andamento</p>
            </div>
            
            <div className="flex gap-4 pt-4">
              <Button 
                onClick={() => navigate('/cliente/remessas')}
                className="flex-1"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Ver Minhas Remessas
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/cliente/dashboard')}
                className="flex-1"
              >
                Voltar ao Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default PixPaymentSuccess;