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
    const { paymentId } = await req.json();

    console.log('Verificando status PIX:', paymentId);

    // Obter chave da API do Abacate Pay
    const abacateApiKey = Deno.env.get('ABACATE_PAY_API_KEY');
    if (!abacateApiKey) {
      return new Response(
        JSON.stringify({ error: 'Chave da API não configurada' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Consultar status na API da Abacate Pay
    const abacateResponse = await fetch(`https://api.abacatepay.com/v1/pixQrCode/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${abacateApiKey}`,
        'Content-Type': 'application/json',
      }
    });

    if (!abacateResponse.ok) {
      const errorText = await abacateResponse.text();
      console.error('Erro ao verificar status PIX:', errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar status do pagamento' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const pixData = await abacateResponse.json();
    const responseData = pixData.data || pixData;

    console.log('Status PIX:', responseData);

    return new Response(
      JSON.stringify({
        success: true,
        status: responseData.status,
        paymentId: responseData.id,
        amount: responseData.amount,
        paidAt: responseData.paidAt || null,
        isPaid: responseData.status === 'PAID'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro interno:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});