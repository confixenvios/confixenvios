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

const CotacaoPreview = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"convencional" | "expresso">("convencional");
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [quoteResult, setQuoteResult] = useState<any>(null);
  const [selectedCarrier, setSelectedCarrier] = useState<"jadlog" | "magalog" | null>(null);

  // Form data
  const [originCep] = useState("74900-000");
  const [destinyCep, setDestinyCep] = useState("");
  const [unitValue, setUnitValue] = useState("");
  const [volumes, setVolumes] = useState<Volume[]>([
    { id: "1", weight: "", length: "", width: "", height: "", merchandiseType: "" },
  ]);

  // Expresso form
  const [expressoDestinyCep, setExpressoDestinyCep] = useState("");
  const [expressoWeight, setExpressoWeight] = useState("");

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
    
    // Para o campo peso
    if (field === "weight") {
      // Permitir apenas números e ponto
      sanitizedValue = value.replace(/[^0-9.]/g, "");
      
      // Auto-inserir ponto apenas quando o usuário digita "0" em campo vazio
      const isTypingZeroFromEmpty = sanitizedValue === "0" && (!previousValue || previousValue === "");
      if (isTypingZeroFromEmpty) {
        sanitizedValue = "0.";
      }
      
      // Limitar peso a 4 dígitos no total
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

  const handleCalculateConvencional = async () => {
    if (!validateCep(destinyCep)) {
      toast({ title: "CEP inválido", description: "Por favor, insira um CEP válido", variant: "destructive" });
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
      
      // Preparar dados de cada volume
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

      console.log("📤 Enviando POST para Webhook:", webhookPayload);

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
      console.log("📥 Webhook resposta:", webhookResponse);

      // Processar resposta
      if (Array.isArray(webhookResponse) && webhookResponse.length > 0) {
        const apiData = webhookResponse[0];
        setQuoteResult({
          type: "convencional",
          jadlog: apiData.jadlog || null,
          magalog: apiData.magalog || null,
          totalWeight,
          totalCubicWeight,
          consideredWeight: Math.max(totalWeight, totalCubicWeight),
          volumeCount: volumes.length,
        });
      }

      toast({ title: "Cotação calculada!", description: "Veja os preços abaixo" });
    } catch (error) {
      console.error("Erro na cotação:", error);
      toast({ title: "Erro", description: "Não foi possível calcular a cotação", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculateExpresso = async () => {
    if (!expressoDestinyCep || expressoDestinyCep.replace(/\D/g, "").length !== 8) {
      toast({ title: "CEP inválido", description: "Por favor, insira um CEP válido", variant: "destructive" });
      return;
    }

    if (!expressoWeight || parseFloat(expressoWeight) <= 0) {
      toast({ title: "Peso obrigatório", description: "Informe o peso do volume", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const cepPrefix = expressoDestinyCep.replace(/\D/g, "").substring(0, 2);
      const weight = parseFloat(expressoWeight);
      
      let basePrice = 25;
      if (["01", "02", "03", "04", "05", "06", "07", "08", "09"].includes(cepPrefix)) {
        basePrice = 45;
      } else if (["20", "21", "22", "23", "24"].includes(cepPrefix)) {
        basePrice = 50;
      } else if (["30", "31", "32", "33", "34", "35"].includes(cepPrefix)) {
        basePrice = 40;
      }
      
      const pricePerKg = weight > 5 ? 3.5 : 5;
      const totalPrice = basePrice + (weight * pricePerKg);

      setQuoteResult({
        type: "expresso",
        price: totalPrice,
        deliveryDays: 1,
        weight,
      });

      toast({ title: "Cotação expressa calculada!", description: "Veja o preço abaixo" });
    } catch (error) {
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
        expressoDestinyCep,
        expressoWeight,
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
    if (activeTab === "convencional") {
      navigate("/cotacao");
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
            Calcule o frete sem compromisso. Compare preços do envio convencional e expresso.
          </p>
        </div>
      </section>

      {/* Quote Form Section */}
      <section className="py-4 sm:py-8 px-2 sm:px-4">
        <div className="container mx-auto max-w-4xl">
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setQuoteResult(null); setSelectedCarrier(null); }}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="convencional" className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Convencional
              </TabsTrigger>
              <TabsTrigger value="expresso" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Expresso
              </TabsTrigger>
            </TabsList>

            {/* Convencional Tab */}
            <TabsContent value="convencional">
              <Card className="shadow-card relative overflow-hidden border-border/50">
                <div className="absolute inset-0 bg-gradient-subtle opacity-30"></div>
                <CardHeader className="relative">
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    Cotação Convencional
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

                            {/* Mostrar peso cúbico individual */}
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

                  {/* Quote Results - Convencional */}
                  {quoteResult && quoteResult.type === "convencional" && (
                    <div className="mt-8 space-y-6">
                      <Separator />
                      <h3 className="text-xl font-semibold text-center">Opções de Frete</h3>
                      
                      {/* Verificar se ambas transportadoras falharam */}
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
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Magalog Card */}
                          {quoteResult.magalog && (
                            <Card
                              className={`shadow-card cursor-pointer transition-all duration-200 ${
                                quoteResult.magalog.permitido
                                  ? selectedCarrier === "magalog"
                                    ? "border-primary ring-2 ring-primary"
                                    : "hover:border-primary/50"
                                  : "opacity-50 cursor-not-allowed"
                              }`}
                              onClick={() => quoteResult.magalog.permitido && setSelectedCarrier("magalog")}
                            >
                              <CardHeader>
                                <CardTitle className="flex items-center space-x-2 text-base">
                                  <DollarSign className="h-4 w-4 text-success" />
                                  <span>Econômico</span>
                                  {!quoteResult.magalog.permitido && (
                                    <Badge variant="destructive" className="ml-2">Indisponível</Badge>
                                  )}
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                {quoteResult.magalog.permitido ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xl font-bold text-primary">
                                        R$ {quoteResult.magalog.preco_total?.toFixed(2)}
                                      </span>
                                      <div className="text-right">
                                        <div className="flex items-center text-sm text-muted-foreground">
                                          <Clock className="h-4 w-4 mr-1" />
                                          {quoteResult.magalog.prazo} dias úteis
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    {translateErrorReason(quoteResult.magalog.motivo)}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          )}

                          {/* Jadlog Card */}
                          {quoteResult.jadlog && (
                            <Card
                              className={`shadow-card cursor-pointer transition-all duration-200 ${
                                quoteResult.jadlog.permitido
                                  ? selectedCarrier === "jadlog"
                                    ? "border-primary ring-2 ring-primary"
                                    : "hover:border-primary/50"
                                  : "opacity-50 cursor-not-allowed"
                              }`}
                              onClick={() => quoteResult.jadlog.permitido && setSelectedCarrier("jadlog")}
                            >
                              <CardHeader>
                                <CardTitle className="flex items-center space-x-2 text-base">
                                  <Zap className="h-4 w-4 text-primary" />
                                  <span>Expresso</span>
                                  {!quoteResult.jadlog.permitido && (
                                    <Badge variant="destructive" className="ml-2">Indisponível</Badge>
                                  )}
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                {quoteResult.jadlog.permitido ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xl font-bold text-primary">
                                        R$ {quoteResult.jadlog.preco_total?.toFixed(2)}
                                      </span>
                                      <div className="text-right">
                                        <div className="flex items-center text-sm text-muted-foreground">
                                          <Clock className="h-4 w-4 mr-1" />
                                          {quoteResult.jadlog.prazo} dias úteis
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    {translateErrorReason(quoteResult.jadlog.motivo)}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      )}

                      {/* Proceed Button */}
                      {(quoteResult.magalog?.permitido || quoteResult.jadlog?.permitido) && (
                        <Button
                          onClick={handleProceed}
                          className="w-full h-14 text-lg font-semibold"
                          variant={user ? "default" : "outline"}
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
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Expresso Tab */}
            <TabsContent value="expresso">
              <Card className="shadow-card relative overflow-hidden border-border/50">
                <div className="absolute inset-0 bg-gradient-subtle opacity-30"></div>
                <CardHeader className="relative">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Cotação Expresso
                  </CardTitle>
                  <CardDescription>
                    Entrega rápida no mesmo dia ou dia seguinte
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="flex items-center space-x-2 text-base font-medium">
                        <MapPin className="h-5 w-5 text-primary" />
                        <span>CEP de Destino *</span>
                      </Label>
                      <InputMask
                        mask="99999-999"
                        value={expressoDestinyCep}
                        onChange={(e) => setExpressoDestinyCep(e.target.value)}
                      >
                        {(inputProps: any) => (
                          <Input {...inputProps} placeholder="00000-000" className="h-14 text-lg" />
                        )}
                      </InputMask>
                    </div>
                    <div className="space-y-3">
                      <Label className="flex items-center space-x-2 text-base font-medium">
                        <Package className="h-5 w-5 text-primary" />
                        <span>Peso Total (kg) *</span>
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={expressoWeight}
                        onChange={(e) => setExpressoWeight(e.target.value)}
                        placeholder="0.0"
                        className="h-14 text-lg"
                      />
                    </div>
                  </div>

                  <Button onClick={handleCalculateExpresso} disabled={isLoading} className="w-full h-14">
                    {isLoading ? "Calculando..." : "Calcular Frete Expresso"}
                  </Button>

                  {/* Quote Result - Expresso */}
                  {quoteResult && quoteResult.type === "expresso" && (
                    <Card className="mt-6 bg-primary/5 border-primary/20">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Zap className="h-5 w-5 text-primary" />
                          Resultado da Cotação Expressa
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-primary">
                            R$ {quoteResult.price?.toFixed(2)}
                          </span>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>Entrega em {quoteResult.deliveryDays} dia(s)</span>
                          </div>
                        </div>
                        <Button onClick={handleProceed} className="w-full" variant={user ? "default" : "outline"}>
                          {user ? (
                            <>
                              <ArrowRight className="mr-2 h-4 w-4" />
                              Continuar
                            </>
                          ) : (
                            <>
                              <LogIn className="mr-2 h-4 w-4" />
                              Fazer Login para Continuar
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  )}
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
