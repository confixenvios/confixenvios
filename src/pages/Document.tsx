import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Package, FileText, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Document = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentShipment, setCurrentShipment] = useState<any>(null);
  const [documentType, setDocumentType] = useState<string>("");
  const [nfeKey, setNfeKey] = useState<string>("");
  const [merchandiseDescription, setMerchandiseDescription] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedShipment = sessionStorage.getItem('currentShipment');
    if (!savedShipment) {
      navigate('/');
      return;
    }
    setCurrentShipment(JSON.parse(savedShipment));
  }, [navigate]);

  const isFormValid = () => {
    if (!documentType) return false;
    if (documentType === 'nfe' && !nfeKey) return false;
    if (documentType === 'declaration' && !merchandiseDescription) return false;
    return true;
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

    setIsLoading(true);

    try {
      const documentData = {
        documentType,
        nfeKey: documentType === 'nfe' ? nfeKey : null,
        merchandiseDescription: documentType === 'declaration' ? merchandiseDescription : null,
        shipment: currentShipment
      };

      sessionStorage.setItem('documentData', JSON.stringify(documentData));

      toast({
        title: "Documento configurado!",
        description: "Redirecionando para pagamento...",
      });

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
              Documento <span className="bg-gradient-primary bg-clip-text text-transparent">Fiscal</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Configure os dados fiscais do seu envio
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Shipment Info */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-primary" />
                  <span>Envio {currentShipment.tracking_code}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <div className="font-medium">{currentShipment.status}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Peso:</span>
                    <div className="font-medium">{currentShipment.weight}kg</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Opção:</span>
                    <div className="font-medium">
                      {currentShipment.selected_option === 'economic' ? 'Menor Preço' : 'Menor Prazo'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Document Type */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span>Tipo de Documento</span>
                </CardTitle>
                <CardDescription>
                  Escolha o tipo de documento fiscal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={documentType} onValueChange={setDocumentType}>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent/20 cursor-pointer">
                    <RadioGroupItem value="declaration" id="declaration" />
                    <Label htmlFor="declaration" className="flex-1 cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <Receipt className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-medium">Declaração de Conteúdo</div>
                          <div className="text-sm text-muted-foreground">
                            Para envios sem nota fiscal (apenas cartão)
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent/20 cursor-pointer">
                    <RadioGroupItem value="nfe" id="nfe" />
                    <Label htmlFor="nfe" className="flex-1 cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-medium">Nota Fiscal Eletrônica</div>
                          <div className="text-sm text-muted-foreground">
                            Com chave de acesso NFe (Pix, Boleto, Cartão)
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Merchandise Description Field */}
            {documentType === 'declaration' && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Descrição da Mercadoria</CardTitle>
                  <CardDescription>
                    Descreva detalhadamente o conteúdo do envio
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="merchandise-description">Descrição do conteúdo *</Label>
                    <Textarea
                      id="merchandise-description"
                      value={merchandiseDescription}
                      onChange={(e) => setMerchandiseDescription(e.target.value)}
                      placeholder="Descreva o que está sendo enviado (ex: 2 pares de tênis esportivos, cor preta, tamanho 42)"
                      rows={4}
                      className="border-input-border focus:border-primary focus:ring-primary resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Seja específico para evitar problemas na entrega
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* NFe Key Field */}
            {documentType === 'nfe' && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Chave de Acesso da NFe</CardTitle>
                  <CardDescription>
                    Digite a chave de 44 dígitos da Nota Fiscal Eletrônica
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="nfe-key">Chave de Acesso *</Label>
                    <Input
                      id="nfe-key"
                      value={nfeKey}
                      onChange={(e) => setNfeKey(e.target.value)}
                      placeholder="00000000000000000000000000000000000000000000"
                      maxLength={44}
                      className="border-input-border focus:border-primary focus:ring-primary font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      {nfeKey.length}/44 dígitos
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <div className="flex space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate("/resultados")}
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