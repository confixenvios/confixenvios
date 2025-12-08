import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Security: Rate limiting and input validation
const validatePixInput = (requestBody: any): { isValid: boolean; error?: string } => {
  const { name, phone, email, cpf, amount } = requestBody;

  // Required fields validation
  if (!name || !phone || !email || !cpf || !amount) {
    return { isValid: false, error: 'Todos os campos são obrigatórios: nome, telefone, email, CPF e valor' };
  }

  // Input sanitization checks
  if (typeof name !== 'string' || name.length > 100) {
    return { isValid: false, error: 'Nome inválido' };
  }

  if (typeof email !== 'string' || !email.includes('@') || email.length > 100) {
    return { isValid: false, error: 'Email inválido' };
  }

  // CPF/CNPJ validation
  const cleanCpf = cpf.replace(/\D/g, '');
  if (cleanCpf.length !== 11 && cleanCpf.length !== 14) {
    return { isValid: false, error: 'CPF/CNPJ deve ter 11 ou 14 dígitos' };
  }

  // Amount validation with strict limits
  if (typeof amount !== 'number' || amount <= 0 || amount > 50000) {
    return { isValid: false, error: 'Valor deve ser entre R$ 0,01 e R$ 50.000,00' };
  }

  return { isValid: true };
};

// Security: Check rate limits
const checkRateLimit = async (supabase: any, clientIp: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      client_ip: clientIp,
      action_type: 'pix_payment_creation',
      max_attempts: 5,
      time_window_minutes: 15
    });

    return !error && data === true;
  } catch (error) {
    console.error('Rate limit check error:', error);
    return false; // Block on error for security
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔵 PIX Payment request started');
    
    const requestBody = await req.json();
    console.log('📋 Request body received (sanitized logging)');
    
    // Security: Get client IP for rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    // Security: Validate input before processing
    const validation = validatePixInput(requestBody);
    if (!validation.isValid) {
      console.error('❌ Input validation failed:', validation.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: validation.error 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Security: Check rate limits
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const rateLimitOk = await checkRateLimit(supabase, clientIp);
    if (!rateLimitOk) {
      console.error('❌ Rate limit exceeded for IP:', clientIp);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429 
        }
      );
    }
    
    const { name, phone, email, cpf, amount, description, userId, quoteData, documentData, isB2B, b2bData } = requestBody;

    // Get API key - usar API key B2B para remessas B2B expresso
    let abacateApiKey: string | undefined;
    
    if (isB2B) {
      abacateApiKey = Deno.env.get('ABACATE_PAY_B2B_API_KEY');
      console.log('🏢 Usando API key B2B para remessa expresso');
    } else {
      abacateApiKey = Deno.env.get('ABACATE_PAY_API_KEY');
      console.log('📦 Usando API key padrão para remessa normal');
    }
    
    if (!abacateApiKey) {
      console.error('❌ API key não encontrada:', isB2B ? 'ABACATE_PAY_B2B_API_KEY' : 'ABACATE_PAY_API_KEY');
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

    console.log('✅ API Key found (B2B:', isB2B, ')');

    // Gerar external ID único
    const externalId = `confix_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Limpar e formatar dados
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanCpf = cpf.replace(/\D/g, '');
    
    // Formatar telefone para Abacate Pay
    const formattedPhone = cleanPhone.length === 11 
      ? cleanPhone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
      : cleanPhone.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');

    // NOVO: Salvar cotação temporária antes de gerar PIX
    console.log('💾 Salvando cotação temporária...');
    console.log('📦 isB2B:', isB2B);
    console.log('📦 Dados da cotação recebidos:', quoteData);
    
    let tempQuoteData;
    
    // B2B flow - não requer quoteData completo
    if (isB2B && b2bData) {
      console.log('📦 Fluxo B2B detectado');
      console.log('📦 Volume addresses:', b2bData.volumeAddresses);
      tempQuoteData = {
        external_id: externalId,
        user_id: userId || null,
        sender_data: {
          name: name,
          email: email,
          phone: phone,
          document: cpf,
          clientId: b2bData.clientId,
          pickupAddress: b2bData.pickupAddress || null
        },
        recipient_data: {
          volumeAddresses: b2bData.volumeAddresses || [],
          vehicleType: b2bData.vehicleType,
          deliveryDate: b2bData.deliveryDate,
          pickupAddress: b2bData.pickupAddress || null
        },
        package_data: {
          volumeCount: b2bData.volumeCount || 1,
          volumeWeights: b2bData.volumeWeights || [],
          totalWeight: b2bData.totalWeight || 0,
          volumeAddresses: b2bData.volumeAddresses || [],
          pickupAddress: b2bData.pickupAddress || null
        },
        quote_options: {
          selectedOption: 'b2b_express',
          pickupOption: 'coleta',
          amount: amount,
          description: description || 'B2B Expresso - Confix Envios',
          isB2B: true,
          vehicleType: b2bData.vehicleType,
          pickupAddress: b2bData.pickupAddress || null
        },
        status: 'pending_payment'
      };
    } else {
      // Fluxo regular - requer quoteData completo
      if (!quoteData || !quoteData.senderData || !quoteData.recipientData) {
        console.error('❌ Dados da cotação incompletos');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Dados da cotação não encontrados. Reinicie o processo.' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        );
      }
      
      // Usar dados reais da cotação
      tempQuoteData = {
        external_id: externalId,
        user_id: userId || null,
        sender_data: quoteData.senderData,
        recipient_data: quoteData.recipientData,
        package_data: quoteData.formData ? {
          weight: parseFloat(quoteData.formData.weight) || 1,
          length: parseFloat(quoteData.formData.length) || 20,
          width: parseFloat(quoteData.formData.width) || 20,
          height: parseFloat(quoteData.formData.height) || 20,
          format: quoteData.formData.format || 'caixa',
          quantity: parseInt(quoteData.formData.quantity) || 1,
          unitValue: parseFloat(quoteData.formData.unitValue) || amount,
          totalValue: quoteData.totalMerchandiseValue || amount
        } : {
          weight: 1,
          length: 20,
          width: 20,
          height: 20,
          format: 'caixa',
          quantity: 1,
          unitValue: amount,
          totalValue: amount
        },
        quote_options: {
          selectedOption: quoteData.selectedOption || 'standard',
          pickupOption: quoteData.pickupOption || 'dropoff',
          amount: amount,
          description: description || 'Pagamento PIX - Confix Envios',
          shippingQuote: quoteData.quoteData?.shippingQuote || null,
          pickupDetails: quoteData.pickupDetails || null,
          documentType: documentData?.documentType || null,
          nfeKey: documentData?.nfeKey || null,
          merchandiseDescription: documentData?.merchandiseDescription || null
        },
        status: 'pending_payment'
      };
    }

    const { data: savedQuote, error: quoteError } = await supabase
      .from('temp_quotes')
      .insert([tempQuoteData])
      .select()
      .single();

    if (quoteError) {
      console.error('❌ Erro ao salvar cotação temporária:', quoteError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao processar cotação. Tente novamente.' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    console.log('✅ Cotação temporária salva:', savedQuote.id);

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
        externalId: externalId,
        userId: userId || 'anonymous',
        source: 'confix-envios'
      },
      // CRÍTICO: Configurar webhook do Abacate Pay
      webhookUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/abacate-webhook`
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

    // Log successful creation with security audit
    try {
      await supabase.from('webhook_logs').insert({
        event_type: 'pix_payment_created',
        shipment_id: userId || 'anonymous',
        payload: {
          payment_id: pixData.id,
          amount: amount,
          success: true,
          source: 'create-pix-payment',
          client_ip: clientIp,
          security_audit: {
            rate_limit_checked: true,
            input_validated: true,
            timestamp: new Date().toISOString()
          }
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
    
    // Security: Log failed attempts for monitoring
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      
      await supabase.from('webhook_logs').insert({
        event_type: 'pix_payment_error',
        shipment_id: 'error',
        payload: {
          error: error.message,
          client_ip: req.headers.get('x-forwarded-for') || 'unknown',
          timestamp: new Date().toISOString()
        },
        response_status: 500,
        response_body: { status: 'error' }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
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