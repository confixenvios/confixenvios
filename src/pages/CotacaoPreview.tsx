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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { calculateShippingQuote, validateCep } from "@/services/shippingService";
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

  // Form data
  const [originCep, setOriginCep] = useState("74900-000");
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

  const updateVolume = (id: string, field: keyof Volume, value: string) => {
    setVolumes((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  };

  const calculateTotalWeight = (): number => {
    return volumes.reduce((total, v) => total + (parseFloat(v.weight) || 0), 0);
  };

  const calculateTotalCubicWeight = (): number => {
    return volumes.reduce((total, v) => {
      const l = parseFloat(v.length) || 0;
      const w = parseFloat(v.width) || 0;
      const h = parseFloat(v.height) || 0;
      return total + (l * w * h) / 5988;
    }, 0);
  };

  const getConsideredWeight = (): number => {
    return Math.max(calculateTotalWeight(), calculateTotalCubicWeight());
  };

  const handleCalculateConvencional = async () => {
    if (!validateCep(destinyCep)) {
      toast({ title: "CEP inválido", description: "Por favor, insira um CEP válido", variant: "destructive" });
      return;
    }

    const isValid = volumes.every((v) => v.weight && v.length && v.width && v.height);
    if (!isValid) {
      toast({ title: "Dados incompletos", description: "Preencha todos os campos de todos os volumes", variant: "destructive" });
      return;
    }

    if (!unitValue) {
      toast({ title: "Valor obrigatório", description: "Informe o valor declarado da mercadoria", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const totalWeight = calculateTotalWeight();
      const totalCubicWeight = calculateTotalCubicWeight();
      const consideredWeight = Math.max(totalWeight, totalCubicWeight);

      // Get first volume dimensions for the quote
      const firstVolume = volumes[0];
      const result = await calculateShippingQuote({
        destinyCep: destinyCep.replace(/\D/g, ""),
        weight: consideredWeight,
        quantity: volumes.length,
        length: parseFloat(firstVolume.length) || 0,
        width: parseFloat(firstVolume.width) || 0,
        height: parseFloat(firstVolume.height) || 0,
        merchandiseValue: parseFloat(unitValue) || 0,
      });

      setQuoteResult({
        type: "convencional",
        ...result,
        totalWeight,
        totalCubicWeight,
        consideredWeight,
        volumeCount: volumes.length,
      });

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
      // Simular cotação expresso (baseado na região)
      const cepPrefix = expressoDestinyCep.replace(/\D/g, "").substring(0, 2);
      const weight = parseFloat(expressoWeight);
      
      // Preços base por região (simplificado)
      let basePrice = 25;
      if (["01", "02", "03", "04", "05", "06", "07", "08", "09"].includes(cepPrefix)) {
        basePrice = 45; // SP
      } else if (["20", "21", "22", "23", "24"].includes(cepPrefix)) {
        basePrice = 50; // RJ
      } else if (["30", "31", "32", "33", "34", "35"].includes(cepPrefix)) {
        basePrice = 40; // MG
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
      // Salvar dados do formulário antes de pedir login
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
      // Usuário logado, redirecionar para cotação completa
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
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setQuoteResult(null); }}>
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    Cotação Convencional
                  </CardTitle>
                  <CardDescription>
                    Envio nacional com prazo de 3-10 dias úteis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* CEPs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>CEP de Origem</Label>
                      <InputMask
                        mask="99999-999"
                        value={originCep}
                        onChange={(e) => setOriginCep(e.target.value)}
                        disabled
                      >
                        {(inputProps: any) => (
                          <Input {...inputProps} placeholder="00000-000" className="bg-muted" />
                        )}
                      </InputMask>
                      <p className="text-xs text-muted-foreground mt-1">Goiânia - GO (fixo)</p>
                    </div>
                    <div>
                      <Label>CEP de Destino *</Label>
                      <InputMask
                        mask="99999-999"
                        value={destinyCep}
                        onChange={(e) => setDestinyCep(e.target.value)}
                      >
                        {(inputProps: any) => (
                          <Input {...inputProps} placeholder="00000-000" />
                        )}
                      </InputMask>
                    </div>
                  </div>

                  {/* Valor declarado */}
                  <div>
                    <Label>Valor Declarado da Mercadoria *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                      <Input
                        value={getCurrencyDisplayValue()}
                        onChange={(e) => handleCurrencyChange(e.target.value)}
                        placeholder="0,00"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Volumes */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <Label className="text-base font-semibold">Volumes ({volumes.length})</Label>
                      <Button variant="outline" size="sm" onClick={addVolume}>
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {volumes.map((volume, index) => (
                        <Card key={volume.id} className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <Badge variant="secondary">Volume {index + 1}</Badge>
                            {volumes.length > 1 && (
                              <Button variant="ghost" size="sm" onClick={() => removeVolume(volume.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <Label className="text-xs">Peso (kg)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={volume.weight}
                                onChange={(e) => updateVolume(volume.id, "weight", e.target.value)}
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Comp. (cm)</Label>
                              <Input
                                type="number"
                                value={volume.length}
                                onChange={(e) => updateVolume(volume.id, "length", e.target.value)}
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Larg. (cm)</Label>
                              <Input
                                type="number"
                                value={volume.width}
                                onChange={(e) => updateVolume(volume.id, "width", e.target.value)}
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Alt. (cm)</Label>
                              <Input
                                type="number"
                                value={volume.height}
                                onChange={(e) => updateVolume(volume.id, "height", e.target.value)}
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {/* Weight summary */}
                    <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
                      <div className="flex justify-between">
                        <span>Peso real:</span>
                        <span>{calculateTotalWeight().toFixed(2)} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Peso cubado:</span>
                        <span>{calculateTotalCubicWeight().toFixed(2)} kg</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between font-semibold">
                        <span>Peso considerado:</span>
                        <span>{getConsideredWeight().toFixed(2)} kg</span>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleCalculateConvencional} disabled={isLoading} className="w-full">
                    {isLoading ? "Calculando..." : "Calcular Frete"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Expresso Tab */}
            <TabsContent value="expresso">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Cotação Expresso
                  </CardTitle>
                  <CardDescription>
                    Entrega rápida no mesmo dia ou dia seguinte
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>CEP de Destino *</Label>
                      <InputMask
                        mask="99999-999"
                        value={expressoDestinyCep}
                        onChange={(e) => setExpressoDestinyCep(e.target.value)}
                      >
                        {(inputProps: any) => (
                          <Input {...inputProps} placeholder="00000-000" />
                        )}
                      </InputMask>
                    </div>
                    <div>
                      <Label>Peso Total (kg) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={expressoWeight}
                        onChange={(e) => setExpressoWeight(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <Button onClick={handleCalculateExpresso} disabled={isLoading} className="w-full">
                    {isLoading ? "Calculando..." : "Calcular Frete Expresso"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Quote Result */}
          {quoteResult && (
            <Card className="mt-6 border-primary/50">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Resultado da Cotação
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {quoteResult.type === "convencional" && (
                  <div className="space-y-4">
                    {/* Economic Option */}
                    {quoteResult.economicPrice && quoteResult.economicPrice > 0 && (
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{quoteResult.tableName || "Frete Econômico"}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{quoteResult.economicDays} dias úteis</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">
                              R$ {quoteResult.economicPrice.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Express Option */}
                    {quoteResult.expressPrice && quoteResult.expressPrice > 0 && (
                      <div className="p-4 border rounded-lg border-primary/50 bg-primary/5">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold flex items-center gap-2">
                              <Zap className="h-4 w-4 text-primary" />
                              Frete Expresso
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{quoteResult.expressDays} dias úteis</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">
                              R$ {quoteResult.expressPrice.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* No options available */}
                    {(!quoteResult.economicPrice || quoteResult.economicPrice <= 0) && 
                     (!quoteResult.expressPrice || quoteResult.expressPrice <= 0) && (
                      <div className="p-4 bg-muted rounded-lg text-center">
                        <p className="text-muted-foreground">
                          Não há opções de envio disponíveis para este destino.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {quoteResult.type === "expresso" && (
                  <div className="p-4 border rounded-lg border-primary">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold flex items-center gap-2">
                          <Zap className="h-4 w-4 text-primary" />
                          Entrega Expresso
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Até {quoteResult.deliveryDays} dia útil</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          R$ {quoteResult.price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <Separator className="my-6" />

                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Para finalizar o pedido, é necessário fazer login ou criar uma conta.
                  </p>
                  <Button onClick={handleProceed} size="lg" className="px-8">
                    {user ? (
                      <>
                        Continuar <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-4 w-4" />
                        Fazer Login para Continuar
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Footer */}
      <footer className="border-t border-border py-6 px-4 mt-8">
        <div className="container mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            © 2025 Confix Envios. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default CotacaoPreview;
