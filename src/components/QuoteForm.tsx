import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, MapPin, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface QuoteFormData {
  originCep: string;
  destinyCep: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  format: string;
}

const QuoteForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState<QuoteFormData>({
    originCep: "",
    destinyCep: "",
    weight: "",
    length: "",
    width: "",
    height: "",
    format: ""
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: keyof QuoteFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Store quote data in sessionStorage for the results page
    sessionStorage.setItem('quoteData', JSON.stringify(formData));
    
    setIsLoading(false);
    toast({
      title: "Cotação calculada!",
      description: "Redirecionando para os resultados...",
    });
    
    navigate("/resultados");
  };

  const isFormValid = Object.values(formData).every(value => value.trim() !== "");

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-card relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-glow opacity-20"></div>
      <CardHeader className="relative">
        <div className="flex items-center space-x-2 mb-2">
          <Calculator className="h-6 w-6 text-primary" />
          <CardTitle className="text-2xl">Calcular Frete</CardTitle>
        </div>
        <CardDescription>
          Insira os dados do seu envio para calcular o melhor preço e prazo
        </CardDescription>
      </CardHeader>
      
      <CardContent className="relative space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* CEP Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origin-cep" className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span>CEP de Origem</span>
              </Label>
              <Input
                id="origin-cep"
                type="text"
                placeholder="00000-000"
                value={formData.originCep}
                onChange={(e) => handleInputChange("originCep", e.target.value)}
                className="border-input-border focus:border-primary focus:ring-primary"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="destiny-cep" className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span>CEP de Destino</span>
              </Label>
              <Input
                id="destiny-cep"
                type="text"
                placeholder="00000-000"
                value={formData.destinyCep}
                onChange={(e) => handleInputChange("destinyCep", e.target.value)}
                className="border-input-border focus:border-primary focus:ring-primary"
              />
            </div>
          </div>

          {/* Package Details */}
          <div className="space-y-4">
            <Label className="flex items-center space-x-2 text-base font-medium">
              <Package className="h-4 w-4 text-primary" />
              <span>Detalhes do Pacote</span>
            </Label>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  placeholder="0.5"
                  value={formData.weight}
                  onChange={(e) => handleInputChange("weight", e.target.value)}
                  className="border-input-border focus:border-primary focus:ring-primary"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="length">Comp. (cm)</Label>
                <Input
                  id="length"
                  type="number"
                  placeholder="20"
                  value={formData.length}
                  onChange={(e) => handleInputChange("length", e.target.value)}
                  className="border-input-border focus:border-primary focus:ring-primary"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="width">Larg. (cm)</Label>
                <Input
                  id="width"
                  type="number"
                  placeholder="15"
                  value={formData.width}
                  onChange={(e) => handleInputChange("width", e.target.value)}
                  className="border-input-border focus:border-primary focus:ring-primary"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="height">Alt. (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="10"
                  value={formData.height}
                  onChange={(e) => handleInputChange("height", e.target.value)}
                  className="border-input-border focus:border-primary focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="format">Formato</Label>
              <Select onValueChange={(value) => handleInputChange("format", value)}>
                <SelectTrigger className="border-input-border focus:border-primary focus:ring-primary">
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
            type="submit"
            disabled={!isFormValid || isLoading}
            className="w-full h-12 text-lg font-semibold bg-gradient-primary hover:shadow-primary transition-all duration-300 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                <span>Calculando...</span>
              </div>
            ) : (
              <>
                <Calculator className="mr-2 h-5 w-5" />
                Calcular Frete
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default QuoteForm;