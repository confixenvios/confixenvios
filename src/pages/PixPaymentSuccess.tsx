import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Package, ArrowRight, Eye } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const PixPaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isCreatingShipment, setIsCreatingShipment] = useState(false);
  const [shipmentId, setShipmentId] = useState(null);
  
  // Get payment data from location state
  const { paymentId, amount, shipmentData } = location.state || {};
  
  useEffect(() => {
    if (!paymentId || !amount || !shipmentData) {
      navigate('/');
      return;
    }
    
    // Automaticamente criar a remessa quando chegar na página de sucesso
    createShipment();
  }, [paymentId, amount, shipmentData]);

  const createShipment = async () => {
    if (!user || !shipmentData) {
      console.error('Dados insuficientes para criar remessa');
      return;
    }

    try {
      setIsCreatingShipment(true);
      console.log('🚚 Criando remessa após pagamento confirmado...');

      // 1. Criar endereços primeiro
      const senderAddressData = {
        user_id: user.id,
        address_type: 'sender',
        name: shipmentData.senderData?.name || 'Remetente',
        document: shipmentData.senderData?.document || '00000000000',
        phone: shipmentData.senderData?.phone || '(00) 00000-0000',
        email: shipmentData.senderData?.email || 'email@teste.com',
        cep: shipmentData.senderData?.cep || '00000-000',
        street: shipmentData.senderData?.street || 'Rua Teste',
        number: shipmentData.senderData?.number || '1',
        neighborhood: shipmentData.senderData?.neighborhood || 'Bairro',
        city: shipmentData.senderData?.city || 'Cidade',
        state: shipmentData.senderData?.state || 'SP'
      };

      const recipientAddressData = {
        user_id: user.id,
        address_type: 'recipient',
        name: shipmentData.recipientData?.name || 'Destinatário',
        document: shipmentData.recipientData?.document || '00000000000',
        phone: shipmentData.recipientData?.phone || '(00) 00000-0000',
        email: shipmentData.recipientData?.email || 'email@teste.com',
        cep: shipmentData.recipientData?.cep || '00000-000',
        street: shipmentData.recipientData?.street || 'Rua Teste',
        number: shipmentData.recipientData?.number || '1',
        neighborhood: shipmentData.recipientData?.neighborhood || 'Bairro',
        city: shipmentData.recipientData?.city || 'Cidade',
        state: shipmentData.recipientData?.state || 'RJ'
      };

      console.log('Criando endereço do remetente...', senderAddressData);
      const { data: senderAddress, error: senderError } = await supabase
        .from('addresses')
        .insert(senderAddressData)
        .select()
        .single();

      if (senderError) {
        console.error('Erro ao criar endereço remetente:', senderError);
        throw senderError;
      }

      console.log('Criando endereço do destinatário...', recipientAddressData);
      const { data: recipientAddress, error: recipientError } = await supabase
        .from('addresses')
        .insert(recipientAddressData)
        .select()
        .single();

      if (recipientError) {
        console.error('Erro ao criar endereço destinatário:', recipientError);
        throw recipientError;
      }

      // 2. Criar remessa
      const newShipmentData = {
        user_id: user.id,
        sender_address_id: senderAddress.id,
        recipient_address_id: recipientAddress.id,
        weight: shipmentData.weight || 1,
        length: shipmentData.dimensions?.length || 20,
        width: shipmentData.dimensions?.width || 15,
        height: shipmentData.dimensions?.height || 10,
        format: shipmentData.format || 'package',
        pickup_option: shipmentData.pickupOption || 'collection',
        selected_option: shipmentData.selectedOption || 'standard',
        quote_data: {
          totalPrice: amount,
          economicPrice: shipmentData.quote?.economicPrice || amount,
          expressPrice: shipmentData.quote?.expressPrice || amount * 1.6,
          deliveryDays: shipmentData.quote?.deliveryDays || 5,
          expressDeliveryDays: shipmentData.quote?.expressDeliveryDays || 3
        },
        payment_data: {
          method: 'pix',
          payment_id: paymentId,
          amount: amount,
          confirmed_at: new Date().toISOString()
        },
        status: 'PAYMENT_CONFIRMED'
      };

      console.log('Criando remessa:', newShipmentData);
      const { data: newShipment, error: shipmentError } = await supabase
        .from('shipments')
        .insert(newShipmentData)
        .select()
        .single();

      if (shipmentError) {
        console.error('Erro ao criar remessa:', shipmentError);
        throw shipmentError;
      }

      console.log('✅ Remessa criada com sucesso:', newShipment);
      setShipmentId(newShipment.id);
      
      toast({
        title: "🎉 Remessa criada com sucesso!",
        description: `Sua remessa foi criada. ID: ${newShipment.id}`
      });

    } catch (error) {
      console.error('Erro ao criar remessa:', error);
      toast({
        title: "Erro ao criar remessa",
        description: "Ocorreu um erro ao processar sua remessa. Entre em contato conosco.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingShipment(false);
    }
  };

  const handleViewShipments = () => {
    navigate('/cliente/remessas');
  };

  const handleNewShipment = () => {
    navigate('/');
  };

  if (isCreatingShipment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background/80 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Processando sua remessa...</h2>
            <p className="text-muted-foreground">Aguarde enquanto criamos sua remessa</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Pagamento Confirmado!
          </h1>
          <p className="text-muted-foreground">
            Seu PIX foi processado com sucesso
          </p>
        </div>

        {/* Payment Details */}
        <Card className="border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Detalhes do Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">ID do Pagamento:</span>
              <span className="font-mono text-sm">{paymentId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Valor Pago:</span>
              <span className="font-semibold text-green-600">R$ {amount?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Método:</span>
              <span>PIX</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status:</span>
              <span className="text-green-600 font-semibold">Confirmado</span>
            </div>
          </CardContent>
        </Card>

        {/* Shipment Status */}
        <Card className="border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Status da Remessa
            </CardTitle>
          </CardHeader>
          <CardContent>
            {shipmentId ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold">Remessa criada com sucesso!</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    ID da Remessa: {shipmentId}
                  </p>
                </div>
                
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>✅ Pagamento confirmado</p>
                  <p>✅ Remessa registrada no sistema</p>
                  <p>🏷️ Em breve você receberá a etiqueta por email</p>
                  <p>📦 Acompanhe o status na área do cliente</p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                  <span className="font-semibold">Processando remessa...</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  Aguarde enquanto processamos seus dados
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button 
            onClick={handleViewShipments}
            className="w-full"
            size="lg"
          >
            <Eye className="h-4 w-4 mr-2" />
            Ver Minhas Remessas
          </Button>
          
          <Button 
            onClick={handleNewShipment}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <Package className="h-4 w-4 mr-2" />
            Fazer Nova Cotação
          </Button>
        </div>

        {/* Help */}
        <Card className="border-border/50 mt-6">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              <p className="mb-2">Precisa de ajuda?</p>
              <p>Entre em contato conosco pelo WhatsApp: (62) 99999-9999</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PixPaymentSuccess;