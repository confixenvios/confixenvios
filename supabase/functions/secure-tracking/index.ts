import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tracking-code",
};

// Enhanced security validation using database functions
const validateAndCheckSecurity = async (supabase: any, trackingCode: string, clientIp: string): Promise<{isValid: boolean, isBlocked: boolean, error?: string}> => {
  try {
    // Check if IP is blocked first
    const { data: isBlocked } = await supabase.rpc('is_ip_blocked', {
      client_ip: clientIp
    });

    if (isBlocked === true) {
      return { isValid: false, isBlocked: true, error: 'IP bloqueado por atividade suspeita' };
    }

    // Validate tracking request with enhanced security
    const { data: isValid } = await supabase.rpc('validate_secure_tracking_request', {
      tracking_code: trackingCode,
      client_ip: clientIp
    });

    return { isValid: isValid === true, isBlocked: false };
  } catch (error) {
    console.error('Security validation error:', error);
    return { isValid: false, isBlocked: false, error: 'Erro de validação de segurança' };
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
    
    // Basic input validation first
    if (!trackingCode || typeof trackingCode !== 'string') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Código de rastreio é obrigatório' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Security: Get client IP for rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Enhanced security validation
    const security = await validateAndCheckSecurity(supabase, trackingCode, clientIp);
    
    if (security.isBlocked) {
      console.error('❌ IP blocked for tracking:', clientIp);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: security.error || 'Acesso bloqueado por segurança',
          blocked: true
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403 
        }
      );
    }

    if (!security.isValid) {
      console.error('❌ Enhanced tracking validation failed');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: security.error || 'Código de rastreio inválido'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const cleanCode = trackingCode.trim().toUpperCase();
    
    // Create client with tracking code header for view access
    const secureSupabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { 
        auth: { persistSession: false },
        global: {
          headers: {
            'x-tracking-code': cleanCode,
            'x-forwarded-for': clientIp
          }
        }
      }
    );
    
    // Query the safe tracking view with enhanced security
    const { data: trackingData, error } = await secureSupabase
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