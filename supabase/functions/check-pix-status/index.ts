import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentId } = await req.json();
    
    if (!paymentId) {
      console.error('❌ PaymentId não fornecido');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'PaymentId é obrigatório'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🔍 Verificando status PIX via API Abacate Pay para:', paymentId);

    // Buscar API key
    const abacateApiKey = Deno.env.get('ABACATE_PAY_API_KEY');
    if (!abacateApiKey) {
      console.error('❌ ABACATE_PAY_API_KEY não configurada');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'API key não configurada'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fazer requisição usando a documentação fornecida - incluindo paymentId como query parameter
    const url = `https://api.abacatepay.com/v1/pixQrCode/check?id=${paymentId}`;
    console.log('🌐 Consultando API:', url);
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${abacateApiKey}`,
        'Content-Type': 'application/json'
      },
      body: undefined
    };

    const response = await fetch(url, options);

    console.log('📊 Status da resposta:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na API Abacate Pay:', response.status, errorText);
      
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Erro ao consultar status do pagamento',
        details: errorText,
        status: response.status
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    console.log('📋 Dados recebidos da API:', JSON.stringify(data, null, 2));

    // Verificar estrutura conforme documentação
    const paymentData = data.data;
    const isPaid = paymentData?.status === 'PAID';
    
    // Debug adicional para entender por que não está detectando o pagamento
    console.log('🔍 Debug detalhado:');
    console.log('- Estrutura completa:', JSON.stringify(data, null, 2));
    console.log('- paymentData:', JSON.stringify(paymentData, null, 2));
    console.log('- status encontrado:', paymentData?.status);
    console.log('- comparação PAID:', paymentData?.status === 'PAID');
    console.log('- isPaid calculado:', isPaid);

    console.log(`💰 Status do pagamento: ${paymentData?.status} - Pago: ${isPaid}`);
    console.log(`⏰ Expira em: ${paymentData?.expiresAt}`);

    return new Response(JSON.stringify({
      success: true,
      data: paymentData,
      isPaid: isPaid,
      status: paymentData?.status,
      expiresAt: paymentData?.expiresAt,
      paymentId: paymentId,
      checkedAt: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro geral na verificação PIX:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});