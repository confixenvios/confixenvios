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
    // FLUXO SIMPLIFICADO: Criar remessa separada POR VOLUME
    // Status inicial: PENDENTE_COLETA
    // =====================================================
    if (isPaid && isB2B) {
      console.log('✅ Pagamento B2B confirmado - criando remessas por volume');
      
      try {
        const { data: pendingQuotes, error: quotesError } = await supabase
          .from('temp_quotes')
          .select('*')
          .eq('status', 'pending_payment')
          .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false });
        
        if (quotesError) {
          console.error('❌ Erro ao buscar temp_quotes:', quotesError);
        } else {
          const b2bQuote = pendingQuotes?.find(q => q.quote_options?.isB2B === true);
          
          if (b2bQuote) {
            console.log('🎯 Temp_quote B2B encontrada:', b2bQuote.id);
            
            const senderData = b2bQuote.sender_data;
            const recipientData = b2bQuote.recipient_data;
            const packageData = b2bQuote.package_data;
            const quoteOptions = b2bQuote.quote_options;
            const b2bClientId = senderData?.clientId;
            
            if (b2bClientId) {
              if (b2bQuote.status === 'processed') {
                console.log('⚠️ Temp_quote já processada');
              } else {
                const { error: lockError } = await supabase
                  .from('temp_quotes')
                  .update({ status: 'processing' })
                  .eq('id', b2bQuote.id)
                  .eq('status', 'pending_payment');
                
                if (lockError) {
                  console.log('⚠️ Lock não obtido');
                } else {
                  // Gerar código base (mesmo para todos os volumes do pedido)
                  const baseTrackingCode = Math.random().toString(36).substr(2, 8).toUpperCase();
                  console.log('🏷️ Base tracking code:', baseTrackingCode);
                  
                  const volumeAddresses = recipientData?.volumeAddresses || packageData?.volumeAddresses || [];
                  const volumeWeights = packageData?.volumeWeights || [];
                  const volumeCount = packageData?.volumeCount || volumeAddresses.length || 1;
                  
                  console.log(`📦 Criando ${volumeCount} remessas individuais`);
                  
                  const createdShipments: any[] = [];
                  
                  for (let i = 0; i < volumeCount; i++) {
                    const volumeNumber = i + 1;
                    // Formato: B2B-XXXXXXXX-V1, B2B-XXXXXXXX-V2, etc
                    const trackingCode = `B2B-${baseTrackingCode}-V${volumeNumber}`;
                    const volumeAddress = volumeAddresses[i] || volumeAddresses[0] || {};
                    const volumeWeight = volumeWeights[i] || 0;
                    
                    console.log(`📦 Criando volume ${volumeNumber}: ${trackingCode}`);
                    
                    const b2bShipmentData = {
                      b2b_client_id: b2bClientId,
                      tracking_code: trackingCode,
                      volume_count: 1,
                      volume_number: volumeNumber,
                      volume_weight: volumeWeight,
                      is_volume: true,
                      delivery_date: recipientData?.deliveryDate || new Date().toISOString().split('T')[0],
                      status: 'PENDENTE_COLETA', // Status simplificado
                      recipient_name: volumeAddress.recipient_name || volumeAddress.recipientName || volumeAddress.name || null,
                      recipient_phone: volumeAddress.recipient_phone || volumeAddress.recipientPhone || volumeAddress.phone || null,
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
                        amount_paid: (quoteOptions?.amount || 0) / volumeCount,
                        total_order_amount: quoteOptions?.amount || 0,
                        payment_id: paymentId,
                        external_id: b2bQuote.external_id,
                        paid_at: new Date().toISOString()
                      })
                    };
                    
                    const { data: newShipment, error: shipError } = await supabase
                      .from('b2b_shipments')
                      .insert([b2bShipmentData])
                      .select()
                      .single();
                    
                    if (shipError) {
                      console.error(`❌ Erro ao criar volume ${volumeNumber}:`, JSON.stringify(shipError));
                    } else {
                      console.log(`✅ Volume ${volumeNumber} criado:`, newShipment.id);
                      createdShipments.push(newShipment);
                      
                      // Gerar código ETI
                      const { data: etiCode, error: etiError } = await supabase.rpc('create_eti_codes_for_shipment', {
                        p_b2b_shipment_id: newShipment.id,
                        p_volume_count: 1
                      });
                      
                      if (!etiError && etiCode && etiCode.length > 0) {
                        await supabase
                          .from('b2b_shipments')
                          .update({ volume_eti_code: etiCode[0].eti_code })
                          .eq('id', newShipment.id);
                        console.log(`✅ ETI gerado: ${etiCode[0].eti_code}`);
                      }
                    }
                  }
                  
                  // Marcar como processada
                  await supabase
                    .from('temp_quotes')
                    .update({ status: 'processed', updated_at: new Date().toISOString() })
                    .eq('id', b2bQuote.id);
                  
                  console.log(`✅ ${createdShipments.length} remessas B2B criadas`);
                  
                  // Log webhook
                  await supabase.from('webhook_logs').insert([{
                    event_type: 'b2b_shipments.created',
                    shipment_id: createdShipments[0]?.id || 'batch',
                    payload: {
                      shipments: createdShipments.map(s => ({ id: s.id, tracking: s.tracking_code })),
                      base_tracking_code: baseTrackingCode,
                      volume_count: volumeCount
                    },
                    response_status: 200,
                    response_body: { success: true }
                  }]);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('⚠️ Erro na criação B2B:', error);
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
