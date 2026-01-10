import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import {
  Calculator,
  MapPin,
  Package,
  Truck,
  Clock,
  DollarSign,
  Plus,
  Trash2,
  Zap,
  ArrowRight,
  LogIn,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Check,
  Calendar,
  Scale,
  Bike,
  Car,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { validateCep } from "@/services/shippingService";
import InputMask from "react-input-mask";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/hooks/useAuth";

interface Volume {
  id: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  merchandiseType: string;
}

// Faixas de CEP permitidas APENAS para Envio Local (bloqueadas no Nacional)
const LOCAL_ONLY_CEP_RANGES: [number, number][] = [
  [74000000, 74899999],
  [74900000, 74999999],
  [75000000, 75159999],
  [75170000, 75174999],
  [75250000, 75264999],
  [75340000, 75344999],
];

// Verifica se o CEP é da área Local (bloqueado para Nacional)
const isLocalOnlyCep = (cep: string): boolean => {
  const cleanCep = cep.replace(/\D/g, "");
  if (cleanCep.length !== 8) return false;
  
  const cepNum = parseInt(cleanCep, 10);
  return LOCAL_ONLY_CEP_RANGES.some(([min, max]) => cepNum >= min && cepNum <= max);
};

const EXPRESSO_STEPS = 4;
const CONVENCIONAL_STEPS = 2;

const CotacaoPreview = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"convencional" | "expresso">("convencional");
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [quoteResult, setQuoteResult] = useState<any>(null);
  const [selectedCarrier, setSelectedCarrier] = useState<"jadlog" | "magalog" | null>(null);
  
  // Convencional Steps
  const [convencionalStep, setConvencionalStep] = useState(1);

  // Form data - Convencional
  const [originCep] = useState("74900-000");
  const [destinyCep, setDestinyCep] = useState("");
  const [unitValue, setUnitValue] = useState("");
  const [volumes, setVolumes] = useState<Volume[]>([
    { id: "1", weight: "", length: "", width: "", height: "", merchandiseType: "" },
  ]);

  // Expresso Quiz State
  const [expressoStep, setExpressoStep] = useState(1);
  // Calcular D+1 automaticamente
  const getD1Date = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const [expressoData, setExpressoData] = useState({
    volume_count: "1",
    delivery_date: getD1Date(), // Fixo em D+1
    vehicle_type: "",
    volume_weights: [""] as string[],
    destination_count: "1",
    destination_cep: "", // CEP de destino para validar cobertura
  });
  const [expressoCepError, setExpressoCepError] = useState("");

  const formatCurrency = (value: string): string => {
    const numbers = value.replace(/\D/g, "");
    if (!numbers) return "";
    const amount = parseFloat(numbers) / 100;
    return amount.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleCurrencyChange = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (!numbers) {
      setUnitValue("");
      return;
    }
    const amount = (parseFloat(numbers) / 100).toFixed(2);
    setUnitValue(amount);
  };

  const getCurrencyDisplayValue = (): string => {
    if (!unitValue) return "";
    const valueInCents = Math.round(parseFloat(unitValue) * 100);
    return formatCurrency(valueInCents.toString());
  };

  const addVolume = () => {
    setVolumes((prev) => [
      ...prev,
      { id: Date.now().toString(), weight: "", length: "", width: "", height: "", merchandiseType: "" },
    ]);
  };

  const removeVolume = (id: string) => {
    if (volumes.length === 1) {
      toast({ title: "Atenção", description: "Deve haver pelo menos um volume", variant: "destructive" });
      return;
    }
    setVolumes((prev) => prev.filter((v) => v.id !== id));
  };

  const updateVolume = (id: string, field: keyof Volume, value: string, previousValue?: string) => {
    let sanitizedValue = value;
    
    if (field === "weight") {
      sanitizedValue = value.replace(/[^0-9.]/g, "");
      const isTypingZeroFromEmpty = sanitizedValue === "0" && (!previousValue || previousValue === "");
      if (isTypingZeroFromEmpty) {
        sanitizedValue = "0.";
      }
      const digitsOnly = sanitizedValue.replace(/\D/g, "");
      if (digitsOnly.length > 4) {
        return;
      }
    }
    
    setVolumes((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: sanitizedValue } : v)));
  };

  const applyMerchandiseTypeToAll = (type: string) => {
    setVolumes((prev) => prev.map((v) => ({ ...v, merchandiseType: type })));
  };

  const calculateTotalWeight = (): number => {
    return volumes.reduce((total, v) => total + (parseFloat(v.weight) || 0), 0);
  };

  const calculateCubicWeight = (length: number, width: number, height: number): number => {
    return (length * width * height) / 5988;
  };

  const calculateTotalCubicWeight = (): number => {
    return volumes.reduce((total, v) => {
      const l = parseFloat(v.length) || 0;
      const w = parseFloat(v.width) || 0;
      const h = parseFloat(v.height) || 0;
      return total + (l * w * h) / 5988;
    }, 0);
  };

  const calculateTotalCubicMeters = (): number => {
    return volumes.reduce((total, v) => {
      const l = parseFloat(v.length) || 0;
      const w = parseFloat(v.width) || 0;
      const h = parseFloat(v.height) || 0;
      return total + (l * w * h) / 1000000;
    }, 0);
  };

  const getConsideredWeight = (): number => {
    return Math.max(calculateTotalWeight(), calculateTotalCubicWeight());
  };

  const hasDangerousMerchandise = (): boolean => {
    return volumes.some((v) => ["quimico", "inflamavel"].includes(v.merchandiseType));
  };

  const isFormValid = (): boolean => {
    if (!destinyCep || destinyCep.replace(/\D/g, "").length !== 8) return false;
    if (!unitValue) return false;
    return volumes.every((v) => v.weight && v.length && v.width && v.height && v.merchandiseType);
  };

  // Expresso price calculation
  const calculateExpressoTotal = () => {
    const basePricePerDestination = 15;
    const destinationCount = parseInt(expressoData.destination_count) || 1;
    const baseTotal = destinationCount * basePricePerDestination;
    
    const weights = expressoData.volume_weights.map(w => parseFloat(w) || 0);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    let weightExtra = 0;
    if (totalWeight > 5) {
      weightExtra = Math.ceil(totalWeight - 5);
    }
    
    const volumeCount = parseInt(expressoData.volume_count) || 1;
    let volumeExtra = 0;
    if (volumeCount > 3) {
      volumeExtra = (volumeCount - 3) * 5;
    }
    
    return baseTotal + weightExtra + volumeExtra;
  };

  const expressoTotalWeight = expressoData.volume_weights.map(w => parseFloat(w) || 0).reduce((sum, w) => sum + w, 0);
  const expressoTotalPrice = calculateExpressoTotal();

  const handleExpressoChange = (field: string, value: string) => {
    if (field === 'volume_count') {
      const volumeCount = parseInt(value) || 0;
      setExpressoData(prev => ({
        ...prev,
        [field]: value,
        volume_weights: Array(volumeCount).fill('').map((_, i) => prev.volume_weights[i] || ''),
      }));
    } else {
      setExpressoData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleExpressoWeightChange = (index: number, value: string) => {
    const formatted = value.replace(/[^\d.]/g, '');
    setExpressoData(prev => ({
      ...prev,
      volume_weights: prev.volume_weights.map((w, i) => i === index ? formatted : w)
    }));
  };

  const validateExpressoStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!expressoData.volume_count || parseInt(expressoData.volume_count) < 1) {
          toast({ title: "Atenção", description: "Informe a quantidade de volumes", variant: "destructive" });
          return false;
        }
        // Validar CEP de destino
        const cleanCep = expressoData.destination_cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) {
          toast({ title: "Atenção", description: "Informe um CEP de destino válido", variant: "destructive" });
          return false;
        }
        if (!isLocalOnlyCep(cleanCep)) {
          toast({ 
            title: "CEP fora da área de cobertura", 
            description: "Este CEP não está na área de atendimento Local. Para outras regiões, use a aba 'Nacional'.", 
            variant: "destructive" 
          });
          return false;
        }
        // Data D+1 é definida automaticamente, não precisa validar
        return true;
      case 2:
        const hasValidWeights = expressoData.volume_weights.every(w => parseFloat(w) > 0);
        if (!hasValidWeights) {
          toast({ title: "Atenção", description: "Preencha o peso de todos os volumes", variant: "destructive" });
          return false;
        }
        if (!expressoData.destination_count || parseInt(expressoData.destination_count) < 1) {
          toast({ title: "Atenção", description: "Informe a quantidade de destinos", variant: "destructive" });
          return false;
        }
        return true;
      case 3:
        if (!expressoData.vehicle_type) {
          toast({ title: "Atenção", description: "Selecione o tipo de veículo", variant: "destructive" });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleExpressoNext = () => {
    if (validateExpressoStep(expressoStep)) {
      setExpressoStep(prev => Math.min(prev + 1, EXPRESSO_STEPS));
    }
  };

  const handleExpressoPrev = () => {
    setExpressoStep(prev => Math.max(prev - 1, 1));
  };

  const getExpressoStepIcon = (step: number) => {
    switch (step) {
      case 1: return <Package className="h-6 w-6" />;
      case 2: return <Scale className="h-6 w-6" />;
      case 3: return <Truck className="h-6 w-6" />;
      case 4: return <DollarSign className="h-6 w-6" />;
      default: return <Package className="h-6 w-6" />;
    }
  };

  const getExpressoStepTitle = (step: number) => {
    switch (step) {
      case 1: return "Informações do Envio";
      case 2: return "Detalhes dos Volumes";
      case 3: return "Tipo de Veículo";
      case 4: return "Resumo e Valor";
      default: return "";
    }
  };

  const handleCalculateConvencional = async () => {
    if (!validateCep(destinyCep)) {
      toast({ title: "CEP inválido", description: "Por favor, insira um CEP válido", variant: "destructive" });
      return;
    }

    // Bloquear CEPs que são exclusivos do Local (região metropolitana de Goiânia)
    if (isLocalOnlyCep(destinyCep)) {
      toast({ 
        title: "CEP não disponível para Nacional", 
        description: "Este CEP está na área de atendimento Local. Use a aba 'Local' para envios nesta região.", 
        variant: "destructive" 
      });
      return;
    }

    const isValid = volumes.every((v) => v.weight && v.length && v.width && v.height && v.merchandiseType);
    if (!isValid) {
      toast({ title: "Dados incompletos", description: "Preencha todos os campos de todos os volumes", variant: "destructive" });
      return;
    }

    if (!unitValue) {
      toast({ title: "Valor obrigatório", description: "Informe o valor declarado da mercadoria", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setQuoteResult(null);
    setSelectedCarrier(null);

    try {
      const totalWeight = calculateTotalWeight();
      const totalCubicWeight = calculateTotalCubicWeight();
      
      const volumesData = volumes.map((vol, index) => {
        const volLength = parseFloat(vol.length) || 0;
        const volWidth = parseFloat(vol.width) || 0;
        const volHeight = parseFloat(vol.height) || 0;
        const volWeight = parseFloat(vol.weight) || 0;
        const volCubicWeight = (volLength * volWidth * volHeight) / 5988;
        
        return {
          volumeNumero: index + 1,
          peso: volWeight,
          comprimento: volLength,
          largura: volWidth,
          altura: volHeight,
          pesoCubado: Math.round(volCubicWeight * 1000) / 1000,
          tipoMercadoria: vol.merchandiseType || "normal",
        };
      });

      const webhookPayload = {
        cepOrigem: originCep,
        cepDestino: destinyCep.replace(/\D/g, ""),
        valorDeclarado: parseFloat(unitValue) || 0,
        quantidadeVolumes: volumes.length,
        pesoTotalDeclarado: totalWeight,
        pesoTotalCubado: totalCubicWeight,
        volumes: volumesData,
        userId: user?.id || null,
        userEmail: user?.email || null,
        dataHora: new Date().toISOString(),
      };

      const WEBHOOK_URL = "https://webhook.grupoconfix.com/webhook/470b0b62-d2ea-4f66-80c3-5dc013710241";

      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      });

      if (!response.ok) {
        throw new Error(`Erro ao calcular frete: status ${response.status}`);
      }

      const webhookResponse = await response.json();
      console.log("Webhook response:", webhookResponse);

      // Handle both array and object responses
      let apiData = null;
      if (Array.isArray(webhookResponse) && webhookResponse.length > 0) {
        apiData = webhookResponse[0];
      } else if (webhookResponse && typeof webhookResponse === 'object' && !Array.isArray(webhookResponse)) {
        apiData = webhookResponse;
      }

      if (apiData) {
        // Map the webhook response format to our expected format
        const jadlogResult = apiData.preco_total_frete_jadlog ? {
          permitido: true,
          preco_total: parseFloat(apiData.preco_total_frete_jadlog),
          prazo: apiData.prazo_frete_jadlog,
        } : apiData.jadlog || null;

        const magalogResult = apiData.preco_total_frete_magalog ? {
          permitido: true,
          preco_total: parseFloat(apiData.preco_total_frete_magalog),
          prazo: apiData.prazo_frete_magalog,
        } : apiData.magalog || null;

        setQuoteResult({
          type: "convencional",
          jadlog: jadlogResult,
          magalog: magalogResult,
          totalWeight,
          totalCubicWeight,
          consideredWeight: Math.max(totalWeight, totalCubicWeight),
          volumeCount: volumes.length,
        });
        toast({ title: "Cotação calculada!", description: "Veja os preços abaixo" });
        setConvencionalStep(2);
      } else {
        toast({ title: "Erro", description: "Não foi possível obter cotação para este destino", variant: "destructive" });
      }
    } catch (error) {
      console.error("Erro na cotação:", error);
      toast({ title: "Erro", description: "Não foi possível calcular a cotação", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceed = () => {
    if (!user) {
      sessionStorage.setItem("cotacaoPreviewData", JSON.stringify({
        activeTab,
        quoteResult,
        originCep,
        destinyCep,
        unitValue,
        volumes,
        expressoData,
      }));
      setShowAuthModal(true);
    } else {
      if (activeTab === "convencional") {
        navigate("/cotacao");
      } else {
        navigate("/painel/expresso/novo-envio");
      }
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // Redireciona para a área correta do painel baseado no tipo de cotação
    if (activeTab === "convencional") {
      navigate("/painel/convencional/cotacoes");
    } else {
      navigate("/painel/expresso/novo-envio");
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-light">
      <Header />

      {/* Hero Section */}
      <section className="relative py-8 sm:py-12 px-2 sm:px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow opacity-30"></div>
        <div className="container mx-auto text-center relative">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 leading-normal">
            Simule o valor do seu
            <span className="bg-gradient-primary bg-clip-text text-transparent block pb-1">
              envio agora mesmo
            </span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            Calcule o frete sem compromisso. Compare preços do envio nacional e expresso.
          </p>
        </div>
      </section>

      {/* Quote Form Section */}
      <section className="py-4 sm:py-8 px-2 sm:px-4">
        <div className="container mx-auto max-w-4xl">
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setQuoteResult(null); setSelectedCarrier(null); setExpressoStep(1); setConvencionalStep(1); }}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="convencional" className="flex items-center gap-2" disabled={convencionalStep === 2}>
                <Truck className="h-4 w-4" />
                Nacional
              </TabsTrigger>
              <TabsTrigger value="expresso" className="flex items-center gap-2" disabled={expressoStep === 4 || convencionalStep === 2}>
                <Car className="h-4 w-4" />
                Local
              </TabsTrigger>
            </TabsList>

            {/* Convencional Tab */}
            <TabsContent value="convencional">
              <Card className="shadow-card relative overflow-hidden border-border/50">
                <div className="absolute inset-0 bg-gradient-subtle opacity-30"></div>
                
                {/* Step 1 - Formulário */}
                {convencionalStep === 1 && (
                  <>
                    <CardHeader className="relative">
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-primary" />
                        Cotação Nacional
                      </CardTitle>
                      <CardDescription>
                        Envio nacional com prazo de 3-10 dias úteis
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="relative space-y-6">
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
                            value={originCep}
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
                            value={destinyCep}
                            onChange={(e) => setDestinyCep(e.target.value)}
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
                          {volumes.map((volume, index) => (
                            <Card key={volume.id} className="border-border/50">
                              <CardHeader className="pb-3 pt-4 px-4">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-base font-semibold">Volume {index + 1}</CardTitle>
                                  {volumes.length > 1 && (
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
                                      type="text"
                                      inputMode="decimal"
                                      placeholder="0.5"
                                      value={volume.weight}
                                      onChange={(e) => {
                                        let value = e.target.value.replace(/[^0-9.]/g, "");
                                        if (volume.weight === "0." && value === "0") {
                                          value = "";
                                        }
                                        updateVolume(volume.id, "weight", value, volume.weight);
                                      }}
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

                                <div className="mt-3 text-sm text-muted-foreground">
                                  Peso cúbico deste volume:{" "}
                                  <span className="font-medium text-foreground">
                                    {calculateCubicWeight(
                                      parseFloat(volume.length) || 0,
                                      parseFloat(volume.width) || 0,
                                      parseFloat(volume.height) || 0,
                                    ).toFixed(3)} kg
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        {hasDangerousMerchandise() && (
                          <Card className="border-warning bg-warning/10">
                            <CardContent className="pt-4 pb-4">
                              <div className="flex items-start space-x-3">
                                <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-semibold text-warning">Atenção especial necessária</p>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Você selecionou um tipo de mercadoria que requer cuidados especiais no transporte.
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
                                <p className="text-2xl font-bold text-primary">{volumes.length}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Peso Total Declarado</p>
                                <p className="text-2xl font-bold">{calculateTotalWeight().toFixed(3)} kg</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Peso Total Cubado</p>
                                <p className="text-2xl font-bold">{calculateTotalCubicWeight().toFixed(3)} kg</p>
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
                        onClick={handleCalculateConvencional}
                        disabled={!isFormValid() || isLoading}
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
                    </CardContent>
                  </>
                )}

                {/* Step 2 - Resultado da Cotação */}
                {convencionalStep === 2 && quoteResult && quoteResult.type === "convencional" && (
                  <>
                    <CardHeader className="relative">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success">
                            <Check className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Cotação realizada com sucesso!</p>
                            <h2 className="text-xl font-bold">Resultado da Cotação</h2>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setConvencionalStep(1); setQuoteResult(null); setSelectedCarrier(null); }}
                          className="text-muted-foreground"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Voltar
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="relative space-y-6">
                      {/* Resumo da Cotação */}
                      <Card className="bg-muted/30 border-border/50">
                        <CardContent className="pt-4 pb-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div>
                              <p className="text-xs text-muted-foreground">Origem</p>
                              <p className="font-semibold">{originCep}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Destino</p>
                              <p className="font-semibold">{destinyCep}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Volumes</p>
                              <p className="font-semibold">{quoteResult.volumeCount}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Peso Considerado</p>
                              <p className="font-semibold">{quoteResult.consideredWeight?.toFixed(2)} kg</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Separator />
                      
                      <h3 className="text-xl font-semibold text-center">Opções de Frete Disponíveis</h3>
                      
                      {quoteResult.magalog && !quoteResult.magalog.permitido &&
                       quoteResult.jadlog && !quoteResult.jadlog.permitido ? (
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
                          <Button
                            onClick={() => { setConvencionalStep(1); setQuoteResult(null); }}
                            variant="outline"
                            className="w-full mt-6"
                          >
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Alterar dados e tentar novamente
                          </Button>
                        </div>
                      ) : (
                        <>
                          {(() => {
                            // Determinar qual é mais barato e mais rápido
                            const magalog = quoteResult.magalog;
                            const jadlog = quoteResult.jadlog;
                            
                            if (!magalog?.permitido && !jadlog?.permitido) return null;
                            
                            let opcaoMaisBarata = null;
                            let opcaoMaisRapida = null;
                            let maisBarataKey = "";
                            let maisRapidaKey = "";
                            
                            const options = [];
                            if (magalog?.permitido) options.push({ key: "magalog", data: magalog });
                            if (jadlog?.permitido) options.push({ key: "jadlog", data: jadlog });
                            
                            if (options.length === 1) {
                              // Apenas uma opção disponível
                              opcaoMaisBarata = options[0].data;
                              opcaoMaisRapida = options[0].data;
                              maisBarataKey = options[0].key;
                              maisRapidaKey = options[0].key;
                            } else if (options.length === 2) {
                              // Comparar preços
                              if (options[0].data.preco_total <= options[1].data.preco_total) {
                                opcaoMaisBarata = options[0].data;
                                maisBarataKey = options[0].key;
                              } else {
                                opcaoMaisBarata = options[1].data;
                                maisBarataKey = options[1].key;
                              }
                              // Comparar prazos
                              if (options[0].data.prazo <= options[1].data.prazo) {
                                opcaoMaisRapida = options[0].data;
                                maisRapidaKey = options[0].key;
                              } else {
                                opcaoMaisRapida = options[1].data;
                                maisRapidaKey = options[1].key;
                              }
                            }
                            
                            // Se são a mesma opção, mostrar apenas um card
                            if (maisBarataKey === maisRapidaKey) {
                              return (
                                <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
                                  <Card
                                    className={`shadow-card cursor-pointer transition-all duration-200 border-primary ring-2 ring-primary`}
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
                                          <span className="text-3xl font-bold text-primary">
                                            R$ {opcaoMaisBarata.preco_total.toFixed(2)}
                                          </span>
                                          <div className="text-right">
                                            <div className="text-lg font-semibold">{opcaoMaisBarata.prazo} dias</div>
                                            <div className="text-xs text-muted-foreground">úteis</div>
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              );
                            }
                            
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Opção Mais Barato */}
                                <Card
                                  className={`shadow-card cursor-pointer transition-all duration-200 ${
                                    selectedCarrier === maisBarataKey
                                      ? "border-primary ring-2 ring-primary"
                                      : "border-border hover:border-primary/50"
                                  }`}
                                  onClick={() => setSelectedCarrier(maisBarataKey as any)}
                                >
                                  <CardHeader>
                                    <CardTitle className="flex items-center space-x-2 text-base">
                                      <DollarSign className="h-4 w-4 text-success" />
                                      <span>Mais barato</span>
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <span className="text-3xl font-bold text-primary">
                                          R$ {opcaoMaisBarata.preco_total.toFixed(2)}
                                        </span>
                                        <div className="text-right">
                                          <div className="text-lg font-semibold">{opcaoMaisBarata.prazo} dias</div>
                                          <div className="text-xs text-muted-foreground">úteis</div>
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>

                                {/* Opção Mais Rápido */}
                                <Card
                                  className={`shadow-card cursor-pointer transition-all duration-200 ${
                                    selectedCarrier === maisRapidaKey
                                      ? "border-primary ring-2 ring-primary"
                                      : "border-border hover:border-primary/50"
                                  }`}
                                  onClick={() => setSelectedCarrier(maisRapidaKey as any)}
                                >
                                  <CardHeader>
                                    <CardTitle className="flex items-center space-x-2 text-base">
                                      <Zap className="h-4 w-4 text-primary" />
                                      <span>Mais rápido</span>
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <span className="text-3xl font-bold text-primary">
                                          R$ {opcaoMaisRapida.preco_total.toFixed(2)}
                                        </span>
                                        <div className="text-right">
                                          <div className="text-lg font-semibold">{opcaoMaisRapida.prazo} dias</div>
                                          <div className="text-xs text-muted-foreground">úteis</div>
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            );
                          })()}

                          {(quoteResult.magalog?.permitido || quoteResult.jadlog?.permitido) && (
                            <div className="space-y-4 pt-4">
                              <Separator />
                              <div className="text-center space-y-2">
                                <p className="text-muted-foreground">
                                  Para finalizar seu envio, faça login ou crie sua conta
                                </p>
                              </div>
                              <Button
                                onClick={handleProceed}
                                className="w-full h-16 text-lg font-semibold bg-gradient-primary hover:shadow-primary transition-all duration-300"
                              >
                                {user ? (
                                  <>
                                    <ArrowRight className="mr-2 h-5 w-5" />
                                    Continuar para Cotação Completa
                                  </>
                                ) : (
                                  <>
                                    <LogIn className="mr-2 h-5 w-5" />
                                    Fazer Login para Continuar
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </>
                )}
              </Card>
            </TabsContent>

            {/* Expresso Tab - Quiz Format */}
            <TabsContent value="expresso">
              <Card className="shadow-card relative overflow-hidden border-border/50">
                <div className="absolute inset-0 bg-gradient-subtle opacity-30"></div>
                <CardHeader className="relative">
                  {/* Progress Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        {getExpressoStepIcon(expressoStep)}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Etapa {expressoStep} de {EXPRESSO_STEPS}</p>
                        <h2 className="text-xl font-bold">{getExpressoStepTitle(expressoStep)}</h2>
                      </div>
                    </div>
                  </div>
                  <Progress value={(expressoStep / EXPRESSO_STEPS) * 100} className="h-2" />
                </CardHeader>

                <CardContent className="relative min-h-[400px]">
                  {/* Step 1: Informações do Envio */}
                  {expressoStep === 1 && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                      {/* CEP de destino */}
                      <div className="space-y-4">
                        <div className="text-center">
                          <MapPin className="h-12 w-12 mx-auto mb-3 text-primary" />
                          <Label className="text-lg font-medium">CEP de destino</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Área de cobertura: Região Metropolitana de Goiânia
                          </p>
                        </div>
                        <InputMask
                          mask="99999-999"
                          value={expressoData.destination_cep}
                          onChange={(e) => {
                            const value = e.target.value;
                            handleExpressoChange('destination_cep', value);
                            // Validar em tempo real
                            const cleanCep = value.replace(/\D/g, '');
                            if (cleanCep.length === 8) {
                              if (!isLocalOnlyCep(cleanCep)) {
                                setExpressoCepError('CEP fora da área de cobertura Local. Use a aba "Nacional" para outras regiões.');
                              } else {
                                setExpressoCepError('');
                              }
                            } else {
                              setExpressoCepError('');
                            }
                          }}
                        >
                          {(inputProps: any) => (
                            <Input
                              {...inputProps}
                              className={`text-center text-2xl font-bold h-16 ${expressoCepError ? 'border-destructive' : ''}`}
                              placeholder="00000-000"
                            />
                          )}
                        </InputMask>
                        {expressoCepError && (
                          <p className="text-sm text-destructive text-center flex items-center justify-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            {expressoCepError}
                          </p>
                        )}
                      </div>

                      {/* Quantidade de volumes */}
                      <div className="space-y-4">
                        <div className="text-center">
                          <Package className="h-12 w-12 mx-auto mb-3 text-primary" />
                          <Label className="text-lg font-medium">Quantos volumes você vai enviar?</Label>
                        </div>
                        <Input
                          type="number"
                          min="1"
                          value={expressoData.volume_count}
                          onChange={(e) => handleExpressoChange('volume_count', e.target.value)}
                          className="text-center text-2xl font-bold h-16"
                          placeholder="1"
                        />
                      </div>

                      {/* Data fixa D+1 - apenas exibição informativa */}
                      <div className="space-y-2">
                        <div className="text-center">
                          <Calendar className="h-10 w-10 mx-auto mb-2 text-primary/60" />
                          <p className="text-sm text-muted-foreground">
                            Entrega programada para <span className="font-semibold text-foreground">D+1 (amanhã)</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Detalhes dos Volumes */}
                  {expressoStep === 2 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <p className="text-muted-foreground text-center">
                        Informe o peso de cada volume e quantos destinos diferentes
                      </p>

                      <div className="space-y-4">
                        {expressoData.volume_weights.map((weight, index) => (
                          <div key={index} className="border rounded-xl p-4 bg-card space-y-4">
                            <div className="flex items-center gap-2 text-primary">
                              <Package className="h-5 w-5" />
                              <span className="font-semibold">Volume {index + 1}</span>
                            </div>
                            
                            <div className="space-y-2">
                              <Label className="text-sm flex items-center gap-1">
                                <Scale className="h-3 w-3" />
                                Peso (kg)
                              </Label>
                              <Input
                                type="text"
                                value={weight}
                                onChange={(e) => handleExpressoWeightChange(index, e.target.value)}
                                placeholder="Ex: 2.5"
                                className="h-12"
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Destinos diferentes - lógica baseada na quantidade de volumes */}
                      {(() => {
                        const volumeCount = parseInt(expressoData.volume_count) || 1;
                        const maxDestinations = volumeCount;
                        
                        // Se só tem 1 volume, fixar em 1 destino (sem mostrar input)
                        if (volumeCount === 1) {
                          return (
                            <div className="space-y-2">
                              <div className="text-center">
                                <MapPin className="h-10 w-10 mx-auto mb-2 text-primary/60" />
                                <p className="text-sm text-muted-foreground">
                                  Destino: <span className="font-semibold text-foreground">1 endereço</span>
                                </p>
                              </div>
                            </div>
                          );
                        }
                        
                        // Se tem 2+ volumes, mostrar input com min 1 e max = volumeCount
                        return (
                          <div className="space-y-4">
                            <div className="text-center">
                              <MapPin className="h-10 w-10 mx-auto mb-2 text-primary" />
                              <Label className="text-lg font-medium">Para quantos destinos diferentes?</Label>
                              <p className="text-xs text-muted-foreground mt-1">
                                Mínimo: 1 | Máximo: {maxDestinations} (com base nos volumes)
                              </p>
                            </div>
                            <Input
                              type="number"
                              min="1"
                              max={maxDestinations}
                              value={expressoData.destination_count}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                const clamped = Math.min(Math.max(val, 1), maxDestinations);
                                handleExpressoChange('destination_count', clamped.toString());
                              }}
                              className="text-center text-2xl font-bold h-14"
                              placeholder="1"
                            />
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Step 3: Tipo de Veículo */}
                  {expressoStep === 3 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <p className="text-muted-foreground text-center">
                        Qual veículo você precisa para a coleta e entrega?
                      </p>

                      <RadioGroup
                        value={expressoData.vehicle_type}
                        onValueChange={(value) => handleExpressoChange('vehicle_type', value)}
                        className="space-y-3"
                      >
                        {[
                          { id: 'moto', label: 'Moto', icon: Bike, desc: 'Ideal para pequenos volumes' },
                          { id: 'carro', label: 'Carro Utilitário', icon: Car, desc: 'Para volumes médios' },
                          { id: 'caminhao', label: 'Caminhão', icon: Truck, desc: 'Para grandes cargas' },
                        ].map((vehicle) => (
                          <label
                            key={vehicle.id}
                            htmlFor={vehicle.id}
                            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                              expressoData.vehicle_type === vehicle.id
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <RadioGroupItem value={vehicle.id} id={vehicle.id} className="sr-only" />
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                              expressoData.vehicle_type === vehicle.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}>
                              <vehicle.icon className="h-7 w-7" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold">{vehicle.label}</p>
                              <p className="text-sm text-muted-foreground">{vehicle.desc}</p>
                            </div>
                            {expressoData.vehicle_type === vehicle.id && (
                              <Check className="h-5 w-5 text-primary" />
                            )}
                          </label>
                        ))}
                      </RadioGroup>
                    </div>
                  )}

                  {/* Step 4: Resumo */}
                  {expressoStep === 4 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <p className="text-muted-foreground text-center">
                        Confira o resumo da sua simulação
                      </p>

                      <div className="space-y-4">
                        {/* Volumes */}
                        <div className="border rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Package className="h-4 w-4 text-primary" />
                            <span className="font-semibold">{expressoData.volume_count} Volume(s)</span>
                          </div>
                          <div className="space-y-2">
                            {expressoData.volume_weights.map((weight, index) => (
                              <div key={index} className="flex justify-between text-sm py-2 border-b last:border-0">
                                <span className="text-muted-foreground">Volume {index + 1}</span>
                                <span className="font-medium">{weight || '0'} kg</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="border rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              <span className="text-sm text-muted-foreground">Destinos</span>
                            </div>
                            <p className="font-semibold text-lg">{expressoData.destination_count}</p>
                          </div>
                          <div className="border rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Scale className="h-4 w-4 text-primary" />
                              <span className="text-sm text-muted-foreground">Peso Total</span>
                            </div>
                            <p className="font-semibold text-lg">{expressoTotalWeight.toFixed(1)} kg</p>
                          </div>
                          <div className="border rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Truck className="h-4 w-4 text-primary" />
                              <span className="text-sm text-muted-foreground">Veículo</span>
                            </div>
                            <p className="font-semibold capitalize">{expressoData.vehicle_type || '-'}</p>
                          </div>
                          <div className="border rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="h-4 w-4 text-primary" />
                              <span className="text-sm text-muted-foreground">Entrega</span>
                            </div>
                            <p className="font-semibold">
                              {expressoData.delivery_date ? new Date(expressoData.delivery_date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                            </p>
                          </div>
                        </div>

                        {/* Total */}
                        <div className="border-2 border-primary rounded-xl p-6 bg-primary/5 text-center">
                          <p className="text-sm text-muted-foreground mb-1">Valor Estimado do Frete</p>
                          <p className="text-4xl font-bold text-primary">R$ {expressoTotalPrice.toFixed(2)}</p>
                        </div>

                        {/* Login Button */}
                        <Button
                          onClick={handleProceed}
                          className="w-full h-14 text-lg font-semibold"
                          variant={user ? "default" : "outline"}
                        >
                          {user ? (
                            <>
                              <ArrowRight className="mr-2 h-5 w-5" />
                              Continuar para Envio Completo
                            </>
                          ) : (
                            <>
                              <LogIn className="mr-2 h-5 w-5" />
                              Fazer Login para Continuar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex gap-3 mt-8">
                    {expressoStep > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleExpressoPrev}
                        className="flex-1 h-14"
                      >
                        <ChevronLeft className="mr-2 h-5 w-5" />
                        Voltar
                      </Button>
                    )}
                    
                    {expressoStep < EXPRESSO_STEPS && (
                      <Button
                        type="button"
                        onClick={handleExpressoNext}
                        className="flex-1 h-14"
                      >
                        Continuar
                        <ChevronRight className="ml-2 h-5 w-5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default CotacaoPreview;
