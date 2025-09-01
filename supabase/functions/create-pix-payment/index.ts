import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a fake PIX code for demonstration
function generatePixCode(amount: number, description: string): string {
  const timestamp = Date.now().toString();
  const randomString = Math.random().toString(36).substring(2, 15);
  return `00020126330014BR.GOV.BCB.PIX0114${randomString}520400005303986540${amount.toFixed(2).replace('.', '')}5802BR5925CONFIANCE LOGISTICA LTDA6009Goiania62070503***6304${timestamp.slice(-4)}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, shipmentData } = await req.json();
    
    console.log('Create PIX payment - Starting with amount:', amount);
    console.log('Create PIX payment - Shipment data:', shipmentData);

    // Generate a simulated PIX code
    const pixCode = generatePixCode(amount, `Frete - Envio de ${shipmentData?.weight || 0}kg`);
    const paymentId = `pix_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    console.log('Create PIX payment - PIX code generated:', paymentId);

    return new Response(JSON.stringify({ 
      paymentIntentId: paymentId,
      clientSecret: pixCode,
      amount: amount,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes from now
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