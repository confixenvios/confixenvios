import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Package, ArrowRight, Eye } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const PixPaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isCreatingShipment, setIsCreatingShipment] = useState(false);
  const [shipmentId, setShipmentId] = useState(null);
  
  // Get payment data from location state
  const { paymentId, amount } = location.state || {};
  
  useEffect(() => {
    console.log('PixPaymentSuccess - Verificando dados:', { paymentId, amount });
    
    if (!paymentId || !amount) {
      console.log('PixPaymentSuccess - Dados insuficientes, redirecionando...');
      navigate('/');
      return;
    }
    
    // Automaticamente criar a remessa quando chegar na página de sucesso
    createShipment();
  }, [paymentId, amount]);

  const createShipment = async () => {
    try {
      setIsCreatingShipment(true);
      console.log('🚚 Criando remessa após pagamento PIX confirmado...');

      // Recuperar TODOS os dados completos do sessionStorage
      const completeShipmentData = JSON.parse(sessionStorage.getItem('completeShipmentData') || '{}');
      const documentData = JSON.parse(sessionStorage.getItem('documentData') || '{}');
      
      console.log('Dados completos recuperados:', completeShipmentData);
      console.log('Dados do documento:', documentData);

      // Verificar se temos todos os dados necessários
      if (!completeShipmentData.addressData) {
        throw new Error('Dados de endereços não encontrados');
      }

      // 1. Criar endereços com os dados corretos do formulário
      const senderData = completeShipmentData.addressData.sender;
      const recipientData = completeShipmentData.addressData.recipient;

      const senderAddressData = {
        user_id: user?.id || null,
        address_type: 'sender',
        name: senderData.name,
        cep: senderData.cep,
        street: senderData.street,
        number: senderData.number,
        complement: senderData.complement || null,
        neighborhood: senderData.neighborhood,
        city: senderData.city,
        state: senderData.state,
        reference: senderData.reference || null,
        session_id: user ? null : completeShipmentData.metadata?.session_id
      };

      const recipientAddressData = {
        user_id: user?.id || null,
        address_type: 'recipient',
        name: recipientData.name,
        cep: recipientData.cep,
        street: recipientData.street,
        number: recipientData.number,
        complement: recipientData.complement || null,
        neighborhood: recipientData.neighborhood,
        city: recipientData.city,
        state: recipientData.state,
        reference: recipientData.reference || null,
        session_id: user ? null : completeShipmentData.metadata?.session_id
      };

      console.log('Criando endereço do remetente...', senderAddressData);
      const { data: senderAddress, error: senderError } = await supabase
        .from('addresses')
        .insert(senderAddressData)
        .select()
        .single();

      if (senderError) {
        console.error('Erro ao criar endereço remetente:', senderError);
        throw senderError;
      }

      console.log('Criando endereço do destinatário...', recipientAddressData);
      const { data: recipientAddress, error: recipientError } = await supabase
        .from('addresses')
        .insert(recipientAddressData)
        .select()
        .single();

      if (recipientError) {
        console.error('Erro ao criar endereço destinatário:', recipientError);
        throw recipientError;
      }

      if (recipientError) {
        console.error('Erro ao criar endereço destinatário:', recipientError);
        throw recipientError;
      }

      // 2. Criar remessa com TODOS os dados do formulário
      const trackingCode = `ID${new Date().getFullYear()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      // Incluir dados do documento no quote_data
      const enrichedQuoteData = {
        ...completeShipmentData,
        // Incluir dados do documento
        documentType: documentData.documentType,
        nfeKey: documentData.nfeKey,
        merchandiseDescription: documentData.merchandiseDescription,
        fiscalData: documentData.fiscalData,
        // Manter compatibilidade com nomes alternativos
        nfeChave: documentData.nfeKey,
        descricaoMercadoria: documentData.merchandiseDescription
      };
      
      // Extrair peso total e dimensões do maior volume para a tabela shipments
      const volumes = completeShipmentData.merchandiseDetails?.volumes || 
                     completeShipmentData.technicalData?.volumes || 
                     completeShipmentData.originalFormData?.volumes || [];
      
      // Peso total = soma dos pesos de todos os volumes
      const totalWeight = volumes.reduce((sum: number, vol: any) => sum + (Number(vol.weight) || 0), 0) || 
                         completeShipmentData.technicalData?.totalWeight || 1;
      
      // Dimensões = usar o maior volume como referência (ou 0 se não houver)
      const largestVolume = volumes.length > 0 
        ? volumes.reduce((max: any, vol: any) => {
            const currentSize = (Number(vol.length) || 0) * (Number(vol.width) || 0) * (Number(vol.height) || 0);
            const maxSize = (Number(max.length) || 0) * (Number(max.width) || 0) * (Number(max.height) || 0);
            return currentSize > maxSize ? vol : max;
          }, volumes[0])
        : null;
      
      const newShipmentData = {
        tracking_code: trackingCode,
        user_id: user?.id || null,
        session_id: user ? null : completeShipmentData.metadata?.session_id,
        sender_address_id: senderAddress.id,
        recipient_address_id: recipientAddress.id,
        weight: totalWeight,
        length: largestVolume ? Number(largestVolume.length) || 0 : 0,
        width: largestVolume ? Number(largestVolume.width) || 0 : 0,
        height: largestVolume ? Number(largestVolume.height) || 0 : 0,
        format: completeShipmentData.technicalData?.format || 'pacote',
        pickup_option: completeShipmentData.deliveryDetails?.pickupOption || 'dropoff',
        selected_option: completeShipmentData.deliveryDetails?.selectedOption || 'standard',
        document_type: documentData.fiscalData?.type || 'declaracao_conteudo',
        // Salvar TODOS os dados completos no quote_data incluindo documento
        quote_data: enrichedQuoteData,
        payment_data: {
          method: 'pix',
          payment_id: paymentId,
          amount: amount,
          confirmed_at: new Date().toISOString(),
          pix_details: {
            payment_id: paymentId,
            amount: amount
          }
        },
        status: 'PAYMENT_CONFIRMED'
      };

      console.log('Criando remessa com dados completos:', newShipmentData);
      const { data: newShipment, error: shipmentError } = await supabase
        .from('shipments')
        .insert(newShipmentData)
        .select()
        .single();

      if (shipmentError) {
        console.error('Erro ao criar remessa:', shipmentError);
        throw shipmentError;
      }

      console.log('✅ Remessa criada com sucesso:', newShipment);
      setShipmentId(newShipment.id);
      
      // ===== DISPARAR WEBHOOK APÓS PAGAMENTO CONFIRMADO =====
      try {
        console.log('🔔 Disparando webhook após pagamento confirmado...');
        
        // Preparar dados para o webhook
        const addressData = completeShipmentData.addressData || {};
        const technicalData = completeShipmentData.technicalData || {};
        const deliveryDetails = completeShipmentData.deliveryDetails || {};
        const shippingQuote = completeShipmentData.shippingQuote || {};
        
        // Dados pessoais estão dentro de addressData.sender e addressData.recipient
        const sender = addressData.sender || {};
        const recipient = addressData.recipient || {};
        
        const queryParams = new URLSearchParams();
        
        // Valor total do frete - pegar do deliveryDetails ou do amount pago
        const valorFrete = deliveryDetails.totalPrice || amount || 0;
        queryParams.append('valorTotal', String(valorFrete));
        
        // Valor declarado da mercadoria - pegar dos dados do formulário original
        const valorDeclarado = completeShipmentData.quoteData?.totalMerchandiseValue || 
                              completeShipmentData.originalFormData?.totalMerchandiseValue || 0;
        queryParams.append('mercadoria_valorDeclarado', String(valorDeclarado));
        
        // Prazo de entrega
        queryParams.append('remessa_prazo', String(deliveryDetails.deliveryDays || shippingQuote.deliveryDays || 5));
        
        // Dados da transportadora selecionada
        queryParams.append('transportadora_nome', shippingQuote.carrierName || deliveryDetails.selectedCarrier || 'Confix');
        queryParams.append('transportadora_servico', deliveryDetails.selectedOption || 'standard');
        
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
        if (documentData.documentType === 'nfe') {
          queryParams.append('chaveNotaFiscal', documentData.nfeKey || '');
        } else {
          // Para declaração de conteúdo, enviar chave fictícia
          queryParams.append('chaveNotaFiscal', '99999999999999999999999999999999999999999999');
          queryParams.append('descricaoMercadoria', documentData.merchandiseDescription || 'Mercadoria Geral');
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
        volumes.forEach((volume, index) => {
          const volumeNumber = index + 1;
          const volumePrefix = `volume${volumeNumber}`;
          
          // Dados básicos do volume
          queryParams.append(`${volumePrefix}_peso`, String(volume.weight || 1));
          queryParams.append(`${volumePrefix}_comprimento`, String(volume.length || 20));
          queryParams.append(`${volumePrefix}_largura`, String(volume.width || 15));
          queryParams.append(`${volumePrefix}_altura`, String(volume.height || 10));
          
          // Cubagem individual do volume (calculada em m³)
          const volumeCubagem = ((volume.length || 20) * (volume.width || 15) * (volume.height || 10)) / 1000000;
          queryParams.append(`${volumePrefix}_cubagemVolume`, volumeCubagem.toFixed(3));
          
          // Tipo de mercadoria do volume
          queryParams.append(`${volumePrefix}_tipoMercadoria`, volume.merchandiseType || 'Normal');
        });
        
        // Adicionar shipmentId e trackingCode para o webhook poder associar o CT-e
        queryParams.append('shipmentId', newShipment.id);
        queryParams.append('trackingCode', trackingCode);
        
        const webhookUrl = `https://webhook.grupoconfix.com/webhook/cd6d1d7d-b6a0-483d-8314-662e54dda78b?${queryParams.toString()}`;
        
        console.log('🌐 URL do webhook:', webhookUrl);

        // Fazer chamada ao webhook
        const webhookResponse = await fetch(webhookUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        console.log('📡 Resposta do webhook:', webhookResponse.status, webhookResponse.statusText);
        
        if (webhookResponse.ok) {
          console.log('✅ Webhook disparado com sucesso! CT-e será processado pelo n8n.');
        } else {
          const errorText = await webhookResponse.text();
          console.error('⚠️ Erro na resposta do webhook:', errorText);
          // Não falhar a criação da remessa por erro no webhook
        }
        
      } catch (webhookError) {
        console.error('⚠️ Erro ao disparar webhook (não bloqueante):', webhookError);
        // Não falhar a criação da remessa por erro no webhook
      }
      
      // Limpar dados do sessionStorage após criar a remessa
      sessionStorage.removeItem('completeShipmentData');
      sessionStorage.removeItem('documentData');
      sessionStorage.removeItem('currentShipment');
      sessionStorage.removeItem('shipmentForPayment');
      
      toast({
        title: "🎉 Remessa criada com sucesso!",
        description: `Código de rastreio: ${trackingCode}`
      });

    } catch (error) {
      console.error('Erro ao criar remessa:', error);
      toast({
        title: "Erro ao criar remessa",
        description: "Ocorreu um erro ao processar sua remessa. Entre em contato conosco.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingShipment(false);
    }
  };

  const handleViewShipments = () => {
    navigate('/cliente/remessas');
  };

  const handleNewShipment = () => {
    navigate('/');
  };

  if (isCreatingShipment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background/80 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Processando sua remessa...</h2>
            <p className="text-muted-foreground">Aguarde enquanto criamos sua remessa</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Pagamento Confirmado!
          </h1>
          <p className="text-muted-foreground">
            Seu PIX foi processado com sucesso
          </p>
        </div>

        {/* Payment Details */}
        <Card className="border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Detalhes do Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">ID do Pagamento:</span>
              <span className="font-mono text-sm">{paymentId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Valor Pago:</span>
              <span className="font-semibold text-green-600">R$ {amount?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Método:</span>
              <span>PIX</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status:</span>
              <span className="text-green-600 font-semibold">Confirmado</span>
            </div>
          </CardContent>
        </Card>

        {/* Shipment Status */}
        <Card className="border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Status da Remessa
            </CardTitle>
          </CardHeader>
          <CardContent>
            {shipmentId ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold">Remessa criada com sucesso!</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    ID da Remessa: {shipmentId}
                  </p>
                </div>
                
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>✅ Pagamento confirmado</p>
                  <p>✅ Remessa registrada no sistema</p>
                  <p>🏷️ Em breve você receberá a etiqueta por email</p>
                  <p>📦 Acompanhe o status na área do cliente</p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                  <span className="font-semibold">Processando remessa...</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  Aguarde enquanto processamos seus dados
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button 
            onClick={handleViewShipments}
            className="w-full"
            size="lg"
          >
            <Eye className="h-4 w-4 mr-2" />
            Ver Minhas Remessas
          </Button>
          
          <Button 
            onClick={handleNewShipment}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <Package className="h-4 w-4 mr-2" />
            Fazer Nova Cotação
          </Button>
        </div>

        {/* Help */}
        <Card className="border-border/50 mt-6">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              <p className="mb-2">Precisa de ajuda?</p>
              <p>Entre em contato conosco pelo WhatsApp: (62) 99999-9999</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PixPaymentSuccess;