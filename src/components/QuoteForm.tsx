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
import {
  Calculator,
  MapPin,
  Package,
  Truck,
  User,
  CheckCircle,
  Circle,
  DollarSign,
  Clock,
  FileText,
  Plus,
  Trash2,
  AlertTriangle,
  Zap,
} from "lucide-react";
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

// Função para determinar estado e tipo (capital/interior) baseado no CEP
const getCepInfo = (cep: string) => {
  const cleanCep = cep.replace(/\D/g, "");
  const cepPrefix = cleanCep.substring(0, 5);

  // Mapeamento de CEPs para estados
  const stateMapping: { [key: string]: string } = {
    "01": "SP",
    "02": "SP",
    "03": "SP",
    "04": "SP",
    "05": "SP",
    "06": "SP",
    "07": "SP",
    "08": "SP",
    "09": "SP",
    "10": "SP",
    "11": "SP",
    "12": "SP",
    "13": "SP",
    "14": "SP",
    "15": "SP",
    "16": "SP",
    "17": "SP",
    "18": "SP",
    "19": "SP",
    "20": "RJ",
    "21": "RJ",
    "22": "RJ",
    "23": "RJ",
    "24": "RJ",
    "25": "RJ",
    "26": "RJ",
    "27": "RJ",
    "28": "RJ",
    "29": "ES",
    "30": "MG",
    "31": "MG",
    "32": "MG",
    "33": "MG",
    "34": "MG",
    "35": "MG",
    "36": "MG",
    "37": "MG",
    "38": "MG",
    "39": "MG",
    "40": "BA",
    "41": "BA",
    "42": "BA",
    "43": "BA",
    "44": "BA",
    "45": "BA",
    "46": "BA",
    "47": "BA",
    "48": "BA",
    "49": "SE",
    "50": "PE",
    "51": "PE",
    "52": "PE",
    "53": "PE",
    "54": "PE",
    "55": "PE",
    "56": "AL",
    "57": "AL",
    "58": "PB",
    "59": "RN",
    "60": "CE",
    "61": "CE",
    "62": "CE",
    "63": "CE",
    "64": "PI",
    "65": "MA",
    "66": "PA",
    "67": "PA",
    "68": "AP",
    "69": "AC",
    "70": "DF",
    "71": "DF",
    "72": "GO",
    "73": "GO",
    "74": "GO",
    "75": "GO",
    "76": "TO",
    "77": "TO",
    "78": "MT",
    "79": "MS",
    "80": "PR",
    "81": "PR",
    "82": "PR",
    "83": "PR",
    "84": "PR",
    "85": "PR",
    "86": "PR",
    "87": "PR",
    "88": "SC",
    "89": "SC",
    "90": "RS",
    "91": "RS",
    "92": "RS",
    "93": "RS",
    "94": "RS",
    "95": "RS",
    "96": "RS",
    "97": "RS",
    "98": "RS",
    "99": "RS",
  };

  // Verificar região 69xxx (Acre, Amazonas, Roraima)
  let state = "AC";
  if (cepPrefix >= "69000" && cepPrefix <= "69099") state = "AM";
  else if (cepPrefix >= "69100" && cepPrefix <= "69299") state = "AM";
  else if (cepPrefix >= "69300" && cepPrefix <= "69389") state = "RR";
  else if (cepPrefix >= "69400" && cepPrefix <= "69899") state = "AM";
  else if (cepPrefix >= "69900" && cepPrefix <= "69999") state = "AC";
  else {
    const prefix2 = cleanCep.substring(0, 2);
    state = stateMapping[prefix2] || "BR";
  }

  // Determinar se é capital ou interior
  const isCapital = checkIfCapital(cleanCep, state);

  return {
    state,
    type: isCapital ? "Capital" : "Interior",
  };
};

const checkIfCapital = (cep: string, state: string): boolean => {
  const cepNum = parseInt(cep);

  const capitalRanges: { [key: string]: [number, number][] } = {
    AC: [[69900000, 69920999]],
    AL: [[57000000, 57099999]],
    AP: [[68900000, 68919999]],
    AM: [[69000000, 69099999]],
    BA: [[40000000, 42599999]],
    CE: [[60000000, 61599999]],
    DF: [[70000000, 72799999]],
    ES: [[29000000, 29099999]],
    GO: [[74000000, 74899999]],
    MA: [[65000000, 65099999]],
    MT: [[78000000, 78109999]],
    MS: [[79000000, 79124999]],
    MG: [[30100000, 31999999]],
    PA: [[66000000, 66999999]],
    PB: [[58000000, 58099999]],
    PR: [[80000000, 82599999]],
    PE: [[50000000, 52999999]],
    PI: [[64000000, 64099999]],
    RJ: [[20000000, 23799999]],
    RN: [[59000000, 59139999]],
    RS: [[90000000, 91999999]],
    RO: [[76800000, 76834999]],
    RR: [[69300000, 69329999]],
    SC: [[88000000, 88099999]],
    SP: [[1000000, 5999999]],
    SE: [[49000000, 49099999]],
    TO: [[77000000, 77270999]],
  };

  const ranges = capitalRanges[state];
  if (!ranges) return false;

  return ranges.some(([min, max]) => cepNum >= min && cepNum <= max);
};

