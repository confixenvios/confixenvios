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
    const trackingCodeParam = url.searchParams.get('trackingCode') || url.searchParams.get('tracking_code');
    
    // Se recebeu um array, pegar o primeiro item
    if (Array.isArray(webhookData)) {
      console.log('CTE Webhook - Received array, using first item');
      webhookData = webhookData[0];
    }

    // Mapear campos da API do CT-e para o formato esperado pela edge function
    const normalizedData = {
      remessa_id: webhookData.remessa_id || webhookData.tracking_code || trackingCodeParam || null,
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

    // Buscar shipment completo para obter tracking_code e confirmar shipment_id
    let shipmentId = webhookData.shipment_id || null;
    let trackingCode = webhookData.remessa_id || null;
    
    // ESTRATÉGIA 1: Se temos shipment_id, buscar dados completos do shipment
    if (shipmentId) {
      console.log('CTE Webhook - Strategy 1: Looking up by shipment_id:', shipmentId);
      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .select('id, tracking_code')
        .eq('id', shipmentId)
        .maybeSingle();

      if (shipmentError) {
        console.error('CTE Webhook - Error finding shipment by ID:', shipmentError);
      } else if (shipment) {
        trackingCode = shipment.tracking_code;
        console.log('CTE Webhook - Found shipment by ID:', { id: shipmentId, tracking_code: trackingCode });
      } else {
        console.warn('CTE Webhook - Shipment not found with ID:', shipmentId);
        shipmentId = null; // Reset para tentar outras estratégias
      }
    }
    
    // ESTRATÉGIA 2: Se temos tracking code mas não shipment_id, buscar o shipment
    if (!shipmentId && trackingCode) {
      console.log('CTE Webhook - Strategy 2: Looking up by tracking_code:', trackingCode);
      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .select('id, tracking_code')
        .eq('tracking_code', trackingCode)
        .maybeSingle();

      if (shipmentError) {
        console.error('CTE Webhook - Error finding shipment by tracking code:', shipmentError);
      } else if (shipment) {
        shipmentId = shipment.id;
        trackingCode = shipment.tracking_code;
        console.log('CTE Webhook - Found shipment via tracking code:', { id: shipmentId, tracking_code: trackingCode });
      } else {
        console.warn('CTE Webhook - No shipment found for tracking code:', trackingCode);
      }
    }
    
    // ESTRATÉGIA 3: Buscar a remessa mais recente com status PAID/PAYMENT_CONFIRMED que ainda não tem CT-e
    // Esta é a estratégia de fallback quando o n8n não passa o shipmentId corretamente
    if (!shipmentId && !trackingCode) {
      console.log('CTE Webhook - Strategy 3: Looking for most recent paid shipment without CTE');
      
      // Buscar remessas pagas recentes (últimas 24 horas) que ainda não têm CT-e registrado
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: recentShipments, error: recentError } = await supabase
        .from('shipments')
        .select('id, tracking_code, created_at, status')
        .in('status', ['PAID', 'PAYMENT_CONFIRMED', 'PROCESSING', 'LABEL_GENERATED'])
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (recentError) {
        console.error('CTE Webhook - Error finding recent shipments:', recentError);
      } else if (recentShipments && recentShipments.length > 0) {
        console.log('CTE Webhook - Found', recentShipments.length, 'recent paid shipments');
        
        // Verificar quais já têm CT-e registrado
        for (const shipment of recentShipments) {
          const { data: existingCte } = await supabase
            .from('cte_emissoes')
            .select('id')
            .eq('shipment_id', shipment.id)
            .maybeSingle();
          
          if (!existingCte) {
            // Esta remessa ainda não tem CT-e, usar ela
            shipmentId = shipment.id;
            trackingCode = shipment.tracking_code;
            console.log('CTE Webhook - Using recent shipment without CTE:', { id: shipmentId, tracking_code: trackingCode });
            break;
          }
        }
        
        if (!shipmentId) {
          console.warn('CTE Webhook - All recent shipments already have CTE');
        }
      } else {
        console.warn('CTE Webhook - No recent paid shipments found');
      }
    }
    
    // ESTRATÉGIA 4: Se ainda não encontrou, salvar o CT-e sem associação (para não perder os dados)
    // Usar a chave_cte como identificador temporário
    if (!shipmentId && !trackingCode) {
      console.warn('CTE Webhook - No shipment found, saving CTE with chave_cte as remessa_id for later association');
      // Usar os últimos 8 caracteres da chave como identificador temporário
      trackingCode = `CTE-${webhookData.chave_cte.slice(-8)}`;
      console.log('CTE Webhook - Using temporary tracking code:', trackingCode);
    }

    // Preparar dados para inserção/atualização com tracking_code garantido
    const cteData = {
      shipment_id: shipmentId,
      remessa_id: trackingCode,
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
    
    console.log('CTE Webhook - Prepared data for database:', JSON.stringify(cteData, null, 2));

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

    // Se o CTe foi aprovado e temos um shipment_id, disparar automaticamente o webhook da Jadlog
    let jadlogResult = null;
    if (webhookData.status === 'aprovado' && shipmentId) {
      console.log('CTE Webhook - CTe aprovado, disparando webhook Jadlog automaticamente para shipment:', shipmentId);
      
      try {
        // Buscar dados completos do shipment para enviar à Jadlog
        const { data: shipmentData, error: shipmentFetchError } = await supabase
          .from('shipments')
          .select(`
            *,
            sender:sender_address_id(
              id, name, street, number, complement, neighborhood, city, state, cep
            ),
            recipient:recipient_address_id(
              id, name, street, number, complement, neighborhood, city, state, cep
            )
          `)
          .eq('id', shipmentId)
          .maybeSingle();

        if (shipmentFetchError || !shipmentData) {
          console.error('CTE Webhook - Erro ao buscar dados do shipment para Jadlog:', shipmentFetchError);
        } else {
          // Buscar dados pessoais criptografados
          let senderPersonalData = { document: '', phone: '', email: '' };
          let recipientPersonalData = { document: '', phone: '', email: '' };

          // Buscar dados do remetente
          const { data: senderSecure } = await supabase
            .from('secure_personal_data')
            .select('*')
            .eq('address_id', shipmentData.sender_address_id)
            .maybeSingle();

          if (senderSecure) {
            try {
              const { data: decrypted } = await supabase.rpc('decrypt_personal_data', { data_id: senderSecure.id });
              if (decrypted && decrypted.length > 0) {
                senderPersonalData = decrypted[0];
              }
            } catch (e) {
              console.log('CTE Webhook - Could not decrypt sender data');
            }
          }

          // Buscar dados do destinatário
          const { data: recipientSecure } = await supabase
            .from('secure_personal_data')
            .select('*')
            .eq('address_id', shipmentData.recipient_address_id)
            .maybeSingle();

          if (recipientSecure) {
            try {
              const { data: decrypted } = await supabase.rpc('decrypt_personal_data', { data_id: recipientSecure.id });
              if (decrypted && decrypted.length > 0) {
                recipientPersonalData = decrypted[0];
              }
            } catch (e) {
              console.log('CTE Webhook - Could not decrypt recipient data');
            }
          }

          // Buscar integração ativa da Jadlog
          const { data: integration } = await supabase
            .from('integrations')
            .select('*')
            .eq('name', 'Jadlog')
            .eq('active', true)
            .maybeSingle();

          if (integration && integration.webhook_url) {
            const quoteData = shipmentData.quote_data || {};
            
            // Preparar payload para Jadlog
            const jadlogPayload = {
              shipmentId: shipmentId,
              tracking_code: trackingCode,
              remetente: {
                nome: shipmentData.sender?.name || '',
                documento: senderPersonalData.document || '',
                telefone: senderPersonalData.phone || '',
                email: senderPersonalData.email || '',
                endereco: shipmentData.sender?.street || '',
                numero: shipmentData.sender?.number || '',
                complemento: shipmentData.sender?.complement || '',
                bairro: shipmentData.sender?.neighborhood || '',
                cidade: shipmentData.sender?.city || '',
                estado: shipmentData.sender?.state || '',
                cep: shipmentData.sender?.cep || ''
              },
              destinatario: {
                nome: shipmentData.recipient?.name || '',
                documento: recipientPersonalData.document || '',
                telefone: recipientPersonalData.phone || '',
                email: recipientPersonalData.email || '',
                endereco: shipmentData.recipient?.street || '',
                numero: shipmentData.recipient?.number || '',
                complemento: shipmentData.recipient?.complement || '',
                bairro: shipmentData.recipient?.neighborhood || '',
                cidade: shipmentData.recipient?.city || '',
                estado: shipmentData.recipient?.state || '',
                cep: shipmentData.recipient?.cep || ''
              },
              pacote: {
                peso: shipmentData.weight || 1,
                altura: shipmentData.height || 10,
                largura: shipmentData.width || 10,
                comprimento: shipmentData.length || 10,
                formato: shipmentData.format || 'pacote'
              },
              valor_declarado: quoteData.declaredValue || quoteData.mercadoria_valorDeclarado || 100,
              valor_frete: quoteData.price || quoteData.valorTotal || 20,
              cte_chave: result.data.chave_cte
            };

            console.log('CTE Webhook - Enviando para Jadlog:', JSON.stringify(jadlogPayload, null, 2));

            const jadlogResponse = await fetch(integration.webhook_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(jadlogPayload)
            });

            jadlogResult = {
              status: jadlogResponse.status,
              success: jadlogResponse.ok
            };

            console.log('CTE Webhook - Resposta Jadlog:', jadlogResult.status);

            // Log do webhook Jadlog
            await supabase.from('webhook_logs').insert({
              shipment_id: shipmentId,
              event_type: 'jadlog_auto_dispatch',
              payload: jadlogPayload,
              response_status: jadlogResponse.status,
              response_body: { auto_triggered: true, from_cte_webhook: true }
            });
          } else {
            console.log('CTE Webhook - Integração Jadlog não encontrada ou inativa');
          }
        }
      } catch (jadlogError) {
        console.error('CTE Webhook - Erro ao disparar Jadlog:', jadlogError);
        jadlogResult = { error: jadlogError.message };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `CTE emission ${result.action} successfully`,
        cte_id: result.data.id,
        action: result.action,
        status: result.data.status,
        chave_cte: result.data.chave_cte,
        shipment_id: shipmentId,
        tracking_code: trackingCode,
        jadlog_auto_dispatch: jadlogResult
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
