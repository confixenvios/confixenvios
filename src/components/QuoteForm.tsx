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
import { SessionManager } from "@/utils/sessionManager";
import SavedAddressManager from "@/components/SavedAddressManager";

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
  
  // Step 1: Cotação
  const [formData, setFormData] = useState<QuoteFormData>({
    originCep: "74900-000",
    destinyCep: "",
    weight: "",
    length: "",
    width: "",
    height: "",
    format: "",
    quantity: "1",
    unitValue: ""
  });
  
  // Step 2: Resultados e opções
  const [quoteData, setQuoteData] = useState<any>(null);
  const [pickupOption, setPickupOption] = useState<string>("");
  
  // Step 3: Dados da etiqueta
  const [senderData, setSenderData] = useState<AddressData>({
    name: "", document: "", phone: "", email: "", cep: "", street: "",
    number: "", complement: "", neighborhood: "", city: "", state: "", reference: ""
  });
  
  const [recipientData, setRecipientData] = useState<AddressData>({
    name: "", document: "", phone: "", email: "", cep: "", street: "",
    number: "", complement: "", neighborhood: "", city: "", state: "", reference: ""
  });
  
  const [samePickupAddress, setSamePickupAddress] = useState<boolean>(true);
  const [alternativePickupAddress, setAlternativePickupAddress] = useState<string>("");

  // Restaurar dados do formulário quando o usuário faz login
  useEffect(() => {
    if (user) {
      // Clear anonymous session when user logs in
      SessionManager.clearOnLogin();
      
      const savedFormData = sessionStorage.getItem('quoteFormData');
      if (savedFormData) {
        try {
          const parsedData = JSON.parse(savedFormData);
          setFormData(parsedData);
          sessionStorage.removeItem('quoteFormData'); // Limpar após restaurar
        } catch (error) {
          console.error('Erro ao restaurar dados do formulário:', error);
        }
      }
    }
  }, [user]);

  const steps = [
    { number: 1, title: "Calcular Frete", icon: Calculator },
    { number: 2, title: "Opções de Coleta", icon: Truck },
    { number: 3, title: "Dados da Etiqueta", icon: User },
    { number: 4, title: "Documento Fiscal", icon: FileText },
    { number: 5, title: "Pagamento", icon: DollarSign }
  ];

  const getPickupCost = (option: string) => {
    if (option === 'pickup') return 10.00;
    return 0;
  };

  const getTotalMerchandiseValue = () => {
    const quantity = parseInt(formData.quantity) || 0;
    const unitValue = parseFloat(formData.unitValue) || 0;
    return quantity * unitValue;
  };

  const getTotalPrice = () => {
    if (!quoteData?.shippingQuote) return 0;
    const freightPrice = quoteData.shippingQuote.economicPrice;
    const pickupCost = getPickupCost(pickupOption);
    return freightPrice + pickupCost;
  };

  const handleInputChange = (field: keyof QuoteFormData, value: string) => {
    // Sanitize input and validate financial data
    const sanitizedValue = sanitizeTextInput(value);
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
  };

  const handleAddressChange = (type: 'sender' | 'recipient', field: keyof AddressData, value: string) => {
    // Security: Enhanced input validation and sanitization
    const shouldPreserveSpaces = field === 'name' || field === 'street' || field === 'neighborhood' || field === 'city';
    
    // Check for suspicious patterns first
    const suspiciousPatterns = [
      /<script/i, /javascript:/i, /on\w+=/i, /eval\(/i, 
      /<iframe/i, /<object/i, /<embed/i, /vbscript:/i
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(value))) {
      toast({
        title: "Entrada inválida",
        description: "Caracteres não permitidos detectados",
        variant: "destructive"
      });
      return;
    }
    
    // Enhanced sanitization based on field type
    let sanitizedValue: string;
    
    if (field === 'document') {
      // Only allow numbers, dots, dashes, slashes for documents
      sanitizedValue = value.replace(/[^0-9.\-\/]/g, '').substring(0, 18);
    } else if (field === 'phone') {
      // Only allow numbers, spaces, parentheses, dashes for phone
      sanitizedValue = value.replace(/[^0-9()\-\s]/g, '').substring(0, 20);
    } else if (field === 'email') {
      // Basic email character allowlist
      sanitizedValue = value.replace(/[^a-zA-Z0-9@._\-]/g, '').substring(0, 100);
    } else if (field === 'cep') {
      // Only numbers and dash for CEP
      sanitizedValue = value.replace(/[^0-9\-]/g, '').substring(0, 9);
    } else if (shouldPreserveSpaces) {
      // Remove dangerous chars but keep spaces for names/addresses
      sanitizedValue = value.replace(/[<>\"'&\x00-\x1f\x7f-\x9f]/g, '').substring(0, 100);
    } else {
      // Standard sanitization for other fields
      sanitizedValue = sanitizeTextInput(value);
    }
    
    if (type === 'sender') {
      setSenderData(prev => ({ ...prev, [field]: sanitizedValue }));
    } else {
      setRecipientData(prev => ({ ...prev, [field]: sanitizedValue }));
    }
  };

  const validateQuoteInputs = (): string | null => {
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

    // Additional security validations
    const quantity = parseInt(formData.quantity);
    if (quantity < 1 || quantity > 100) {
      return "Quantidade deve ser entre 1 e 100 itens";
    }

    // Validate CEP format more strictly
    if (!validateCep(formData.destinyCep)) {
      return "CEP de destino deve ter exatamente 8 dígitos";
    }

    // Check for suspicious patterns in string inputs
    const suspiciousPatterns = [/<script/i, /javascript:/i, /on\w+=/i, /eval\(/i];
    const stringFields = [formData.format];
    
    for (const field of stringFields) {
      if (field && suspiciousPatterns.some(pattern => pattern.test(field))) {
        return "Dados inválidos detectados. Por favor, revise suas informações.";
      }
    }

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

  // Step 1: Calcular Cotação
  const handleStep1Submit = async () => {
    // Verificar se o usuário está logado antes de prosseguir
    if (!user) {
      // Salvar os dados do formulário no sessionStorage
      sessionStorage.setItem('quoteFormData', JSON.stringify(formData));
      setShowAuthModal(true);
      return;
    }

    await processQuoteCalculation();
  };

  // Função para processar o cálculo da cotação
  const processQuoteCalculation = async () => {
    setIsLoading(true);

    try {
      if (!validateCep(formData.destinyCep)) {
        toast({
          title: "CEP inválido",
          description: "Digite um CEP válido com 8 dígitos",
          variant: "destructive"
        });
        return;
      }

      // Validate all inputs for security
      const validationError = validateQuoteInputs();
      if (validationError) {
        toast({
          title: "Dados inválidos",
          description: validationError,
          variant: "destructive"
        });
        return;
      }

      const weight = parseFloat(formData.weight);
      if (weight <= 0) {
        toast({
          title: "Peso inválido", 
          description: "Digite um peso válido maior que 0",
          variant: "destructive"
        });
        return;
      }

      const quantity = parseInt(formData.quantity) || 1;

      const shippingQuote = await calculateShippingQuote({
        destinyCep: formData.destinyCep,
        weight: weight,
        quantity: quantity
      });

      // Salvar todos os dados da cotação completa
      const completeQuoteData = {
        // Dados da cotação original
        originCep: formData.originCep,
        destinyCep: formData.destinyCep,
        weight: formData.weight,
        length: formData.length,
        width: formData.width,
        height: formData.height,
        format: formData.format,
        quantity: formData.quantity,
        unitValue: formData.unitValue,
        totalMerchandiseValue: getTotalMerchandiseValue(),
        
        // Resultado da cotação
        shippingQuote,
        
        // Metadados
        calculatedAt: new Date().toISOString()
      };

      setQuoteData(completeQuoteData);
      
      // Salvar no sessionStorage para uso posterior
      sessionStorage.setItem('completeQuoteData', JSON.stringify(completeQuoteData));
      
      setCurrentStep(2);
      
      toast({
        title: "Cotação calculada!",
        description: "Escolha uma opção de coleta para continuar",
      });

    } catch (error) {
      console.error('Erro ao calcular frete:', error);
      toast({
        title: "Erro no cálculo",
        description: error instanceof Error ? error.message : "Erro inesperado ao calcular o frete",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Selecionar opções
  const handleStep2Submit = () => {
    if (!pickupOption) {
      toast({
        title: "Seleção obrigatória",
        description: "Selecione uma opção de coleta para continuar",
        variant: "destructive"
      });
      return;
    }
    
    setCurrentStep(3);
    toast({
      title: "Opção selecionada!",
      description: "Agora preencha os dados da etiqueta",
    });
  };

  // Step 3: Avançar para documento fiscal (sem criar etiqueta ainda)
  const handleStep3Submit = async () => {
    console.log('QuoteForm - Step 3 submit iniciado - apenas coletando dados');
    
    const requiredFields: (keyof AddressData)[] = [
      'name', 'document', 'phone', 'email', 'cep', 'street', 
      'number', 'neighborhood', 'city', 'state'
    ];

    const senderValid = requiredFields.every(field => senderData[field].trim() !== "");
    const recipientValid = requiredFields.every(field => recipientData[field].trim() !== "");

    // Validate alternative pickup address if needed
    const pickupValid = pickupOption !== 'pickup' || samePickupAddress || alternativePickupAddress.trim() !== "";

    if (!senderValid || !recipientValid || !pickupValid) {
      toast({
        title: "Dados obrigatórios",
        description: "Preencha todos os campos obrigatórios antes de continuar",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Get or create session ID for anonymous users (security fix)
      let sessionId = null;
      if (!user) {
        console.log('QuoteForm - Getting session ID for anonymous user');
        sessionId = await SessionManager.getSessionId();
        console.log('QuoteForm - Anonymous session ID:', sessionId);
      }

      // Preparar dados COMPLETOS para as próximas etapas (sem salvar no banco ainda)
      const completeShipmentData = {
        // === DADOS DA COTAÇÃO ORIGINAL ===
        quoteData: quoteData,
        originalFormData: {
          originCep: formData.originCep,
          destinyCep: formData.destinyCep,
          weight: formData.weight,
          length: formData.length,
          width: formData.width,
          height: formData.height,
          format: formData.format,
          quantity: formData.quantity,
          unitValue: formData.unitValue,
          totalMerchandiseValue: getTotalMerchandiseValue()
        },
        
        // === DETALHES DA MERCADORIA ===
        merchandiseDetails: {
          quantity: parseInt(formData.quantity),
          unitValue: parseFloat(formData.unitValue),
          totalValue: getTotalMerchandiseValue(),
          description: `Mercadoria - Formato: ${formData.format}`,
          weight: parseFloat(formData.weight),
          dimensions: {
            length: parseFloat(formData.length),
            width: parseFloat(formData.width),
            height: parseFloat(formData.height)
          }
        },
        
        // === DADOS DE ENTREGA E COLETA ===
        deliveryDetails: {
          selectedOption: "standard",
          shippingPrice: quoteData?.shippingQuote?.economicPrice || 0,
          pickupOption: pickupOption,
          pickupCost: getPickupCost(pickupOption),
          totalPrice: getTotalPrice(),
          estimatedDays: quoteData?.shippingQuote?.estimatedDays || 5,
          pickupDetails: {
            option: pickupOption,
            sameAsOrigin: samePickupAddress,
            alternativeAddress: alternativePickupAddress
          }
        },
        
        // === DADOS COMPLETOS DOS ENDEREÇOS ===
        addressData: {
          sender: {
            ...senderData,
            addressType: 'sender'
          },
          recipient: {
            ...recipientData,
            addressType: 'recipient'
          }
        },
        
        // === DADOS TÉCNICOS ===
        technicalData: {
          weight: parseFloat(formData.weight),
          length: parseFloat(formData.length),
          width: parseFloat(formData.width),
          height: parseFloat(formData.height),
          format: formData.format,
          cubicWeight: (parseFloat(formData.length) * parseFloat(formData.width) * parseFloat(formData.height)) / 5000
        },
        
        // === METADADOS E CONTROLE ===
        metadata: {
          user_id: user?.id || null,
          session_id: sessionId,
          status: 'PENDING_DOCUMENT',
          createdAt: new Date().toISOString(),
          step: 'label_data_completed',
          calculatedAt: quoteData?.calculatedAt || new Date().toISOString()
        }
      };

      console.log('QuoteForm - Salvando dados COMPLETOS no sessionStorage:', completeShipmentData);
      
      // Salvar TODOS os dados coletados no sessionStorage para as próximas etapas
      sessionStorage.setItem('completeShipmentData', JSON.stringify(completeShipmentData));
      sessionStorage.setItem('currentShipment', JSON.stringify(completeShipmentData));
      localStorage.setItem('completeShipmentData_backup', JSON.stringify(completeShipmentData));
      
      console.log('QuoteForm - Dados completos salvos no sessionStorage com todos os detalhes do formulário');

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

  const isStep1Valid = Object.values(formData).every(value => value.trim() !== "");

  const renderStepIndicator = () => (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-6">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className={`flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 px-2 sm:px-3 py-2 sm:py-3 rounded-lg transition-all duration-300 ${
                currentStep === step.number 
                  ? 'bg-primary text-primary-foreground shadow-lg' 
                  : currentStep > step.number 
                    ? 'bg-success text-success-foreground'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {currentStep > step.number ? (
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <step.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
                <span className="font-medium text-xs sm:text-sm text-center">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`hidden sm:block w-6 lg:w-12 h-0.5 mx-2 transition-all duration-300 ${
                  currentStep > step.number ? 'bg-success' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full">
      <Card className="shadow-card relative overflow-hidden border-border/50">
        <div className="absolute inset-0 bg-gradient-subtle opacity-30"></div>
        <CardHeader className="relative pb-4 sm:pb-6 px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
          <CardTitle className="text-center text-2xl sm:text-3xl font-bold">
            Cotação Rápida
          </CardTitle>
          <CardDescription className="text-center text-base sm:text-lg">
            Calcule o frete para sua encomenda em segundos
          </CardDescription>
        </CardHeader>
        
        <CardContent className="relative px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
          {renderStepIndicator()}

          <div className="animate-fade-in">
            {currentStep === 1 && (
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center mb-4 sm:mb-6">
                  <h3 className="text-lg sm:text-xl font-semibold flex items-center justify-center space-x-2">
                    <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <span>Calcular Frete</span>
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground mt-2">
                    Insira os dados do seu envio para calcular o preço e prazo
                  </p>
                </div>

                {/* CEP Fields */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  <div className="space-y-3">
                    <Label htmlFor="origin-cep" className="flex items-center space-x-2 text-base font-medium">
                      <MapPin className="h-5 w-5 text-primary" />
                      <span>CEP de Origem</span>
                    </Label>
                    <Input
                      id="origin-cep"
                      type="text"
                      value={formData.originCep}
                      disabled
                      className="border-input-border bg-muted text-muted-foreground h-14 text-lg"
                    />
                    <p className="text-sm text-muted-foreground">
                      Goiânia e Região / Origem fixa
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="destiny-cep" className="flex items-center space-x-2 text-base font-medium">
                      <MapPin className="h-5 w-5 text-primary" />
                      <span>CEP de Destino</span>
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
                          className="border-input-border focus:border-primary focus:ring-primary h-14 text-lg"
                        />
                      )}
                    </InputMask>
                  </div>
                </div>

                {/* Merchandise Details */}
                <div className="space-y-6">
                  <Label className="flex items-center space-x-2 text-lg font-semibold">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span>Detalhes da Mercadoria</span>
                  </Label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="quantity" className="text-base font-medium">Quantidade</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        placeholder="1"
                        value={formData.quantity}
                        onChange={(e) => handleInputChange("quantity", e.target.value)}
                        className="border-input-border focus:border-primary focus:ring-primary h-14 text-lg"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor="unitValue" className="text-base font-medium">Valor Unitário (R$)</Label>
                      <Input
                        id="unitValue"
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="100.00"
                        value={formData.unitValue}
                        onChange={(e) => handleInputChange("unitValue", e.target.value)}
                        className="border-input-border focus:border-primary focus:ring-primary h-14 text-lg"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Valor Total</Label>
                      <div className="h-14 flex items-center px-4 py-2 rounded-md border border-input-border text-foreground font-semibold text-lg">
                        R$ {getTotalMerchandiseValue().toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Package Details */}
                <div className="space-y-6">
                  <Label className="flex items-center space-x-2 text-lg font-semibold">
                    <Package className="h-5 w-5 text-primary" />
                    <span>Detalhes do Pacote</span>
                  </Label>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="weight" className="text-base font-medium">Peso (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        placeholder="0.5"
                        value={formData.weight}
                        onChange={(e) => handleInputChange("weight", e.target.value)}
                        className="border-input-border focus:border-primary focus:ring-primary h-14 text-lg"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor="length" className="text-base font-medium">Comp. (cm)</Label>
                      <Input
                        id="length"
                        type="number"
                        placeholder="20"
                        value={formData.length}
                        onChange={(e) => handleInputChange("length", e.target.value)}
                        className="border-input-border focus:border-primary focus:ring-primary h-14 text-lg"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor="width" className="text-base font-medium">Larg. (cm)</Label>
                      <Input
                        id="width"
                        type="number"
                        placeholder="15"
                        value={formData.width}
                        onChange={(e) => handleInputChange("width", e.target.value)}
                        className="border-input-border focus:border-primary focus:ring-primary h-14 text-lg"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor="height" className="text-base font-medium">Alt. (cm)</Label>
                      <Input
                        id="height"
                        type="number"
                        placeholder="10"
                        value={formData.height}
                        onChange={(e) => handleInputChange("height", e.target.value)}
                        className="border-input-border focus:border-primary focus:ring-primary h-14 text-lg"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 max-w-sm">
                    <Label htmlFor="format" className="text-base font-medium">Formato</Label>
                    <Select onValueChange={(value) => handleInputChange("format", value)}>
                      <SelectTrigger className="border-input-border focus:border-primary focus:ring-primary h-14 text-lg">
                        <SelectValue placeholder="Selecione o formato" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="caixa">Caixa</SelectItem>
                        <SelectItem value="pacote">Pacote</SelectItem>
                        <SelectItem value="rolo">Rolo</SelectItem>
                        <SelectItem value="cilindro">Cilindro</SelectItem>
                        <SelectItem value="esfera">Esfera</SelectItem>
                        <SelectItem value="envelope">Envelope</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleStep1Submit}
                  disabled={!isStep1Valid || isLoading}
                  className="w-full h-16 text-lg font-semibold bg-gradient-primary hover:shadow-primary transition-all duration-300 mt-8"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                      <span>Calculando...</span>
                    </div>
                  ) : (
                    <>
                      <Calculator className="mr-3 h-5 w-5" />
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
                        <span className="text-muted-foreground">Frete:</span>
                        <span className="font-medium">R$ {quoteData.shippingQuote.economicPrice.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-card rounded-lg">
                      <div className="flex items-center space-x-3">
                        <DollarSign className="h-5 w-5 text-success" />
                        <div>
                          <div className="font-semibold">Frete Padrão</div>
                          <div className="text-sm text-muted-foreground">Entrega padrão com melhor custo-benefício</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">R$ {quoteData.shippingQuote.economicPrice.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">{quoteData.shippingQuote.economicDays} dias úteis</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pickup Options */}
                <div className="space-y-4">
                  <div 
                    className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover-scale ${
                      pickupOption === 'dropoff' 
                        ? 'border-primary bg-accent/20 ring-2 ring-primary' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setPickupOption('dropoff')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Circle className={`h-4 w-4 ${pickupOption === 'dropoff' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div>
                          <h4 className="font-medium">Postar no ponto de coleta</h4>
                          <p className="text-sm text-muted-foreground">
                            Leve até uma agência parceira (imediato)
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">Gratuito</Badge>
                    </div>
                  </div>
                  
                  <div 
                    className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover-scale ${
                      pickupOption === 'pickup' 
                        ? 'border-primary bg-accent/20 ring-2 ring-primary' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setPickupOption('pickup')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Circle className={`h-4 w-4 ${pickupOption === 'pickup' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div>
                          <h4 className="font-medium">Coletar no meu local</h4>
                          <p className="text-sm text-muted-foreground">
                            Buscamos em seu endereço (Região Metropolitana de Goiânia e Anápolis)
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">+ R$ 10,00</Badge>
                    </div>
                  </div>
                </div>

                {/* Total Price */}
                {pickupOption && (
                  <Card className="border-success/20 bg-success/5 animate-scale-in">
                    <CardContent className="pt-6">
                      <div className="text-center space-y-2">
                        <div className="text-sm text-muted-foreground">Valor Total</div>
                        <div className="text-3xl font-bold text-primary">R$ {getTotalPrice().toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">
                          Frete: R$ {quoteData.shippingQuote.economicPrice.toFixed(2)}
                          {pickupOption === 'pickup' && ' + Coleta: R$ 10,00'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

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
                          <Label>Nome completo *</Label>
                          <Input
                            value={senderData.name}
                            onChange={(e) => handleAddressChange('sender', 'name', e.target.value)}
                            placeholder="Nome completo"
                            className="h-12"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                             <Label>CPF/CNPJ *</Label>
                             <Input
                               type="text"
                               value={senderData.document}
                               onChange={(e) => handleAddressChange('sender', 'document', e.target.value)}
                               placeholder="CPF ou CNPJ (apenas números)"
                               className="h-12"
                               maxLength={18}
                             />
                           </div>
                          <div className="space-y-2">
                            <Label>Telefone *</Label>
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
                                  className="h-12"
                                />
                              )}
                            </InputMask>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>E-mail *</Label>
                          <Input
                            type="email"
                            value={senderData.email}
                            onChange={(e) => handleAddressChange('sender', 'email', e.target.value)}
                            placeholder="email@exemplo.com"
                            className="h-12"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>CEP *</Label>
                            <InputMask
                              mask="99999-999"
                              value={senderData.cep}
                              onChange={(e) => handleCepChange('sender', e.target.value)}
                            >
                              {(inputProps: any) => (
                                <Input
                                  {...inputProps}
                                  type="text"
                                  placeholder="00000-000"
                                  className="h-12"
                                />
                              )}
                            </InputMask>
                          </div>
                          <div className="space-y-2">
                            <Label>Número *</Label>
                            <Input
                              value={senderData.number}
                              onChange={(e) => handleAddressChange('sender', 'number', e.target.value)}
                              placeholder="123"
                              className="h-12"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Endereço *</Label>
                          <Input
                            value={senderData.street}
                            onChange={(e) => handleAddressChange('sender', 'street', e.target.value)}
                            placeholder="Rua, Avenida..."
                            className="h-12"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Bairro *</Label>
                            <Input
                              value={senderData.neighborhood}
                              onChange={(e) => handleAddressChange('sender', 'neighborhood', e.target.value)}
                              placeholder="Bairro"
                              className="h-12"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Complemento</Label>
                            <Input
                              value={senderData.complement}
                              onChange={(e) => handleAddressChange('sender', 'complement', e.target.value)}
                              placeholder="Apto, Bloco..."
                              className="h-12"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Cidade *</Label>
                            <Input
                              value={senderData.city}
                              onChange={(e) => handleAddressChange('sender', 'city', e.target.value)}
                              placeholder="Cidade"
                              className="h-12"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Estado *</Label>
                            <Input
                              value={senderData.state}
                              onChange={(e) => handleAddressChange('sender', 'state', e.target.value)}
                              placeholder="GO"
                              maxLength={2}
                              className="h-12"
                            />
                          </div>
                         </div>
                       </div>

                       {/* Pickup address section - only show when pickup option is selected */}
                       {pickupOption === 'pickup' && (
                         <>
                           <Separator className="my-4" />
                           <div className="space-y-4">
                             <Label className="text-base font-medium">Local de Coleta</Label>
                             
                             <RadioGroup
                               value={samePickupAddress ? "sim" : "nao"}
                               onValueChange={(value) => {
                                 setSamePickupAddress(value === "sim");
                                 if (value === "sim") {
                                   setAlternativePickupAddress("");
                                 }
                               }}
                               className="flex flex-col space-y-2"
                             >
                               <div className="flex items-center space-x-2">
                                 <RadioGroupItem value="sim" id="pickup-same" />
                                 <Label htmlFor="pickup-same" className="cursor-pointer">
                                   O local de coleta é o mesmo endereço do remetente
                                 </Label>
                               </div>
                               <div className="flex items-center space-x-2">
                                 <RadioGroupItem value="nao" id="pickup-different" />
                                 <Label htmlFor="pickup-different" className="cursor-pointer">
                                   O local de coleta é diferente
                                 </Label>
                               </div>
                             </RadioGroup>

                             {!samePickupAddress && (
                               <div className="space-y-2">
                                 <Label htmlFor="alternative-pickup-address">
                                   Informe o endereço do local de coleta *
                                 </Label>
                                 <Textarea
                                   id="alternative-pickup-address"
                                   value={alternativePickupAddress}
                                   onChange={(e) => setAlternativePickupAddress(sanitizeTextInput(e.target.value))}
                                   placeholder="Ex.: Loja X, Rua H, nº 123"
                                   className="border-input-border focus:border-primary focus:ring-primary"
                                   rows={3}
                                   required
                                 />
                               </div>
                             )}
                           </div>
                         </>
                       )}
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
                          <Label>Nome completo *</Label>
                          <Input
                            value={recipientData.name}
                            onChange={(e) => handleAddressChange('recipient', 'name', e.target.value)}
                            placeholder="Nome completo"
                            className="h-12"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                             <Label>CPF/CNPJ *</Label>
                             <Input
                               type="text"
                               value={recipientData.document}
                               onChange={(e) => handleAddressChange('recipient', 'document', e.target.value)}
                               placeholder="CPF ou CNPJ (apenas números)"
                               className="h-12"
                               maxLength={18}
                             />
                           </div>
                          <div className="space-y-2">
                            <Label>Telefone *</Label>
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
                                  className="h-12"
                                />
                              )}
                            </InputMask>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>E-mail *</Label>
                          <Input
                            type="email"
                            value={recipientData.email}
                            onChange={(e) => handleAddressChange('recipient', 'email', e.target.value)}
                            placeholder="email@exemplo.com"
                            className="h-12"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>CEP *</Label>
                            <InputMask
                              mask="99999-999"
                              value={recipientData.cep}
                              onChange={(e) => handleCepChange('recipient', e.target.value)}
                            >
                              {(inputProps: any) => (
                                <Input
                                  {...inputProps}
                                  type="text"
                                  placeholder="00000-000"
                                  className="h-12"
                                />
                              )}
                            </InputMask>
                          </div>
                          <div className="space-y-2">
                            <Label>Número *</Label>
                            <Input
                              value={recipientData.number}
                              onChange={(e) => handleAddressChange('recipient', 'number', e.target.value)}
                              placeholder="123"
                              className="h-12"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Endereço *</Label>
                          <Input
                            value={recipientData.street}
                            onChange={(e) => handleAddressChange('recipient', 'street', e.target.value)}
                            placeholder="Rua, Avenida..."
                            className="h-12"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Bairro *</Label>
                            <Input
                              value={recipientData.neighborhood}
                              onChange={(e) => handleAddressChange('recipient', 'neighborhood', e.target.value)}
                              placeholder="Bairro"
                              className="h-12"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Complemento</Label>
                            <Input
                              value={recipientData.complement}
                              onChange={(e) => handleAddressChange('recipient', 'complement', e.target.value)}
                              placeholder="Apto, Bloco..."
                              className="h-12"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Cidade *</Label>
                            <Input
                              value={recipientData.city}
                              onChange={(e) => handleAddressChange('recipient', 'city', e.target.value)}
                              placeholder="Cidade"
                              className="h-12"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Estado *</Label>
                            <Input
                              value={recipientData.state}
                              onChange={(e) => handleAddressChange('recipient', 'state', e.target.value)}
                              placeholder="SP"
                              maxLength={2}
                              className="h-12"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                 </div>

                 {/* Seção de Endereços Salvos - Posicionada no final para melhor visibilidade */}
                 <div className="space-y-6">
                   <div className="text-center">
                     <h3 className="text-lg font-semibold text-muted-foreground">
                       Gerenciar Endereços Salvos
                     </h3>
                     <p className="text-sm text-muted-foreground">
                       Salve os dados preenchidos para reutilizar em futuras cotações
                     </p>
                   </div>

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     <SavedAddressManager
                       type="sender"
                       title="Remetentes Salvos"
                       currentAddressData={senderData}
                       onAddressSelect={(data) => setSenderData(data)}
                       onAddressSave={(data) => {
                         toast({
                           title: "Remetente salvo!",
                           description: "Dados salvos para futuras cotações"
                         });
                       }}
                     />

                     <SavedAddressManager
                       type="recipient"
                       title="Destinatários Salvos"
                       currentAddressData={recipientData}
                       onAddressSelect={(data) => setRecipientData(data)}
                       onAddressSave={(data) => {
                         toast({
                           title: "Destinatário salvo!",
                           description: "Dados salvos para futuras cotações"
                         });
                       }}
                     />
                   </div>
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
        </CardContent>
      </Card>

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