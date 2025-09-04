import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Security configuration
const MAX_REQUESTS_PER_IP = 5; // Max requests per IP per hour
const MAX_AMOUNT = 50000; // R$ 50,000 maximum
const MIN_AMOUNT = 1; // R$ 1 minimum

// Input validation functions
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

function validateCPF(cpf: string): boolean {
  const cleanCpf = cpf.replace(/\D/g, '');
  if (cleanCpf.length !== 11) return false;
  
  // Check for invalid patterns
  const invalidPatterns = ['00000000000', '11111111111', '22222222222', 
                          '33333333333', '44444444444', '55555555555',
                          '66666666666', '77777777777', '88888888888', '99999999999'];
  if (invalidPatterns.includes(cleanCpf)) return false;
  
  return true;
}

function validatePhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 10 && cleanPhone.length <= 11;
}

function sanitizeString(input: string, maxLength: number = 255): string {
  return input
    .replace(/[<>\"'&\x00-\x1f\x7f-\x9f]/g, '') // Remove dangerous chars
    .trim()
    .substring(0, maxLength);
}

async function checkRateLimit(supabase: any, clientIP: string): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('webhook_logs')
    .select('id')
    .eq('event_type', 'pix_payment_request')
    .gte('created_at', oneHourAgo)
    .contains('payload', { client_ip: clientIP });
  
  if (!error && data && data.length >= MAX_REQUESTS_PER_IP) {
    throw new Error(`Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_IP} requests per hour per IP.`);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";
  
  // Create Supabase client for logging and rate limiting
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const requestData = await req.json();
    const { name, phone, email, cpf, amount, description, userId } = requestData;

    console.log('=== SECURITY ENHANCED PIX REQUEST ===');
    console.log('Client IP:', clientIP);
    console.log('User Agent:', userAgent);
    console.log('Request validation starting...');

    // Rate limiting check
    await checkRateLimit(supabase, clientIP);
    
    // Comprehensive input validation
    if (!name || !phone || !email || !cpf || !amount) {
      console.error('Missing required fields');
      throw new Error('Todos os campos são obrigatórios');
    }

    // Validate and sanitize inputs
    const sanitizedName = sanitizeString(name, 100);
    const sanitizedEmail = sanitizeString(email, 254).toLowerCase();
    const sanitizedDescription = description ? sanitizeString(description, 500) : 'Pagamento PIX';
    
    if (!validateEmail(sanitizedEmail)) {
      throw new Error('Email inválido');
    }
    
    if (!validateCPF(cpf)) {
      throw new Error('CPF inválido');
    }
    
    if (!validatePhone(phone)) {
      throw new Error('Telefone inválido');
    }
    
    if (typeof amount !== 'number' || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      throw new Error(`Valor deve estar entre R$ ${MIN_AMOUNT} e R$ ${MAX_AMOUNT.toLocaleString('pt-BR')}`);
    }

    // Log the request for monitoring
    await supabase.from('webhook_logs').insert({
      event_type: 'pix_payment_request',
      shipment_id: userId || 'anonymous',
      payload: {
        client_ip: clientIP,
        user_agent: userAgent,
        amount: amount,
        timestamp: new Date().toISOString()
      },
      response_status: 200,
      response_body: { status: 'request_logged' }
    });

    // Get API key
    const abacateApiKey = Deno.env.get('ABACATE_PAY_API_KEY');
    if (!abacateApiKey) {
      console.error('ABACATE_PAY_API_KEY not found');
      throw new Error('Configuração de pagamento não encontrada');
    }
    
    console.log('✓ API Key found, type:', abacateApiKey.includes('prod') ? 'PRODUCTION' : 'DEVELOPMENT');

    // Clean and format data
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanCpf = cpf.replace(/\D/g, '');
    
    // Format phone number correctly for Abacate Pay
    const formattedPhone = cleanPhone.length === 11 
      ? cleanPhone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
      : cleanPhone.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');

    // Create secure payload
    const pixPayload = {
      amount: Math.round(amount * 100), // Convert to cents
      expiresIn: 1800, // 30 minutes
      description: sanitizedDescription,
      customer: {
        name: sanitizedName,
        email: sanitizedEmail,
        cellphone: formattedPhone,
        taxId: cleanCpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
      },
      metadata: {
        externalId: `secure_shipment_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        userId: userId || 'anonymous',
        clientIP: clientIP
      }
    };

    console.log('✅ Secure payload created, making API request...');

    // Call Abacate Pay API
    const abacateResponse = await fetch('https://api.abacatepay.com/v1/pixQrCode/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${abacateApiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ConFix-Secure-API/1.0'
      },
      body: JSON.stringify(pixPayload)
    });

    console.log('📊 Abacate API response status:', abacateResponse.status);

    if (!abacateResponse.ok) {
      const errorText = await abacateResponse.text();
      console.error('Abacate API error:', errorText);
      
      // Log the error securely (without exposing sensitive data)
      await supabase.from('webhook_logs').insert({
        event_type: 'pix_api_error',
        shipment_id: userId || 'anonymous',
        payload: {
          status: abacateResponse.status,
          client_ip: clientIP,
          error_type: 'abacate_api_failure'
        },
        response_status: abacateResponse.status,
        response_body: { error: 'API request failed' }
      });
      
      throw new Error('Erro ao processar pagamento PIX. Tente novamente.');
    }

    const pixData = await abacateResponse.json();
    const responseData = pixData.data || pixData;

    if (!responseData || !responseData.brCode) {
      console.error('Invalid API response structure');
      throw new Error('Resposta inválida da API de pagamento');
    }

    console.log('✅ PIX payment created successfully');

    // Log successful payment creation
    await supabase.from('webhook_logs').insert({
      event_type: 'pix_payment_created',
      shipment_id: userId || 'anonymous',
      payload: {
        payment_id: responseData.id,
        amount: amount,
        client_ip: clientIP,
        success: true
      },
      response_status: 200,
      response_body: { status: 'pix_created' }
    });

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
    console.error('PIX payment error:', error.message);
    
    // Log the error for monitoring
    try {
      await supabase.from('webhook_logs').insert({
        event_type: 'pix_payment_error',
        shipment_id: 'error',
        payload: {
          error: error.message,
          client_ip: clientIP,
          user_agent: userAgent,
          timestamp: new Date().toISOString()
        },
        response_status: 500,
        response_body: { error: 'Internal error' }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message.includes('Rate limit') || 
               error.message.includes('inválido') || 
               error.message.includes('obrigatórios') || 
               error.message.includes('Valor deve') 
               ? error.message 
               : 'Erro interno do servidor. Tente novamente.'
      }),
      { 
        status: error.message.includes('Rate limit') ? 429 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});