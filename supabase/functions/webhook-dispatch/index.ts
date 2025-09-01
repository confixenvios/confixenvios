import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shipmentId, paymentData, documentData, selectedQuote, shipmentData } = await req.json();
    
    // Create service role client to bypass RLS
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`Processing webhook dispatch for shipment: ${shipmentId}`);

    // Get shipment data with related addresses
    const { data: shipment, error: shipmentError } = await supabaseService
      .from('shipments')
      .select(`
        *,
        sender_address:addresses!sender_address_id (*),
        recipient_address:addresses!recipient_address_id (*)
      `)
      .eq('id', shipmentId)
      .single();

    if (shipmentError || !shipment) {
      throw new Error(`Shipment not found: ${shipmentError?.message}`);
    }

    // Get active integration webhook URL
    const { data: integration, error: integrationError } = await supabaseService
      .from('integrations')
      .select('webhook_url, secret_key')
      .eq('active', true)
      .single();

    if (integrationError || !integration) {
      throw new Error(`No active integration found: ${integrationError?.message}`);
    }

    // Prepare complete webhook payload with all collected data
    const payload = {
      // Identificação da remessa
      shipmentId: shipment.id,
      trackingCode: shipment.tracking_code,
      quoteId: shipment.quote_data?.quoteId || 'QUOTE_' + shipment.id.substring(0, 8),
      status: shipment.status,
      createdAt: shipment.created_at,
      
      // Dados completos da cotação inicial
      cotacaoOriginal: {
        // CEPs
        cepOrigemInformado: selectedQuote?.completeQuoteData?.originCep || shipmentData?.completeQuoteData?.originCep || '74345-260',
        cepDestinoInformado: selectedQuote?.completeQuoteData?.destinyCep || shipmentData?.completeQuoteData?.destinyCep,
        
        // Detalhes da mercadoria
        mercadoria: {
          quantidade: selectedQuote?.completeQuoteData?.quantity || shipmentData?.completeQuoteData?.quantity || '1',
          valorUnitario: selectedQuote?.completeQuoteData?.unitValue || shipmentData?.completeQuoteData?.unitValue || '0',
          valorTotal: selectedQuote?.completeQuoteData?.totalMerchandiseValue || shipmentData?.completeQuoteData?.totalMerchandiseValue || '0'
        },
        
        // Detalhes do pacote  
        pacoteDetalhes: {
          pesoKg: selectedQuote?.completeQuoteData?.weight || shipmentData?.completeQuoteData?.weight || shipment.weight,
          comprimentoCm: selectedQuote?.completeQuoteData?.length || shipmentData?.completeQuoteData?.length || shipment.length,
          larguraCm: selectedQuote?.completeQuoteData?.width || shipmentData?.completeQuoteData?.width || shipment.width,
          alturaCm: selectedQuote?.completeQuoteData?.height || shipmentData?.completeQuoteData?.height || shipment.height,
          formato: selectedQuote?.completeQuoteData?.format || shipmentData?.completeQuoteData?.format || shipment.format
        },
        
        // Resultado da cotação
        resultadoCotacao: {
          origem: 'Aparecida de Goiânia - GO',
          destino: shipment.recipient_address?.city + ' - ' + shipment.recipient_address?.state,
          precoEconomico: selectedQuote?.completeQuoteData?.shippingQuote?.economicPrice || selectedQuote?.quoteData?.economicPrice,
          precoExpresso: selectedQuote?.completeQuoteData?.shippingQuote?.expressPrice || selectedQuote?.quoteData?.expressPrice,
          prazoEconomico: selectedQuote?.completeQuoteData?.shippingQuote?.economicDays || selectedQuote?.quoteData?.economicDays,
          prazoExpresso: selectedQuote?.completeQuoteData?.shippingQuote?.expressDays || selectedQuote?.quoteData?.expressDays,
          zona: selectedQuote?.completeQuoteData?.shippingQuote?.zone || selectedQuote?.quoteData?.zone,
          zoneName: selectedQuote?.completeQuoteData?.shippingQuote?.zoneName || selectedQuote?.quoteData?.zoneName
        },
        
        calculadoEm: selectedQuote?.completeQuoteData?.calculatedAt || new Date().toISOString()
      },
      
      // Opções de coleta selecionadas
      opcaoColeta: {
        tipo: shipment.pickup_option,
        descricao: shipment.pickup_option === 'pickup' ? 'Coleta no Local' : 'Postagem em Agência',
        enderecoIgualOrigemRemetente: selectedQuote?.pickupDetails?.sameAsOrigin || shipmentData?.pickupDetails?.sameAsOrigin || true,
        enderecoAlternativo: selectedQuote?.pickupDetails?.alternativeAddress || shipmentData?.pickupDetails?.alternativeAddress || null,
        custoColeta: shipment.pickup_option === 'pickup' ? 10.00 : 0.00
      },
      
      // Dados completos do remetente
      remetente: {
        dadosPessoais: {
          nome: shipment.sender_address?.name,
          cpfCnpj: shipment.sender_address?.document,
          telefone: shipment.sender_address?.phone,
          email: shipment.sender_address?.email
        },
        endereco: {
          cep: shipment.sender_address?.cep,
          logradouro: shipment.sender_address?.street,
          numero: shipment.sender_address?.number,
          complemento: shipment.sender_address?.complement,
          bairro: shipment.sender_address?.neighborhood,
          cidade: shipment.sender_address?.city,
          estado: shipment.sender_address?.state,
          referencia: shipment.sender_address?.reference
        }
      },
      
      // Dados completos do destinatário
      destinatario: {
        dadosPessoais: {
          nome: shipment.recipient_address?.name,
          cpfCnpj: shipment.recipient_address?.document,
          telefone: shipment.recipient_address?.phone,
          email: shipment.recipient_address?.email
        },
        endereco: {
          cep: shipment.recipient_address?.cep,
          logradouro: shipment.recipient_address?.street,
          numero: shipment.recipient_address?.number,
          complemento: shipment.recipient_address?.complement,
          bairro: shipment.recipient_address?.neighborhood,
          cidade: shipment.recipient_address?.city,
          estado: shipment.recipient_address?.state,
          referencia: shipment.recipient_address?.reference
        }
      },
      
      // Dados completos do documento fiscal
      documentoFiscal: {
        tipo: documentData?.documentType || 'declaration',
        descricao: documentData?.documentType === 'nfe' ? 'Nota Fiscal Eletrônica' : 'Declaração de Conteúdo',
        chaveNfe: documentData?.nfeKey || null,
        descricaoMercadoria: documentData?.merchandiseDescription || null,
        informadoEm: new Date().toISOString()
      },
      
      // Resumo financeiro completo
      resumoFinanceiro: {
        valorMercadoria: selectedQuote?.completeQuoteData?.totalMerchandiseValue || 0,
        valorFrete: selectedQuote?.completeQuoteData?.shippingQuote?.economicPrice || selectedQuote?.quoteData?.economicPrice || 0,
        valorColeta: shipment.pickup_option === 'pickup' ? 10.00 : 0.00,
        valorTotal: paymentData?.amount || selectedQuote?.totalPrice || 0,
        metodoPagamento: paymentData?.method || shipment.payment_data?.method || 'CARTAO',
        statusPagamento: paymentData?.status || 'PAGO',
        processadoEm: new Date().toISOString()
      },
      
      // Dados técnicos do pacote
      especificacoesTecnicas: {
        pesoKg: parseFloat(shipment.weight),
        dimensoes: {
          comprimentoCm: parseFloat(shipment.length),
          larguraCm: parseFloat(shipment.width),
          alturaCm: parseFloat(shipment.height)
        },
        formato: shipment.format?.toUpperCase(),
        volumeM3: (parseFloat(shipment.length) * parseFloat(shipment.width) * parseFloat(shipment.height)) / 1000000
      },
      
      // Metadados do processo
      metadados: {
        processadoEm: new Date().toISOString(),
        fonte: 'lovable-shipping-app',
        versao: '1.0',
        todosOsDadosColetados: true,
        etapasCompletas: ['cotacao', 'opcoes_coleta', 'dados_etiqueta', 'documento_fiscal', 'pagamento'],
        usuario: {
          autenticado: true,
          processouFluxoCompleto: true
        }
      }
    };

    console.log(`Sending webhook to: ${integration.webhook_url}`);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    // Send webhook to external system
    const webhookResponse = await fetch(integration.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(integration.secret_key && { 'Authorization': `Bearer ${integration.secret_key}` })
      },
      body: JSON.stringify(payload)
    });

    const webhookResult = await webhookResponse.text();
    console.log(`Webhook response status: ${webhookResponse.status}`);
    console.log(`Webhook response body: ${webhookResult}`);

    // Update shipment status to AWAITING_LABEL
    const { error: updateError } = await supabaseService
      .from('shipments')
      .update({ 
        status: 'AWAITING_LABEL',
        updated_at: new Date().toISOString()
      })
      .eq('id', shipmentId);

    if (updateError) {
      console.error('Error updating shipment status:', updateError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Webhook dispatched successfully',
      webhookStatus: webhookResponse.status,
      webhookResponse: webhookResult
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in webhook-dispatch:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);