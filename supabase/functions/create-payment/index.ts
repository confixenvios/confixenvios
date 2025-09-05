import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, shipmentData } = await req.json();
    
    console.log('Create payment - Starting with amount:', amount);
    console.log('Create payment - Shipment data:', shipmentData);

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    console.log("Stripe key exists:", !!stripeKey);
    console.log("Stripe key prefix:", stripeKey ? stripeKey.substring(0, 7) : "no key");
    
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not found in environment variables");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Create a one-time payment session with multiple payment methods
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: { 
              name: "Frete - Envio",
              description: `Envio de ${shipmentData?.weight || 0}kg`
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_method_types: [
        "card",        // Cartão de crédito/débito
        "boleto",      // Boleto bancário
      ],
      // Note: PIX is not directly supported by Stripe in Brazil checkout
      // You would need to use a Brazilian payment provider like PagSeguro, Mercado Pago, etc.
      success_url: `https://confixenvios.com.br/pagamento-sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://confixenvios.com.br/pagamento`,
      metadata: {
        shipment_id: shipmentData?.id || 'temp-id',
        user_email: shipmentData?.senderEmail || 'guest@example.com'
      }
    });

    console.log('Create payment - Stripe session created:', session.id);

    // Create Supabase service client for both shipment update and webhook dispatch
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // SECURITY FIX: Ensure shipment exists with proper session isolation
    let shipmentId = shipmentData?.id;
    
    if (!shipmentId && shipmentData) {
      console.log('Create payment - Creating shipment with session isolation');
      
      // Get session token from headers for anonymous users
      const sessionToken = req.headers.get('x-session-token') || '';
      const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      
      // Validate session for anonymous users
      let validatedSessionId = null;
      if (!shipmentData.user_id && sessionToken) {
        const { data: sessionId } = await supabaseService.rpc('validate_session_with_security_monitoring', {
          session_token: sessionToken,
          client_ip: clientIP
        });
        validatedSessionId = sessionId;
        console.log('Create payment - Validated session ID:', validatedSessionId);
      }

      // Create addresses first
      const senderAddressData = {
        name: shipmentData.senderData?.name || 'Anonymous Sender',
        cep: shipmentData.senderData?.cep || '',
        street: shipmentData.senderData?.street || '',
        number: shipmentData.senderData?.number || '',
        complement: shipmentData.senderData?.complement || '',
        neighborhood: shipmentData.senderData?.neighborhood || '',
        city: shipmentData.senderData?.city || '',
        state: shipmentData.senderData?.state || '',
        reference: shipmentData.senderData?.reference || '',
        address_type: 'sender',
        user_id: shipmentData.user_id || null,
        session_id: validatedSessionId
      };

      const recipientAddressData = {
        name: shipmentData.recipientData?.name || 'Anonymous Recipient',
        cep: shipmentData.recipientData?.cep || '',
        street: shipmentData.recipientData?.street || '',
        number: shipmentData.recipientData?.number || '',
        complement: shipmentData.recipientData?.complement || '',
        neighborhood: shipmentData.recipientData?.neighborhood || '',
        city: shipmentData.recipientData?.city || '',
        state: shipmentData.recipientData?.state || '',
        reference: shipmentData.recipientData?.reference || '',
        address_type: 'recipient',
        user_id: shipmentData.user_id || null,
        session_id: validatedSessionId
      };

      // Insert sender address
      const { data: senderAddress, error: senderError } = await supabaseService
        .from('addresses')
        .insert(senderAddressData)
        .select()
        .single();

      if (senderError) {
        console.error('Create payment - Error creating sender address:', senderError);
        throw new Error('Failed to create sender address');
      }

      // Insert recipient address
      const { data: recipientAddress, error: recipientError } = await supabaseService
        .from('addresses')
        .insert(recipientAddressData)
        .select()
        .single();

      if (recipientError) {
        console.error('Create payment - Error creating recipient address:', recipientError);
        throw new Error('Failed to create recipient address');
      }

      // Create shipment with proper session isolation
      const shipmentCreateData = {
        user_id: shipmentData.user_id || null,
        session_id: validatedSessionId, // CRITICAL: Session ID for anonymous users
        sender_address_id: senderAddress.id,
        recipient_address_id: recipientAddress.id,
        weight: parseFloat(shipmentData.weight) || 1,
        length: parseFloat(shipmentData.length) || 10,
        width: parseFloat(shipmentData.width) || 10,
        height: parseFloat(shipmentData.height) || 10,
        format: shipmentData.format || 'CAIXA',
        pickup_option: shipmentData.pickupOption || 'dropoff',
        selected_option: 'standard',
        status: 'PENDING_PAYMENT',
        quote_data: shipmentData.quoteData || {},
        tracking_code: `ID${new Date().getFullYear()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`
      };

      const { data: newShipment, error: shipmentError } = await supabaseService
        .from('shipments')
        .insert(shipmentCreateData)
        .select()
        .single();

      if (shipmentError) {
        console.error('Create payment - Error creating shipment:', shipmentError);
        throw new Error('Failed to create shipment: ' + shipmentError.message);
      }

      shipmentId = newShipment.id;
      console.log('Create payment - Created shipment with ID:', shipmentId);
    }

    // Se temos um shipment_id válido, atualizar com o session_id
    if (shipmentId) {
      try {
        console.log('Create payment - Atualizando shipment com session_id:', session.id);
        
        // Atualizar shipment com session_id nos payment_data
        const { error: updateError } = await supabaseService
          .from('shipments')
          .update({
            payment_data: {
              session_id: session.id,
              stripe_session_id: session.id,  
              amount: amount,
              currency: "BRL",
              method: "stripe_checkout",
              status: "payment_initiated",
              created_at: new Date().toISOString()
            },
            status: 'PENDING_PAYMENT',
            updated_at: new Date().toISOString()
          })
          .eq('id', shipmentId);

        if (updateError) {
          console.error('Create payment - Erro ao atualizar shipment:', updateError);
        } else {
          console.log('Create payment - Shipment atualizado com sucesso');
        }
      } catch (updateError) {
        console.error('Create payment - Erro na atualização:', updateError);
      }
    }

    try {
      // After successful payment session creation, prepare and dispatch webhook
      const webhhookPayload = {
        event: "payment_session_created",
        sessionId: session.id,
        stripeSessionId: session.id,
        amount: amount,
        currency: "BRL",
        shipmentData: shipmentData,
        paymentMethod: "stripe_checkout",
        status: "payment_initiated",
        createdAt: new Date().toISOString()
      };

      // Get active integration for webhook dispatch
      const { data: integration, error: integrationError } = await supabaseService
        .from('integrations')
        .select('webhook_url')
        .eq('active', true)
        .single();

      if (integration?.webhook_url) {
        console.log('Create payment - Dispatching webhook to:', integration.webhook_url);
        
        // Dispatch webhook to N8n
        const webhookResponse = await fetch(integration.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Confix-Envios/1.0'
          },
          body: JSON.stringify(webhhookPayload)
        });

        console.log('Create payment - Webhook response status:', webhookResponse.status);
        
        // Log webhook dispatch
        await supabaseService.from('webhook_logs').insert({
          event_type: 'payment_session_created',
          shipment_id: shipmentData?.id || session.id,
          payload: webhhookPayload,
          response_status: webhookResponse.status,
          response_body: { webhook_dispatched: true }
        });
      }
    } catch (webhookError) {
      console.error('Create payment - Webhook error (non-blocking):', webhookError);
      // Continue with payment flow even if webhook fails
    }

    return new Response(JSON.stringify({ 
      sessionId: session.id,
      url: session.url 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Create payment - Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});