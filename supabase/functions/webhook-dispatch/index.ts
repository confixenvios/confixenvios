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

    // Prepare consolidated webhook payload as specified
    const payload = {
      event: "shipment_confirmed",
      shipmentId: shipment.id,
      clienteId: shipment.user_id || "GUEST",
      status: "PAGO_AGUARDANDO_ETIQUETA",

      // DADOS COMPLETOS DA COTAÇÃO ORIGINAL
      cotacao: {
        originCep: selectedQuote?.completeQuoteData?.originCep || shipmentData?.quoteData?.originCep || "",
        destinyCep: selectedQuote?.completeQuoteData?.destinyCep || shipmentData?.quoteData?.destinyCep || "",
        weight: selectedQuote?.completeQuoteData?.weight || shipmentData?.weight || 0,
        length: selectedQuote?.completeQuoteData?.length || shipmentData?.length || 0,
        width: selectedQuote?.completeQuoteData?.width || shipmentData?.width || 0,
        height: selectedQuote?.completeQuoteData?.height || shipmentData?.height || 0,
        format: selectedQuote?.completeQuoteData?.format || shipmentData?.format || "",
        quantity: selectedQuote?.completeQuoteData?.quantity || shipmentData?.quoteData?.quantity || 1,
        unitValue: selectedQuote?.completeQuoteData?.unitValue || shipmentData?.quoteData?.unitValue || 0,
        totalMerchandiseValue: selectedQuote?.completeQuoteData?.totalMerchandiseValue || shipmentData?.quoteData?.totalMerchandiseValue || 0,
        calculatedAt: selectedQuote?.completeQuoteData?.calculatedAt || shipmentData?.quoteData?.calculatedAt || new Date().toISOString(),
        shippingQuote: selectedQuote?.completeQuoteData?.shippingQuote || shipmentData?.quoteData?.shippingQuote || {}
      },

      // OPÇÕES DE COLETA E ENTREGA
      opcoes: {
        pickupOption: selectedQuote?.pickup || shipmentData?.pickupOption || shipmentData?.pickupDetails?.option || "",
        selectedOption: selectedQuote?.option || shipmentData?.selectedOption || "standard",
        totalPrice: selectedQuote?.totalPrice || shipmentData?.totalPrice || 0,
        pickupDetails: shipmentData?.pickupDetails || {
          option: selectedQuote?.pickup || "",
          sameAsOrigin: true,
          alternativeAddress: ""
        }
      },

      remetente: {
        nome: shipment.sender_address?.name || "",
        cpfCnpj: shipmentData?.senderData?.document || "",
        telefone: shipmentData?.senderData?.phone || "",
        email: shipmentData?.senderData?.email || "",
        cep: shipment.sender_address?.cep || "",
        endereco: shipment.sender_address?.street || "",
        numero: shipment.sender_address?.number || "",
        complemento: shipment.sender_address?.complement || "",
        bairro: shipment.sender_address?.neighborhood || "",
        cidade: shipment.sender_address?.city || "",
        estado: shipment.sender_address?.state || "",
        referencia: shipment.sender_address?.reference || ""
      },

      destinatario: {
        nome: shipment.recipient_address?.name || "",
        cpfCnpj: shipmentData?.recipientData?.document || "",
        telefone: shipmentData?.recipientData?.phone || "",
        email: shipmentData?.recipientData?.email || "",
        cep: shipment.recipient_address?.cep || "",
        endereco: shipment.recipient_address?.street || "",
        numero: shipment.recipient_address?.number || "",
        complemento: shipment.recipient_address?.complement || "",
        bairro: shipment.recipient_address?.neighborhood || "",
        cidade: shipment.recipient_address?.city || "",
        estado: shipment.recipient_address?.state || "",
        referencia: shipment.recipient_address?.reference || ""
      },

      pacote: {
        pesoKg: parseFloat(shipment.weight) || 0,
        comprimentoCm: parseFloat(shipment.length) || 0,
        larguraCm: parseFloat(shipment.width) || 0,
        alturaCm: parseFloat(shipment.height) || 0,
        formato: shipment.format?.toUpperCase() || "CAIXA"
      },

      mercadoria: {
        quantidade: parseInt(selectedQuote?.completeQuoteData?.quantity || shipmentData?.quoteData?.quantity || "1"),
        valorUnitario: parseFloat(selectedQuote?.completeQuoteData?.unitValue || shipmentData?.quoteData?.unitValue || "0"),
        valorTotal: parseFloat(selectedQuote?.completeQuoteData?.totalMerchandiseValue || shipmentData?.quoteData?.totalMerchandiseValue || "0"),
        
        // DADOS DO DOCUMENTO FISCAL COMPLETOS
        documentoFiscal: {
          tipo: documentData?.documentType === 'nfe' ? 'NOTA_FISCAL' : 'DECLARACAO_CONTEUDO',
          temNotaFiscal: documentData?.documentType === 'nfe',
          chaveNfe: documentData?.nfeKey || null,
          descricaoMercadoria: documentData?.merchandiseDescription || "",
          
          // Dados extras do documento
          documentType: documentData?.documentType || "",
          createdAt: new Date().toISOString()
        }
      },

      pagamento: {
        metodo: paymentData?.method?.toUpperCase() || shipment.payment_data?.method?.toUpperCase() || "PIX",
        valor: parseFloat(paymentData?.amount || shipment.payment_data?.amount || "0"),
        status: "PAID",
        dataPagamento: new Date().toISOString(),
        sessionId: paymentData?.session_id || shipment.payment_data?.session_id || null
      },

      // DADOS TÉCNICOS COMPLETOS PARA DEBUG
      dadosTecnicos: {
        trackingCode: shipment.tracking_code,
        createdAt: shipment.created_at,
        updatedAt: shipment.updated_at,
        originalFormData: shipmentData?.formData || {},
        completeQuoteData: selectedQuote?.completeQuoteData || shipmentData?.quoteData || {},
        allOriginalData: {
          selectedQuote: selectedQuote || {},
          shipmentData: shipmentData || {},
          documentData: documentData || {},
          paymentData: paymentData || {}
        }
      }
    };

    console.log(`Sending webhook to: ${integration.webhook_url}`);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    // Send webhook to external system (only for admin notifications)
    const webhookResponse = await fetch(integration.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Notification': 'true', // Indicador que é notificação administrativa
        ...(integration.secret_key && { 'Authorization': `Bearer ${integration.secret_key}` })
      },
      body: JSON.stringify({
        ...payload,
        notificationType: 'admin-only', // Especifica que é apenas para administradores
        adminNotification: true
      })
    });

    const webhookResult = await webhookResponse.text();
    console.log(`Webhook response status: ${webhookResponse.status}`);
    console.log(`Webhook response body: ${webhookResult}`);

    // Update shipment status to PAGO_AGUARDANDO_ETIQUETA
    const { error: updateError } = await supabaseService
      .from('shipments')
      .update({ 
        status: 'PAGO_AGUARDANDO_ETIQUETA',
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