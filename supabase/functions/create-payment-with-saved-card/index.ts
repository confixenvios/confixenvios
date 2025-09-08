import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentMethodId, amount, shipmentData } = await req.json();
    
    if (!paymentMethodId || !amount) {
      throw new Error("Payment method ID and amount are required");
    }

    console.log('Create payment with saved card - Starting with:', { paymentMethodId, amount });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    console.log("Stripe key exists:", !!stripeKey);
    console.log("Stripe key prefix:", stripeKey ? stripeKey.substring(0, 7) : "no key");
    
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not found in environment variables");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Find Stripe customer
    const customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 1 
    });

    if (customers.data.length === 0) {
      throw new Error("Customer not found");
    }

    const customerId = customers.data[0].id;

    // Create payment intent with saved payment method
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'brl',
      customer: customerId,
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      confirm: true,
      return_url: `${req.headers.get("origin")}/pagamento-sucesso-stripe`,
      metadata: {
        shipmentData: JSON.stringify(shipmentData)
      }
    });

    console.log('Payment intent created:', paymentIntent.id);

    // Webhook will be dispatched automatically by database trigger for shipment creation

    // Get active integration for webhook dispatch
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: integration, error: integrationError } = await supabaseService
      .from('integrations')
      .select('webhook_url, secret_key')
      .eq('active', true)
      .single();

    // Dispatch webhook if integration exists
    if (!integrationError && integration?.webhook_url) {
      const webhookPayload = {
        paymentIntentId: paymentIntent.id,
        paymentData: {
          method: 'STRIPE_SAVED_CARD',
          payment_intent_id: paymentIntent.id,
          amount: amount,
          status: paymentIntent.status
        },
        shipmentData
      };

      console.log('Dispatching webhook to:', integration.webhook_url);

      try {
        const webhookResponse = await fetch(integration.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(integration.secret_key && { 'Authorization': `Bearer ${integration.secret_key}` })
          },
          body: JSON.stringify(webhookPayload)
        });

        console.log('Webhook response status:', webhookResponse.status);

        // Log webhook dispatch
        await supabaseService.from('webhook_logs').insert({
          event_type: 'stripe_payment_saved_card',
          shipment_id: shipmentData?.id || paymentIntent.id,
          payload: webhookPayload,
          response_status: webhookResponse.status,
          response_body: await webhookResponse.text()
        });

      } catch (webhookError) {
        console.error('Webhook dispatch error (non-blocking):', webhookError);
      }
    }

    if (paymentIntent.status === 'requires_action' && paymentIntent.next_action?.type === 'redirect_to_url') {
      return new Response(JSON.stringify({ 
        requiresAction: true,
        redirectUrl: paymentIntent.next_action.redirect_to_url.url,
        paymentIntentId: paymentIntent.id
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else if (paymentIntent.status === 'succeeded') {
      return new Response(JSON.stringify({ 
        success: true,
        paymentIntentId: paymentIntent.id,
        redirectUrl: `${req.headers.get("origin")}/pagamento-sucesso-stripe?payment_intent=${paymentIntent.id}`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      throw new Error(`Payment failed with status: ${paymentIntent.status}`);
    }

  } catch (error) {
    console.error("Error processing payment with saved card:", error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});