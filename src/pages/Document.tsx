import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Package, FileText, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Document = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentShipment, setCurrentShipment] = useState<any>(null);
  const [documentType, setDocumentType] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('Document - Component montado');
    const savedShipment = sessionStorage.getItem('currentShipment');
    console.log('Document - Shipment encontrado no sessionStorage:', savedShipment);
    if (!savedShipment) {
      console.log('Document - Nenhum shipment encontrado, redirecionando para home');
      navigate('/');
      return;
    }
    const parsedShipment = JSON.parse(savedShipment);
    console.log('Document - Shipment parseado:', parsedShipment);
    setCurrentShipment(parsedShipment);
  }, [navigate]);

  const isFormValid = () => {
    return !!documentType;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Document - Submit iniciado');
    
    if (!isFormValid()) {
      console.log('Document - Form inválido');
      toast({
        title: "Dados obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const documentData = {
        documentType,
        shipment: currentShipment
      };

      console.log('Document - Salvando dados do documento:', documentData);
      sessionStorage.setItem('documentData', JSON.stringify(documentData));

      toast({
        title: "Documento selecionado!",
        description: "Redirecionando para pagamento...",
      });

      console.log('Document - Navegando para pagamento');
      navigate("/pagamento");

    } catch (error: any) {
      console.error('Error processing document:', error);
      toast({
        title: "Erro ao processar documento",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentShipment) {
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
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Tipo de <span className="bg-gradient-primary bg-clip-text text-transparent">Documento</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Selecione o tipo de documento para seu envio
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Document Type */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span>Selecionar Documento</span>
                </CardTitle>
                <CardDescription>
                  Escolha o tipo de documento para seu envio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={documentType} onValueChange={setDocumentType}>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent/20 cursor-pointer">
                    <RadioGroupItem value="cpf" id="cpf" />
                    <Label htmlFor="cpf" className="flex-1 cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <Receipt className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-medium">Pessoa Física (CPF)</div>
                          <div className="text-sm text-muted-foreground">
                            Envio com documento de pessoa física
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent/20 cursor-pointer">
                    <RadioGroupItem value="cnpj" id="cnpj" />
                    <Label htmlFor="cnpj" className="flex-1 cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-medium">Pessoa Jurídica (CNPJ)</div>
                          <div className="text-sm text-muted-foreground">
                            Envio com documento de pessoa jurídica
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent/20 cursor-pointer">
                    <RadioGroupItem value="other" id="other" />
                    <Label htmlFor="other" className="flex-1 cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <Package className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-medium">Outros</div>
                          <div className="text-sm text-muted-foreground">
                            Outros tipos de documento
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate("/etiqueta")}
                className="flex-1 h-12"
              >
                Voltar
              </Button>
              <Button 
                type="submit"
                disabled={!isFormValid() || isLoading}
                className="flex-1 h-12 text-lg font-semibold bg-gradient-primary hover:shadow-primary transition-all duration-300"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                    <span>Processando...</span>
                  </div>
                ) : (
                  "Continuar para Pagamento"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Document;