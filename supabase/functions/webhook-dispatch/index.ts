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
      
      // Dados da cotação original
      cotacao: {
        origem: selectedQuote?.quoteData?.origin || 'Aparecida de Goiânia - GO',
        destino: selectedQuote?.quoteData?.destiny || shipment.recipient_address?.city,
        peso: selectedQuote?.quoteData?.weight || shipment.weight,
        dimensoes: {
          comprimento: selectedQuote?.quoteData?.length || shipment.length,
          largura: selectedQuote?.quoteData?.width || shipment.width,
          altura: selectedQuote?.quoteData?.height || shipment.height,
          formato: selectedQuote?.quoteData?.format || shipment.format
        },
        precoEconomico: selectedQuote?.quoteData?.economicPrice,
        precoExpresso: selectedQuote?.quoteData?.expressPrice,
        prazoEconomico: selectedQuote?.quoteData?.economicDays,
        prazoExpresso: selectedQuote?.quoteData?.expressDays,
        opcaoEscolhida: selectedQuote?.option || shipment.selected_option,
        zona: selectedQuote?.quoteData?.zone,
        totalPrice: selectedQuote?.totalPrice
      },
      
      // Modo de coleta
      pickupMode: shipment.pickup_option,
      coletaAlternativa: shipment.quote_data?.coletaAlternativa,
      
      // Dados do remetente
      remetente: {
        nome: shipment.sender_address?.name,
        cpfCnpj: shipment.sender_address?.document,
        telefone: shipment.sender_address?.phone,
        email: shipment.sender_address?.email,
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
      
      // Dados do destinatário
      destinatario: {
        nome: shipment.recipient_address?.name,
        cpfCnpj: shipment.recipient_address?.document,
        telefone: shipment.recipient_address?.phone,
        email: shipment.recipient_address?.email,
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
      
      // Dados do documento fiscal
      documento: {
        tipo: documentData?.documentType || 'declaration',
        chaveNfe: documentData?.nfeKey || null,
        descricaoMercadoria: documentData?.merchandiseDescription || null
      },
      
      // Dados do pacote
      pacote: {
        pesoKg: shipment.weight,
        comprimentoCm: shipment.length,
        larguraCm: shipment.width,
        alturaCm: shipment.height,
        formato: shipment.format?.toUpperCase()
      },
      
      // Dados do pagamento
      pagamento: {
        metodo: paymentData?.method || shipment.payment_data?.method || 'CARTAO',
        valor: paymentData?.amount || shipment.payment_data?.amount || selectedQuote?.totalPrice || 0,
        status: paymentData?.status || 'PAGO',
        processedAt: new Date().toISOString()
      },
      
      // Metadados do fluxo
      metadata: {
        processedAt: new Date().toISOString(),
        source: 'lovable-shipping-app',
        version: '1.0',
        allDataCollected: true
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