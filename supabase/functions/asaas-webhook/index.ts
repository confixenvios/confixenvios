import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle GET for webhook validation
  if (req.method === "GET") {
    console.log('🔍 Requisição GET recebida - validação de webhook Asaas');
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook endpoint ativo - Asaas',
        service: 'confix-envios',
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const webhookData = await req.json();
    console.log('📩 Webhook recebido do Asaas:', JSON.stringify(webhookData, null, 2));

    const event = webhookData.event;
    const payment = webhookData.payment;

    // Handle payment events
    // PAYMENT_RECEIVED = PIX/Boleto paid
    // PAYMENT_CONFIRMED = Credit card confirmed
    if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(event)) {
      const externalReference = payment?.externalReference;
      const paymentId = payment?.id;
      const amount = payment?.value;
      const billingType = payment?.billingType;
      
      console.log('💰 Pagamento aprovado:', { event, paymentId, externalReference, amount, billingType });

      // Validate externalReference
      if (!externalReference || !externalReference.startsWith('confix_')) {
        console.error('❌ ExternalReference inválido:', externalReference);
        return new Response(
          JSON.stringify({ error: 'ExternalReference inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      console.log('🔍 Buscando cotação temporária com external_id:', externalReference);

      // Find temp quote
      const { data: tempQuote, error: quoteError } = await supabase
        .from('temp_quotes')
        .select('*')
        .eq('external_id', externalReference)
        .eq('status', 'pending_payment')
        .single();

      if (quoteError || !tempQuote) {
        console.error('❌ Erro ao buscar cotação temporária:', quoteError);
        
        // Check if already processed
        const { data: processedQuote } = await supabase
          .from('temp_quotes')
          .select('id, status')
          .eq('external_id', externalReference)
          .single();
        
        if (processedQuote?.status === 'processed') {
          console.log('⏭️ Cotação já processada anteriormente');
          return new Response(
            JSON.stringify({ success: true, message: 'Já processado' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ error: 'Cotação não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Cotação temporária encontrada:', tempQuote.id);
      
      const senderData = tempQuote.sender_data;
      const recipientData = tempQuote.recipient_data;
      const packageData = tempQuote.package_data;
      const quoteOptions = tempQuote.quote_options;
      const userId = tempQuote.user_id;

      // =====================================================
      // B2B FLOW
      // =====================================================
      if (quoteOptions?.isB2B === true) {
        console.log('🏢 Detectado pagamento B2B - criando remessa B2B');
        
        const b2bClientId = senderData?.clientId;
        
        if (!b2bClientId) {
          console.error('❌ Client ID B2B não encontrado');
          return new Response(
            JSON.stringify({ error: 'Client ID B2B não encontrado' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Lock to prevent duplicates
        const { error: lockError } = await supabase
          .from('temp_quotes')
          .update({ status: 'processing' })
          .eq('id', tempQuote.id)
          .eq('status', 'pending_payment');
        
        if (lockError) {
          console.log('⏭️ Cotação já está sendo processada');
          return new Response(
            JSON.stringify({ success: true, message: 'Em processamento' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const volumeAddresses = recipientData?.volumeAddresses || packageData?.volumeAddresses || [];
        const volumeWeights = packageData?.volumeWeights || [];
        const volumeCount = packageData?.volumeCount || volumeAddresses.length || 1;
        const pickupAddressId = senderData?.pickupAddress?.id || recipientData?.pickupAddress?.id || null;

        const trackingCode = `B2B-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

        const b2bShipmentData = {
          b2b_client_id: b2bClientId,
          tracking_code: trackingCode,
          status: 'PENDENTE',
          total_volumes: volumeCount,
          total_weight: volumeWeights.reduce((sum: number, w: number) => sum + (w || 0), 0),
          total_price: amount,
          delivery_date: recipientData?.deliveryDate || new Date().toISOString().split('T')[0],
          pickup_address_id: pickupAddressId,
          vehicle_type: recipientData?.vehicleType || quoteOptions?.vehicleType || null,
          payment_data: {
            payment_id: paymentId,
            amount: amount,
            paid_at: new Date().toISOString(),
            provider: 'asaas',
            billing_type: billingType,
            external_reference: externalReference
          }
        };

        console.log('📝 Inserindo remessa B2B:', b2bShipmentData);

        const { data: newB2BShipment, error: b2bError } = await supabase
          .from('b2b_shipments')
          .insert([b2bShipmentData])
          .select()
          .single();

        if (b2bError) {
          console.error('❌ Erro ao criar remessa B2B:', b2bError);
          throw b2bError;
        }

        console.log('✅ Remessa B2B criada:', newB2BShipment.id);

        // Create volumes
        for (let i = 0; i < volumeCount; i++) {
          const volumeNumber = i + 1;
          const volumeAddress = volumeAddresses[i] || volumeAddresses[0] || {};
          const volumeWeight = volumeWeights[i] || 0;
          
          const { data: etiData } = await supabase.rpc('generate_eti_code');
          const etiCode = etiData || `ETI-${String(Date.now()).slice(-4)}`;
          
          const volumeData = {
            b2b_shipment_id: newB2BShipment.id,
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
              observacoes: `Volume criado após confirmação de pagamento (Asaas - ${billingType})`
            });
          }
        }

        // Mark quote as processed
        await supabase
          .from('temp_quotes')
          .update({ status: 'processed', updated_at: new Date().toISOString() })
          .eq('id', tempQuote.id);

        // Log webhook
        await supabase.from('webhook_logs').insert([{
          event_type: 'b2b_shipment.payment_received_asaas',
          shipment_id: newB2BShipment.id,
          payload: {
            b2b_shipment: newB2BShipment,
            payment: {
              method: billingType,
              amount: amount,
              paymentId: paymentId,
              externalReference: externalReference,
              userId: userId,
              status: 'paid',
              paidAt: new Date().toISOString(),
              provider: 'asaas'
            }
          },
          response_status: 200,
          response_body: { success: true }
        }]);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Pagamento B2B processado',
            trackingCode: trackingCode,
            shipmentId: newB2BShipment.id,
            type: 'b2b'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // =====================================================
      // STANDARD FLOW
      // =====================================================
      console.log('📦 Fluxo normal - criando remessa padrão');

      // Lock
      const { error: lockError } = await supabase
        .from('temp_quotes')
        .update({ status: 'processing' })
        .eq('id', tempQuote.id)
        .eq('status', 'pending_payment');
      
      if (lockError) {
        console.log('⏭️ Cotação já está sendo processada');
        return new Response(
          JSON.stringify({ success: true, message: 'Em processamento' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create sender address - handle both flat and nested structures
      const senderCep = senderData.cep || senderData.address?.cep;
      const senderStreet = senderData.street || senderData.address?.street;
      const senderNumber = senderData.number || senderData.address?.number;
      const senderNeighborhood = senderData.neighborhood || senderData.address?.neighborhood;
      const senderCity = senderData.city || senderData.address?.city;
      const senderState = senderData.state || senderData.address?.state;
      const senderComplement = senderData.complement || senderData.address?.complement || null;

      console.log('📍 Dados do remetente:', { name: senderData.name, cep: senderCep, street: senderStreet });

      const { data: senderAddress, error: senderError } = await supabase
        .from('addresses')
        .insert([{
          name: senderData.name || 'Remetente',
          street: senderStreet || '',
          number: senderNumber || '',
          neighborhood: senderNeighborhood || '',
          city: senderCity || '',
          state: senderState || '',
          cep: senderCep || '',
          complement: senderComplement,
          address_type: 'sender',
          user_id: userId
        }])
        .select()
        .single();

      if (senderError) {
        console.error('❌ Erro ao criar endereço do remetente:', senderError);
        throw senderError;
      }

      // Create recipient address - handle both flat and nested structures
      const recipientCep = recipientData.cep || recipientData.address?.cep;
      const recipientStreet = recipientData.street || recipientData.address?.street;
      const recipientNumber = recipientData.number || recipientData.address?.number;
      const recipientNeighborhood = recipientData.neighborhood || recipientData.address?.neighborhood;
      const recipientCity = recipientData.city || recipientData.address?.city;
      const recipientState = recipientData.state || recipientData.address?.state;
      const recipientComplement = recipientData.complement || recipientData.address?.complement || null;

      console.log('📍 Dados do destinatário:', { name: recipientData.name, cep: recipientCep, street: recipientStreet });

      const { data: recipientAddress, error: recipientError } = await supabase
        .from('addresses')
        .insert([{
          name: recipientData.name || 'Destinatário',
          street: recipientStreet || '',
          number: recipientNumber || '',
          neighborhood: recipientNeighborhood || '',
          city: recipientCity || '',
          state: recipientState || '',
          cep: recipientCep || '',
          complement: recipientComplement,
          address_type: 'recipient',
          user_id: userId
        }])
        .select()
        .single();

      if (recipientError) {
        console.error('❌ Erro ao criar endereço do destinatário:', recipientError);
        throw recipientError;
      }

      const trackingCode = `ID${new Date().getFullYear()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      const shipmentData = {
        user_id: userId,
        tracking_code: trackingCode,
        sender_address_id: senderAddress.id,
        recipient_address_id: recipientAddress.id,
        quote_data: {
          ...quoteOptions,
          paymentMethod: billingType.toLowerCase(),
          paymentId: paymentId,
          externalReference: externalReference,
          amount: amount,
          paidAt: new Date().toISOString(),
          originalQuote: tempQuote.id,
          provider: 'asaas'
        },
        selected_option: quoteOptions?.selectedOption || 'standard',
        pickup_option: quoteOptions?.pickupOption || 'dropoff',
        weight: packageData?.weight || 1,
        length: packageData?.length || 20,
        width: packageData?.width || 20,
        height: packageData?.height || 20,
        format: packageData?.format || 'caixa',
        status: 'PAID',
        payment_data: {
          method: billingType.toLowerCase(),
          status: 'paid',
          paymentId: paymentId,
          externalReference: externalReference,
          paidAt: new Date().toISOString(),
          quoteId: tempQuote.id,
          provider: 'asaas'
        }
      };

      const { data: newShipment, error: shipmentError } = await supabase
        .from('shipments')
        .insert([shipmentData])
        .select()
        .single();

      if (shipmentError) {
        console.error('❌ Erro ao criar remessa:', shipmentError);
        throw shipmentError;
      }

      console.log('✅ Remessa criada com sucesso:', newShipment.id);

      // Mark quote as processed
      await supabase
        .from('temp_quotes')
        .update({ status: 'processed', updated_at: new Date().toISOString() })
        .eq('id', tempQuote.id);

      // Create status history
      await supabase
        .from('shipment_status_history')
        .insert([{
          shipment_id: newShipment.id,
          status: 'PAID',
          observacoes: `Pagamento ${billingType} aprovado via webhook Asaas. Valor: R$ ${amount.toFixed(2)}.`
        }]);

      // Dispatch webhooks to integrations
      try {
        const webhookPayload = {
          event: 'shipment.payment_received',
          data: {
            shipment: newShipment,
            payment: {
              method: billingType.toLowerCase(),
              amount: amount,
              paymentId: paymentId,
              externalReference: externalReference,
              userId: userId,
              status: 'paid',
              paidAt: new Date().toISOString(),
              provider: 'asaas'
            }
          }
        };

        const { data: integrations } = await supabase
          .from('integrations')
          .select('*')
          .eq('active', true);

        if (integrations) {
          for (const integration of integrations) {
            try {
              console.log(`📤 Enviando webhook para: ${integration.webhook_url}`);
              
              const webhookResponse = await fetch(integration.webhook_url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Webhook-Source': 'confix-envios',
                  'X-Event-Type': 'shipment.payment_received'
                },
                body: JSON.stringify(webhookPayload)
              });

              await supabase.from('webhook_logs').insert([{
                event_type: 'shipment.payment_received',
                shipment_id: newShipment.id,
                payload: webhookPayload,
                response_status: webhookResponse.status,
                response_body: webhookResponse.status < 400 ? { success: true } : { error: 'Failed' }
              }]);

              console.log(`✅ Webhook enviado para ${integration.name}: ${webhookResponse.status}`);
            } catch (error) {
              console.error(`❌ Erro ao enviar webhook para ${integration.name}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('❌ Erro ao processar webhooks:', error);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Pagamento processado e remessa criada',
          trackingCode: trackingCode,
          shipmentId: newShipment.id,
          type: 'standard'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log('⏭️ Webhook ignorado - evento:', event);
      return new Response(
        JSON.stringify({ success: true, message: 'Evento ignorado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
