import { useState, useEffect } from "react";
import InputMask from "react-input-mask";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Calculator, MapPin, Package, Truck, User, CheckCircle, Circle, DollarSign, Clock, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { calculateShippingQuote, validateCep, formatCep } from "@/services/shippingService";
import { supabase } from "@/integrations/supabase/client";
import { validateUnitValue, validateWeight, validateDimensions, sanitizeTextInput } from "@/utils/inputValidation";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/useAuth";
import AuthModal from "@/components/AuthModal";

interface QuoteFormData {
  originCep: string;
  destinyCep: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  format: string;
  quantity: string;
  unitValue: string;
}

interface AddressData {
  name: string;
  document: string;
  phone: string;
  email: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  reference: string;
}

const QuoteForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [formData, setFormData] = useState<QuoteFormData>({
    originCep: "74345-260",
    destinyCep: "",
    weight: "",
    length: "",
    width: "",
    height: "",
    format: "",
    quantity: "1",
    unitValue: "",
  });

  const [quoteData, setQuoteData] = useState<any>(null);
  const [pickupOption, setPickupOption] = useState<"pickup" | "delivery" | "">("");
  const [samePickupAddress, setSamePickupAddress] = useState(true);
  const [alternativePickupAddress, setAlternativePickupAddress] = useState("");

  const [senderData, setSenderData] = useState<AddressData>({
    name: "",
    document: "",
    phone: "",
    email: "",
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    reference: "",
  });

  const [recipientData, setRecipientData] = useState<AddressData>({
    name: "",
    document: "",
    phone: "",
    email: "",
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    reference: "",
  });

  const steps = [
    { number: 1, title: "Cotação", icon: Calculator },
    { number: 2, title: "Coleta", icon: Truck },
    { number: 3, title: "Dados", icon: User }
  ];

  const handleInputChange = (field: keyof QuoteFormData, value: string) => {
    const sanitizedValue = sanitizeTextInput(value);
    setFormData(prev => ({ 
      ...prev, 
      [field]: sanitizedValue 
    }));
  };

  const handleAddressChange = (
    type: 'sender' | 'recipient',
    field: keyof AddressData,
    value: string
  ) => {
    const sanitizedValue = sanitizeTextInput(value);
    
    if (type === 'sender') {
      setSenderData(prev => ({ ...prev, [field]: sanitizedValue }));
    } else {
      setRecipientData(prev => ({ ...prev, [field]: sanitizedValue }));
    }
  };

  const getTotalMerchandiseValue = () => {
    const quantity = parseInt(formData.quantity) || 0;
    const unitValue = parseFloat(formData.unitValue) || 0;
    return quantity * unitValue;
  };

  const validateForm = () => {
    // CEP validation
    if (!validateCep(formData.destinyCep)) {
      return "CEP de destino inválido";
    }

    // Validate unit value
    const unitValue = parseFloat(formData.unitValue);
    const unitValueError = validateUnitValue(unitValue);
    if (unitValueError) return unitValueError;

    // Validate weight
    const weight = parseFloat(formData.weight);
    const weightError = validateWeight(weight);
    if (weightError) return weightError;

    // Validate dimensions
    const length = parseFloat(formData.length);
    const width = parseFloat(formData.width);
    const height = parseFloat(formData.height);
    const dimensionsError = validateDimensions(length, width, height);
    if (dimensionsError) return dimensionsError;

    return null;
  };

  // Função para buscar endereço por CEP via ViaCEP
  const fetchEnderecoPorCep = async (cep: string) => {
    const apenasDigitos = cep.replace(/\D/g, "");
    console.log('CEP digitado:', cep, 'Apenas dígitos:', apenasDigitos);
    if (apenasDigitos.length !== 8) return null;

    try {
      console.log('Buscando CEP na API ViaCEP...');
      const res = await fetch(`https://viacep.com.br/ws/${apenasDigitos}/json/`);
      const data = await res.json();
      console.log('Resposta ViaCEP:', data);
      if (data.erro) return null;

      return {
        logradouro: data.logradouro,
        bairro: data.bairro,
        cidade: data.localidade,
        estado: data.uf,
      };
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      return null;
    }
  };

  // Função especial para CEP com busca automática
  const handleCepChange = async (
    type: 'sender' | 'recipient',
    value: string
  ) => {
    console.log('CEP mudou:', type, value);
    const sanitizedValue = sanitizeTextInput(value);
    
    if (type === 'sender') {
      setSenderData(prev => ({ ...prev, cep: sanitizedValue }));
    } else {
      setRecipientData(prev => ({ ...prev, cep: sanitizedValue }));
    }

    // Buscar endereço quando CEP estiver completo
    if (value.replace(/\D/g, "").length === 8) {
      console.log('CEP completo, buscando endereço...');
      const endereco = await fetchEnderecoPorCep(value);
      if (endereco) {
        console.log('Endereço encontrado:', endereco);
        if (type === 'sender') {
          setSenderData(prev => ({
            ...prev,
            street: endereco.logradouro || prev.street,
            neighborhood: endereco.bairro || prev.neighborhood,
            city: endereco.cidade || prev.city,
            state: endereco.estado || prev.state
          }));
        } else {
          setRecipientData(prev => ({
            ...prev,
            street: endereco.logradouro || prev.street,
            neighborhood: endereco.bairro || prev.neighborhood,
            city: endereco.cidade || prev.city,
            state: endereco.estado || prev.state
          }));
        }
        
        toast({
          title: "CEP encontrado!",
          description: "Endereço preenchido automaticamente.",
        });
      } else {
        console.log('CEP não encontrado');
        toast({
          title: "CEP não encontrado",
          description: "Verifique se o CEP está correto.",
          variant: "destructive"
        });
      }
    }
  };

  const processQuoteCalculation = async () => {
    console.log('Iniciando processQuoteCalculation...');
    
    const validationError = validateForm();
    if (validationError) {
      toast({
        title: "Erro de validação",
        description: validationError,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Chamando calculateShippingQuote...');
      const result = await calculateShippingQuote({
        destinyCep: formData.destinyCep,
        weight: parseFloat(formData.weight),
        quantity: parseInt(formData.quantity)
      });

      console.log('Resultado da cotação:', result);

      // Preparar dados da cotação
      const quoteResult = {
        ...formData,
        weight: parseFloat(formData.weight),
        length: parseFloat(formData.length),
        width: parseFloat(formData.width),
        height: parseFloat(formData.height),
        quantity: parseInt(formData.quantity),
        unitValue: parseFloat(formData.unitValue),
        totalValue: getTotalMerchandiseValue(),
        shippingQuote: result,
        timestamp: Date.now()
      };

      setQuoteData(quoteResult);
      setCurrentStep(2);

      toast({
        title: "Cotação calculada!",
        description: `Preço: R$ ${result.economicPrice} - Prazo: ${result.economicDays} dias`,
      });

    } catch (error: any) {
      console.error('Error calculating quote:', error);
      toast({
        title: "Erro ao calcular cotação",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Calcular Cotação
  const handleStep1Submit = async () => {
    // Verificar se o usuário está logado antes de prosseguir
    if (!user) {
      console.log('Usuário não logado, salvando dados no sessionStorage e mostrando modal de auth...');
      // Salvar dados do formulário no sessionStorage para recuperar após login
      sessionStorage.setItem('pendingQuoteData', JSON.stringify(formData));
      setShowAuthModal(true);
      return;
    }

    // Se está logado, prosseguir com o cálculo
    await processQuoteCalculation();
  };

  // Step 2: Opções de Coleta/Entrega
  const handleStep2Submit = () => {
    setCurrentStep(3);
  };

  // Step 3: Finalizar com dados dos endereços
  const handleStep3Submit = async () => {
    if (!pickupOption) {
      toast({
        title: "Seleção obrigatória",
        description: "Escolha uma opção de coleta/entrega",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Preparar dados completos do envio
      const completeShipmentData = {
        // Dados da cotação
        originCep: formData.originCep,
        destinyCep: formData.destinyCep,
        shippingQuote: quoteData?.shippingQuote,
        merchandiseValue: getTotalMerchandiseValue(),
        quantity: parseInt(formData.quantity),
        unitValue: parseFloat(formData.unitValue),
        totalPrice: getTotalPrice(),
        
        // Dados de coleta
        pickupOption: pickupOption,
        pickupDetails: {
          option: pickupOption,
          sameAsOrigin: samePickupAddress,
          alternativeAddress: alternativePickupAddress
        },
        
        // Dados dos endereços
        senderData: senderData,
        recipientData: recipientData,
        
        // Dados de dimensões e peso
        weight: parseFloat(formData.weight),
        length: parseFloat(formData.length),
        width: parseFloat(formData.width),
        height: parseFloat(formData.height),
        format: formData.format,
        
        // Status do fluxo
        status: 'PENDING_DOCUMENT',
        createdAt: new Date().toISOString()
      };

      console.log('QuoteForm - Salvando dados completos no sessionStorage:', completeShipmentData);
      
      // Salvar todos os dados coletados no sessionStorage para as próximas etapas
      sessionStorage.setItem('currentShipment', JSON.stringify(completeShipmentData));

      toast({
        title: "Dados coletados!",
        description: "Avançando para documento fiscal...",
      });

      // Navegar diretamente para documento fiscal
      navigate("/documento");

    } catch (error: any) {
      console.error('Error preparing shipment data:', error);
      toast({
        title: "Erro ao processar dados",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTotalPrice = () => {
    return (quoteData?.shippingQuote?.price || 0) + getTotalMerchandiseValue();
  };

  const isStep1Valid = Object.values(formData).every(value => value.trim() !== "");

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6 overflow-x-auto pb-2">
      <div className="flex items-center space-x-2 min-w-max px-2">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 ${
              currentStep === step.number 
                ? 'bg-primary text-primary-foreground' 
                : currentStep > step.number 
                  ? 'bg-success text-success-foreground'
                  : 'bg-muted text-muted-foreground'
            }`}>
              {currentStep > step.number ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <step.icon className="h-4 w-4" />
              )}
              <span className="font-medium text-sm">{step.title}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-8 h-0.5 mx-2 transition-all duration-300 ${
                currentStep > step.number ? 'bg-success' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-6">
      {renderStepIndicator()}

      <div className="animate-fade-in">
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* CEP Section */}
            <div className="bg-card rounded-lg p-4 border border-border/50 space-y-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-primary" />
                <span>CEP de Origem e Destino</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="origin-cep" className="text-base font-medium">
                    CEP de Origem
                  </Label>
                  <Input
                    id="origin-cep"
                    type="text"
                    value={formData.originCep}
                    disabled
                    className="h-12 text-base rounded-lg bg-muted border-0"
                  />
                  <p className="text-sm text-muted-foreground">
                    Goiânia e Região / Origem fixa
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="destiny-cep" className="text-base font-medium">
                    CEP de Destino
                  </Label>
                  <InputMask
                    mask="99999-999"
                    value={formData.destinyCep}
                    onChange={(e) => handleInputChange("destinyCep", e.target.value)}
                  >
                    {(inputProps: any) => (
                      <Input
                        {...inputProps}
                        id="destiny-cep"
                        type="text"
                        placeholder="00000-000"
                        className="h-12 text-base rounded-lg border-2 focus:border-primary transition-colors"
                      />
                    )}
                  </InputMask>
                </div>
              </div>
            </div>

            {/* Merchandise Details Section */}
            <div className="bg-card rounded-lg p-4 border border-border/50 space-y-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span>Detalhes da Mercadoria</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity" className="text-base font-medium">Quantidade</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange("quantity", e.target.value)}
                    className="h-12 text-base rounded-lg border-2 focus:border-primary transition-colors"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="unitValue" className="text-base font-medium">Valor Unitário (R$)</Label>
                  <Input
                    id="unitValue"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="100.00"
                    value={formData.unitValue}
                    onChange={(e) => handleInputChange("unitValue", e.target.value)}
                    className="h-12 text-base rounded-lg border-2 focus:border-primary transition-colors"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-base font-medium">Valor Total</Label>
                  <div className="h-12 flex items-center px-4 rounded-lg border-2 border-border bg-muted text-foreground font-semibold text-base">
                    R$ {getTotalMerchandiseValue().toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Package Details Section */}
            <div className="bg-card rounded-lg p-4 border border-border/50 space-y-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Package className="h-5 w-5 text-primary" />
                <span>Detalhes do Pacote</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight" className="text-base font-medium">Peso (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    min="0.1"
                    step="0.1"
                    placeholder="1.0"
                    value={formData.weight}
                    onChange={(e) => handleInputChange("weight", e.target.value)}
                    className="h-12 text-base rounded-lg border-2 focus:border-primary transition-colors"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="format" className="text-base font-medium">Formato</Label>
                  <Select value={formData.format} onValueChange={(value) => handleInputChange("format", value)}>
                    <SelectTrigger className="h-12 text-base rounded-lg border-2 focus:border-primary transition-colors">
                      <SelectValue placeholder="Selecione o formato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="box">Caixa/Pacote</SelectItem>
                      <SelectItem value="envelope">Envelope</SelectItem>
                      <SelectItem value="roll">Rolo/Prisma</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="length" className="text-base font-medium">Comprimento (cm)</Label>
                  <Input
                    id="length"
                    type="number"
                    min="1"
                    placeholder="20"
                    value={formData.length}
                    onChange={(e) => handleInputChange("length", e.target.value)}
                    className="h-12 text-base rounded-lg border-2 focus:border-primary transition-colors"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="width" className="text-base font-medium">Largura (cm)</Label>
                  <Input
                    id="width"
                    type="number"
                    min="1"
                    placeholder="15"
                    value={formData.width}
                    onChange={(e) => handleInputChange("width", e.target.value)}
                    className="h-12 text-base rounded-lg border-2 focus:border-primary transition-colors"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="height" className="text-base font-medium">Altura (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    min="1"
                    placeholder="10"
                    value={formData.height}
                    onChange={(e) => handleInputChange("height", e.target.value)}
                    className="h-12 text-base rounded-lg border-2 focus:border-primary transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Calculate Button */}
            <Button
              onClick={handleStep1Submit}
              disabled={!isStep1Valid || isLoading}
              className="w-full h-12 text-base font-semibold rounded-lg bg-primary hover:bg-primary/90 transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  <span>Calculando...</span>
                </div>
              ) : (
                <>
                  <Calculator className="mr-2 h-5 w-5" />
                  Calcular Frete
                </>
              )}
            </Button>
          </div>
        )}

        {currentStep === 2 && quoteData && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold flex items-center justify-center space-x-2">
                <Truck className="h-5 w-5 text-primary" />
                <span>Opções de Entrega e Coleta</span>
              </h3>
              <p className="text-muted-foreground mt-2">
                Escolha como será feita a coleta do seu envio
              </p>
            </div>

            {/* Quote Summary */}
            <Card className="bg-accent/20 border-primary/20">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
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
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">Valor:</span>
                    <span className="font-medium">R$ {quoteData.totalValue.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div className="flex flex-col items-center p-4 bg-primary/10 rounded-lg">
                    <h4 className="font-semibold text-primary mb-2">Preço do Frete</h4>
                    <p className="text-2xl font-bold">R$ {quoteData.shippingQuote?.price?.toFixed(2) || "0.00"}</p>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-accent/20 rounded-lg">
                    <h4 className="font-semibold mb-2">Prazo Estimado</h4>
                    <p className="text-2xl font-bold">{quoteData.shippingQuote?.estimatedDays || 0} dias</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pickup/Delivery Options */}
            <Card>
              <CardHeader>
                <CardTitle>Opção de Coleta/Entrega</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={pickupOption}
                  onValueChange={(value: "pickup" | "delivery") => setPickupOption(value)}
                  className="space-y-4"
                >
                  <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="pickup" id="pickup" />
                    <Label htmlFor="pickup" className="flex-1 cursor-pointer">
                      <div className="font-medium">Coleta no local</div>
                      <div className="text-sm text-muted-foreground">
                        Nosso motorista coleta em seu endereço
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="delivery" id="delivery" />
                    <Label htmlFor="delivery" className="flex-1 cursor-pointer">
                      <div className="font-medium">Entrega na nossa base</div>
                      <div className="text-sm text-muted-foreground">
                        Você entrega o pacote em nosso endereço
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            <div className="flex space-x-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="flex-1 h-12"
              >
                Voltar
              </Button>
              <Button
                onClick={handleStep2Submit}
                disabled={!pickupOption}
                className="flex-1 h-12 bg-gradient-primary hover:shadow-primary"
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold flex items-center justify-center space-x-2">
                <User className="h-5 w-5 text-primary" />
                <span>Dados da Etiqueta</span>
              </h3>
              <p className="text-muted-foreground mt-2">
                Preencha os dados do remetente e destinatário
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Sender Address */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <User className="h-5 w-5 text-primary" />
                    <span>Dados do Remetente</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label className="text-base font-medium">Nome completo *</Label>
                      <Input
                        value={senderData.name}
                        onChange={(e) => handleAddressChange('sender', 'name', e.target.value)}
                        placeholder="Nome completo"
                        className="h-12 text-base rounded-lg"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <Label className="text-base font-medium">CPF/CNPJ *</Label>
                         <Input
                           type="text"
                           value={senderData.document}
                           onChange={(e) => handleAddressChange('sender', 'document', e.target.value)}
                           placeholder="CPF ou CNPJ"
                           className="h-12 text-base rounded-lg"
                         />
                       </div>
                      <div className="space-y-2">
                        <Label className="text-base font-medium">Telefone *</Label>
                        <InputMask
                          mask="(99) 99999-9999"
                          value={senderData.phone}
                          onChange={(e) => handleAddressChange('sender', 'phone', e.target.value)}
                        >
                          {(inputProps: any) => (
                            <Input
                              {...inputProps}
                              type="tel"
                              placeholder="(00) 00000-0000"
                              className="h-12 text-base rounded-lg"
                            />
                          )}
                        </InputMask>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-base font-medium">E-mail *</Label>
                      <Input
                        type="email"
                        value={senderData.email}
                        onChange={(e) => handleAddressChange('sender', 'email', e.target.value)}
                        placeholder="email@exemplo.com"
                        className="h-12 text-base rounded-lg"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recipient Address */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <span>Dados do Destinatário</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label className="text-base font-medium">Nome completo *</Label>
                      <Input
                        value={recipientData.name}
                        onChange={(e) => handleAddressChange('recipient', 'name', e.target.value)}
                        placeholder="Nome completo"
                        className="h-12 text-base rounded-lg"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <Label className="text-base font-medium">CPF/CNPJ *</Label>
                         <Input
                           type="text"
                           value={recipientData.document}
                           onChange={(e) => handleAddressChange('recipient', 'document', e.target.value)}
                           placeholder="CPF ou CNPJ"
                           className="h-12 text-base rounded-lg"
                         />
                       </div>
                      <div className="space-y-2">
                        <Label className="text-base font-medium">Telefone *</Label>
                        <InputMask
                          mask="(99) 99999-9999"
                          value={recipientData.phone}
                          onChange={(e) => handleAddressChange('recipient', 'phone', e.target.value)}
                        >
                          {(inputProps: any) => (
                            <Input
                              {...inputProps}
                              type="tel"
                              placeholder="(00) 00000-0000"
                              className="h-12 text-base rounded-lg"
                            />
                          )}
                        </InputMask>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-base font-medium">E-mail *</Label>
                      <Input
                        type="email"
                        value={recipientData.email}
                        onChange={(e) => handleAddressChange('recipient', 'email', e.target.value)}
                        placeholder="email@exemplo.com"
                        className="h-12 text-base rounded-lg"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex space-x-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(2)}
                className="flex-1 h-12"
              >
                Voltar
              </Button>
              <Button
                onClick={handleStep3Submit}
                disabled={isLoading}
                className="flex-1 h-12 bg-gradient-primary hover:shadow-primary"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                    <span>Processando...</span>
                  </div>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Avançar
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          // Dados já foram salvos no sessionStorage, continuar com o cálculo
          processQuoteCalculation();
        }}
      />
    </div>
  );
};

export default QuoteForm;