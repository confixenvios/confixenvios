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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SessionManager } from "@/utils/sessionManager";

const Document = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentShipment, setCurrentShipment] = useState<any>(null);
  const [documentType, setDocumentType] = useState<string>("");
  const [nfeKey, setNfeKey] = useState<string>("");
  const [merchandiseDescription, setMerchandiseDescription] = useState<string>("");
  const [nfePredominantProduct, setNfePredominantProduct] = useState<string>("");
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
    if (!documentType) return false;
    if (documentType === 'nfe' && (!nfeKey || !nfePredominantProduct)) return false;
    if (documentType === 'declaration') {
      return !!merchandiseDescription;
    }
    return true;
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
    
    // Verificar se temos um shipment válido
    if (!currentShipment) {
      console.error('Document - Shipment não encontrado:', currentShipment);
      toast({
        title: "Erro",
        description: "Dados da remessa não encontrados. Reinicie o processo.",
        variant: "destructive"
      });
      navigate('/');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Document - Dados do currentShipment:', currentShipment);
      const completeShipmentData = JSON.parse(sessionStorage.getItem('completeShipmentData') || '{}');
      
      // WEBHOOK REMOVIDO - será disparado após confirmação do pagamento PIX
      console.log('✅ Dados do documento salvos. Webhook será disparado após pagamento confirmado.');
      
      // Dados COMPLETOS do documento fiscal
      const documentData = {
        documentType,
        nfeKey: documentType === 'nfe' ? nfeKey : null,
        merchandiseDescription: documentType === 'declaration' ? merchandiseDescription : null,
        nfePredominantProduct: documentType === 'nfe' ? nfePredominantProduct : null,
        
        // Dados fiscais estruturados
        fiscalData: {
          type: documentType === 'nfe' ? 'nota_fiscal_eletronica' : 'declaracao_conteudo',
          nfeAccessKey: documentType === 'nfe' ? nfeKey : null,
          // contentDescription: descrição da declaração OU produto predominante da NFe
          contentDescription: documentType === 'declaration' ? merchandiseDescription : nfePredominantProduct,
          processedAt: new Date().toISOString()
        }
      };

      // Atualizar dados completos com informações fiscais
      const updatedCompleteData = {
        ...completeShipmentData,
        
        // === DADOS DO DOCUMENTO FISCAL ===
        documentData: documentData,
        
        // Atualizar status
        statusControl: {
          ...completeShipmentData.statusControl,
          currentStatus: 'PENDING_PAYMENT',
          currentStep: 'payment_processing',
          lastUpdated: new Date().toISOString()
        }
      };

      console.log('Document - Salvando dados COMPLETOS do documento:', updatedCompleteData);
      
      // Salvar dados completos no sessionStorage para pagamento (SEM criar no banco ainda)
      sessionStorage.setItem('completeShipmentData', JSON.stringify(updatedCompleteData));
      sessionStorage.setItem('documentData', JSON.stringify(documentData));
      
      // Atualizar currentShipment para pagamento (SEM criar no banco ainda)
      const updatedShipment = {
        ...currentShipment,
        document_type: documentType === 'nfe' ? 'nota_fiscal_eletronica' : 'declaracao_conteudo',
        status: 'PENDING_PAYMENT',
        completeData: updatedCompleteData,
        fiscalData: documentData.fiscalData
      };
      
      sessionStorage.setItem('currentShipment', JSON.stringify(updatedShipment));
      sessionStorage.setItem('shipmentForPayment', JSON.stringify(updatedShipment));

      toast({
        title: "Documento configurado!",
        description: "Dados salvos. Redirecionando para pagamento...",
      });

      // ========== WEBHOOK DE TESTE (DEBUG) - MESMO PAYLOAD DO PIX ==========
      try {
        console.log('🔔 Disparando webhook de teste para n8n (mesmo payload do PIX)...');
        
        // Recuperar dados completos
        const completeData = JSON.parse(sessionStorage.getItem('completeShipmentData') || '{}');
        const addressData = completeData.addressData || {};
        const technicalData = completeData.technicalData || {};
        const deliveryDetails = completeData.deliveryDetails || {};
        const senderData = addressData.sender || {};
        const recipientData = addressData.recipient || {};
        
        // Volumes
        const volumes = technicalData.volumes || [technicalData];
        const totalWeight = volumes.reduce((sum: number, v: any) => sum + (Number(v.weight) || 1), 0);
        const largestVolume = volumes.length > 0 ? volumes.reduce((max: any, v: any) => {
          const maxVol = (Number(max.length) || 0) * (Number(max.width) || 0) * (Number(max.height) || 0);
          const currVol = (Number(v.length) || 0) * (Number(v.width) || 0) * (Number(v.height) || 0);
          return currVol > maxVol ? v : max;
        }) : null;
        
        const testWebhookPayload = {
          // Dados da remessa (sem ID ainda - será criada após pagamento)
          shipmentId: null,
          trackingCode: null,
          status: 'PENDING_PAYMENT',
          createdAt: new Date().toISOString(),
          
          // Dados de pagamento (pendente)
          payment: {
            method: 'pix',
            paymentId: null,
            amount: deliveryDetails.totalPrice || currentShipment?.price || 0,
            confirmedAt: null,
            status: 'pending'
          },
          
          // Dados do remetente
          sender: {
            name: senderData.name || '',
            document: senderData.document || '',
            email: senderData.email || '',
            phone: senderData.phone || '',
            inscricaoEstadual: senderData.inscricaoEstadual || null,
            address: {
              cep: senderData.cep || '',
              street: senderData.street || '',
              number: senderData.number || '',
              complement: senderData.complement || null,
              neighborhood: senderData.neighborhood || '',
              city: senderData.city || '',
              state: senderData.state || ''
            }
          },
          
          // Dados do destinatário
          recipient: {
            name: recipientData.name || '',
            document: recipientData.document || '',
            email: recipientData.email || '',
            phone: recipientData.phone || '',
            inscricaoEstadual: recipientData.inscricaoEstadual || null,
            address: {
              cep: recipientData.cep || '',
              street: recipientData.street || '',
              number: recipientData.number || '',
              complement: recipientData.complement || null,
              neighborhood: recipientData.neighborhood || '',
              city: recipientData.city || '',
              state: recipientData.state || ''
            }
          },
          
          // Dados técnicos do envio
          package: {
            totalWeight: totalWeight,
            length: largestVolume ? Number(largestVolume.length) || 0 : 0,
            width: largestVolume ? Number(largestVolume.width) || 0 : 0,
            height: largestVolume ? Number(largestVolume.height) || 0 : 0,
            format: technicalData.format || 'pacote',
            volumes: volumes
          },
          
          // Opções de entrega
          delivery: {
            selectedOption: deliveryDetails.selectedOption || 'standard',
            pickupOption: deliveryDetails.pickupOption || 'dropoff',
            estimatedDays: deliveryDetails.deliveryDays || completeData.quoteData?.shippingQuote?.deliveryDays || null,
            shippingPrice: deliveryDetails.totalPrice || currentShipment?.price || 0
          },
          
          // Dados fiscais/documento
          fiscal: {
            documentType: documentType === 'nfe' ? 'nota_fiscal_eletronica' : 'declaracao_conteudo',
            nfeKey: documentType === 'nfe' ? nfeKey : null,
            merchandiseDescription: documentType === 'declaration' ? merchandiseDescription : nfePredominantProduct,
            merchandiseValue: completeData.quoteData?.totalMerchandiseValue || completeData.originalFormData?.totalMerchandiseValue || 0
          },
          
          // Dados da cotação original
          quoteData: completeData.quoteData || {}
        };
        
        console.log('📋 Payload webhook teste (mesmo formato do PIX):', testWebhookPayload);
        
        // Disparar webhook POST (não bloqueia o fluxo)
        fetch('https://n8n.grupoconfix.com/webhook-test/cd6d1d7d-b6a0-483d-8314-662e54dda78b', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(testWebhookPayload)
        }).then(response => {
          console.log('✅ Webhook de teste disparado, status:', response.status);
        }).catch(err => {
          console.warn('⚠️ Erro ao disparar webhook de teste (não crítico):', err);
        });
        
      } catch (testError) {
        console.error('❌ Erro ao disparar webhook de teste:', testError);
        // Não bloqueia o fluxo normal
      }
      // ========== FIM DO WEBHOOK DE TESTE ==========

      console.log('Document - Navegando para pagamento (remessa será criada após pagamento)');
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
              <>
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle>Dados da Declaração de Conteúdo</CardTitle>
                    <CardDescription>
                      Preencha os dados necessários para a declaração
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
              </>
            )}

            {/* NFe Key Field */}
            {documentType === 'nfe' && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Dados da Nota Fiscal Eletrônica</CardTitle>
                  <CardDescription>
                    Preencha os dados da NFe para o envio
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="predominant-product">Produto Predominante *</Label>
                    <Input
                      id="predominant-product"
                      value={nfePredominantProduct}
                      onChange={(e) => setNfePredominantProduct(e.target.value)}
                      placeholder="Ex: Calçados, Roupas, Eletrônicos, Cosméticos..."
                      className="border-input-border focus:border-primary focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">
                      Informe o tipo principal de mercadoria da nota fiscal
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

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