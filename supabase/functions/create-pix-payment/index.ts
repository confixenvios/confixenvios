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
    const { name, phone, email, cpf, amount, description } = await req.json();

    console.log('Creating PIX payment:', { name, phone, email, cpf, amount, description });

    // Validar campos obrigatórios
    if (!name || !phone || !email || !cpf || !amount) {
      return new Response(
        JSON.stringify({ error: 'Todos os campos são obrigatórios' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

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

    // Criar pagamento PIX via Abacate Pay
    const pixPayload = {
      amount: amount, // Valor em reais
      expiresIn: 30 * 60, // 30 minutos em segundos
      description: description || 'Pagamento via PIX',
      customer: {
        name: name,
        email: email,
        cellphone: phone,
        taxId: cpf.replace(/\D/g, '') // Remove formatação do CPF
      },
      metadata: {
        externalId: `pix_${Date.now()}`
      }
    };

    console.log('PIX payload:', pixPayload);

    // Chamar API do Abacate Pay
    const abacateResponse = await fetch('https://api.abacatepay.com/v1/pixQrCode/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${abacateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pixPayload)
    });

    if (!abacateResponse.ok) {
      const errorText = await abacateResponse.text();
      console.error('Erro da API Abacate Pay:', errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar pagamento PIX' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const pixData = await abacateResponse.json();
    console.log('PIX response:', pixData);

    // Acessar os dados da resposta
    const responseData = pixData.data || pixData;

    return new Response(
      JSON.stringify({
        success: true,
        pixCode: responseData.brCode,
        qrCodeImage: responseData.brCodeBase64,
        paymentId: responseData.id,
        amount: amount,
        expiresAt: responseData.expiresAt
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