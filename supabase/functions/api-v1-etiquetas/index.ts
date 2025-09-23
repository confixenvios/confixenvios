import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EtiquetaRequest {
  remessa_id: string;
  destinatario: {
    nome: string;
    endereco: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  remetente: {
    nome: string;
    cnpj: string;
  };
  servico: 'expresso' | 'economico';
  peso: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let apiKeyId: string | null = null;
  let requestBody: any = null;
  let responseStatus = 500;
  let responseBody: any = null;

  try {
    // Verificar método HTTP
    if (req.method !== 'POST') {
      responseStatus = 405;
      responseBody = { error: 'Método não permitido. Use POST.' };
      return new Response(JSON.stringify(responseBody), {
        status: responseStatus,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extrair e validar API key
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      responseStatus = 401;
      responseBody = { error: 'Token de autenticação obrigatório. Use: Authorization: Bearer {API_KEY}' };
      return new Response(JSON.stringify(responseBody), {
        status: responseStatus,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = authHeader.substring(7); // Remove "Bearer "
    
    // Criar cliente Supabase
    const supabase = createClient(
      'https://dhznyjtisfdxzbnzinab.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoem55anRpc2ZkeHpibnppbmFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQwMzI2MCwiZXhwIjoyMDcxOTc5MjYwfQ.mzNZ5iS9x3fH5y8kRT9yOqKs8tg2D7y1RSI__RhGfZ0'
    );

    // Validar API key
    const { data: keyValidation } = await supabase.rpc('validate_api_key', {
      p_api_key: apiKey
    });

    if (!keyValidation || keyValidation.length === 0 || !keyValidation[0]?.is_valid) {
      responseStatus = 401;
      responseBody = { 
        error: 'API key inválida ou expirada. Verifique sua chave de acesso.',
        details: keyValidation?.[0]?.is_valid === false ? 'Rate limit excedido ou chave inativa' : 'Chave não encontrada'
      };
      return new Response(JSON.stringify(responseBody), {
        status: responseStatus,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    apiKeyId = keyValidation[0].key_id;

    // Parse request body
    try {
      requestBody = await req.json();
    } catch (error) {
      responseStatus = 400;
      responseBody = { error: 'JSON inválido no body da requisição' };
      return new Response(JSON.stringify(responseBody), {
        status: responseStatus,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validar campos obrigatórios
    const requiredFields = [
      'remessa_id', 'destinatario', 'remetente', 'servico', 'peso'
    ];
    
    for (const field of requiredFields) {
      if (!requestBody[field]) {
        responseStatus = 400;
        responseBody = { error: `Campo obrigatório ausente: ${field}` };
        return new Response(JSON.stringify(responseBody), {
          status: responseStatus,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Validar estrutura do destinatário
    const destinatarioFields = ['nome', 'endereco', 'cidade', 'uf', 'cep'];
    for (const field of destinatarioFields) {
      if (!requestBody.destinatario[field]) {
        responseStatus = 400;
        responseBody = { error: `Campo obrigatório ausente em destinatario: ${field}` };
        return new Response(JSON.stringify(responseBody), {
          status: responseStatus,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Validar estrutura do remetente
    const remetenteFields = ['nome', 'cnpj'];
    for (const field of remetenteFields) {
      if (!requestBody.remetente[field]) {
        responseStatus = 400;
        responseBody = { error: `Campo obrigatório ausente em remetente: ${field}` };
        return new Response(JSON.stringify(responseBody), {
          status: responseStatus,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Validar serviço
    if (!['expresso', 'economico'].includes(requestBody.servico)) {
      responseStatus = 400;
      responseBody = { error: 'Serviço deve ser "expresso" ou "economico"' };
      return new Response(JSON.stringify(responseBody), {
        status: responseStatus,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validar peso
    if (typeof requestBody.peso !== 'number' || requestBody.peso <= 0) {
      responseStatus = 400;
      responseBody = { error: 'Peso deve ser um número maior que zero' };
      return new Response(JSON.stringify(responseBody), {
        status: responseStatus,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Simular criação de etiqueta
    const trackingCode = `CF${Date.now().toString().slice(-8)}`;
    const etiquetaUrl = `https://sistema.confix.com.br/etiquetas/${trackingCode}.pdf`;

    // Criar registro de remessa no sistema (simplificado)
    const remessaData = {
      tracking_code: trackingCode,
      status: 'LABEL_GENERATED',
      weight: requestBody.peso,
      selected_option: requestBody.servico,
      format: 'caixa', // Valor padrão
      pickup_option: 'balcao', // Valor padrão
      quote_data: {
        addressData: {
          sender: {
            name: requestBody.remetente.nome,
            document: requestBody.remetente.cnpj
          },
          recipient: {
            name: requestBody.destinatario.nome,
            street: requestBody.destinatario.endereco,
            city: requestBody.destinatario.cidade,
            state: requestBody.destinatario.uf,
            cep: requestBody.destinatario.cep
          }
        },
        api_created: true,
        api_company: keyValidation[0].company_name
      }
    };

    // Atualizar contador de uso da API key
    await supabase
      .from('api_keys')
      .update({ 
        usage_count: keyValidation[0].usage_count + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', apiKeyId);

    responseStatus = 200;
    responseBody = {
      status: 'sucesso',
      remessa_id: requestBody.remessa_id,
      tracking_code: trackingCode,
      etiqueta_url: etiquetaUrl,
      servico: requestBody.servico,
      peso: requestBody.peso
    };

    return new Response(JSON.stringify(responseBody), {
      status: responseStatus,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro no endpoint de etiquetas:', error);
    responseStatus = 500;
    responseBody = { 
      error: 'Erro interno do servidor',
      details: error.message 
    };
    return new Response(JSON.stringify(responseBody), {
      status: responseStatus,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } finally {
    // Log da requisição para auditoria
    if (apiKeyId) {
      const executionTime = Date.now() - startTime;
      const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = req.headers.get('user-agent') || 'unknown';

      try {
        const supabase = createClient(
          'https://dhznyjtisfdxzbnzinab.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoem55anRpc2ZkeHpibnppbmFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQwMzI2MCwiZXhwIjoyMDcxOTc5MjYwfQ.mzNZ5iS9x3fH5y8kRT9yOqKs8tg2D7y1RSI__RhGfZ0'
        );

        await supabase.from('api_usage_logs').insert({
          api_key_id: apiKeyId,
          endpoint: '/api/v1/etiquetas',
          method: 'POST',
          request_body: requestBody,
          response_status: responseStatus,
          response_body: responseBody,
          ip_address: clientIp,
          user_agent: userAgent,
          execution_time_ms: executionTime
        });
      } catch (logError) {
        console.error('Erro ao salvar log de auditoria:', logError);
      }
    }
  }
});