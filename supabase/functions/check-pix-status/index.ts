import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentId, isB2B: requestIsB2B } = await req.json();
    
    if (!paymentId) {
      console.error('❌ PaymentId não fornecido');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'PaymentId é obrigatório'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🔍 Verificando status PIX via API Abacate Pay para:', paymentId);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Determinar se é B2B verificando temp_quotes ou pelo parâmetro
    let isB2B = requestIsB2B || false;
    
    if (!isB2B) {
      // Tentar identificar se é B2B pelo temp_quote pendente mais recente
      const { data: recentQuotes } = await supabase
        .from('temp_quotes')
        .select('quote_options')
        .eq('status', 'pending_payment')
        .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (recentQuotes && recentQuotes.length > 0 && recentQuotes[0].quote_options?.isB2B) {
        isB2B = true;
        console.log('🏢 Detectado pagamento B2B pelo temp_quote');
      }
    }

    // Buscar API key correta baseado no tipo de pagamento
    let abacateApiKey: string | undefined;
    
    if (isB2B) {
      abacateApiKey = Deno.env.get('ABACATE_PAY_B2B_API_KEY');
      console.log('🏢 Usando API key B2B para verificação');
    } else {
      abacateApiKey = Deno.env.get('ABACATE_PAY_API_KEY');
      console.log('📦 Usando API key padrão para verificação');
    }
    
    if (!abacateApiKey) {
      console.error('❌ API key não configurada:', isB2B ? 'ABACATE_PAY_B2B_API_KEY' : 'ABACATE_PAY_API_KEY');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'API key não configurada'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fazer requisição usando a documentação fornecida
    const url = `https://api.abacatepay.com/v1/pixQrCode/check?id=${paymentId}`;
    console.log('🌐 Consultando API:', url, '(B2B:', isB2B, ')');
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${abacateApiKey}`,
        'Content-Type': 'application/json'
      },
      body: undefined
    };

    const response = await fetch(url, options);

    console.log('📊 Status da resposta:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na API Abacate Pay:', response.status, errorText);
      
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Erro ao consultar status do pagamento',
        details: errorText,
        status: response.status
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    console.log('📋 Dados recebidos da API:', JSON.stringify(data, null, 2));

    // Verificar estrutura conforme documentação
    const paymentData = data.data;
    const isPaid = paymentData?.status === 'PAID';
    
    console.log(`💰 Status do pagamento: ${paymentData?.status} - Pago: ${isPaid}`);

    // =====================================================
    // NOVA ARQUITETURA: Criar remessa separada POR VOLUME
    // =====================================================
    if (isPaid && isB2B) {
      console.log('✅ Pagamento B2B confirmado - iniciando criação das remessas por volume');
      
      try {
        // Buscar temp_quotes B2B pendentes das últimas 2 horas
        console.log('🔍 Buscando temp_quotes B2B pendentes...');
        
        const { data: pendingQuotes, error: quotesError } = await supabase
          .from('temp_quotes')
          .select('*')
          .eq('status', 'pending_payment')
          .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false });
        
        if (quotesError) {
          console.error('❌ Erro ao buscar temp_quotes:', quotesError);
        } else {
          console.log(`📦 Encontradas ${pendingQuotes?.length || 0} temp_quotes pendentes`);
          
          // Encontrar a quote B2B mais recente
          const b2bQuote = pendingQuotes?.find(q => q.quote_options?.isB2B === true);
          
          if (b2bQuote) {
            console.log('🎯 Temp_quote B2B encontrada:', b2bQuote.id, 'external_id:', b2bQuote.external_id);
            
            const senderData = b2bQuote.sender_data;
            const recipientData = b2bQuote.recipient_data;
            const packageData = b2bQuote.package_data;
            const quoteOptions = b2bQuote.quote_options;
            const b2bClientId = senderData?.clientId;
            
            console.log('👤 ClientId B2B:', b2bClientId);
            
            if (b2bClientId) {
              // Verificar se temp_quote já foi processada (evita duplicação)
              if (b2bQuote.status === 'processed') {
                console.log('⚠️ Temp_quote já foi processada, remessas B2B já existem');
              } else {
                // Marcar como processada ANTES de criar para evitar race condition
                const { error: lockError } = await supabase
                  .from('temp_quotes')
                  .update({ status: 'processing' })
                  .eq('id', b2bQuote.id)
                  .eq('status', 'pending_payment');
                
                if (lockError) {
                  console.log('⚠️ Não foi possível obter lock, provavelmente já está sendo processada');
                } else {
                  // Gerar código base de rastreamento (será o mesmo para todos os volumes)
                  const baseTrackingCode = Math.random().toString(36).substr(2, 8).toUpperCase();
                  console.log('🏷️ Gerando tracking code base:', baseTrackingCode);
                  
                  const volumeAddresses = recipientData?.volumeAddresses || packageData?.volumeAddresses || [];
                  const volumeWeights = packageData?.volumeWeights || [];
                  const volumeCount = packageData?.volumeCount || volumeAddresses.length || 1;
                  
                  console.log(`📦 Criando ${volumeCount} remessas individuais (uma por volume)`);
                  
                  const createdShipments: any[] = [];
                  const createdEtiCodes: any[] = [];
                  
                  // Criar uma remessa para cada volume
                  for (let i = 0; i < volumeCount; i++) {
                    const volumeNumber = i + 1;
                    const trackingCode = `B2B-${baseTrackingCode}-V${volumeNumber}`;
                    const volumeAddress = volumeAddresses[i] || volumeAddresses[0] || {};
                    const volumeWeight = volumeWeights[i] || 0;
                    
                    console.log(`📦 Criando volume ${volumeNumber}: ${trackingCode}`);
                    
                    const b2bShipmentData = {
                      b2b_client_id: b2bClientId,
                      tracking_code: trackingCode,
                      volume_count: 1, // Cada remessa é 1 volume
                      volume_number: volumeNumber,
                      volume_weight: volumeWeight,
                      is_volume: true, // Todos são volumes individuais desde o início
                      delivery_date: recipientData?.deliveryDate || new Date().toISOString().split('T')[0],
                      status: 'B2B_COLETA_PENDENTE',
                      // Dados do destinatário específico deste volume
                      recipient_name: volumeAddress.recipientName || volumeAddress.name || null,
                      recipient_phone: volumeAddress.recipientPhone || volumeAddress.phone || null,
                      recipient_cep: volumeAddress.cep || null,
                      recipient_street: volumeAddress.street || null,
                      recipient_number: volumeAddress.number || null,
                      recipient_complement: volumeAddress.complement || null,
                      recipient_neighborhood: volumeAddress.neighborhood || null,
                      recipient_city: volumeAddress.city || null,
                      recipient_state: volumeAddress.state || null,
                      observations: JSON.stringify({
                        vehicle_type: recipientData?.vehicleType || quoteOptions?.vehicleType,
                        base_tracking_code: baseTrackingCode,
                        total_volumes_in_order: volumeCount,
                        volume_address: volumeAddress,
                        pickup_address: senderData?.pickupAddress || recipientData?.pickupAddress || packageData?.pickupAddress || quoteOptions?.pickupAddress || null,
                        amount_paid: (quoteOptions?.amount || 0) / volumeCount, // Proporção do pagamento
                        total_order_amount: quoteOptions?.amount || 0,
                        payment_id: paymentId,
                        external_id: b2bQuote.external_id,
                        paid_at: new Date().toISOString(),
                        paid: true,
                        created_via: 'check-pix-status-individual-volumes'
                      })
                    };
                    
                    const { data: newB2BShipment, error: b2bError } = await supabase
                      .from('b2b_shipments')
                      .insert([b2bShipmentData])
                      .select()
                      .single();
                    
                    if (b2bError) {
                      console.error(`❌ Erro ao criar volume ${volumeNumber}:`, JSON.stringify(b2bError));
                    } else {
                      console.log(`✅ Volume ${volumeNumber} criado:`, newB2BShipment.id);
                      createdShipments.push(newB2BShipment);
                      
                      // Gerar código ETI para este volume
                      const { data: etiCode, error: etiError } = await supabase.rpc('create_eti_codes_for_shipment', {
                        p_b2b_shipment_id: newB2BShipment.id,
                        p_volume_count: 1
                      });
                      
                      if (etiError) {
                        console.error(`❌ Erro ao gerar ETI para volume ${volumeNumber}:`, etiError);
                      } else {
                        console.log(`✅ ETI gerado para volume ${volumeNumber}:`, etiCode);
                        createdEtiCodes.push(etiCode);
                        
                        // Atualizar o volume com o código ETI
                        if (etiCode && etiCode.length > 0) {
                          await supabase
                            .from('b2b_shipments')
                            .update({ volume_eti_code: etiCode[0].eti_code })
                            .eq('id', newB2BShipment.id);
                        }
                      }
                    }
                  }
                  
                  console.log(`✅ ${createdShipments.length} remessas B2B criadas com sucesso`);
                  
                  // Marcar temp_quote como processada
                  const { error: updateError } = await supabase
                    .from('temp_quotes')
                    .update({ 
                      status: 'processed',
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', b2bQuote.id);
                  
                  if (updateError) {
                    console.error('❌ Erro ao atualizar temp_quote:', updateError);
                  } else {
                    console.log('✅ Temp_quote marcada como processada');
                  }
                  
                  // Log do webhook
                  await supabase
                    .from('webhook_logs')
                    .insert([{
                      event_type: 'b2b_shipments.created_individual_volumes',
                      shipment_id: createdShipments[0]?.id || 'batch',
                      payload: {
                        b2b_shipments: createdShipments,
                        base_tracking_code: baseTrackingCode,
                        volume_count: volumeCount,
                        payment_id: paymentId,
                        external_id: b2bQuote.external_id,
                        created_via: 'check-pix-status-individual-volumes',
                        eti_codes: createdEtiCodes
                      },
                      response_status: 200,
                      response_body: { success: true }
                    }]);
                  
                  console.log('📋 Log de webhook criado');
                }
              }
            } else {
              console.error('❌ ClientId B2B não encontrado no sender_data');
            }
          } else {
            console.log('⚠️ Nenhuma temp_quote B2B pendente encontrada');
          }
        }
      } catch (fallbackError) {
        console.error('⚠️ Erro no fallback de criação B2B:', fallbackError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: paymentData,
      isPaid: isPaid,
      status: paymentData?.status,
      expiresAt: paymentData?.expiresAt,
      paymentId: paymentId,
      checkedAt: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro geral na verificação PIX:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
