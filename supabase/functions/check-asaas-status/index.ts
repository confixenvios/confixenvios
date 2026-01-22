import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentId, isB2B: requestIsB2B } = await req.json();
    
    if (!paymentId) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'PaymentId é obrigatório'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🔍 Verificando status pagamento Asaas:', paymentId);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    
    if (!asaasApiKey) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'API key Asaas não configurada'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const asaasBaseUrl = 'https://api.asaas.com/v3';

    // Check payment status in Asaas
    const maxRetries = 3;
    let paymentData = null;
    let isPaid = false;
    let lastStatus = 'UNKNOWN';
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const response = await fetch(`${asaasBaseUrl}/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'access_token': asaasApiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Tentativa ${attempt} falhou:`, errorText);
        
        if (attempt === maxRetries) {
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Erro ao consultar status do pagamento',
            details: errorText
          }), {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      paymentData = await response.json();
      lastStatus = paymentData?.status || 'UNKNOWN';
      
      // Asaas statuses: PENDING, RECEIVED, CONFIRMED, OVERDUE, REFUNDED, etc.
      isPaid = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(lastStatus);
      
      console.log(`💰 Tentativa ${attempt}/${maxRetries} - Status: ${lastStatus} - Pago: ${isPaid}`);
      
      if (isPaid) {
        console.log('✅ Pagamento confirmado na tentativa', attempt);
        break;
      }
      
      if (attempt < maxRetries && lastStatus === 'PENDING') {
        console.log(`⏳ Aguardando 1.5s antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    console.log(`💰 Status final: ${lastStatus} - Pago: ${isPaid}`);

    // Determine if B2B
    let isB2B = requestIsB2B || false;
    
    if (!isB2B) {
      const { data: recentQuotes } = await supabase
        .from('temp_quotes')
        .select('quote_options')
        .eq('status', 'pending_payment')
        .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (recentQuotes && recentQuotes.length > 0 && recentQuotes[0].quote_options?.isB2B) {
        isB2B = true;
      }
    }

    // Process B2B payment if confirmed
    if (isPaid && isB2B) {
      console.log('✅ Pagamento B2B confirmado');
      
      try {
        const externalReference = paymentData?.externalReference;
        
        const { data: pendingQuotes } = await supabase
          .from('temp_quotes')
          .select('*')
          .eq('status', 'pending_payment')
          .eq('external_id', externalReference)
          .single();
        
        const b2bQuote = pendingQuotes;
        
        if (b2bQuote && b2bQuote.status !== 'processed') {
          console.log('🎯 Processando temp_quote B2B:', b2bQuote.id);
          
          const { error: lockError } = await supabase
            .from('temp_quotes')
            .update({ status: 'processing' })
            .eq('id', b2bQuote.id)
            .eq('status', 'pending_payment');
          
          if (!lockError) {
            const senderData = b2bQuote.sender_data;
            const recipientData = b2bQuote.recipient_data;
            const packageData = b2bQuote.package_data;
            const quoteOptions = b2bQuote.quote_options;
            
            const b2bClientId = senderData?.clientId;
            const volumeAddresses = recipientData?.volumeAddresses || packageData?.volumeAddresses || [];
            const volumeWeights = packageData?.volumeWeights || [];
            const volumeCount = packageData?.volumeCount || volumeAddresses.length || 1;
            const pickupAddressId = senderData?.pickupAddress?.id || recipientData?.pickupAddress?.id || null;
            
            const trackingCode = `B2B-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
            console.log('🏷️ Tracking code:', trackingCode);
            
            const shipmentData = {
              b2b_client_id: b2bClientId,
              tracking_code: trackingCode,
              status: 'PENDENTE',
              total_volumes: volumeCount,
              total_weight: volumeWeights.reduce((sum: number, w: number) => sum + (w || 0), 0),
              total_price: quoteOptions?.amount || 0,
              delivery_date: recipientData?.deliveryDate || new Date().toISOString().split('T')[0],
              pickup_address_id: pickupAddressId,
              vehicle_type: recipientData?.vehicleType || quoteOptions?.vehicleType || null,
              payment_data: {
                payment_id: paymentId,
                amount: quoteOptions?.amount,
                paid_at: new Date().toISOString(),
                provider: 'asaas',
                billing_type: paymentData?.billingType
              }
            };
            
            const { data: newShipment, error: shipError } = await supabase
              .from('b2b_shipments')
              .insert([shipmentData])
              .select()
              .single();
            
            if (shipError) {
              console.error('❌ Erro ao criar shipment:', shipError);
            } else {
              console.log('✅ Shipment criado:', newShipment.id);
              
              for (let i = 0; i < volumeCount; i++) {
                const volumeNumber = i + 1;
                const volumeAddress = volumeAddresses[i] || volumeAddresses[0] || {};
                const volumeWeight = volumeWeights[i] || 0;
                
                const { data: etiData } = await supabase.rpc('generate_eti_code');
                const etiCode = etiData || `ETI-${String(Date.now()).slice(-4)}`;
                
                const volumeData = {
                  b2b_shipment_id: newShipment.id,
                  eti_code: etiCode,
                  volume_number: volumeNumber,
                  weight: volumeWeight,
                  status: 'AGUARDANDO_ACEITE_COLETA',
                  recipient_name: volumeAddress.recipient_name || volumeAddress.recipientName || volumeAddress.name || 'Destinatário',
                  recipient_phone: volumeAddress.recipient_phone || volumeAddress.recipientPhone || volumeAddress.phone || '',
                  recipient_document: volumeAddress.recipient_document || volumeAddress.recipientDocument || volumeAddress.document || null,
                  recipient_cep: volumeAddress.cep || '',
                  recipient_street: volumeAddress.street || '',
                  recipient_number: volumeAddress.number || '',
                  recipient_complement: volumeAddress.complement || null,
                  recipient_neighborhood: volumeAddress.neighborhood || '',
                  recipient_city: volumeAddress.city || '',
                  recipient_state: volumeAddress.state || ''
                };
                
                const { data: newVolume, error: volError } = await supabase
                  .from('b2b_volumes')
                  .insert([volumeData])
                  .select()
                  .single();
                
                if (volError) {
                  console.error(`❌ Erro ao criar volume ${volumeNumber}:`, volError);
                } else {
                  console.log(`✅ Volume ${volumeNumber} criado: ${etiCode}`);
                  
                  await supabase.from('b2b_status_history').insert({
                    volume_id: newVolume.id,
                    status: 'AGUARDANDO_ACEITE_COLETA',
                    observacoes: 'Volume criado após confirmação de pagamento (Asaas)'
                  });
                }
              }
              
              await supabase.from('webhook_logs').insert([{
                event_type: 'b2b_payment.confirmed_asaas',
                shipment_id: newShipment.id,
                payload: {
                  tracking_code: trackingCode,
                  volume_count: volumeCount,
                  total_price: quoteOptions?.amount,
                  provider: 'asaas'
                },
                response_status: 200,
                response_body: { success: true }
              }]);
            }
            
            await supabase
              .from('temp_quotes')
              .update({ status: 'processed', updated_at: new Date().toISOString() })
              .eq('id', b2bQuote.id);
            
            console.log('✅ Processamento B2B concluído');
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
      status: lastStatus,
      billingType: paymentData?.billingType,
      paymentId: paymentId,
      checkedAt: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro geral:', error);
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
