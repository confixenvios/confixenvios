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
      success_url: `${req.headers.get("origin")}/pagamento-sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/pagamento`,
      metadata: {
        shipment_id: shipmentData?.id || 'temp-id',
        user_email: shipmentData?.senderEmail || 'guest@example.com'
      }
    });

    console.log('Create payment - Stripe session created:', session.id);

    // Create Supabase service client for webhook dispatch
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

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