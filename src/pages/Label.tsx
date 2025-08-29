import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import InputMask from "react-input-mask";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label as FormLabel } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { User, MapPin, Package, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { sanitizeTextInput, validateDocument, validateCEP } from "@/utils/inputValidation";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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

const Label = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [samePickupAddress, setSamePickupAddress] = useState<boolean>(true);
  const [alternativePickupAddress, setAlternativePickupAddress] = useState<string>("");

  const steps = [
    { number: 1, title: "Dados do Remetente", icon: User },
    { number: 2, title: "Dados do Destinatário", icon: MapPin },
    { number: 3, title: "Resumo do Envio", icon: Package }
  ];

  const [senderData, setSenderData] = useState<AddressData>({
    name: "", document: "", phone: "", email: "", cep: "", street: "",
    number: "", complement: "", neighborhood: "", city: "", state: "", reference: ""
  });

  const [recipientData, setRecipientData] = useState<AddressData>({
    name: "", document: "", phone: "", email: "", cep: "", street: "",
    number: "", complement: "", neighborhood: "", city: "", state: "", reference: ""
  });

  useEffect(() => {
    const savedQuote = sessionStorage.getItem('selectedQuote');
    if (!savedQuote) {
      navigate('/');
      return;
    }
    setSelectedQuote(JSON.parse(savedQuote));
  }, [navigate]);

  // Função para buscar endereço por CEP via ViaCEP
  const fetchEnderecoPorCep = async (cep: string) => {
    const apenasDigitos = cep.replace(/\D/g, "");
    if (apenasDigitos.length !== 8) return null;

    try {
      const res = await fetch(`https://viacep.com.br/ws/${apenasDigitos}/json/`);
      const data = await res.json();
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

  const handleCepChange = async (
    type: 'sender' | 'recipient',
    value: string
  ) => {
    const sanitizedValue = sanitizeTextInput(value);
    
    if (type === 'sender') {
      setSenderData(prev => ({ ...prev, cep: sanitizedValue }));
    } else {
      setRecipientData(prev => ({ ...prev, cep: sanitizedValue }));
    }

    if (value.replace(/\D/g, "").length === 8) {
      const endereco = await fetchEnderecoPorCep(value);
      if (endereco) {
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
        toast({
          title: "CEP não encontrado",
          description: "Verifique se o CEP está correto.",
          variant: "destructive"
        });
      }
    }
  };

  const isStep1Valid = () => {
    const requiredFields: (keyof AddressData)[] = [
      'name', 'document', 'phone', 'email', 'cep', 'street', 
      'number', 'neighborhood', 'city', 'state'
    ];
    const senderValid = requiredFields.every(field => senderData[field].trim() !== "");
    const pickupValid = selectedQuote?.pickup !== 'pickup' || samePickupAddress || alternativePickupAddress.trim() !== "";
    return senderValid && pickupValid;
  };

  const isStep2Valid = () => {
    const requiredFields: (keyof AddressData)[] = [
      'name', 'document', 'phone', 'email', 'cep', 'street', 
      'number', 'neighborhood', 'city', 'state'
    ];
    return requiredFields.every(field => recipientData[field].trim() !== "");
  };

  const handleStep1Submit = () => {
    if (!isStep1Valid()) {
      toast({
        title: "Dados obrigatórios",
        description: "Preencha todos os campos obrigatórios do remetente",
        variant: "destructive"
      });
      return;
    }

    // Validate sender data
    const senderDocError = validateDocument(senderData.document);
    if (senderDocError) {
      toast({
        title: "Documento inválido",
        description: `Remetente: ${senderDocError}`,
        variant: "destructive"
      });
      return;
    }
    
    const senderCepError = validateCEP(senderData.cep);
    if (senderCepError) {
      toast({
        title: "CEP inválido",
        description: `Remetente: ${senderCepError}`,
        variant: "destructive"
      });
      return;
    }

    setCurrentStep(2);
  };

  const handleStep2Submit = () => {
    if (!isStep2Valid()) {
      toast({
        title: "Dados obrigatórios",
        description: "Preencha todos os campos obrigatórios do destinatário",
        variant: "destructive"
      });
      return;
    }

    // Validate recipient data
    const recipientDocError = validateDocument(recipientData.document);
    if (recipientDocError) {
      toast({
        title: "Documento inválido",
        description: `Destinatário: ${recipientDocError}`,
        variant: "destructive"
      });
      return;
    }
    
    const recipientCepError = validateCEP(recipientData.cep);
    if (recipientCepError) {
      toast({
        title: "CEP inválido",
        description: `Destinatário: ${recipientCepError}`,
        variant: "destructive"
      });
      return;
    }

    setCurrentStep(3);
  };

  const handleFinalSubmit = async () => {
    setIsLoading(true);

    try {
      // Create sender address
      const { data: senderAddress, error: senderError } = await supabase
        .from('addresses')
        .insert({
          ...senderData,
          address_type: 'sender',
          user_id: user?.id
        })
        .select()
        .maybeSingle();

      if (senderError) throw senderError;

      // Create recipient address
      const { data: recipientAddress, error: recipientError } = await supabase
        .from('addresses')
        .insert({
          ...recipientData,
          address_type: 'recipient',
          user_id: user?.id
        })
        .select()
        .maybeSingle();

      if (recipientError) throw recipientError;

      // Generate tracking code
      const { data: trackingResult, error: trackingError } = await supabase
        .rpc('generate_tracking_code');

      if (trackingError) throw trackingError;

      // Create shipment
      const shipmentQuoteData = {
        ...selectedQuote.quoteData,
        totalPrice: selectedQuote.totalPrice,
        pickupMode: selectedQuote.pickup === 'pickup' ? 'PICKUP_D1' : 'DROP_OFF',
        coletaAlternativa: selectedQuote.pickup === 'pickup' && !samePickupAddress ? alternativePickupAddress : null
      };

      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .insert({
          tracking_code: trackingResult,
          sender_address_id: senderAddress.id,
          recipient_address_id: recipientAddress.id,
          quote_data: shipmentQuoteData,
          selected_option: selectedQuote.option,
          pickup_option: selectedQuote.pickup,
          weight: parseFloat(selectedQuote.quoteData.weight),
          length: parseFloat(selectedQuote.quoteData.length),
          width: parseFloat(selectedQuote.quoteData.width),
          height: parseFloat(selectedQuote.quoteData.height),
          format: selectedQuote.quoteData.format,
          status: 'PENDING_DOCUMENT',
          user_id: user?.id
        })
        .select()
        .maybeSingle();

      if (shipmentError) throw shipmentError;

      sessionStorage.setItem('currentShipment', JSON.stringify(shipment));

      toast({
        title: "Etiqueta criada!",
        description: `Código de rastreio: ${trackingResult}`,
      });

      navigate("/documento");

    } catch (error: any) {
      console.error('Error creating shipment:', error);
      toast({
        title: "Erro ao criar etiqueta",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
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
  );

  const AddressForm = ({ 
    title, 
    type, 
    data, 
    icon: Icon 
  }: { 
    title: string; 
    type: 'sender' | 'recipient'; 
    data: AddressData; 
    icon: any;
  }) => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Icon className="h-12 w-12 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-muted-foreground">
          Dados completos {type === 'sender' ? 'do remetente' : 'do destinatário'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <FormLabel htmlFor={`${type}-name`}>Nome Completo *</FormLabel>
          <Input
            id={`${type}-name`}
            value={data.name}
            onChange={(e) => handleAddressChange(type, 'name', e.target.value)}
            placeholder="Nome completo"
            className="border-input-border focus:border-primary focus:ring-primary h-12"
          />
        </div>
        <div className="space-y-2">
          <FormLabel htmlFor={`${type}-document`}>CPF/CNPJ *</FormLabel>
          <InputMask
            mask={data.document?.replace(/\D/g, "").length > 11 ? "99.999.999/9999-99" : "999.999.999-99"}
            value={data.document}
            onChange={(e) => handleAddressChange(type, 'document', e.target.value)}
          >
            {(inputProps: any) => (
              <Input
                {...inputProps}
                id={`${type}-document`}
                type="text"
                placeholder="CPF ou CNPJ"
                className="border-input-border focus:border-primary focus:ring-primary h-12"
              />
            )}
          </InputMask>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <FormLabel htmlFor={`${type}-phone`}>Telefone *</FormLabel>
          <InputMask
            mask="(99) 99999-9999"
            value={data.phone}
            onChange={(e) => handleAddressChange(type, 'phone', e.target.value)}
          >
            {(inputProps: any) => (
              <Input
                {...inputProps}
                id={`${type}-phone`}
                type="tel"
                placeholder="(00) 00000-0000"
                className="border-input-border focus:border-primary focus:ring-primary h-12"
              />
            )}
          </InputMask>
        </div>
        <div className="space-y-2">
          <FormLabel htmlFor={`${type}-email`}>E-mail *</FormLabel>
          <Input
            id={`${type}-email`}
            type="email"
            value={data.email}
            onChange={(e) => handleAddressChange(type, 'email', e.target.value)}
            placeholder="email@exemplo.com"
            className="border-input-border focus:border-primary focus:ring-primary h-12"
          />
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <FormLabel htmlFor={`${type}-cep`}>CEP *</FormLabel>
          <InputMask
            mask="99999-999"
            value={data.cep}
            onChange={(e) => handleCepChange(type, e.target.value)}
          >
            {(inputProps: any) => (
              <Input
                {...inputProps}
                id={`${type}-cep`}
                type="text"
                placeholder="00000-000"
                className="border-input-border focus:border-primary focus:ring-primary h-12"
              />
            )}
          </InputMask>
        </div>
        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor={`${type}-street`}>Rua *</FormLabel>
          <Input
            id={`${type}-street`}
            value={data.street}
            onChange={(e) => handleAddressChange(type, 'street', e.target.value)}
            placeholder="Nome da rua"
            className="border-input-border focus:border-primary focus:ring-primary h-12"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <FormLabel htmlFor={`${type}-number`}>Número *</FormLabel>
          <Input
            id={`${type}-number`}
            value={data.number}
            onChange={(e) => handleAddressChange(type, 'number', e.target.value)}
            placeholder="123"
            className="border-input-border focus:border-primary focus:ring-primary h-12"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor={`${type}-complement`}>Complemento</FormLabel>
          <Input
            id={`${type}-complement`}
            value={data.complement}
            onChange={(e) => handleAddressChange(type, 'complement', e.target.value)}
            placeholder="Apto, Bloco, etc."
            className="border-input-border focus:border-primary focus:ring-primary h-12"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <FormLabel htmlFor={`${type}-neighborhood`}>Bairro *</FormLabel>
          <Input
            id={`${type}-neighborhood`}
            value={data.neighborhood}
            onChange={(e) => handleAddressChange(type, 'neighborhood', e.target.value)}
            placeholder="Nome do bairro"
            className="border-input-border focus:border-primary focus:ring-primary h-12"
          />
        </div>
        <div className="space-y-2">
          <FormLabel htmlFor={`${type}-city`}>Cidade *</FormLabel>
          <Input
            id={`${type}-city`}
            value={data.city}
            onChange={(e) => handleAddressChange(type, 'city', e.target.value)}
            placeholder="Nome da cidade"
            className="border-input-border focus:border-primary focus:ring-primary h-12"
          />
        </div>
        <div className="space-y-2">
          <FormLabel htmlFor={`${type}-state`}>UF *</FormLabel>
          <Input
            id={`${type}-state`}
            value={data.state}
            onChange={(e) => handleAddressChange(type, 'state', e.target.value)}
            placeholder="SP"
            maxLength={2}
            className="border-input-border focus:border-primary focus:ring-primary h-12"
          />
        </div>
      </div>

      {type === 'recipient' && (
        <div className="space-y-2">
          <FormLabel htmlFor={`${type}-reference`}>Referência</FormLabel>
          <Textarea
            id={`${type}-reference`}
            value={data.reference}
            onChange={(e) => handleAddressChange(type, 'reference', e.target.value)}
            placeholder="Ponto de referência para facilitar a localização"
            className="border-input-border focus:border-primary focus:ring-primary"
            rows={2}
          />
        </div>
      )}

      {/* Pickup address section - only show for sender when pickup option is selected */}
      {type === 'sender' && selectedQuote?.pickup === 'pickup' && (
        <>
          <Separator />
          <div className="space-y-4">
            <FormLabel className="text-base font-medium">Local de Coleta</FormLabel>
            
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
                <FormLabel htmlFor="pickup-same" className="cursor-pointer">
                  O local de coleta é o mesmo endereço do remetente
                </FormLabel>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nao" id="pickup-different" />
                <FormLabel htmlFor="pickup-different" className="cursor-pointer">
                  O local de coleta é diferente
                </FormLabel>
              </div>
            </RadioGroup>

            {!samePickupAddress && (
              <div className="space-y-2">
                <FormLabel htmlFor="alternative-pickup-address">
                  Informe o endereço do local de coleta *
                </FormLabel>
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
    </div>
  );

  if (!selectedQuote) {
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
        <div className="w-full max-w-5xl mx-auto">
          <Card className="shadow-card relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-glow opacity-10"></div>
            <CardHeader className="relative pb-4">
              <CardTitle className="text-center text-2xl font-bold">
                Dados da Etiqueta
              </CardTitle>
              <CardDescription className="text-center">
                Preencha os dados do remetente e destinatário
              </CardDescription>
            </CardHeader>
            
            <CardContent className="relative">
              {renderStepIndicator()}

              <div className="animate-fade-in">
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <AddressForm 
                      title="Dados do Remetente" 
                      type="sender" 
                      data={senderData} 
                      icon={User} 
                    />

                    <div className="flex justify-end">
                      <Button
                        onClick={handleStep1Submit}
                        disabled={!isStep1Valid()}
                        className="px-8 h-12 bg-gradient-primary hover:shadow-primary"
                      >
                        Avançar
                      </Button>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-6">
                    <AddressForm 
                      title="Dados do Destinatário" 
                      type="recipient" 
                      data={recipientData} 
                      icon={MapPin} 
                    />

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
                        disabled={!isStep2Valid()}
                        className="flex-1 h-12 bg-gradient-primary hover:shadow-primary"
                      >
                        Avançar
                      </Button>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <Package className="h-12 w-12 text-primary mx-auto mb-4" />
                      <h2 className="text-2xl font-bold">Resumo do Envio</h2>
                      <p className="text-muted-foreground">
                        Confira os dados antes de finalizar
                      </p>
                    </div>

                    {/* Quote Summary */}
                    <Card className="border-2 border-primary/20">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="font-semibold mb-2 flex items-center">
                              <User className="h-4 w-4 mr-2" />
                              Remetente
                            </h3>
                            <div className="text-sm space-y-1">
                              <p><strong>{senderData.name}</strong></p>
                              <p>{senderData.email}</p>
                              <p>{senderData.phone}</p>
                              <p>{senderData.street}, {senderData.number}</p>
                              <p>{senderData.neighborhood} - {senderData.city}/{senderData.state}</p>
                              <p>CEP: {senderData.cep}</p>
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="font-semibold mb-2 flex items-center">
                              <MapPin className="h-4 w-4 mr-2" />
                              Destinatário
                            </h3>
                            <div className="text-sm space-y-1">
                              <p><strong>{recipientData.name}</strong></p>
                              <p>{recipientData.email}</p>
                              <p>{recipientData.phone}</p>
                              <p>{recipientData.street}, {recipientData.number}</p>
                              <p>{recipientData.neighborhood} - {recipientData.city}/{recipientData.state}</p>
                              <p>CEP: {recipientData.cep}</p>
                            </div>
                          </div>
                        </div>

                        <Separator className="my-6" />

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Origem:</span>
                            <div className="font-medium">{selectedQuote.quoteData.originCep}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Destino:</span>
                            <div className="font-medium">{selectedQuote.quoteData.destinyCep}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Peso:</span>
                            <div className="font-medium">{selectedQuote.quoteData.weight}kg</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Coleta:</span>
                            <div className="font-medium">
                              {selectedQuote.pickup === 'pickup' ? 'No local (+R$ 10,00)' : 'Ponto de coleta (Grátis)'}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Valor Total:</span>
                            <div className="font-medium text-primary text-lg">
                              R$ {selectedQuote.totalPrice?.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {selectedQuote?.pickup === 'pickup' && !samePickupAddress && (
                      <Card className="border-orange-200 bg-orange-50">
                        <CardContent className="p-4">
                          <h4 className="font-semibold text-orange-800 mb-2">Local de coleta alternativo:</h4>
                          <p className="text-orange-700">{alternativePickupAddress}</p>
                        </CardContent>
                      </Card>
                    )}

                    <div className="flex space-x-4">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStep(2)}
                        className="flex-1 h-12"
                      >
                        Voltar
                      </Button>
                      <Button
                        onClick={handleFinalSubmit}
                        disabled={isLoading}
                        className="flex-1 h-12 bg-gradient-primary hover:shadow-primary"
                      >
                        {isLoading ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                            <span>Criando etiqueta...</span>
                          </div>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-5 w-5" />
                            Finalizar Etiqueta
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Label;