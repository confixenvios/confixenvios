import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Security: Input validation for tracking codes
const validateTrackingCode = (trackingCode: string): { isValid: boolean; error?: string } => {
  if (!trackingCode || typeof trackingCode !== 'string') {
    return { isValid: false, error: 'Código de rastreio é obrigatório' };
  }

  // Sanitize and validate format
  const cleanCode = trackingCode.trim().toUpperCase();
  if (!/^[A-Z0-9\-]{3,20}$/.test(cleanCode)) {
    return { isValid: false, error: 'Código de rastreio inválido. Use apenas letras, números e hífen.' };
  }

  return { isValid: true };
};

// Security: Check rate limits for tracking queries
const checkTrackingRateLimit = async (supabase: any, clientIp: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      client_ip: clientIp,
      action_type: 'tracking_query',
      max_attempts: 20, // More lenient for tracking queries
      time_window_minutes: 10
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
    console.log('🔍 Secure tracking request started');
    
    const { trackingCode } = await req.json();
    
    // Security: Get client IP for rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    // Security: Validate input
    const validation = validateTrackingCode(trackingCode);
    if (!validation.isValid) {
      console.error('❌ Tracking code validation failed:', validation.error);
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Security: Check rate limits
    const rateLimitOk = await checkTrackingRateLimit(supabase, clientIp);
    if (!rateLimitOk) {
      console.error('❌ Rate limit exceeded for tracking from IP:', clientIp);
      
      // Log security incident
      await supabase.from('webhook_logs').insert({
        event_type: 'tracking_rate_limit_exceeded',
        shipment_id: 'rate_limit',
        payload: {
          client_ip: clientIp,
          tracking_code: trackingCode.substring(0, 5) + '***', // Partial tracking code for security
          timestamp: new Date().toISOString()
        },
        response_status: 429,
        response_body: { status: 'rate_limited' }
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Muitas consultas de rastreio. Aguarde alguns minutos antes de tentar novamente.',
          rateLimited: true
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429 
        }
      );
    }

    const cleanCode = trackingCode.trim().toUpperCase();
    
    // Query the safe tracking view instead of full shipments table
    const { data: trackingData, error } = await supabase
      .from('safe_tracking_view')
      .select('*')
      .eq('tracking_code', cleanCode)
      .maybeSingle();

    // Log tracking attempt for security audit
    await supabase.from('webhook_logs').insert({
      event_type: 'secure_tracking_query',
      shipment_id: cleanCode,
      payload: {
        tracking_code: cleanCode,
        client_ip: clientIp,
        found: !!trackingData,
        timestamp: new Date().toISOString(),
        security_audit: {
          rate_limit_checked: true,
          input_validated: true,
          safe_view_used: true
        }
      },
      response_status: trackingData ? 200 : 404,
      response_body: { status: trackingData ? 'found' : 'not_found' }
    });

    if (error) {
      console.error('❌ Database error:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro interno do sistema' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    if (!trackingData) {
      console.log('📦 Tracking code not found:', cleanCode);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Código de rastreio não encontrado',
          notFound: true
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      );
    }

    console.log('✅ Secure tracking data found');

    return new Response(
      JSON.stringify({
        success: true,
        data: trackingData,
        security: {
          dataProtected: true,
          message: "Apenas informações básicas são exibidas para proteção de dados"
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('💥 Secure tracking error:', error);
    
    // Security: Log failed attempts
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      
      await supabase.from('webhook_logs').insert({
        event_type: 'secure_tracking_error',
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
      console.error('Failed to log tracking error:', logError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Erro interno do servidor'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});