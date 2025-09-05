import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CreditCard, Zap, Barcode, DollarSign, Loader2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SavedCardsSelector from "@/components/SavedCardsSelector";
import PixPaymentModal from "@/components/PixPaymentModal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { SessionManager } from "@/utils/sessionManager";

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [pixModalOpen, setPixModalOpen] = useState(false);
  
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
  
  // Calcular valores do frete
  const freightPrice = shipmentData.quoteData?.shippingQuote?.economicPrice || 0;
  const pickupCost = shipmentData.pickupDetails?.option === 'pickup' ? 10 : 0;
  const totalAmount = freightPrice + pickupCost;
  
  console.log('Payment - Valores calculados:', {
    freightPrice,
    pickupCost,
    totalAmount
  });
  
  const handleBack = () => {
    navigate('/documento');
  };

  const paymentMethods = [
    {
      id: 'saved_credit',
      name: 'Cartão de Crédito Salvo',
      icon: CreditCard,
      description: 'Use um cartão salvo',
      available: !!user // Only available for logged users
    },
    {
      id: 'credit',
      name: 'Novo Cartão de Crédito',
      icon: CreditCard,
      description: 'Pagamento à vista',
      available: true
    },
    {
      id: 'pix',
      name: 'PIX',
      icon: Zap,
      description: 'Aprovação instantânea',
      available: true
    },
    {
      id: 'boleto',
      name: 'Boleto Bancário',
      icon: Barcode,
      description: 'Vencimento em 3 dias úteis',
      available: true
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

      if (selectedMethod === 'saved_credit') {
        if (!selectedCard) {
          toast({
            title: "Erro",
            description: "Selecione um cartão salvo ou adicione um novo",
            variant: "destructive"
          });
          return;
        }

        // Process payment with saved card
        const { data, error } = await supabase.functions.invoke('create-payment-with-saved-card', {
          body: {
            paymentMethodId: selectedCard,
            amount: totalAmount,
            shipmentData: {
              ...shipmentData,
              weight: shipmentData.weight || 1,
              senderEmail: shipmentData.senderAddress?.email || user?.email || 'guest@example.com'
            }
          },
          headers: sessionHeaders
        });

        if (error) {
          console.error('Saved card payment error:', error);
          toast({
            title: "Erro no pagamento",
            description: "Erro ao processar pagamento com cartão salvo. Tente novamente.",
            variant: "destructive"
          });
          return;
        }

        console.log('Saved card payment response:', data);
        
        if (data.success) {
          window.location.href = data.redirectUrl;
        } else if (data.requiresAction) {
          window.location.href = data.redirectUrl;
        }
        return;
      }
      
      // Handle new credit card (existing Stripe flow)
      if (selectedMethod === 'credit') {
        const { data, error } = await supabase.functions.invoke('create-payment', {
          body: {
            amount: totalAmount,
            shipmentData: {
              ...shipmentData,
              weight: shipmentData.weight || 1,
              senderEmail: shipmentData.senderAddress?.email || user?.email || 'guest@example.com'
            }
          },
          headers: sessionHeaders
        });

        if (error) {
          console.error('Payment error:', error);
          toast({
            title: "Erro no pagamento",
            description: "Erro ao processar pagamento. Tente novamente.",
            variant: "destructive"
          });
          return;
        }

        console.log('Stripe session created:', data);
        
        // Save current shipment data with backup before redirecting to Stripe
        if (shipmentData && shipmentData.id) {
          localStorage.setItem('currentShipment_backup', JSON.stringify(shipmentData));
          localStorage.setItem('shipmentData_stripe_session', data.sessionId);
          console.log('Payment - Dados salvos no localStorage como backup antes do Stripe');
        }
        
        // Redirect to Stripe checkout in same tab to preserve session
        if (data.url) {
          window.location.href = data.url;
        }
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
                return (
                  <div
                    key={method.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-primary/50 ${
                      selectedMethod === method.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border'
                    }`}
                    onClick={() => handlePaymentSelect(method.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <div className="font-semibold">{method.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {method.description}
                        </div>
                      </div>
                      {selectedMethod === method.id && (
                        <Badge variant="default" className="bg-primary">
                          Selecionado
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Show saved cards selector when credit card with saved cards is selected */}
          {selectedMethod === 'saved_credit' && (
            <SavedCardsSelector
              onCardSelected={(cardId) => setSelectedCard(cardId)}
              onNewCard={() => setSelectedMethod('credit')}
              disabled={processing}
            />
          )}

          {/* Confirm Button */}
          <Button 
            onClick={handleConfirmPayment}
            disabled={!selectedMethod || processing || (selectedMethod === 'saved_credit' && !selectedCard)}
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
    </div>
  );
};

export default Payment;