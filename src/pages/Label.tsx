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
import { User, MapPin, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createAddress } from "@/services/addressService";
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
  inscricaoEstadual?: string;
}

const Label = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [samePickupAddress, setSamePickupAddress] = useState<boolean>(true);
  const [alternativePickupAddress, setAlternativePickupAddress] = useState<string>("");
  const [senderDocType, setSenderDocType] = useState<'cpf' | 'cnpj'>('cpf');
  const [recipientDocType, setRecipientDocType] = useState<'cpf' | 'cnpj'>('cpf');

  // Debug log
  console.log('Label - Component rendered with docTypes:', { senderDocType, recipientDocType });

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
    inscricaoEstadual: ""
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
    inscricaoEstadual: ""
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
    console.log('Label - CEP digitado:', cep, 'Apenas dígitos:', apenasDigitos);
    if (apenasDigitos.length !== 8) return null;

    try {
      console.log('Label - Buscando CEP na API ViaCEP...');
      const res = await fetch(`https://viacep.com.br/ws/${apenasDigitos}/json/`);
      const data = await res.json();
      console.log('Label - Resposta ViaCEP:', data);
      if (data.erro) return null;

      return {
        logradouro: data.logradouro,
        bairro: data.bairro,
        cidade: data.localidade,
        estado: data.uf,
      };
    } catch (error) {
      console.error('Label - Erro ao buscar CEP:', error);
      return null;
    }
  };

  const handleAddressChange = (
    type: 'sender' | 'recipient',
    field: keyof AddressData,
    value: string
  ) => {
    // Sanitize input for security
    const sanitizedValue = sanitizeTextInput(value);
    
    if (type === 'sender') {
      setSenderData(prev => ({ ...prev, [field]: sanitizedValue }));
    } else {
      setRecipientData(prev => ({ ...prev, [field]: sanitizedValue }));
    }
  };

  // Função especial para CEP com busca automática
  const handleCepChange = async (
    type: 'sender' | 'recipient',
    value: string
  ) => {
    console.log('Label - CEP mudou:', type, value);
    const sanitizedValue = sanitizeTextInput(value);
    
    if (type === 'sender') {
      setSenderData(prev => ({ ...prev, cep: sanitizedValue }));
    } else {
      setRecipientData(prev => ({ ...prev, cep: sanitizedValue }));
    }

    // Buscar endereço quando CEP estiver completo
    if (value.replace(/\D/g, "").length === 8) {
      console.log('Label - CEP completo, buscando endereço...');
      const endereco = await fetchEnderecoPorCep(value);
      if (endereco) {
        console.log('Label - Endereço encontrado:', endereco);
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
        console.log('Label - CEP não encontrado');
        toast({
          title: "CEP não encontrado",
          description: "Verifique se o CEP está correto.",
          variant: "destructive"
        });
      }
    }
  };

  const validateFormInputs = (): string | null => {
    // Validate sender data
    const senderDocError = validateDocument(senderData.document);
    if (senderDocError) return `Remetente: ${senderDocError}`;
    
    // Validate IE for CNPJ
    if (senderDocType === 'cnpj' && !senderData.inscricaoEstadual?.trim()) {
      return 'Remetente: Inscrição Estadual é obrigatória para CNPJ';
    }
    
    const senderCepError = validateCEP(senderData.cep);
    if (senderCepError) return `Remetente: ${senderCepError}`;
    
    // Validate recipient data
    const recipientDocError = validateDocument(recipientData.document);
    if (recipientDocError) return `Destinatário: ${recipientDocError}`;
    
    // Validate IE for CNPJ (recipient)
    if (recipientDocType === 'cnpj' && !recipientData.inscricaoEstadual?.trim()) {
      return 'Destinatário: Inscrição Estadual é obrigatória para CNPJ';
    }
    
    const recipientCepError = validateCEP(recipientData.cep);
    if (recipientCepError) return `Destinatário: ${recipientCepError}`;
    
    return null;
  };

  const isFormValid = () => {
    const requiredFields: (keyof AddressData)[] = [
      'name', 'document', 'phone', 'email', 'cep', 'street', 
      'number', 'neighborhood', 'city', 'state'
    ];

    const senderValid = requiredFields.every(field => senderData[field].trim() !== "");
    const recipientValid = requiredFields.every(field => recipientData[field].trim() !== "");

    // Validate alternative pickup address if needed
    const pickupValid = selectedQuote?.pickup !== 'pickup' || samePickupAddress || alternativePickupAddress.trim() !== "";

    return senderValid && recipientValid && pickupValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      toast({
        title: "Dados obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    // Validate input security
    const validationError = validateFormInputs();
    if (validationError) {
      toast({
        title: "Dados inválidos",
        description: validationError,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Label - Iniciando criação de endereços com segurança');
      console.log('Label - Dados do remetente:', senderData);
      console.log('Label - Dados do destinatário:', recipientData);
      
      // Salvar dados pessoais no sessionStorage para uso posterior
      sessionStorage.setItem('senderPersonalData', JSON.stringify({
        document: senderData.document,
        phone: senderData.phone,
        email: senderData.email,
        inscricaoEstadual: senderData.inscricaoEstadual || '',
      }));
      
      sessionStorage.setItem('recipientPersonalData', JSON.stringify({
        document: recipientData.document,
        phone: recipientData.phone,
        email: recipientData.email,
        inscricaoEstadual: recipientData.inscricaoEstadual || '',
      }));
      
      // Create sender address using secure service
      const senderAddress = await createAddress({
        ...senderData,
        address_type: 'sender',
        user_id: null
      });
      console.log('Label - Endereço do remetente criado:', senderAddress);

      // Create recipient address using secure service
      const recipientAddress = await createAddress({
        ...recipientData,
        address_type: 'recipient',
        user_id: null
      });
      console.log('Label - Endereço do destinatário criado:', recipientAddress);

      // Generate tracking code
      const { data: trackingResult, error: trackingError } = await supabase
        .rpc('generate_tracking_code');

      if (trackingError) throw trackingError;

      // Dados COMPLETOS da remessa para salvar no banco
      const shipmentQuoteData = {
        // Dados originais da cotação
        ...selectedQuote.quoteData,
        
        // Preços e totais
        totalPrice: selectedQuote.totalPrice,
        shippingPrice: selectedQuote.quoteData?.deliveryDetails?.shippingPrice || 0,
        pickupCost: selectedQuote.quoteData?.deliveryDetails?.pickupCost || 0,
        
        // Dados completos da mercadoria
        merchandiseDetails: selectedQuote.quoteData?.merchandiseDetails || {
          quantity: 1,
          unitValue: 0,
          totalValue: 0,
          description: "Mercadoria não especificada"
        },
        
        // Detalhes de coleta e entrega
        pickupMode: selectedQuote.pickup === 'pickup' ? 'PICKUP_D1' : 'DROP_OFF',
        coletaAlternativa: selectedQuote.pickup === 'pickup' && !samePickupAddress ? alternativePickupAddress : null,
        deliveryDetails: selectedQuote.quoteData?.deliveryDetails || {},
        
        // Dados técnicos completos
        technicalData: selectedQuote.quoteData?.technicalData || {
          weight: parseFloat(selectedQuote.quoteData?.weight) || 0,
          dimensions: {
            length: parseFloat(selectedQuote.quoteData?.length) || 0,
            width: parseFloat(selectedQuote.quoteData?.width) || 0,
            height: parseFloat(selectedQuote.quoteData?.height) || 0
          }
        },
        
        // Informações dos endereços (dados resumidos, detalhes estão nas tabelas)
        addressSummary: {
          senderName: senderData.name,
          senderCity: senderData.city,
          senderState: senderData.state,
          recipientName: recipientData.name,
          recipientCity: recipientData.city,
          recipientState: recipientData.state
        },
        
        // Metadados de controle
        creationSource: 'label_form',
        processedAt: new Date().toISOString()
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
          weight: parseFloat(selectedQuote.quoteData?.weight) || 0,
          length: parseFloat(selectedQuote.quoteData?.length) || 0,
          width: parseFloat(selectedQuote.quoteData?.width) || 0,
          height: parseFloat(selectedQuote.quoteData?.height) || 0,
          format: selectedQuote.quoteData?.format || 'caixa',
          document_type: 'declaracao_conteudo', // Padrão, será atualizado na tela de documento
          status: 'PENDING_DOCUMENT',
          user_id: null
        })
        .select()
        .maybeSingle();

      if (shipmentError) throw shipmentError;

      // Save shipment data for next step
      sessionStorage.setItem('currentShipment', JSON.stringify(shipment));

      toast({
        title: "Etiqueta criada!",
        description: `Código de rastreio: ${trackingResult}`,
      });

      // Navigate to document step
      console.log('Label - Navegando para documento');
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
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Icon className="h-5 w-5 text-primary" />
          <span>{title}</span>
        </CardTitle>
        <CardDescription>
          Dados completos {type === 'sender' ? 'do remetente' : 'do destinatário'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Document Type Selection - CPF or CNPJ - Updated */}
        <div className="space-y-2">
          <FormLabel htmlFor={`${type}-doc-type`}>Tipo de Documento *</FormLabel>
          <RadioGroup
            value={type === 'sender' ? senderDocType : recipientDocType}
            onValueChange={(value: 'cpf' | 'cnpj') => {
              console.log(`${type} document type changed to:`, value);
              if (type === 'sender') {
                setSenderDocType(value);
                setSenderData(prev => ({ ...prev, document: '', inscricaoEstadual: '' }));
              } else {
                setRecipientDocType(value);
                setRecipientData(prev => ({ ...prev, document: '', inscricaoEstadual: '' }));
              }
            }}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cpf" id={`${type}-doc-cpf`} />
              <FormLabel htmlFor={`${type}-doc-cpf`} className="cursor-pointer font-normal">
                CPF
              </FormLabel>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cnpj" id={`${type}-doc-cnpj`} />
              <FormLabel htmlFor={`${type}-doc-cnpj`} className="cursor-pointer font-normal">
                CNPJ
              </FormLabel>
            </div>
          </RadioGroup>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <FormLabel htmlFor={`${type}-name`}>Nome Completo *</FormLabel>
            <Input
              id={`${type}-name`}
              value={data.name}
              onChange={(e) => handleAddressChange(type, 'name', e.target.value)}
              placeholder="Nome completo"
              className="border-input-border focus:border-primary focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <FormLabel htmlFor={`${type}-document`}>
              {type === 'sender' 
                ? (senderDocType === 'cpf' ? 'CPF *' : 'CNPJ *') 
                : (recipientDocType === 'cpf' ? 'CPF *' : 'CNPJ *')
              }
            </FormLabel>
            <InputMask
              mask={
                type === 'sender' 
                  ? (senderDocType === 'cnpj' ? "99.999.999/9999-99" : "999.999.999-99")
                  : (recipientDocType === 'cnpj' ? "99.999.999/9999-99" : "999.999.999-99")
              }
              value={data.document}
              onChange={(e) => handleAddressChange(type, 'document', e.target.value)}
            >
              {(inputProps: any) => (
                <Input
                  {...inputProps}
                  id={`${type}-document`}
                  type="text"
                  placeholder={type === 'sender' 
                    ? (senderDocType === 'cpf' ? 'CPF' : 'CNPJ') 
                    : (recipientDocType === 'cpf' ? 'CPF' : 'CNPJ')
                  }
                  className="border-input-border focus:border-primary focus:ring-primary"
                />
              )}
            </InputMask>
          </div>
        </div>

        {/* IE Field - For CNPJ */}
        {((type === 'sender' && senderDocType === 'cnpj') || (type === 'recipient' && recipientDocType === 'cnpj')) && (
          <div className="space-y-2">
            <FormLabel htmlFor={`${type}-ie`}>Inscrição Estadual *</FormLabel>
            <Input
              id={`${type}-ie`}
              value={data.inscricaoEstadual || ''}
              onChange={(e) => handleAddressChange(type, 'inscricaoEstadual', e.target.value)}
              placeholder="Inscrição Estadual"
              className="border-input-border focus:border-primary focus:ring-primary"
            />
          </div>
        )}

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
                  className="border-input-border focus:border-primary focus:ring-primary"
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
              className="border-input-border focus:border-primary focus:ring-primary"
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
                  className="border-input-border focus:border-primary focus:ring-primary"
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
              className="border-input-border focus:border-primary focus:ring-primary"
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
              className="border-input-border focus:border-primary focus:ring-primary"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <FormLabel htmlFor={`${type}-complement`}>Complemento</FormLabel>
            <Input
              id={`${type}-complement`}
              value={data.complement}
              onChange={(e) => handleAddressChange(type, 'complement', e.target.value)}
              placeholder="Apto, Bloco, etc."
              className="border-input-border focus:border-primary focus:ring-primary"
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
              className="border-input-border focus:border-primary focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <FormLabel htmlFor={`${type}-city`}>Cidade *</FormLabel>
            <Input
              id={`${type}-city`}
              value={data.city}
              onChange={(e) => handleAddressChange(type, 'city', e.target.value)}
              placeholder="Nome da cidade"
              className="border-input-border focus:border-primary focus:ring-primary"
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
              className="border-input-border focus:border-primary focus:ring-primary"
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
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-light">
      <Header />
      
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Dados da <span className="bg-gradient-primary bg-clip-text text-transparent">Etiqueta</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Preencha os dados do remetente e destinatário
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Sender Form */}
            <AddressForm 
              title="Remetente" 
              type="sender" 
              data={senderData} 
              icon={User} 
            />

            {/* Recipient Form */}
            <AddressForm 
              title="Destinatário" 
              type="recipient" 
              data={recipientData} 
              icon={MapPin} 
            />

            {/* Quote Summary */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-primary" />
                  <span>Resumo do Envio</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
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

            {/* Submit Button */}
            <div className="text-center">
              <Button 
                type="submit"
                disabled={!isFormValid() || isLoading}
                className="w-full md:w-auto px-12 h-12 text-lg font-semibold bg-gradient-primary hover:shadow-primary transition-all duration-300"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                    <span>Processando...</span>
                  </div>
                ) : (
                  "Avançar"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Label;