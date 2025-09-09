import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CompanyBranch {
  id: string;
  name: string;
  cnpj: string;
  rntrc?: string;
  inscricao_estadual?: string;
  fantasy_name?: string;
  email?: string;
  phone?: string;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  cfop_comercio_dentro_estado: string;
  cfop_comercio_fora_estado: string;
  cfop_industria_dentro_estado: string;
  cfop_industria_fora_estado: string;
  is_main_branch: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface WebhookPayload {
  event_type: 'company_branch_created' | 'company_branch_updated' | 'company_branch_deleted';
  branch_id: string;
  branch_data: CompanyBranch;
  timestamp: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { branch_id, event_type } = await req.json();

    console.log(`Processing company branch webhook for branch: ${branch_id}, event: ${event_type}`);

    // Buscar dados da filial (se não foi deletada)
    let branchData = null;
    if (event_type !== 'company_branch_deleted') {
      const { data: branch, error: branchError } = await supabase
        .from('company_branches')
        .select('*')
        .eq('id', branch_id)
        .single();

      if (branchError) {
        console.error('Error fetching branch data:', branchError);
        throw branchError;
      }
      branchData = branch;
    }

    // Buscar todas as integrações ativas
    const { data: integrations, error: integrationsError } = await supabase
      .from('integrations')
      .select('*')
      .eq('active', true);

    if (integrationsError) {
      console.error('Error fetching integrations:', integrationsError);
      throw integrationsError;
    }

    if (!integrations || integrations.length === 0) {
      console.log('No active integrations found');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No active integrations to send webhook to'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Preparar payload do webhook
    const webhookPayload: WebhookPayload = {
      event_type,
      branch_id,
      branch_data: branchData,
      timestamp: new Date().toISOString()
    };

    // Enviar webhook para cada integração
    const webhookPromises = integrations.map(async (integration) => {
      try {
        console.log(`Sending webhook to: ${integration.webhook_url}`);

        const response = await fetch(integration.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Supabase-Company-Branch-Webhook/1.0',
            'X-Webhook-Event': event_type,
            'X-Webhook-Source': 'company-branch-system'
          },
          body: JSON.stringify(webhookPayload)
        });

        const responseText = await response.text();
        let responseBody;
        
        try {
          responseBody = JSON.parse(responseText);
        } catch {
          responseBody = { message: responseText };
        }

        // Log do resultado do webhook
        await supabase
          .from('webhook_logs')
          .insert({
            event_type: `${event_type}_webhook_sent`,
            shipment_id: branch_id,
            payload: {
              integration_id: integration.id,
              integration_name: integration.name,
              webhook_url: integration.webhook_url,
              branch_data: webhookPayload,
              sent_at: new Date().toISOString()
            },
            response_status: response.status,
            response_body: responseBody
          });

        console.log(`Webhook sent successfully to ${integration.name}: ${response.status}`);

        return {
          integration_id: integration.id,
          integration_name: integration.name,
          success: response.ok,
          status: response.status,
          response: responseBody
        };

      } catch (error) {
        console.error(`Error sending webhook to ${integration.name}:`, error);

        // Log do erro
        await supabase
          .from('webhook_logs')
          .insert({
            event_type: `${event_type}_webhook_error`,
            shipment_id: branch_id,
            payload: {
              integration_id: integration.id,
              integration_name: integration.name,
              webhook_url: integration.webhook_url,
              error: error.message,
              branch_data: webhookPayload,
              attempted_at: new Date().toISOString()
            },
            response_status: 500,
            response_body: { error: error.message }
          });

        return {
          integration_id: integration.id,
          integration_name: integration.name,
          success: false,
          error: error.message
        };
      }
    });

    const results = await Promise.all(webhookPromises);

    console.log('All webhooks processed:', results);

    return new Response(JSON.stringify({
      success: true,
      branch_id,
      event_type,
      integrations_notified: results.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error processing company branch webhook:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});