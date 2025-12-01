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
    if (documentType === 'nfe' && !nfeKey) return false;
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
        
        // Dados fiscais estruturados
        fiscalData: {
          type: documentType === 'nfe' ? 'nota_fiscal_eletronica' : 'declaracao_conteudo',
          nfeAccessKey: documentType === 'nfe' ? nfeKey : null,
          contentDescription: documentType === 'declaration' ? merchandiseDescription : null,
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

      // ========== WEBHOOK DE TESTE (DEBUG) ==========
      try {
        console.log('🔍 Disparando webhook de teste para debug...');
        
        // Recuperar dados completos (mesma estrutura do webhook PIX)
        const completeShipmentData = JSON.parse(sessionStorage.getItem('completeShipmentData') || '{}');
        
        console.log('📦 Dados completos recuperados:', completeShipmentData);
        
        // Extrair estruturas de dados
        const addressData = completeShipmentData.addressData || {};
        const technicalData = completeShipmentData.technicalData || {};
        const deliveryDetails = completeShipmentData.deliveryDetails || {};
        const shippingQuote = completeShipmentData.shippingQuote || {};
        
        // Dados pessoais estão dentro de addressData.sender e addressData.recipient
        const sender = addressData.sender || {};
        const recipient = addressData.recipient || {};
        
        console.log('👤 Sender:', sender);
        console.log('👤 Recipient:', recipient);
        
        const queryParams = new URLSearchParams();
        
        // Valor total do frete
        const valorFrete = deliveryDetails.totalPrice || currentShipment.price || 0;
        queryParams.append('valorTotal', String(valorFrete));
        
        // Valor declarado da mercadoria
        const valorDeclarado = completeShipmentData.quoteData?.totalMerchandiseValue || 
                              completeShipmentData.originalFormData?.totalMerchandiseValue || 
                              currentShipment.declaredValue || 0;
        queryParams.append('mercadoria_valorDeclarado', String(valorDeclarado));
        
        // Prazo de entrega
        queryParams.append('remessa_prazo', String(deliveryDetails.deliveryDays || shippingQuote.deliveryDays || currentShipment.deliveryTime || 5));
        
        // Dados da transportadora selecionada
        queryParams.append('transportadora_nome', shippingQuote.carrierName || deliveryDetails.selectedCarrier || currentShipment.carrier || 'Confix');
        queryParams.append('transportadora_servico', deliveryDetails.selectedOption || currentShipment.serviceType || 'standard');
        
        // CNPJ do transportador destino (sempre vazio)
        queryParams.append('cnpjTransportadorDestinto', '');
        
        // Expedidor (sempre "Juri Express")
        queryParams.append('expedidor', 'Juri Express');
        
        // Dados do remetente (TOMADOR DO SERVIÇO)
        queryParams.append('remetente_nome', sender.name || '');
        queryParams.append('remetente_documento', sender.document || '');
        queryParams.append('remetente_inscricaoEstadual', sender.inscricaoEstadual || '');
        queryParams.append('remetente_email', sender.email || '');
        queryParams.append('remetente_telefone', sender.phone || '');
        queryParams.append('remetente_endereco', sender.street || '');
        queryParams.append('remetente_numero', sender.number || '');
        queryParams.append('remetente_complemento', sender.complement || '');
        queryParams.append('remetente_bairro', sender.neighborhood || '');
        queryParams.append('remetente_cidade', sender.city || '');
        queryParams.append('remetente_estado', sender.state || '');
        queryParams.append('remetente_cep', sender.cep || '');
        
        // Dados do destinatário
        queryParams.append('destinatario_nome', recipient.name || '');
        queryParams.append('destinatario_documento', recipient.document || '');
        queryParams.append('destinatario_inscricaoEstadual', recipient.inscricaoEstadual || '');
        queryParams.append('destinatario_email', recipient.email || '');
        queryParams.append('destinatario_telefone', recipient.phone || '');
        queryParams.append('destinatario_endereco', recipient.street || '');
        queryParams.append('destinatario_numero', recipient.number || '');
        queryParams.append('destinatario_complemento', recipient.complement || '');
        queryParams.append('destinatario_bairro', recipient.neighborhood || '');
        queryParams.append('destinatario_cidade', recipient.city || '');
        queryParams.append('destinatario_estado', recipient.state || '');
        queryParams.append('destinatario_cep', recipient.cep || '');
        
        // Dados do documento fiscal
        if (documentType === 'nfe') {
          queryParams.append('chaveNotaFiscal', nfeKey || '');
        } else {
          // Para declaração de conteúdo, enviar chave fictícia
          queryParams.append('chaveNotaFiscal', '99999999999999999999999999999999999999999999');
          queryParams.append('descricaoMercadoria', merchandiseDescription || 'Mercadoria Geral');
        }
        
        // Dados técnicos da remessa
        const primeiroVolume = technicalData.volumes?.[0] || technicalData;
        queryParams.append('remessa_peso', String(technicalData.consideredWeight || technicalData.weight || 1));
        queryParams.append('remessa_cubagemTotal', (technicalData.totalCubicWeight || 0).toFixed(3));
        queryParams.append('remessa_largura', String(primeiroVolume.width || technicalData.width || 15));
        queryParams.append('remessa_comprimento', String(primeiroVolume.length || technicalData.length || 20));
        queryParams.append('remessa_altura', String(primeiroVolume.height || technicalData.height || 10));
        queryParams.append('remessa_formato', primeiroVolume.merchandiseType || 'caixa');
        
        // Informações detalhadas de cada volume
        const volumes = technicalData.volumes || [technicalData];
        volumes.forEach((volume: any, index: number) => {
          const volumeNumber = index + 1;
          const volumePrefix = `volume${volumeNumber}`;
          
          queryParams.append(`${volumePrefix}_peso`, String(volume.weight || 1));
          queryParams.append(`${volumePrefix}_comprimento`, String(volume.length || 20));
          queryParams.append(`${volumePrefix}_largura`, String(volume.width || 15));
          queryParams.append(`${volumePrefix}_altura`, String(volume.height || 10));
          
          const volumeCubagem = ((volume.length || 20) * (volume.width || 15) * (volume.height || 10)) / 1000000;
          queryParams.append(`${volumePrefix}_cubagemVolume`, volumeCubagem.toFixed(3));
          queryParams.append(`${volumePrefix}_tipoMercadoria`, volume.merchandiseType || 'Normal');
        });
        
        // URL de teste
        const testWebhookUrl = `https://n8n.grupoconfix.com/webhook-test/cd6d1d7d-b6a0-483d-8314-662e54dda78b?${queryParams.toString()}`;
        
        console.log('🔍 Query params construídos:', Object.fromEntries(queryParams.entries()));
        console.log('🔍 URL completa:', testWebhookUrl);
        
        // Disparar webhook (não aguardar resposta para não bloquear)
        fetch(testWebhookUrl, { method: 'GET' }).catch(err => {
          console.warn('⚠️ Erro ao disparar webhook de teste (não crítico):', err);
        });
        
        console.log('✅ Webhook de teste disparado com sucesso');
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