interface Volume {
  id: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  merchandiseType: string;
}

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
  volumes: Volume[];
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
  inscricaoEstadual?: string;
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
    unitValue: "",
    volumes: [
      {
        id: "1",
        weight: "",
        length: "",
        width: "",
        height: "",
        merchandiseType: "",
      },
    ],
  });

  // Step 2: Resultados e opções
  const [quoteData, setQuoteData] = useState<any>(null);
  const [pickupOption, setPickupOption] = useState<string>("");
  const [shippingOption, setShippingOption] = useState<"economic" | "express">("economic");

  // Step 3: Dados da etiqueta
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
    inscricaoEstadual: "",
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
    inscricaoEstadual: "",
  });

  const [samePickupAddress, setSamePickupAddress] = useState<boolean>(true);
  const [alternativePickupAddress, setAlternativePickupAddress] = useState<string>("");
  const [senderDocType, setSenderDocType] = useState<'cpf' | 'cnpj'>('cpf');
  const [recipientDocType, setRecipientDocType] = useState<'cpf' | 'cnpj'>('cpf');

  // Restaurar dados do formulário quando o usuário faz login
  useEffect(() => {
    if (user) {
      // Clear anonymous session when user logs in
      SessionManager.clearOnLogin();

      const savedFormData = sessionStorage.getItem("quoteFormData");
      if (savedFormData) {
        try {
          const parsedData = JSON.parse(savedFormData);
          setFormData(parsedData);
          sessionStorage.removeItem("quoteFormData"); // Limpar após restaurar
        } catch (error) {
          console.error("Erro ao restaurar dados do formulário:", error);
        }
      }
    }
  }, [user]);

  // Monitor changes in quoteData
  useEffect(() => {
    if (quoteData) {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("👀 [QuoteForm] MUDANÇA NO QUOTEDATA DETECTADA");
      console.log("🔍 Dados completos:", JSON.stringify(quoteData, null, 2));
      console.log("💰 economicPrice:", quoteData?.shippingQuote?.economicPrice);
      console.log("🏢 tableName:", quoteData?.shippingQuote?.tableName);
      console.log("📅 economicDays:", quoteData?.shippingQuote?.economicDays);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }
  }, [quoteData]);

  const steps = [
    { number: 1, title: "Calcular Frete", icon: Calculator },
    { number: 2, title: "Opções de Coleta", icon: Truck },
    { number: 3, title: "Dados da Etiqueta", icon: User },
    { number: 4, title: "Documento Fiscal", icon: FileText },
    { number: 5, title: "Pagamento", icon: DollarSign },
  ];

  const getPickupCost = (option: string) => {
    if (option === "pickup") return 10.0;
    return 0;
  };

  const getTotalMerchandiseValue = () => {
    const quantity = parseInt(formData.quantity) || 0;
    const unitValue = parseFloat(formData.unitValue) || 0;
    return quantity * unitValue;
  };

  // Funções para gerenciar volumes
  const addVolume = () => {
    const newVolume: Volume = {
      id: Date.now().toString(),
      weight: "",
      length: "",
      width: "",
      height: "",
      merchandiseType: "",
    };
    setFormData((prev) => ({
      ...prev,
      volumes: [...prev.volumes, newVolume],
    }));
  };

  const removeVolume = (id: string) => {
    if (formData.volumes.length === 1) {
      toast({
        title: "Atenção",
        description: "Deve haver pelo menos um volume",
        variant: "destructive",
      });
      return;
    }
    setFormData((prev) => ({
      ...prev,
      volumes: prev.volumes.filter((v) => v.id !== id),
    }));
  };

  const updateVolume = (id: string, field: keyof Volume, value: string) => {
    setFormData((prev) => ({
      ...prev,
      volumes: prev.volumes.map((v) => (v.id === id ? { ...v, [field]: sanitizeTextInput(value) } : v)),
    }));
  };

  const applyMerchandiseTypeToAll = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      volumes: prev.volumes.map((v) => ({ ...v, merchandiseType: type })),
    }));
  };

  // Cálculos de peso
  const calculateTotalWeight = (): number => {
    return formData.volumes.reduce((total, volume) => {
      return total + (parseFloat(volume.weight) || 0);
    }, 0);
  };

  const calculateCubicWeight = (length: number, width: number, height: number): number => {
    return (length * width * height) / 5988;
  };

  // Arredonda para cima apenas se a primeira casa decimal for >= 0.1
  const roundWeightForDisplay = (value: number): number => {
    const fractional = value % 1;
    return fractional >= 0.1 ? Math.ceil(value) : Math.floor(value);
  };

  const calculateTotalCubicWeight = (): number => {
    return formData.volumes.reduce((total, volume) => {
      const length = parseFloat(volume.length) || 0;
      const width = parseFloat(volume.width) || 0;
      const height = parseFloat(volume.height) || 0;
      return total + calculateCubicWeight(length, width, height);
    }, 0);
  };

  const calculateTotalCubicMeters = (): number => {
    return formData.volumes.reduce((total, volume) => {
      const length = parseFloat(volume.length) || 0;
      const width = parseFloat(volume.width) || 0;
      const height = parseFloat(volume.height) || 0;
      // Convert cm³ to m³: (cm * cm * cm) / 1000000
      return total + (length * width * height) / 1000000;
    }, 0);
  };

  const getConsideredWeight = (): number => {
    const totalWeight = calculateTotalWeight();
    const totalCubicWeight = calculateTotalCubicWeight();
    return Math.max(totalWeight, totalCubicWeight);
  };

  const hasDangerousMerchandise = (): boolean => {
    return formData.volumes.some((v) => ["quimico", "inflamavel"].includes(v.merchandiseType));
  };

  const getInsuranceValue = (): number => {
    const merchandiseValue = getTotalMerchandiseValue();
    return merchandiseValue * 0.013;
  };

  const getTotalPrice = () => {
    if (!quoteData?.shippingQuote) return 0;
    const freightPrice =
      shippingOption === "economic" ? quoteData.shippingQuote.economicPrice : quoteData.shippingQuote.expressPrice;
    const pickupCost = getPickupCost(pickupOption);
    return freightPrice + pickupCost;
  };

  const handleInputChange = (field: keyof QuoteFormData, value: string) => {
    // Sanitize input and validate financial data
    const sanitizedValue = sanitizeTextInput(value);
    setFormData((prev) => ({ ...prev, [field]: sanitizedValue }));
  };

  const formatCurrency = (value: string): string => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, "");
    if (!numbers) return "";

    // Converte para número com centavos (números já representam centavos)
    const amount = parseFloat(numbers) / 100;

    // Formata como moeda brasileira
    return amount.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleCurrencyChange = (value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, "");

    if (!numbers) {
      setFormData((prev) => ({ ...prev, unitValue: "" }));
      return;
    }

    // Armazena o valor em reais (não em centavos)
    const amount = (parseFloat(numbers) / 100).toFixed(2);
    setFormData((prev) => ({ ...prev, unitValue: amount }));
  };

  const getCurrencyDisplayValue = (): string => {
    if (!formData.unitValue) return "";
    // Converte o valor em reais para centavos e formata
    const valueInCents = Math.round(parseFloat(formData.unitValue) * 100);
    return formatCurrency(valueInCents.toString());
  };

  const handleQuantityChange = (value: string) => {
    const sanitizedValue = sanitizeTextInput(value);

    setFormData((prev) => ({
      ...prev,
      quantity: sanitizedValue,
    }));
  };

  const handleAddressChange = (type: "sender" | "recipient", field: keyof AddressData, value: string) => {
    // Security: Enhanced input validation and sanitization
    const shouldPreserveSpaces = field === "name" || field === "street" || field === "neighborhood" || field === "city";

    // Check for suspicious patterns first
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /eval\(/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /vbscript:/i,
    ];

    if (suspiciousPatterns.some((pattern) => pattern.test(value))) {
      toast({
        title: "Entrada inválida",
        description: "Caracteres não permitidos detectados",
        variant: "destructive",
      });
      return;
    }

    // Enhanced sanitization based on field type
    let sanitizedValue: string;

    if (field === "document") {
      // Only allow numbers, dots, dashes, slashes for documents
      sanitizedValue = value.replace(/[^0-9.\-\/]/g, "").substring(0, 18);
    } else if (field === "phone") {
      // Only allow numbers, spaces, parentheses, dashes for phone
      sanitizedValue = value.replace(/[^0-9()\-\s]/g, "").substring(0, 20);
    } else if (field === "email") {
      // Basic email character allowlist
      sanitizedValue = value.replace(/[^a-zA-Z0-9@._\-]/g, "").substring(0, 100);
    } else if (field === "cep") {
      // Only numbers and dash for CEP
      sanitizedValue = value.replace(/[^0-9\-]/g, "").substring(0, 9);
    } else if (shouldPreserveSpaces) {
      // Remove dangerous chars but keep spaces for names/addresses
      sanitizedValue = value.replace(/[<>\"'&\x00-\x1f\x7f-\x9f]/g, "").substring(0, 100);
    } else {
      // Standard sanitization for other fields
      sanitizedValue = sanitizeTextInput(value);
    }

    if (type === "sender") {
      setSenderData((prev) => ({ ...prev, [field]: sanitizedValue }));
    } else {
      setRecipientData((prev) => ({ ...prev, [field]: sanitizedValue }));
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

    // Validate merchandise types
    for (const volume of formData.volumes) {
      if (volume.merchandiseType && suspiciousPatterns.some((pattern) => pattern.test(volume.merchandiseType))) {
        return "Dados inválidos detectados. Por favor, revise suas informações.";
      }
    }

    return null;
  };

  // Função para buscar endereço por CEP via ViaCEP
  const fetchEnderecoPorCep = async (cep: string) => {
    const apenasDigitos = cep.replace(/\D/g, "");
    console.log("CEP digitado:", cep, "Apenas dígitos:", apenasDigitos);
    if (apenasDigitos.length !== 8) return null;

    try {
      console.log("Buscando CEP na API ViaCEP...");
      const res = await fetch(`https://viacep.com.br/ws/${apenasDigitos}/json/`);
      const data = await res.json();
      console.log("Resposta ViaCEP:", data);
      if (data.erro) return null;

      return {
        logradouro: data.logradouro,
        bairro: data.bairro,
        cidade: data.localidade,
        estado: data.uf,
      };
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      return null;
    }
  };

  // Função especial para CEP com busca automática
  const handleCepChange = async (type: "sender" | "recipient", value: string) => {
    console.log("CEP mudou:", type, value);
    const sanitizedValue = sanitizeTextInput(value);

    if (type === "sender") {
      setSenderData((prev) => ({ ...prev, cep: sanitizedValue }));
    } else {
      setRecipientData((prev) => ({ ...prev, cep: sanitizedValue }));
    }

    // Buscar endereço quando CEP estiver completo
    if (value.replace(/\D/g, "").length === 8) {
      console.log("CEP completo, buscando endereço...");
      const endereco = await fetchEnderecoPorCep(value);
      if (endereco) {
        console.log("Endereço encontrado:", endereco);
        if (type === "sender") {
          setSenderData((prev) => ({
            ...prev,
            street: endereco.logradouro || prev.street,
            neighborhood: endereco.bairro || prev.neighborhood,
            city: endereco.cidade || prev.city,
            state: endereco.estado || prev.state,
          }));
        } else {
          setRecipientData((prev) => ({
            ...prev,
            street: endereco.logradouro || prev.street,
            neighborhood: endereco.bairro || prev.neighborhood,
            city: endereco.cidade || prev.city,
            state: endereco.estado || prev.state,
          }));
        }

        toast({
          title: "CEP encontrado!",
          description: "Endereço preenchido automaticamente.",
        });
      } else {
        console.log("CEP não encontrado");
        toast({
          title: "CEP não encontrado",
          description: "Verifique se o CEP está correto.",
          variant: "destructive",
        });
      }
    }
  };

  // Step 1: Calcular Cotação
  const handleStep1Submit = async () => {
    // Verificar se o usuário está logado
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para calcular o frete",
        variant: "destructive",
      });
      setShowAuthModal(true);
      return;
    }

    await processQuoteCalculation();
  };

  // Função para processar o cálculo da cotação
  const processQuoteCalculation = async () => {
    // Evitar múltiplas requisições simultâneas
    if (isLoading) {
      console.log("Cotação já sendo processada, ignorando nova requisição");
      return;
    }

    // Limpar dados antigos antes de calcular nova cotação
    setQuoteData(null);
    setShippingOption("economic");
    setPickupOption("");

    // Limpar cache do sessionStorage
    sessionStorage.removeItem("completeQuoteData");

    setIsLoading(true);

    try {
      if (!validateCep(formData.destinyCep)) {
        toast({
          title: "CEP inválido",
          description: "Digite um CEP válido com 8 dígitos",
          variant: "destructive",
        });
        return;
      }

      // Validate all inputs for security
      const validationError = validateQuoteInputs();
      if (validationError) {
        toast({
          title: "Dados inválidos",
          description: validationError,
          variant: "destructive",
        });
        return;
      }

      const consideredWeight = getConsideredWeight();
      if (consideredWeight <= 0) {
        toast({
          title: "Peso inválido",
          description: "Digite um peso válido maior que 0 para pelo menos um volume",
          variant: "destructive",
        });
        return;
      }

      const quantity = parseInt(formData.quantity) || 1;

      console.log("Iniciando cálculo de cotação...", {
        cep: formData.destinyCep,
        consideredWeight,
        totalWeight: calculateTotalWeight(),
        cubicWeight: calculateTotalCubicWeight(),
        quantity,
      });

      // Pegar dimensões do primeiro volume
      const firstVolume = formData.volumes[0];
      const length = parseFloat(firstVolume?.length) || 0;
      const width = parseFloat(firstVolume?.width) || 0;
      const height = parseFloat(firstVolume?.height) || 0;
      const merchandiseValue = getTotalMerchandiseValue();
      const tipo = firstVolume?.merchandiseType === "normal" ? "Normal" : "Normal";

      // Chamar API Confix diretamente
      const API_URL = "https://api-freteconfix.onrender.com/frete/confix";
      const BEARER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5ZTM2MDc2YS0yZWE2LTRiMDktOGY2Mi05ZGE5NTViYzBiNmYiLCJlbWFpbCI6Im1hcmNvc0Bjb25maXguY29tIiwianRpIjoiZWMxNDAzMTYtNWQzNy00N2MwLWIwODEtNTI3YzU5Yjc4MTU4IiwiaWF0IjoxNzYyODg0NjQ1LCJleHAiOjE3NjI5NzEwNDV9.aqPsac1PX_PCtDoJeR_c4qe_zLeqtCDGi2WwwXAnPJE";

      const requestData = {
        cep: formData.destinyCep.replace(/\D/g, ""),
        quantidade: quantity,
        valorDeclarado: merchandiseValue || 1,
        peso: consideredWeight,
        comprimento: length,
        largura: width,
        altura: height,
        tipo: tipo,
      };

      console.log("📤 Enviando POST para API Confix:", API_URL, requestData);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${BEARER_TOKEN}`,
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      const apiData = await response.json();
      console.log("📥 Resposta COMPLETA da API:", JSON.stringify(apiData, null, 2));

      // Verificar se temos dados das transportadoras
      if (!apiData.jadlog && !apiData.magalog) {
        throw new Error("Nenhuma cotação disponível para este CEP");
      }

      // Log detalhado dos dados recebidos
      console.log("📊 Magalog recebido:", apiData.magalog);
      console.log("   - preco_total:", apiData.magalog?.preco_total);
      console.log("   - peso_real:", apiData.magalog?.peso_real);
      console.log("   - peso_cubado:", apiData.magalog?.peso_cubado);
      console.log("📊 Jadlog recebido:", apiData.jadlog);
      console.log("   - preco_total:", apiData.jadlog?.preco_total);
      console.log("   - peso_real:", apiData.jadlog?.peso_real);
      console.log("   - peso_cubado:", apiData.jadlog?.peso_cubado);

      // Montar objeto de cotação no formato esperado
      // IMPORTANTE: Passar os objetos completos sem modificação para preservar todos os campos
      const shippingQuote = {
        jadlog: apiData.jadlog || null,
        magalog: apiData.magalog || null,
        economicPrice: apiData.magalog?.preco_total || apiData.jadlog?.preco_total || 0,
        economicDays: apiData.magalog?.prazo || apiData.jadlog?.prazo || 0,
        expressPrice: apiData.jadlog?.preco_total || apiData.magalog?.preco_total || 0,
        expressDays: apiData.jadlog?.prazo || apiData.magalog?.prazo || 0,
        cubicWeight: apiData.jadlog?.peso_cubado || apiData.magalog?.peso_cubado || calculateTotalCubicWeight(),
        zone: apiData.jadlog?.regiao || apiData.magalog?.regiao || "N/A",
        zoneName: apiData.jadlog?.regiao || apiData.magalog?.regiao || "N/A",
        tableId: "confix-api",
        tableName: "Confix API",
        cnpj: "",
      };

      console.log("📦 Objeto shippingQuote montado:", JSON.stringify(shippingQuote, null, 2));

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📋 [QuoteForm] COTAÇÃO PROCESSADA");
      console.log("🔍 Objeto Completo:", JSON.stringify(shippingQuote, null, 2));
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      // Salvar todos os dados da cotação completa
      const completeQuoteData = {
        // Dados da cotação original
        originCep: formData.originCep,
        destinyCep: formData.destinyCep,
        weight: consideredWeight.toString(),
        totalWeight: calculateTotalWeight(),
        cubicWeight: calculateTotalCubicWeight(),
        consideredWeight: consideredWeight,
        volumes: formData.volumes,
        quantity: formData.quantity,
        unitValue: formData.unitValue,
        totalMerchandiseValue: getTotalMerchandiseValue(),

        // Resultado da cotação
        shippingQuote,

        // Metadados
        calculatedAt: new Date().toISOString(),
      };

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("💾 [QuoteForm] DADOS QUE SERÃO SALVOS NO STATE");
      console.log("🔍 completeQuoteData.shippingQuote:", JSON.stringify(completeQuoteData.shippingQuote, null, 2));
      console.log("✅ economicPrice:", completeQuoteData.shippingQuote.economicPrice);
      console.log("✅ tableName:", completeQuoteData.shippingQuote.tableName);
      console.log("✅ economicDays:", completeQuoteData.shippingQuote.economicDays);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      setQuoteData(completeQuoteData);

      // Salvar no sessionStorage para uso posterior
      sessionStorage.setItem("completeQuoteData", JSON.stringify(completeQuoteData));

      setCurrentStep(2);
    } catch (error) {
      console.error("Erro ao calcular frete:", error);

      // Mensagens de erro mais específicas
      let errorMessage = "Erro inesperado ao calcular o frete";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: "Erro no cálculo",
        description: errorMessage,
        variant: "destructive",
      });

      // Limpar cache se erro persistir
      if (errorMessage.includes("timeout") || errorMessage.includes("Timeout")) {
        const { clearQuoteCache } = await import("@/services/shippingService");
        clearQuoteCache();
      }
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
        variant: "destructive",
      });
      return;
    }

    if (!shippingOption) {
      toast({
        title: "Seleção obrigatória",
        description: "Selecione uma opção de frete para continuar",
        variant: "destructive",
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
    console.log("QuoteForm - Step 3 submit iniciado - apenas coletando dados");

    const requiredFields: (keyof AddressData)[] = [
      "name",
      "document",
      "phone",
      "email",
      "cep",
      "street",
      "number",
      "complement",
      "neighborhood",
      "city",
      "state",
    ];

    const senderValid = requiredFields.every((field) => senderData[field].trim() !== "");
    const recipientValid = requiredFields.every((field) => recipientData[field].trim() !== "");
    
    // Validate IE for CNPJ
    if (senderDocType === 'cnpj' && !senderData.inscricaoEstadual?.trim()) {
      toast({
        title: "Inscrição Estadual obrigatória",
        description: "Para CNPJ, a Inscrição Estadual é obrigatória",
        variant: "destructive",
      });
      return;
    }
    
    if (recipientDocType === 'cnpj' && !recipientData.inscricaoEstadual?.trim()) {
      toast({
        title: "Inscrição Estadual obrigatória",
        description: "Para CNPJ do destinatário, a Inscrição Estadual é obrigatória",
        variant: "destructive",
      });
      return;
    }

    // Validate alternative pickup address if needed
    const pickupValid = pickupOption !== "pickup" || samePickupAddress || alternativePickupAddress.trim() !== "";

    if (!senderValid || !recipientValid || !pickupValid) {
      toast({
        title: "Dados obrigatórios",
        description: "Preencha todos os campos obrigatórios antes de continuar",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Get or create session ID for anonymous users (security fix)
      let sessionId = null;
      if (!user) {
        console.log("QuoteForm - Getting session ID for anonymous user");
        sessionId = await SessionManager.getSessionId();
        console.log("QuoteForm - Anonymous session ID:", sessionId);
      }

      // Calcular pesos
      const totalWeight = calculateTotalWeight();
      const cubicWeight = calculateTotalCubicWeight();
      const consideredWeight = getConsideredWeight();

      // Preparar dados COMPLETOS para as próximas etapas (sem salvar no banco ainda)
      const completeShipmentData = {
        // === DADOS DA COTAÇÃO ORIGINAL ===
        quoteData: quoteData,
        originalFormData: {
          originCep: formData.originCep,
          destinyCep: formData.destinyCep,
          weight: consideredWeight.toString(),
          totalWeight: totalWeight,
          cubicWeight: cubicWeight,
          consideredWeight: consideredWeight,
          volumes: formData.volumes,
          quantity: formData.quantity,
          unitValue: formData.unitValue,
          totalMerchandiseValue: getTotalMerchandiseValue(),
        },

        // === DETALHES DA MERCADORIA ===
        merchandiseDetails: {
          quantity: parseInt(formData.quantity),
          unitValue: parseFloat(formData.unitValue),
          totalValue: getTotalMerchandiseValue(),
          description: `Mercadoria - ${formData.volumes.length} volume(s)`,
          weight: consideredWeight,
          totalWeight: totalWeight,
          cubicWeight: cubicWeight,
          volumes: formData.volumes.map((v) => ({
            weight: parseFloat(v.weight),
            length: parseFloat(v.length),
            width: parseFloat(v.width),
            height: parseFloat(v.height),
            merchandiseType: v.merchandiseType,
            cubicWeight: calculateCubicWeight(
              parseFloat(v.length) || 0,
              parseFloat(v.width) || 0,
              parseFloat(v.height) || 0,
            ),
          })),
        },

        // === DADOS DE ENTREGA E COLETA ===
        deliveryDetails: {
          selectedOption: shippingOption,
          shippingPrice: shippingOption === "economic" 
            ? (quoteData?.shippingQuote?.economicPrice || 0)
            : (quoteData?.shippingQuote?.expressPrice || 0),
          pickupOption: pickupOption,
          pickupCost: getPickupCost(pickupOption),
          totalPrice: getTotalPrice(),
          deliveryDays: shippingOption === "economic" 
            ? (quoteData?.shippingQuote?.economicDays || 0)
            : (quoteData?.shippingQuote?.expressDays || 0),
          pickupDetails: {
            option: pickupOption,
            sameAsOrigin: samePickupAddress,
            alternativeAddress: alternativePickupAddress,
          },
        },

        // === DADOS COMPLETOS DOS ENDEREÇOS ===
        addressData: {
          sender: {
            ...senderData,
            addressType: "sender",
          },
          recipient: {
            ...recipientData,
            addressType: "recipient",
          },
        },

        // === DADOS TÉCNICOS ===
        technicalData: {
          weight: consideredWeight,
          totalWeight: totalWeight,
          cubicWeight: cubicWeight,
          volumes: formData.volumes,
        },

        // === METADADOS E CONTROLE ===
        metadata: {
          user_id: user?.id || null,
          session_id: sessionId,
          status: "PENDING_DOCUMENT",
          createdAt: new Date().toISOString(),
          step: "label_data_completed",
          calculatedAt: quoteData?.calculatedAt || new Date().toISOString(),
        },
      };

      console.log("QuoteForm - Salvando dados COMPLETOS no sessionStorage:", completeShipmentData);
      console.log("QuoteForm - deliveryDays sendo salvo:", completeShipmentData.deliveryDetails?.deliveryDays);
      console.log("QuoteForm - shippingOption selecionado:", shippingOption);

      // Salvar dados pessoais para uso no webhook
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

      // Salvar TODOS os dados coletados no sessionStorage para as próximas etapas
      sessionStorage.setItem("completeShipmentData", JSON.stringify(completeShipmentData));
      sessionStorage.setItem("currentShipment", JSON.stringify(completeShipmentData));
      localStorage.setItem("completeShipmentData_backup", JSON.stringify(completeShipmentData));

      console.log("QuoteForm - Dados completos salvos no sessionStorage com todos os detalhes do formulário");

      toast({
        title: "Dados coletados!",
        description: "Avançando para documento fiscal...",
      });

      // Navegar diretamente para documento fiscal
      navigate("/documento");
    } catch (error: any) {
      console.error("Error preparing shipment data:", error);
      toast({
        title: "Erro ao processar dados",
        description: "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isStep1Valid = (): boolean => {
    // Validar campos básicos
    if (!formData.destinyCep || !formData.quantity) {
      return false;
    }

    // Validar que todos os volumes estão preenchidos
    return formData.volumes.every(
      (volume) => volume.weight && volume.length && volume.width && volume.height && volume.merchandiseType,
    );
  };

  // Traduz códigos de erro para mensagens amigáveis
  const translateErrorReason = (reason: string | null): string => {
    if (!reason) return "Não disponível para este envio";

    const translations: Record<string, string> = {
      region_not_found: "Região não disponível",
      peso_excede_30kg: "Peso excede o limite",
      dimensao_max_excedida_80cm: "Dimensão excede o limite",
      soma_dimensoes_excede_200cm: "Soma das dimensões excede o limite",
    };

    return translations[reason] || reason;
  };

  const renderStepIndicator = () => (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-6">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div
                className={`flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 px-2 sm:px-3 py-2 sm:py-3 rounded-lg transition-all duration-300 ${
                  currentStep === step.number
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : currentStep > step.number
                      ? "bg-success text-success-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {currentStep > step.number ? (
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <step.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
                <span className="font-medium text-xs sm:text-sm text-center">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`hidden sm:block w-6 lg:w-12 h-0.5 mx-2 transition-all duration-300 ${
                    currentStep > step.number ? "bg-success" : "bg-muted"
                  }`}
                />
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
          <CardTitle className="text-center text-2xl sm:text-3xl font-bold">Cotação Rápida</CardTitle>
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
                    <p className="text-sm text-muted-foreground">Goiânia e Região / Origem fixa</p>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="quantity" className="text-base font-medium">
                        Quantidade
                      </Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        placeholder="1"
                        value={formData.quantity}
                        onChange={(e) => handleQuantityChange(e.target.value)}
                        className="border-input-border focus:border-primary focus:ring-primary h-14 text-lg"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="totalValue" className="text-base font-medium">
                        Valor Total Declarado (R$)
                      </Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">
                          R$
                        </span>
                        <Input
                          id="totalValue"
                          type="text"
                          placeholder="0,00"
                          value={getCurrencyDisplayValue()}
                          onChange={(e) => handleCurrencyChange(e.target.value)}
                          className="border-input-border focus:border-primary focus:ring-primary h-14 text-lg pl-12"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Volumes Dinâmicos */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center space-x-2 text-lg font-semibold">
                      <Package className="h-5 w-5 text-primary" />
                      <span>Volumes</span>
                    </Label>
                    <Button
                      type="button"
                      onClick={addVolume}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Adicionar Volume</span>
                    </Button>
                  </div>

                  {/* Tipo de mercadoria geral */}
                  <Card className="bg-accent/10 border-border/50">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <Label className="text-sm font-medium whitespace-nowrap">
                          Aplicar tipo de mercadoria para todos:
                        </Label>
                        <Select onValueChange={applyMerchandiseTypeToAll}>
                          <SelectTrigger className="w-full sm:w-64 h-10">
                            <SelectValue placeholder="Selecione um tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="liquido">Líquido</SelectItem>
                            <SelectItem value="quimico">Químico</SelectItem>
                            <SelectItem value="inflamavel">Inflamável</SelectItem>
                            <SelectItem value="vidro">Vidro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lista de volumes */}
                  <div className="space-y-4">
                    {formData.volumes.map((volume, index) => (
                      <Card key={volume.id} className="border-border/50">
                        <CardHeader className="pb-3 pt-4 px-4">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-semibold">Volume {index + 1}</CardTitle>
                            {formData.volumes.length > 1 && (
                              <Button
                                type="button"
                                onClick={() => removeVolume(volume.id)}
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Peso (kg)</Label>
                              <Input
                                type="number"
                                step="0.1"
                                placeholder="0.5"
                                value={volume.weight}
                                onChange={(e) => updateVolume(volume.id, "weight", e.target.value)}
                                className="h-12"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Comp. (cm)</Label>
                              <Input
                                type="number"
                                placeholder="20"
                                value={volume.length}
                                onChange={(e) => updateVolume(volume.id, "length", e.target.value)}
                                className="h-12"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Larg. (cm)</Label>
                              <Input
                                type="number"
                                placeholder="15"
                                value={volume.width}
                                onChange={(e) => updateVolume(volume.id, "width", e.target.value)}
                                className="h-12"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Alt. (cm)</Label>
                              <Input
                                type="number"
                                placeholder="10"
                                value={volume.height}
                                onChange={(e) => updateVolume(volume.id, "height", e.target.value)}
                                className="h-12"
                              />
                            </div>

                            <div className="space-y-2 col-span-2 lg:col-span-1">
                              <Label className="text-sm font-medium">Tipo de Mercadoria *</Label>
                              <Select
                                value={volume.merchandiseType}
                                onValueChange={(value) => updateVolume(volume.id, "merchandiseType", value)}
                              >
                                <SelectTrigger className="h-12">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="normal">Normal</SelectItem>
                                  <SelectItem value="liquido">Líquido</SelectItem>
                                  <SelectItem value="quimico">Químico</SelectItem>
                                  <SelectItem value="inflamavel">Inflamável</SelectItem>
                                  <SelectItem value="vidro">Vidro</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Mostrar peso cúbico individual */}
                          <div className="mt-3 text-sm text-muted-foreground">
                            Peso cúbico deste volume:{" "}
                            <span className="font-medium text-foreground">
                              {roundWeightForDisplay(
                                calculateCubicWeight(
                                  parseFloat(volume.length) || 0,
                                  parseFloat(volume.width) || 0,
                                  parseFloat(volume.height) || 0,
                                ),
                              )}{" "}
                              kg
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Alerta para mercadorias perigosas */}
                  {hasDangerousMerchandise() && (
                    <Card className="border-warning bg-warning/10">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start space-x-3">
                          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-warning">Atenção especial necessária</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Você selecionou um tipo de mercadoria que requer cuidados especiais no transporte.
                              Certifique-se de embalar adequadamente.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Resumo dos volumes */}
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold">Resumo dos Volumes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Quantidade de Volumes</p>
                          <p className="text-2xl font-bold text-primary">{formData.volumes.length}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Peso Total Declarado</p>
                          <p className="text-2xl font-bold">{calculateTotalWeight().toFixed(2)} kg</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Peso Total Cubado</p>
                          <p className="text-2xl font-bold">{roundWeightForDisplay(calculateTotalCubicWeight())} kg</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Volume Total</p>
                          <p className="text-2xl font-bold">{calculateTotalCubicMeters().toFixed(4)} m³</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Button
                  onClick={handleStep1Submit}
                  disabled={!isStep1Valid() || isLoading}
                  className="w-full h-16 text-lg font-semibold bg-gradient-primary hover:shadow-primary transition-all duration-300 mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                      <span>Calculando frete...</span>
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
                {(() => {
                  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                  console.log("🖼️ [Step 2] RENDERIZANDO TELA");
                  console.log("📦 Magalog:");
                  if (quoteData.shippingQuote.magalog) {
                    console.log("   - preco_total:", quoteData.shippingQuote.magalog.preco_total);
                    console.log("   - peso_real:", quoteData.shippingQuote.magalog.peso_real);
                    console.log("   - peso_cubado:", quoteData.shippingQuote.magalog.peso_cubado);
                    console.log("   - prazo:", quoteData.shippingQuote.magalog.prazo);
                  } else {
                    console.log("   - Não disponível");
                  }
                  console.log("📦 Jadlog:");
                  if (quoteData.shippingQuote.jadlog) {
                    console.log("   - preco_total:", quoteData.shippingQuote.jadlog.preco_total);
                    console.log("   - peso_real:", quoteData.shippingQuote.jadlog.peso_real);
                    console.log("   - peso_cubado:", quoteData.shippingQuote.jadlog.peso_cubado);
                    console.log("   - prazo:", quoteData.shippingQuote.jadlog.prazo);
                  } else {
                    console.log("   - Não disponível");
                  }
                  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                  return null;
                })()}

                {/* Freight Options - Magalog e Jadlog */}
                <div className="mb-6">
                  {/* Verificar se ambas transportadoras falharam */}
                  {quoteData.shippingQuote.magalog &&
                  !quoteData.shippingQuote.magalog.permitido &&
                  quoteData.shippingQuote.jadlog &&
                  !quoteData.shippingQuote.jadlog.permitido ? (
                    <div className="p-6 bg-destructive/10 border-2 border-destructive/20 rounded-lg">
                      <div className="flex flex-col items-center space-y-3 text-center">
                        <AlertTriangle className="h-12 w-12 text-destructive" />
                        <div>
                          <h3 className="text-lg font-semibold text-destructive mb-2">
                            Nenhuma transportadora disponível
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Não há transportadoras disponíveis para as especificações informadas.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(() => {
                          const magalog = quoteData.shippingQuote.magalog;
                          const jadlog = quoteData.shippingQuote.jadlog;

                          // Verificar quais estão disponíveis
                          const magalogDisponivel = magalog && magalog.permitido && magalog.preco_total !== null;
                          const jadlogDisponivel = jadlog && jadlog.permitido && jadlog.preco_total !== null;

                          if (!magalogDisponivel && !jadlogDisponivel) return null;

                          // Se só uma está disponível, mostrar apenas ela
                          if (magalogDisponivel && !jadlogDisponivel) {
                            return (
                              <Card
                                className="shadow-card cursor-pointer transition-all duration-200 border-primary ring-2 ring-primary"
                                onClick={() => setShippingOption("economic")}
                              >
                                <CardHeader>
                                  <CardTitle className="flex items-center space-x-2 text-base">
                                    <DollarSign className="h-4 w-4 text-success" />
                                    <Zap className="h-4 w-4 text-primary" />
                                    <span>Mais barato e mais rápido</span>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xl font-bold text-primary">
                                        R$ {magalog.preco_total.toFixed(2)}
                                      </span>
                                      <div className="text-right">
                                        <div className="text-lg font-semibold">{magalog.prazo} dias</div>
                                        <div className="text-xs text-muted-foreground">úteis</div>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          }

                          if (jadlogDisponivel && !magalogDisponivel) {
                            return (
                              <Card
                                className="shadow-card cursor-pointer transition-all duration-200 border-primary ring-2 ring-primary"
                                onClick={() => setShippingOption("express")}
                              >
                                <CardHeader>
                                  <CardTitle className="flex items-center space-x-2 text-base">
                                    <DollarSign className="h-4 w-4 text-success" />
                                    <Zap className="h-4 w-4 text-primary" />
                                    <span>Mais barato e mais rápido</span>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xl font-bold text-primary">
                                        R$ {jadlog.preco_total.toFixed(2)}
                                      </span>
                                      <div className="text-right">
                                        <div className="text-lg font-semibold">{jadlog.prazo} dias</div>
                                        <div className="text-xs text-muted-foreground">úteis</div>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          }

                          // Ambas disponíveis - determinar qual é mais barata e qual é mais rápida
                          const magalogMaisBarata = magalog.preco_total <= jadlog.preco_total;
                          const magalogMaisRapida = magalog.prazo <= jadlog.prazo;

                          // Se as duas opções são da mesma transportadora, mostrar apenas uma
                          const mesmaTransportadora = magalogMaisBarata === magalogMaisRapida;

                          const opcaoEsquerda = magalogMaisBarata ? magalog : jadlog;
                          const opcaoEsquerdaTipo = magalogMaisBarata ? "economic" : "express";
                          const opcaoEsquerdaNome = "Mais barato";

                          const opcaoDireita = magalogMaisRapida ? magalog : jadlog;
                          const opcaoDireitaTipo = magalogMaisRapida ? "economic" : "express";
                          const opcaoDireitaNome = "Mais rápido";

                          // Se for a mesma transportadora, mostrar apenas um cartão
                          if (mesmaTransportadora) {
                            return (
                              <Card
                                className="shadow-card cursor-pointer transition-all duration-200 border-primary ring-2 ring-primary md:col-span-2"
                                onClick={() => setShippingOption(opcaoEsquerdaTipo)}
                              >
                                <CardHeader>
                                  <CardTitle className="flex items-center space-x-2 text-base">
                                    <DollarSign className="h-4 w-4 text-success" />
                                    <Zap className="h-4 w-4 text-primary" />
                                    <span>Mais barato e mais rápido</span>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xl font-bold text-primary">
                                        R$ {opcaoEsquerda.preco_total.toFixed(2)}
                                      </span>
                                      <div className="text-right">
                                        <div className="text-lg font-semibold">{opcaoEsquerda.prazo} dias</div>
                                        <div className="text-xs text-muted-foreground">úteis</div>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          }

                          return (
                            <>
                              {/* Opção Esquerda - Mais Barato */}
                              <Card
                                className={`shadow-card cursor-pointer transition-all duration-200 ${
                                  shippingOption === opcaoEsquerdaTipo
                                    ? "border-primary ring-2 ring-primary"
                                    : "border-border hover:border-primary/50"
                                }`}
                                onClick={() => setShippingOption(opcaoEsquerdaTipo)}
                              >
                                <CardHeader>
                                  <CardTitle className="flex items-center space-x-2 text-base">
                                    <DollarSign className="h-4 w-4 text-success" />
                                    <span>{opcaoEsquerdaNome}</span>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xl font-bold text-primary">
                                        R$ {opcaoEsquerda.preco_total.toFixed(2)}
                                      </span>
                                      <div className="text-right">
                                        <div className="text-lg font-semibold">{opcaoEsquerda.prazo} dias</div>
                                        <div className="text-xs text-muted-foreground">úteis</div>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Opção Direita - Mais Rápido */}
                              <Card
                                className={`shadow-card cursor-pointer transition-all duration-200 ${
                                  shippingOption === opcaoDireitaTipo
                                    ? "border-primary ring-2 ring-primary"
                                    : "border-border hover:border-primary/50"
                                }`}
                                onClick={() => setShippingOption(opcaoDireitaTipo)}
                              >
                                <CardHeader>
                                  <CardTitle className="flex items-center space-x-2 text-base">
                                    <Zap className="h-4 w-4 text-primary" />
                                    <span>{opcaoDireitaNome}</span>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xl font-bold text-primary">
                                        R$ {opcaoDireita.preco_total.toFixed(2)}
                                      </span>
                                      <div className="text-right">
                                        <div className="text-lg font-semibold">{opcaoDireita.prazo} dias</div>
                                        <div className="text-xs text-muted-foreground">úteis</div>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </>
                          );
                        })()}
                      </div>
                    </>
                  )}
                </div>

                {/* Quote Summary with Selected Option */}
                <Card className="bg-accent/20 border-primary/20 mb-6">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-center space-x-2 text-sm">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">Destino:</span>
                      <span className="font-medium">
                        {formatCep(quoteData.destinyCep)} - {getCepInfo(quoteData.destinyCep).state}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Pickup Options */}
                <div className="space-y-4">
                  <div
                    className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover-scale ${
                      pickupOption === "dropoff"
                        ? "border-primary bg-accent/20 ring-2 ring-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setPickupOption("dropoff")}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Circle
                          className={`h-4 w-4 ${pickupOption === "dropoff" ? "text-primary" : "text-muted-foreground"}`}
                        />
                        <div>
                          <h4 className="font-medium">Postar no ponto de coleta</h4>
                          <p className="text-sm text-muted-foreground">Leve até uma agência parceira (imediato)</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Gratuito</Badge>
                    </div>
                  </div>

                  <div
                    className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover-scale ${
                      pickupOption === "pickup"
                        ? "border-primary bg-accent/20 ring-2 ring-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setPickupOption("pickup")}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Circle
                          className={`h-4 w-4 ${pickupOption === "pickup" ? "text-primary" : "text-muted-foreground"}`}
                        />
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
                          {pickupOption === "pickup" && "Inclui coleta no endereço"}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex space-x-4">
                  <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1 h-12">
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
                  <p className="text-muted-foreground mt-2">Preencha os dados do remetente e destinatário</p>
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
                        {/* Document Type Selection */}
                        <div className="space-y-2">
                          <Label>Tipo de Documento *</Label>
                          <RadioGroup
                            value={senderDocType}
                            onValueChange={(value: 'cpf' | 'cnpj') => {
                              setSenderDocType(value);
                              setSenderData(prev => ({ ...prev, document: '', inscricaoEstadual: '' }));
                            }}
                            className="flex space-x-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="cpf" id="sender-doc-cpf" />
                              <Label htmlFor="sender-doc-cpf" className="cursor-pointer font-normal">
                                CPF
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="cnpj" id="sender-doc-cnpj" />
                              <Label htmlFor="sender-doc-cnpj" className="cursor-pointer font-normal">
                                CNPJ
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Nome completo *</Label>
                          <Input
                            value={senderData.name}
                            onChange={(e) => handleAddressChange("sender", "name", e.target.value)}
                            placeholder="Nome completo"
                            className="h-12"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>{senderDocType === 'cpf' ? 'CPF *' : 'CNPJ *'}</Label>
                            <InputMask
                              mask={senderDocType === 'cnpj' ? "99.999.999/9999-99" : "999.999.999-99"}
                              value={senderData.document}
                              onChange={(e) => handleAddressChange("sender", "document", e.target.value)}
                            >
                              {(inputProps: any) => (
                                <Input 
                                  {...inputProps} 
                                  type="text" 
                                  placeholder={senderDocType === 'cpf' ? 'CPF' : 'CNPJ'} 
                                  className="h-12" 
                                />
                              )}
                            </InputMask>
                          </div>
                          <div className="space-y-2">
                            <Label>Telefone *</Label>
                            <InputMask
                              mask="(99) 99999-9999"
                              value={senderData.phone}
                              onChange={(e) => handleAddressChange("sender", "phone", e.target.value)}
                            >
                              {(inputProps: any) => (
                                <Input {...inputProps} type="tel" placeholder="(00) 00000-0000" className="h-12" />
                              )}
                            </InputMask>
                          </div>
                        </div>

                        {/* IE Field - Only for CNPJ */}
                        {senderDocType === 'cnpj' && (
                          <div className="space-y-2">
                            <Label>Inscrição Estadual *</Label>
                            <Input
                              value={senderData.inscricaoEstadual || ''}
                              onChange={(e) => handleAddressChange("sender", "inscricaoEstadual", e.target.value)}
                              placeholder="Inscrição Estadual"
                              className="h-12"
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>E-mail *</Label>
                          <Input
                            type="email"
                            value={senderData.email}
                            onChange={(e) => handleAddressChange("sender", "email", e.target.value)}
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
                              onChange={(e) => handleCepChange("sender", e.target.value)}
                            >
                              {(inputProps: any) => (
                                <Input {...inputProps} type="text" placeholder="00000-000" className="h-12" />
                              )}
                            </InputMask>
                          </div>
                          <div className="space-y-2">
                            <Label>Número *</Label>
                            <Input
                              value={senderData.number}
                              onChange={(e) => handleAddressChange("sender", "number", e.target.value)}
                              placeholder="123"
                              className="h-12"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Endereço *</Label>
                          <Input
                            value={senderData.street}
                            onChange={(e) => handleAddressChange("sender", "street", e.target.value)}
                            placeholder="Rua, Avenida..."
                            className="h-12"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Bairro *</Label>
                            <Input
                              value={senderData.neighborhood}
                              onChange={(e) => handleAddressChange("sender", "neighborhood", e.target.value)}
                              placeholder="Bairro"
                              className="h-12"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Complemento *</Label>
                            <Input
                              value={senderData.complement}
                              onChange={(e) => handleAddressChange("sender", "complement", e.target.value)}
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
                              onChange={(e) => handleAddressChange("sender", "city", e.target.value)}
                              placeholder="Cidade"
                              className="h-12"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Estado *</Label>
                            <Input
                              value={senderData.state}
                              onChange={(e) => handleAddressChange("sender", "state", e.target.value)}
                              placeholder="GO"
                              maxLength={2}
                              className="h-12"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Pickup address section - only show when pickup option is selected */}
                      {pickupOption === "pickup" && (
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
                        {/* Document Type Selection */}
                        <div className="space-y-2">
                          <Label>Tipo de Documento *</Label>
                          <RadioGroup
                            value={recipientDocType}
                            onValueChange={(value: 'cpf' | 'cnpj') => {
                              setRecipientDocType(value);
                              setRecipientData(prev => ({ ...prev, document: '', inscricaoEstadual: '' }));
                            }}
                            className="flex space-x-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="cpf" id="recipient-doc-cpf" />
                              <Label htmlFor="recipient-doc-cpf" className="cursor-pointer font-normal">
                                CPF
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="cnpj" id="recipient-doc-cnpj" />
                              <Label htmlFor="recipient-doc-cnpj" className="cursor-pointer font-normal">
                                CNPJ
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Nome completo *</Label>
                          <Input
                            value={recipientData.name}
                            onChange={(e) => handleAddressChange("recipient", "name", e.target.value)}
                            placeholder="Nome completo"
                            className="h-12"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>{recipientDocType === 'cpf' ? 'CPF *' : 'CNPJ *'}</Label>
                            <InputMask
                              mask={recipientDocType === 'cnpj' ? "99.999.999/9999-99" : "999.999.999-99"}
                              value={recipientData.document}
                              onChange={(e) => handleAddressChange("recipient", "document", e.target.value)}
                            >
                              {(inputProps: any) => (
                                <Input 
                                  {...inputProps} 
                                  type="text" 
                                  placeholder={recipientDocType === 'cpf' ? 'CPF' : 'CNPJ'} 
                                  className="h-12" 
                                />
                              )}
                            </InputMask>
                          </div>
                          <div className="space-y-2">
                            <Label>Telefone *</Label>
                            <InputMask
                              mask="(99) 99999-9999"
                              value={recipientData.phone}
                              onChange={(e) => handleAddressChange("recipient", "phone", e.target.value)}
                            >
                              {(inputProps: any) => (
                                <Input {...inputProps} type="tel" placeholder="(00) 00000-0000" className="h-12" />
                              )}
                            </InputMask>
                          </div>
                        </div>

                        {/* IE Field - Only for CNPJ */}
                        {recipientDocType === 'cnpj' && (
                          <div className="space-y-2">
                            <Label>Inscrição Estadual *</Label>
                            <Input
                              value={recipientData.inscricaoEstadual || ''}
                              onChange={(e) => handleAddressChange("recipient", "inscricaoEstadual", e.target.value)}
                              placeholder="Inscrição Estadual"
                              className="h-12"
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>E-mail *</Label>
                          <Input
                            type="email"
                            value={recipientData.email}
                            onChange={(e) => handleAddressChange("recipient", "email", e.target.value)}
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
                              onChange={(e) => handleCepChange("recipient", e.target.value)}
                            >
                              {(inputProps: any) => (
                                <Input {...inputProps} type="text" placeholder="00000-000" className="h-12" />
                              )}
                            </InputMask>
                          </div>
                          <div className="space-y-2">
                            <Label>Número *</Label>
                            <Input
                              value={recipientData.number}
                              onChange={(e) => handleAddressChange("recipient", "number", e.target.value)}
                              placeholder="123"
                              className="h-12"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Endereço *</Label>
                          <Input
                            value={recipientData.street}
                            onChange={(e) => handleAddressChange("recipient", "street", e.target.value)}
                            placeholder="Rua, Avenida..."
                            className="h-12"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Bairro *</Label>
                            <Input
                              value={recipientData.neighborhood}
                              onChange={(e) => handleAddressChange("recipient", "neighborhood", e.target.value)}
                              placeholder="Bairro"
                              className="h-12"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Complemento *</Label>
                            <Input
                              value={recipientData.complement}
                              onChange={(e) => handleAddressChange("recipient", "complement", e.target.value)}
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
                              onChange={(e) => handleAddressChange("recipient", "city", e.target.value)}
                              placeholder="Cidade"
                              className="h-12"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Estado *</Label>
                            <Input
                              value={recipientData.state}
                              onChange={(e) => handleAddressChange("recipient", "state", e.target.value)}
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
                    <h3 className="text-lg font-semibold text-muted-foreground">Gerenciar Endereços Salvos</h3>
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
                          description: "Dados salvos para futuras cotações",
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
                          description: "Dados salvos para futuras cotações",
                        });
                      }}
                    />
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Button variant="outline" onClick={() => setCurrentStep(2)} className="flex-1 h-12">
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
