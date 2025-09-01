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
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
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