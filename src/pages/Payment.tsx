import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CreditCard, Zap, Barcode, DollarSign } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  
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
      id: 'credit',
      name: 'Cartão de Crédito',
      icon: CreditCard,
      description: 'Até 12x sem juros',
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
  ];

  const handlePaymentSelect = (methodId: string) => {
    setSelectedMethod(methodId);
  };

  const handleConfirmPayment = async () => {
    if (!selectedMethod) return;
    
    try {
      console.log('Processing payment with method:', selectedMethod);
      
      if (selectedMethod === 'pix') {
        // PIX não é suportado pelo Stripe no Brasil, mostrar mensagem
        alert('PIX será implementado em breve. Por favor, use cartão ou boleto.');
        return;
      }
      
      // Call Stripe edge function
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          amount: totalAmount,
          shipmentData: {
            ...shipmentData,
            weight: shipmentData.weight || 1,
            senderEmail: shipmentData.senderAddress?.email || 'guest@example.com'
          }
        }
      });

      if (error) {
        console.error('Payment error:', error);
        alert('Erro ao processar pagamento. Tente novamente.');
        return;
      }

      console.log('Stripe session created:', data);
      
      // Open Stripe checkout in new tab
      if (data.url) {
        window.open(data.url, '_blank');
      }
      
    } catch (error) {
      console.error('Payment error:', error);
      alert('Erro ao processar pagamento. Tente novamente.');
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

          {/* Confirm Button */}
          <Button 
            onClick={handleConfirmPayment}
            disabled={!selectedMethod}
            className="w-full h-12 text-base font-semibold"
          >
            Confirmar Pagamento
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Payment;