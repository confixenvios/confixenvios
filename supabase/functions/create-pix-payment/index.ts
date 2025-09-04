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
    const { name, phone, email, cpf, amount, description, userId } = await req.json();

    console.log('=== INÍCIO DEBUG PIX ===');
    console.log('Dados recebidos:', { name, phone, email, cpf, amount, description, userId });
    console.log('Headers da requisição:', Object.fromEntries(req.headers.entries()));
    
    // Validar campos obrigatórios
    if (!name || !phone || !email || !cpf || !amount) {
      console.error('Campos obrigatórios faltando:', { 
        hasName: !!name,
        hasPhone: !!phone, 
        hasEmail: !!email,
        hasCpf: !!cpf,
        hasAmount: !!amount
      });
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
    console.log('Tentando obter ABACATE_PAY_API_KEY...');
    console.log('Variáveis de ambiente disponíveis:', Object.keys(Deno.env.toObject()));
    
    if (!abacateApiKey) {
      console.error('ERRO CRÍTICO: API Key não encontrada nas variáveis de ambiente');
      return new Response(
        JSON.stringify({ error: 'Chave da API não configurada - verifique as secrets do Supabase' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('✓ API Key encontrada:', abacateApiKey.substring(0, 12) + '...');
    console.log('✓ Tipo de API Key:', abacateApiKey.includes('prod') ? 'PRODUÇÃO ✓' : 'DESENVOLVIMENTO ⚠️');

    // Limpar e validar dados
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanCpf = cpf.replace(/\D/g, '');
    
    console.log('Dados recebidos para processamento:', { 
      name: name.trim(), 
      email: email.trim().toLowerCase(), 
      cleanPhone, 
      cleanCpf, 
      amount 
    });
    
    // Validar CPF
    if (cleanCpf.length !== 11) {
      console.error('CPF inválido - deve ter 11 dígitos:', cleanCpf);
      return new Response(
        JSON.stringify({ error: 'CPF deve ter 11 dígitos' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validar telefone
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      console.error('Telefone inválido:', cleanPhone);
      return new Response(
        JSON.stringify({ error: 'Telefone deve ter 10 ou 11 dígitos' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Formatar telefone corretamente para Abacate Pay (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
    const formattedPhone = cleanPhone.length === 11 
      ? cleanPhone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')  // (11) 99999-9999
      : cleanPhone.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');  // (11) 9999-9999

    // Payload conforme documentação oficial do Abacate Pay
    const pixPayload = {
      amount: Math.round(amount * 100), // Centavos
      expiresIn: 1800, // 30 minutos (obrigatório)
      description: description || 'Pagamento PIX',
      customer: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        cellphone: formattedPhone, // Formato brasileiro: (XX) XXXXX-XXXX
        taxId: cleanCpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') // XXX.XXX.XXX-XX
      },
      metadata: {
        externalId: `shipment_${Date.now()}`,
        userId: userId || 'anonymous'
      }
    };

    console.log('✅ PIX payload final:', JSON.stringify(pixPayload, null, 2));

    // Chamar API do Abacate Pay
    console.log('🚀 Fazendo requisição para Abacate Pay...');
    const abacateResponse = await fetch('https://api.abacatepay.com/v1/pixQrCode/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${abacateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pixPayload)
    });

    console.log('📊 Status da resposta Abacate:', abacateResponse.status);
    console.log('📋 Headers da resposta:', Object.fromEntries(abacateResponse.headers.entries()));

    if (!abacateResponse.ok) {
      const errorText = await abacateResponse.text();
      console.error('Erro da API Abacate Pay - Status:', abacateResponse.status);
      console.error('Erro da API Abacate Pay - Response:', errorText);
      
      let errorMessage = 'Erro ao processar pagamento PIX';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        // Se não conseguir fazer parse do JSON, usar mensagem padrão
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: errorText,
          status: abacateResponse.status 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const pixData = await abacateResponse.json();
    console.log('Resposta completa do Abacate:', JSON.stringify(pixData, null, 2));

    // Acessar os dados da resposta
    const responseData = pixData.data || pixData;

    if (!responseData) {
      console.error('Dados não encontrados na resposta:', pixData);
      return new Response(
        JSON.stringify({ error: 'Resposta inválida da API' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Dados de resposta extraídos:', responseData);

    return new Response(
      JSON.stringify({
        success: true,
        pixCode: responseData.brCode,
        qrCodeImage: responseData.brCodeBase64,
        paymentId: responseData.id,
        amount: amount,
        expiresAt: responseData.expiresAt,
        webhookUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/abacate-webhook`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro interno completo:', error);
    console.error('Stack trace:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});