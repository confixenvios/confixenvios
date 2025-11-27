import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }), 
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let webhookData = await req.json();
    
    console.log('CTE Webhook - Received raw data:', JSON.stringify(webhookData, null, 2));

    // Extrair shipmentId do query parameter se não estiver no body
    const url = new URL(req.url);
    const shipmentIdParam = url.searchParams.get('shipmentId');
    
    // Se recebeu um array, pegar o primeiro item
    if (Array.isArray(webhookData)) {
      console.log('CTE Webhook - Received array, using first item');
      webhookData = webhookData[0];
    }

    // Mapear campos da API do CT-e para o formato esperado pela edge function
    const normalizedData = {
      remessa_id: webhookData.remessa_id || webhookData.tracking_code || null,
      chave_cte: webhookData.chave_cte || webhookData.chave || null,
      uuid_cte: webhookData.uuid_cte || webhookData.uuid || null,
      serie: webhookData.serie ? String(webhookData.serie) : null,
      numero_cte: webhookData.numero_cte || webhookData.cte ? String(webhookData.numero_cte || webhookData.cte) : null,
      status: webhookData.status || null,
      modelo: webhookData.modelo || null,
      motivo: webhookData.motivo || null,
      epec: webhookData.epec !== undefined ? webhookData.epec : null,
      xml_url: webhookData.xml_url || webhookData.xml || null,
      dacte_url: webhookData.dacte_url || webhookData.dacte || null,
      log: webhookData.log || null,
      shipment_id: webhookData.shipment_id || shipmentIdParam || null
    };

    console.log('CTE Webhook - Normalized data:', JSON.stringify(normalizedData, null, 2));

    // Validar campos obrigatórios
    const requiredFields = [
      'chave_cte', 
      'uuid_cte',
      'serie',
      'numero_cte',
      'status',
      'modelo'
    ];

    const missingFields = requiredFields.filter(field => !normalizedData[field]);
    if (missingFields.length > 0) {
      console.error('CTE Webhook - Missing required fields:', missingFields);
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          missing_fields: missingFields,
          received_data: normalizedData 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Usar dados normalizados daqui em diante
    webhookData = normalizedData;

    // Validar status
    const validStatuses = ['aprovado', 'reprovado', 'cancelado', 'processando', 'contingencia'];
    if (!validStatuses.includes(webhookData.status)) {
      console.error('CTE Webhook - Invalid status:', webhookData.status);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid status', 
          valid_statuses: validStatuses,
          received_status: webhookData.status
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Buscar shipment_id se fornecido o remessa_id ou usar o shipment_id fornecido
    let shipmentId = webhookData.shipment_id || null;
    
    if (!shipmentId && webhookData.remessa_id) {
      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .select('id')
        .eq('tracking_code', webhookData.remessa_id)
        .maybeSingle();

      if (shipmentError) {
        console.error('CTE Webhook - Error finding shipment:', shipmentError);
      } else if (shipment) {
        shipmentId = shipment.id;
        console.log('CTE Webhook - Found shipment ID via tracking code:', shipmentId);
      } else {
        console.warn('CTE Webhook - No shipment found for remessa_id:', webhookData.remessa_id);
      }
    } else if (shipmentId) {
      console.log('CTE Webhook - Using provided shipment ID:', shipmentId);
    }

    // Preparar dados para inserção/atualização
    const cteData = {
      shipment_id: shipmentId,
      remessa_id: webhookData.remessa_id,
      chave_cte: webhookData.chave_cte,
      uuid_cte: webhookData.uuid_cte,
      serie: webhookData.serie,
      numero_cte: webhookData.numero_cte,
      status: webhookData.status,
      motivo: webhookData.motivo || null,
      modelo: webhookData.modelo,
      epec: Boolean(webhookData.epec),
      xml_url: webhookData.xml_url || null,
      dacte_url: webhookData.dacte_url || null,
      payload_bruto: webhookData
    };

    // Verificar se já existe um registro com essa chave
    const { data: existingCte, error: checkError } = await supabase
      .from('cte_emissoes')
      .select('id')
      .eq('chave_cte', webhookData.chave_cte)
      .maybeSingle();

    if (checkError) {
      console.error('CTE Webhook - Error checking existing CTE:', checkError);
      return new Response(
        JSON.stringify({ 
          error: 'Database error while checking existing CTE',
          details: checkError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let result;
    if (existingCte) {
      // Atualizar registro existente
      console.log('CTE Webhook - Updating existing CTE with ID:', existingCte.id);
      const { data, error } = await supabase
        .from('cte_emissoes')
        .update(cteData)
        .eq('id', existingCte.id)
        .select()
        .single();

      if (error) {
        console.error('CTE Webhook - Error updating CTE:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to update CTE emission',
            details: error.message 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      result = { action: 'updated', data };
    } else {
      // Inserir novo registro
      console.log('CTE Webhook - Creating new CTE emission');
      const { data, error } = await supabase
        .from('cte_emissoes')
        .insert(cteData)
        .select()
        .single();

      if (error) {
        console.error('CTE Webhook - Error inserting CTE:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to insert CTE emission',
            details: error.message 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      result = { action: 'created', data };
    }

    console.log(`CTE Webhook - Successfully ${result.action} CTE emission:`, result.data.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `CTE emission ${result.action} successfully`,
        cte_id: result.data.id,
        action: result.action,
        status: result.data.status,
        chave_cte: result.data.chave_cte
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('CTE Webhook - Unexpected error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});