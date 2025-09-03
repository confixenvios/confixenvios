import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create service role client to bypass RLS
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log('Testing webhook URL connectivity...');

    // Get active integration webhook URL
    const { data: integration, error: integrationError } = await supabaseService
      .from('integrations')
      .select('webhook_url, secret_key, name')
      .eq('active', true)
      .single();

    if (integrationError || !integration) {
      throw new Error(`No active integration found: ${integrationError?.message}`);
    }

    console.log(`Testing webhook: ${integration.name} at ${integration.webhook_url}`);

    // Test payload for connectivity check
    const testPayload = {
      event: "connectivity_test",
      timestamp: new Date().toISOString(),
      test: true,
      message: "Teste de conectividade do webhook Confix Envios"
    };

    console.log('Sending test payload:', JSON.stringify(testPayload, null, 2));

    // Send test request to webhook URL
    const webhookResponse = await fetch(integration.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Confix-Envios-Test/1.0',
        ...(integration.secret_key && { 'Authorization': `Bearer ${integration.secret_key}` })
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await webhookResponse.text();
    
    console.log(`Webhook response status: ${webhookResponse.status}`);
    console.log(`Webhook response headers:`, Object.fromEntries(webhookResponse.headers.entries()));
    console.log(`Webhook response body: ${responseText}`);

    // Log test result to webhook_logs table
    await supabaseService.from('webhook_logs').insert({
      event_type: 'connectivity_test',
      shipment_id: 'test-connectivity',
      payload: testPayload,
      response_status: webhookResponse.status,
      response_body: {
        body: responseText,
        headers: Object.fromEntries(webhookResponse.headers.entries()),
        test: true
      }
    });

    const result = {
      success: webhookResponse.ok,
      integration: {
        name: integration.name,
        url: integration.webhook_url,
        hasSecret: !!integration.secret_key
      },
      response: {
        status: webhookResponse.status,
        statusText: webhookResponse.statusText,
        body: responseText,
        headers: Object.fromEntries(webhookResponse.headers.entries())
      },
      analysis: {
        isReachable: webhookResponse.status !== 0,
        isValidEndpoint: webhookResponse.status < 500,
        possibleIssues: []
      }
    };

    // Analyze common issues
    if (webhookResponse.status === 404) {
      result.analysis.possibleIssues.push("Endpoint não encontrado (404) - Verificar se a URL está correta no N8n");
    }
    if (webhookResponse.status === 401 || webhookResponse.status === 403) {
      result.analysis.possibleIssues.push("Problema de autenticação - Verificar secret key se necessário");
    }
    if (webhookResponse.status >= 500) {
      result.analysis.possibleIssues.push("Erro no servidor de destino - Verificar logs do N8n");
    }
    if (webhookResponse.status === 0) {
      result.analysis.possibleIssues.push("URL não é acessível - Verificar conectividade de rede");
    }

    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error testing webhook URL:', error);
    
    const errorResult = {
      success: false,
      error: error.message,
      analysis: {
        isReachable: false,
        isValidEndpoint: false,
        possibleIssues: [
          "Falha na conexão com o webhook",
          "Verificar se a URL está correta",
          "Verificar se o serviço N8n está funcionando"
        ]
      }
    };

    return new Response(JSON.stringify(errorResult, null, 2), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});