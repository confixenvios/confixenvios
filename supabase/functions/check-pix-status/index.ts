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
        error: 'PaymentId é obrigatório',
        isPaid: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🔍 Verificando status do PIX para paymentId:', paymentId);

    // Buscar a API key do Abacate Pay
    const abacateApiKey = Deno.env.get('ABACATE_PAY_API_KEY');
    if (!abacateApiKey) {
      console.error('❌ ABACATE_PAY_API_KEY não configurada');
      return new Response(JSON.stringify({ 
        error: 'Configuração da API não encontrada',
        isPaid: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fazer requisição melhorada para API do Abacate Pay
    console.log('🌐 Fazendo requisição para Abacate Pay API...');
    const response = await fetch(`https://api.abacatepay.com/v1/pixQrCode/check?id=${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${abacateApiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Confix-Envios/2.0'
      }
    });

    if (!response.ok) {
      console.error('❌ Erro na API do Abacate Pay:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Detalhes do erro:', errorText);
      
      return new Response(JSON.stringify({ 
        error: 'Erro ao verificar status do pagamento',
        isPaid: false,
        details: errorText,
        status: response.status
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const pixStatus = await response.json();
    console.log('📋 Status COMPLETO retornado pela API:', JSON.stringify(pixStatus, null, 2));

    // Análise mais robusta do status
    const paymentData = pixStatus.data || pixStatus;
    
    // Verificar múltiplos indicadores de pagamento
    const isPaid = 
      paymentData.status === 'PAID' || 
      paymentData.status === 'paid' ||
      paymentData.status === 'COMPLETED' || 
      paymentData.status === 'APPROVED' ||
      paymentData.status === 'SUCCESS' ||
      paymentData.status === 'CONFIRMED' ||
      paymentData.paid === true ||
      paymentData.completed === true ||
      paymentData.confirmed === true;

    console.log(`💰 ANÁLISE DETALHADA DO PAGAMENTO:`);
    console.log(`- Status: "${paymentData.status}"`);
    console.log(`- Campo 'paid': ${paymentData.paid}`);
    console.log(`- Campo 'completed': ${paymentData.completed}`);
    console.log(`- Campo 'confirmed': ${paymentData.confirmed}`);
    console.log(`- RESULTADO FINAL isPaid: ${isPaid}`);

    return new Response(JSON.stringify({
      isPaid: isPaid,
      status: paymentData.status,
      paymentId: paymentId,
      fullResponse: paymentData,
      paid: paymentData.paid,
      completed: paymentData.completed,
      confirmed: paymentData.confirmed,
      checkedAt: new Date().toISOString(),
      success: true
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro geral ao verificar status PIX:', error);
    return new Response(JSON.stringify({ 
      error: 'Erro interno do servidor',
      message: error.message,
      isPaid: false,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

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
    console.log('📊 Status data received:', JSON.stringify(statusData, null, 2));

    // Log the raw API response for debugging
    console.log('🔍 Raw API Response Structure:');
    console.log('- Has data property:', 'data' in statusData);
    console.log('- Status value:', statusData.data?.status || statusData.status);
    console.log('- Full object keys:', Object.keys(statusData));

    const paymentData = statusData.data || statusData;
    
    // Enhanced validation: check for different possible "paid" statuses
    const isPaid = paymentData.status === 'COMPLETED' || 
                   paymentData.status === 'PAID' || 
                   paymentData.status === 'APPROVED' ||
                   paymentData.status === 'SUCCESS' ||
                   paymentData.status === 'CONFIRMED' ||
                   paymentData.paid === true ||
                   paymentData.completed === true;

    console.log(`💰 Payment Analysis:`);
    console.log(`- Status: "${paymentData.status}"`);
    console.log(`- Paid field: ${paymentData.paid}`);
    console.log(`- Completed field: ${paymentData.completed}`);
    console.log(`- Final isPaid result: ${isPaid}`);

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