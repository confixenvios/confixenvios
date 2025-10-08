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

// Função para determinar estado e tipo (capital/interior) baseado no CEP
const getCepInfo = (cep: string) => {
  const cleanCep = cep.replace(/\D/g, '');
  const cepPrefix = cleanCep.substring(0, 5);
  
  // Mapeamento de CEPs para estados
  const stateMapping: { [key: string]: string } = {
    '01': 'SP', '02': 'SP', '03': 'SP', '04': 'SP', '05': 'SP', '06': 'SP', '07': 'SP', '08': 'SP', '09': 'SP',
    '10': 'SP', '11': 'SP', '12': 'SP', '13': 'SP', '14': 'SP', '15': 'SP', '16': 'SP', '17': 'SP', '18': 'SP', '19': 'SP',
    '20': 'RJ', '21': 'RJ', '22': 'RJ', '23': 'RJ', '24': 'RJ', '25': 'RJ', '26': 'RJ', '27': 'RJ', '28': 'RJ',
    '29': 'ES', '30': 'MG', '31': 'MG', '32': 'MG', '33': 'MG', '34': 'MG', '35': 'MG', '36': 'MG', '37': 'MG', '38': 'MG', '39': 'MG',
    '40': 'BA', '41': 'BA', '42': 'BA', '43': 'BA', '44': 'BA', '45': 'BA', '46': 'BA', '47': 'BA', '48': 'BA',
    '49': 'SE', '50': 'PE', '51': 'PE', '52': 'PE', '53': 'PE', '54': 'PE', '55': 'PE', '56': 'AL', '57': 'AL',
    '58': 'PB', '59': 'RN', '60': 'CE', '61': 'CE', '62': 'CE', '63': 'CE',
    '64': 'PI', '65': 'MA', '66': 'PA', '67': 'PA', '68': 'AP',
    '69': 'AC', // AC, AM, RR (precisa verificar range específico)
    '70': 'DF', '71': 'DF', '72': 'GO', '73': 'GO', '74': 'GO', '75': 'GO', '76': 'TO', '77': 'TO',
    '78': 'MT', '79': 'MS',
    '80': 'PR', '81': 'PR', '82': 'PR', '83': 'PR', '84': 'PR', '85': 'PR', '86': 'PR', '87': 'PR',
    '88': 'SC', '89': 'SC',
    '90': 'RS', '91': 'RS', '92': 'RS', '93': 'RS', '94': 'RS', '95': 'RS', '96': 'RS', '97': 'RS', '98': 'RS', '99': 'RS'
  };
  
  // Verificar região 69xxx (Acre, Amazonas, Roraima)
  let state = 'AC'; // Default
  if (cepPrefix >= '69000' && cepPrefix <= '69099') state = 'AM';
  else if (cepPrefix >= '69100' && cepPrefix <= '69299') state = 'AM';
  else if (cepPrefix >= '69300' && cepPrefix <= '69389') state = 'RR';
  else if (cepPrefix >= '69400' && cepPrefix <= '69899') state = 'AM';
  else if (cepPrefix >= '69900' && cepPrefix <= '69999') state = 'AC';
  else {
    const prefix2 = cleanCep.substring(0, 2);
    state = stateMapping[prefix2] || 'BR';
  }
  
  // Determinar se é capital ou interior baseado em faixas específicas
  const isCapital = checkIfCapital(cleanCep, state);
  
  return {
    state,
    type: isCapital ? 'Capital' : 'Interior'
  };
};

const checkIfCapital = (cep: string, state: string): boolean => {
  const cepNum = parseInt(cep);
  
  // Faixas de CEP das capitais
  const capitalRanges: { [key: string]: [number, number][] } = {
    'AC': [[69900000, 69920999]], // Rio Branco
    'AL': [[57000000, 57099999]], // Maceió
    'AP': [[68900000, 68919999]], // Macapá
    'AM': [[69000000, 69099999]], // Manaus
    'BA': [[40000000, 42599999]], // Salvador
    'CE': [[60000000, 61599999]], // Fortaleza
    'DF': [[70000000, 72799999]], // Brasília (todo DF)
    'ES': [[29000000, 29099999]], // Vitória
    'GO': [[74000000, 74899999]], // Goiânia
    'MA': [[65000000, 65099999]], // São Luís
    'MT': [[78000000, 78109999]], // Cuiabá
    'MS': [[79000000, 79124999]], // Campo Grande
    'MG': [[30100000, 31999999]], // Belo Horizonte
    'PA': [[66000000, 66999999]], // Belém
    'PB': [[58000000, 58099999]], // João Pessoa
    'PR': [[80000000, 82599999]], // Curitiba
    'PE': [[50000000, 52999999]], // Recife
    'PI': [[64000000, 64099999]], // Teresina
    'RJ': [[20000000, 23799999]], // Rio de Janeiro
    'RN': [[59000000, 59139999]], // Natal
    'RS': [[90000000, 91999999]], // Porto Alegre
    'RO': [[76800000, 76834999]], // Porto Velho
    'RR': [[69300000, 69329999]], // Boa Vista
    'SC': [[88000000, 88099999]], // Florianópolis
    'SP': [[1000000, 5999999]], // São Paulo
    'SE': [[49000000, 49099999]], // Aracaju
    'TO': [[77000000, 77270999]], // Palmas
  };
  
  const ranges = capitalRanges[state];
  if (!ranges) return false;
  
  return ranges.some(([min, max]) => cepNum >= min && cepNum <= max);
};

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
                  <span className="font-medium">
                    {formatCep(quoteData.destinyCep)} - {getCepInfo(quoteData.destinyCep).state} ({getCepInfo(quoteData.destinyCep).type})
                  </span>
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
                  {(quoteData.shippingQuote.insuranceValue || quoteData.shippingQuote.basePrice || quoteData.weight > 30) && (
                    <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                      <div className="font-medium text-muted-foreground mb-2">Composição do valor:</div>
                      
                      {quoteData.shippingQuote.basePrice && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Preço da tabela</span>
                          <span>R$ {quoteData.shippingQuote.basePrice.toFixed(2)}</span>
                        </div>
                      )}
                      
                      {quoteData.shippingQuote.insuranceValue && quoteData.shippingQuote.insuranceValue > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Seguro (0,6% do valor declarado)</span>
                          <span>R$ {quoteData.shippingQuote.insuranceValue.toFixed(2)}</span>
                        </div>
                      )}
                      
                      {quoteData.weight > 30 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Peso excedente ({(quoteData.weight - 30).toFixed(1)}kg × R$10)</span>
                          <span>R$ {((quoteData.weight - 30) * 10).toFixed(2)}</span>
                        </div>
                      )}
                      
                   {quoteData.shippingQuote.tableName && (
                    <div className="text-xs text-muted-foreground pt-2 border-t mt-2">
                      <strong>Tabela utilizada:</strong> {quoteData.shippingQuote.tableName}
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