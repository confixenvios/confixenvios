import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CreditCard, Zap, Barcode, DollarSign, Loader2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import PixPaymentModal from "@/components/PixPaymentModal";
import PaymentDataModal from "@/components/PaymentDataModal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { SessionManager } from "@/utils/sessionManager";

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [paymentDataModalOpen, setPaymentDataModalOpen] = useState(false);
  const [paymentDataBillingType, setPaymentDataBillingType] = useState<'CREDIT_CARD' | 'BOLETO'>('CREDIT_CARD');
  
  // Get shipment data from location state or sessionStorage
  const shipmentData = location.state?.shipmentData || JSON.parse(sessionStorage.getItem('currentShipment') || '{}');
  
  console.log('Payment - Component montado');
  console.log('Payment - Shipment data:', shipmentData);
  
  // Verificar se há dados válidos
  if (!shipmentData.quoteData) {
    console.log('Payment - Nenhum dado de cotação encontrado, redirecionando para cotação');
    // Redirecionar para cotação se não houver dados
    setTimeout(() => navigate('/cotacao'), 100);
  }
  
  // Calcular valores do frete - usar shippingPrice que já considera a seleção do usuário
  const freightPrice = shipmentData.deliveryDetails?.shippingPrice || 
    shipmentData.quoteData?.shippingQuote?.economicPrice || 0;
  const pickupCost = shipmentData.deliveryDetails?.pickupCost || 
    (shipmentData.pickupDetails?.option === 'pickup' ? 10 : 0);
  const totalAmount = shipmentData.deliveryDetails?.totalPrice || (freightPrice + pickupCost);
  
  console.log('Payment - Valores calculados:', {
    freightPrice,
    pickupCost,
    totalAmount,
    deliveryDetails: shipmentData.deliveryDetails,
    selectedOption: shipmentData.deliveryDetails?.selectedOption
  });
  
  const handleBack = () => {
    navigate('/documento');
  };

  const paymentMethods = [
    {
      id: 'pix',
      name: 'PIX',
      icon: Zap,
      description: 'Aprovação instantânea',
      available: true,
      disabled: false
    },
    {
      id: 'credit',
      name: 'Cartão de Crédito',
      icon: CreditCard,
      description: 'Pagamento à vista',
      available: true,
      disabled: false
    },
    {
      id: 'boleto',
      name: 'Boleto Bancário',
      icon: Barcode,
      description: 'Temporariamente indisponível',
      available: true,
      disabled: true
    }
  ].filter(method => method.available);

  const handlePaymentSelect = (methodId: string) => {
    setSelectedMethod(methodId);
  };

  const handleConfirmPayment = async () => {
    if (!selectedMethod) return;
    
    setProcessing(true);
    
    try {
      console.log('Processing payment with method:', selectedMethod);
      
      // SECURITY FIX: Get session token for anonymous users
      let sessionHeaders = {};
      if (!user) {
        const sessionToken = SessionManager.getSessionToken();
        if (sessionToken) {
          sessionHeaders = {
            'x-session-token': sessionToken
          };
          console.log('Payment - Adding session token for anonymous user');
        }
      }
      
      if (selectedMethod === 'pix') {
        setPixModalOpen(true);
        setProcessing(false);
        return;
      }

      // Handle credit card - open modal to collect user data via Asaas hosted checkout
      if (selectedMethod === 'credit') {
        setPaymentDataBillingType('CREDIT_CARD');
        setPaymentDataModalOpen(true);
        setProcessing(false);
        return;
      }
      
      // Handle boleto - open modal to collect user data
      if (selectedMethod === 'boleto') {
        setPaymentDataBillingType('BOLETO');
        setPaymentDataModalOpen(true);
        setProcessing(false);
        return;
      }
      
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Erro no pagamento",
        description: "Erro ao processar pagamento. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="mb-4 hover:bg-background/80"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Pagamento</h1>
          </div>
          <p className="text-muted-foreground">
            Escolha a forma de pagamento para finalizar seu envio
          </p>
        </div>

        <div className="grid gap-6">
          {/* Order Summary */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Frete</span>
                <span className="font-semibold">R$ {freightPrice.toFixed(2)}</span>
              </div>
              {pickupCost > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Taxa de Coleta</span>
                  <span className="font-semibold">R$ {pickupCost.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">R$ {totalAmount.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Formas de Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                const isDisabled = method.disabled;
                return (
                  <div
                    key={method.id}
                    className={`p-4 border rounded-lg transition-all ${
                      isDisabled 
                        ? 'cursor-not-allowed opacity-50 border-border bg-muted/30' 
                        : `cursor-pointer hover:border-primary/50 ${
                            selectedMethod === method.id 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border'
                          }`
                    }`}
                    onClick={() => !isDisabled && handlePaymentSelect(method.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${isDisabled ? 'text-muted-foreground' : 'text-primary'}`} />
                      <div className="flex-1">
                        <div className={`font-semibold ${isDisabled ? 'text-muted-foreground' : ''}`}>{method.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {method.description}
                        </div>
                      </div>
                      {selectedMethod === method.id && !isDisabled && (
                        <Badge variant="default" className="bg-primary">
                          Selecionado
                        </Badge>
                      )}
                      {isDisabled && (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          Indisponível
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Confirm Button */}
          <Button 
            onClick={handleConfirmPayment}
            disabled={!selectedMethod || processing}
            className="w-full h-12 text-base font-semibold"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processando...
              </>
            ) : (
              'Confirmar Pagamento'
            )}
          </Button>
        </div>
      </div>
      
      {/* PIX Payment Modal */}
      <PixPaymentModal
        isOpen={pixModalOpen}
        onClose={() => setPixModalOpen(false)}
        amount={totalAmount}
      />

      {/* Credit Card / Boleto Payment Modal */}
      <PaymentDataModal
        isOpen={paymentDataModalOpen}
        onClose={() => setPaymentDataModalOpen(false)}
        amount={totalAmount}
        billingType={paymentDataBillingType}
      />
    </div>
  );
};

export default Payment;