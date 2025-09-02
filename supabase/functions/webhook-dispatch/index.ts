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

      remetente: {
        nome: shipment.sender_address?.name || "",
        cpfCnpj: shipment.sender_address?.document || "",
        telefone: shipment.sender_address?.phone || "",
        email: shipment.sender_address?.email || "",
        cep: shipment.sender_address?.cep || "",
        endereco: shipment.sender_address?.street || "",
        numero: shipment.sender_address?.number || "",
        bairro: shipment.sender_address?.neighborhood || "",
        cidade: shipment.sender_address?.city || "",
        estado: shipment.sender_address?.state || "",
        referencia: shipment.sender_address?.reference || ""
      },

      destinatario: {
        nome: shipment.recipient_address?.name || "",
        cpfCnpj: shipment.recipient_address?.document || "",
        telefone: shipment.recipient_address?.phone || "",
        email: shipment.recipient_address?.email || "",
        cep: shipment.recipient_address?.cep || "",
        endereco: shipment.recipient_address?.street || "",
        numero: shipment.recipient_address?.number || "",
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
        quantidade: parseInt(selectedQuote?.completeQuoteData?.quantity || shipmentData?.completeQuoteData?.quantity || "1"),
        valorUnitario: parseFloat(selectedQuote?.completeQuoteData?.unitValue || shipmentData?.completeQuoteData?.unitValue || "0"),
        valorTotal: parseFloat(selectedQuote?.completeQuoteData?.totalMerchandiseValue || shipmentData?.completeQuoteData?.totalMerchandiseValue || "0"),
        documentoFiscal: {
          tipo: documentData?.documentType === 'nfe' ? 'NOTA_FISCAL' : 'DECLARACAO_CONTEUDO',
          temNotaFiscal: documentData?.documentType === 'nfe',
          chaveNfe: documentData?.nfeKey || null
        }
      },

      pagamento: {
        metodo: paymentData?.method?.toUpperCase() || shipment.payment_data?.method?.toUpperCase() || "PIX",
        valor: parseFloat(paymentData?.amount || shipment.payment_data?.amount || "0"),
        status: "PAID",
        dataPagamento: new Date().toISOString()
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