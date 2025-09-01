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
    
    console.log('Create PIX payment - Starting with amount:', amount);
    console.log('Create PIX payment - Shipment data:', shipmentData);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create a PIX payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: "brl",
      payment_method_types: ["pix"],
      description: `Frete - Envio de ${shipmentData?.weight || 0}kg`,
      metadata: {
        shipment_id: shipmentData?.id || 'temp-id',
        user_email: shipmentData?.senderEmail || 'guest@example.com'
      }
    });

    console.log('Create PIX payment - Payment Intent created:', paymentIntent.id);

    return new Response(JSON.stringify({ 
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: amount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Create PIX payment - Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});