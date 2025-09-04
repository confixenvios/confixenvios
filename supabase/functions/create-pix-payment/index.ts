import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    console.log('🔵 PIX Payment request started');
    
    const requestBody = await req.json();
    console.log('📋 Request body:', JSON.stringify(requestBody, null, 2));
    
    const { name, phone, email, cpf, amount, description, userId } = requestBody;

    // Validação básica
    if (!name || !phone || !email || !cpf || !amount) {
      console.error('❌ Missing required fields');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Todos os campos são obrigatórios: nome, telefone, email, CPF e valor' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Validação de valor
    if (typeof amount !== 'number' || amount <= 0 || amount > 50000) {
      console.error('❌ Invalid amount:', amount);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Valor deve ser entre R$ 0,01 e R$ 50.000,00' 
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
          error: 'Configuração de pagamento não encontrada' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    console.log('✅ API Key found');

    // Limpar e formatar dados
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanCpf = cpf.replace(/\D/g, '');
    
    // Formatar telefone para Abacate Pay
    const formattedPhone = cleanPhone.length === 11 
      ? cleanPhone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
      : cleanPhone.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');

    // Payload para Abacate Pay
    const pixPayload = {
      amount: Math.round(amount * 100), // Converter para centavos
      expiresIn: 1800, // 30 minutos
      description: description || 'Pagamento PIX - Confix Envios',
      customer: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        cellphone: formattedPhone,
        taxId: cleanCpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
      },
      metadata: {
        externalId: `confix_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        userId: userId || 'anonymous',
        source: 'confix-envios'
      }
    };

    console.log('📤 Sending to Abacate Pay:', JSON.stringify(pixPayload, null, 2));

    // Chamar API Abacate Pay
    const abacateResponse = await fetch('https://api.abacatepay.com/v1/pixQrCode/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${abacateApiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Confix-Envios/1.0'
      },
      body: JSON.stringify(pixPayload)
    });

    console.log('📊 Abacate API response status:', abacateResponse.status);

    if (!abacateResponse.ok) {
      const errorText = await abacateResponse.text();
      console.error('❌ Abacate API error:', errorText);
      
      let errorMessage = 'Erro ao processar pagamento PIX';
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch (e) {
        // Manter mensagem padrão se não conseguir parsear
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          details: 'Erro na comunicação com provedor de pagamento'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const pixResponse = await abacateResponse.json();
    console.log('✅ PIX Response completa:', JSON.stringify(pixResponse, null, 2));

    const pixData = pixResponse.data || pixResponse;
    console.log('📋 PIX Data extraído:', JSON.stringify(pixData, null, 2));

    if (!pixData || !pixData.brCode) {
      console.error('❌ Invalid response structure:', pixResponse);
      console.error('❌ pixData:', pixData);
      console.error('❌ brCode:', pixData?.brCode);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Resposta inválida do provedor de pagamento',
          debug: { pixResponse, pixData }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    console.log('🔍 Verificando QR Code:');
    console.log('- brCode:', pixData.brCode ? 'OK' : 'MISSING');
    console.log('- qrCodeBase64:', pixData.qrCodeBase64 ? 'OK' : 'MISSING');
    console.log('- brCodeBase64:', pixData.brCodeBase64 ? 'OK' : 'MISSING');
    console.log('- id:', pixData.id ? 'OK' : 'MISSING');

    // Log successful creation
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      await supabase.from('webhook_logs').insert({
        event_type: 'pix_payment_created',
        shipment_id: userId || 'anonymous',
        payload: {
          payment_id: pixData.id,
          amount: amount,
          success: true,
          source: 'create-pix-payment'
        },
        response_status: 200,
        response_body: { status: 'pix_created' }
      });
    } catch (logError) {
      console.error('⚠️ Log error (non-blocking):', logError);
    }

    console.log('🎉 PIX payment created successfully');

    // Usar brCodeBase64 diretamente da resposta (já vem com data:image/png;base64)
    const qrCodeImage = pixData.brCodeBase64 || null;
    
    console.log('📱 QR Code info:', {
      brCodeBase64_available: !!pixData.brCodeBase64,
      brCodeBase64_length: pixData.brCodeBase64?.length || 0,
      brCodeBase64_prefix: pixData.brCodeBase64?.substring(0, 30) || 'N/A'
    });

    const responseData = {
      success: true,
      pixCode: pixData.brCode,
      qrCodeImage: qrCodeImage,
      paymentId: pixData.id,
      amount: amount,
      expiresAt: pixData.expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };

    console.log('✅ Response preparada:', {
      success: responseData.success,
      hasQrCode: !!responseData.qrCodeImage,
      hasPixCode: !!responseData.pixCode,
      paymentId: responseData.paymentId,
      qrCodeLength: responseData.qrCodeImage?.length || 0
    });

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('💥 PIX payment error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});