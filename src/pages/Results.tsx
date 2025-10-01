import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import AuthModal from "@/components/AuthModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, DollarSign, MapPin, Package, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { formatCep } from "@/services/shippingService";

const Results = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [quoteData, setQuoteData] = useState<any>(null);
  const [pickupOption, setPickupOption] = useState<string>("");
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Função para calcular valor da coleta baseado na região
  const getPickupCost = (option: string) => {
    if (option === 'pickup') {
      // Coleta padrão na região metropolitana de Goiânia é R$ 10,00
      return 10.00;
    }
    return 0;
  };

  // Calcula o valor total (frete + coleta)
  const getTotalPrice = () => {
    if (!quoteData?.shippingQuote) return 0;
    const freightPrice = quoteData.shippingQuote.economicPrice;
    const pickupCost = getPickupCost(pickupOption);
    return freightPrice + pickupCost;
  };

  useEffect(() => {
    const savedQuoteData = sessionStorage.getItem('quoteData');
    if (!savedQuoteData) {
      navigate('/');
      return;
    }
    setQuoteData(JSON.parse(savedQuoteData));
  }, [navigate]);

  const handleContinue = () => {
    if (!pickupOption) {
      toast({
        title: "Seleção obrigatória",
        description: "Selecione uma opção de coleta para continuar",
        variant: "destructive"
      });
      return;
    }

    // Check if user is authenticated
    if (!user && !loading) {
    // Store selections before showing auth modal
    sessionStorage.setItem('selectedQuote', JSON.stringify({
      option: "standard", // Sempre frete padrão
      pickup: pickupOption,
      quoteData,
      totalPrice: getTotalPrice()
    }));
    
    setShowAuthModal(true);
    return;
  }

  // User is authenticated, proceed
  proceedToNextStep();
};

  const proceedToNextStep = () => {
    // Store selections and navigate to next step
    sessionStorage.setItem('selectedQuote', JSON.stringify({
      option: "standard", // Sempre frete padrão
      pickup: pickupOption,
      quoteData,
      totalPrice: getTotalPrice()
    }));
    
    toast({
      title: "Opção selecionada!",
      description: "Redirecionando para dados da etiqueta...",
    });
    
    navigate("/etiqueta");
  };

  const handleAuthSuccess = () => {
    // After successful auth, proceed to next step
    setTimeout(() => {
      proceedToNextStep();
    }, 500); // Small delay to allow auth state to settle
  };

  if (!quoteData) {
    return (
      <div className="min-h-screen bg-gradient-light flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-light">
      <Header />
      
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Quote Summary */}
          <Card className="mb-8 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-primary" />
                <span>Resumo da Cotação</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Origem:</span>
                  <span className="font-medium">Aparecida de Goiânia, GO</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Destino:</span>
                  <span className="font-medium">{formatCep(quoteData.destinyCep)} - {quoteData.shippingQuote?.zoneName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Peso:</span>
                  <span className="font-medium">{quoteData.weight}kg</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Freight Information (Non-clickable) */}
          <div className="max-w-md mx-auto mb-8">
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-success" />
                    <span>Frete Padrão</span>
                  </CardTitle>
                  <Badge variant="secondary">
                    Padrão
                  </Badge>
                </div>
                <CardDescription>Entrega padrão com melhor custo-benefício</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">
                      R$ {quoteData.shippingQuote.economicPrice.toFixed(2)}
                    </span>
                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        {quoteData.shippingQuote.economicDays} dias úteis
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Prazo estimado
                      </div>
                    </div>
                  </div>
                  
                  {/* Detalhamento do valor */}
                  {(quoteData.shippingQuote.adValoremValue || quoteData.shippingQuote.grisValue || quoteData.weight > 30) && (
                    <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                      <div className="font-medium text-muted-foreground mb-2">Composição do valor:</div>
                      
                      {quoteData.shippingQuote.adValoremValue && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ad Valorem (0,3%)</span>
                          <span>R$ {quoteData.shippingQuote.adValoremValue.toFixed(2)}</span>
                        </div>
                      )}
                      
                      {quoteData.shippingQuote.grisValue && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">GRIS (0,3%)</span>
                          <span>R$ {quoteData.shippingQuote.grisValue.toFixed(2)}</span>
                        </div>
                      )}
                      
                      {quoteData.weight > 30 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Peso excedente ({(quoteData.weight - 30).toFixed(1)}kg × R$10)</span>
                          <span>R$ {((quoteData.weight - 30) * 10).toFixed(2)}</span>
                        </div>
                      )}
                      
                      {quoteData.shippingQuote.cubicWeight && quoteData.shippingQuote.cubicWeight > quoteData.weight && (
                        <div className="text-xs text-muted-foreground pt-2 border-t">
                          * Peso cubado aplicado: {quoteData.shippingQuote.cubicWeight.toFixed(2)}kg
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pickup Options */}
          <Card className="mb-8 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Truck className="h-5 w-5 text-primary" />
                <span>Opções de Coleta</span>
              </CardTitle>
              <CardDescription>
                Escolha como será feita a coleta do seu envio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                  pickupOption === 'dropoff' 
                    ? 'border-primary bg-accent/20 ring-2 ring-primary' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setPickupOption('dropoff')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Postar no ponto de coleta</h4>
                    <p className="text-sm text-muted-foreground">
                      Leve até uma agência parceira (imediato)
                    </p>
                  </div>
                  <Badge variant="secondary">Gratuito</Badge>
                </div>
              </div>
              
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                  pickupOption === 'pickup' 
                    ? 'border-primary bg-accent/20 ring-2 ring-primary' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setPickupOption('pickup')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Coletar no meu local</h4>
                    <p className="text-sm text-muted-foreground">
                      Buscamos em seu endereço (Região Metropolitana de Goiânia e Anápolis)
                    </p>
                  </div>
                  <Badge variant="outline">+ R$ 10,00</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Price Display */}
          {pickupOption && (
            <Card className="mb-8 shadow-card border-primary/20">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <div className="text-sm text-muted-foreground">Valor Total</div>
                  <div className="text-3xl font-bold text-primary">
                    R$ {getTotalPrice().toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Frete: R$ {quoteData.shippingQuote.economicPrice.toFixed(2)} 
                    {pickupOption === 'pickup' && ' + Coleta: R$ 10,00'}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Continue Button */}
          <div className="text-center">
            <Button 
              onClick={handleContinue}
              className="w-full md:w-auto px-12 h-12 text-lg font-semibold bg-gradient-primary hover:shadow-primary transition-all duration-300"
              disabled={!pickupOption}
            >
              Preencher Dados da Etiqueta
            </Button>
          </div>
        </div>
      </div>

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default Results;