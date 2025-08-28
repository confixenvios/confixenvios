import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, DollarSign, MapPin, Package, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCep } from "@/services/shippingService";

interface QuoteOption {
  id: string;
  type: "price" | "speed";
  title: string;
  price: number;
  deliveryDays: number;
  description: string;
}

const Results = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quoteData, setQuoteData] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [pickupOption, setPickupOption] = useState<string>("");

  // Apenas uma opção de preço baseada na tabela atual
  const getQuoteOptions = (): QuoteOption[] => {
    if (!quoteData?.shippingQuote) return [];
    
    const { shippingQuote } = quoteData;
    return [
      {
        id: "standard",
        type: "price",
        title: "Frete Padrão",
        price: shippingQuote.economicPrice,
        deliveryDays: shippingQuote.economicDays,
        description: "Entrega padrão com melhor custo-benefício"
      }
    ];
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
    if (!selectedOption || !pickupOption) {
      toast({
        title: "Seleção obrigatória",
        description: "Selecione uma opção de entrega e coleta para continuar",
        variant: "destructive"
      });
      return;
    }

    // Store selections and navigate to next step
    sessionStorage.setItem('selectedQuote', JSON.stringify({
      option: selectedOption,
      pickup: pickupOption,
      quoteData
    }));
    
    toast({
      title: "Opções selecionadas!",
      description: "Redirecionando para dados da etiqueta...",
    });
    
    navigate("/etiqueta");
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
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Opções de <span className="bg-gradient-primary bg-clip-text text-transparent">Entrega</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Escolha a melhor opção para o seu envio
            </p>
          </div>

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

          {/* Quote Options */}
          <div className="max-w-md mx-auto mb-8">
            {getQuoteOptions().map((option) => (
              <Card 
                key={option.id}
                className={`cursor-pointer transition-all duration-300 shadow-card hover:shadow-glow ${
                  selectedOption === option.id 
                    ? 'ring-2 ring-primary shadow-primary' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => setSelectedOption(option.id)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      {option.type === "price" ? (
                        <DollarSign className="h-5 w-5 text-success" />
                      ) : (
                        <Clock className="h-5 w-5 text-warning" />
                      )}
                      <span>{option.title}</span>
                    </CardTitle>
                    <Badge variant="secondary">
                      Padrão
                    </Badge>
                  </div>
                  <CardDescription>{option.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary">
                        R$ {option.price.toFixed(2)}
                      </span>
                      <div className="text-right">
                        <div className="text-lg font-semibold">
                          {option.deliveryDays} dias úteis
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Prazo estimado
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
                    ? 'border-primary bg-accent/20' 
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
                    ? 'border-primary bg-accent/20' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setPickupOption('pickup')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Coleta no local</h4>
                    <p className="text-sm text-muted-foreground">
                      Buscamos em seu endereço (D+1)
                    </p>
                  </div>
                  <Badge variant="outline">+ R$ 5,00</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Continue Button */}
          <div className="text-center">
            <Button 
              onClick={handleContinue}
              className="w-full md:w-auto px-12 h-12 text-lg font-semibold bg-gradient-primary hover:shadow-primary transition-all duration-300"
              disabled={!selectedOption || !pickupOption}
            >
              Preencher Dados da Etiqueta
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;