import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    console.log('🔍 PIX Status check request started');
    
    const { paymentId } = await req.json();
    
    if (!paymentId) {
      console.error('❌ Missing paymentId');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Payment ID é obrigatório' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Get API key
    const abacateApiKey = Deno.env.get('ABACATE_PAY_API_KEY');
    if (!abacateApiKey) {
      console.error('❌ ABACATE_PAY_API_KEY not found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Configuração não encontrada' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    console.log('🔍 Checking PIX status for payment:', paymentId);

    // Check PIX status with Abacate Pay using the correct endpoint with query parameter
    const statusResponse = await fetch(`https://api.abacatepay.com/v1/pixQrCode/check?id=${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${abacateApiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Confix-Envios/1.0'
      }
    });

    console.log('📊 Status response:', statusResponse.status);

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('❌ Status check error:', errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao verificar status do pagamento',
          details: errorText
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const statusData = await statusResponse.json();
    console.log('✅ Status data:', JSON.stringify(statusData, null, 2));

    const paymentData = statusData.data || statusData;
    
    const isPaid = paymentData.status === 'COMPLETED' || 
                   paymentData.status === 'PAID' || 
                   paymentData.paid === true;

    console.log(`💰 Payment status: ${paymentData.status}, isPaid: ${isPaid}`);

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: paymentId,
        status: paymentData.status,
        isPaid: isPaid,
        expiresAt: paymentData.expiresAt,
        paidAt: paymentData.paidAt || null
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('💥 Status check error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Erro interno ao verificar status',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});