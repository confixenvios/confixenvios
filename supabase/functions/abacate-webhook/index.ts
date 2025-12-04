import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookData = await req.json();
    console.log('📩 Webhook recebido da Abacate Pay:', JSON.stringify(webhookData, null, 2));

    // Verificar se é um pagamento PIX aprovado (evento correto do Abacate Pay)
    if (webhookData.event === 'billing.paid' && webhookData.data?.pixQrCode?.status === 'PAID') {
      const pixData = webhookData.data.pixQrCode;
      const externalId = pixData.metadata?.externalId;
      const userId = pixData.metadata?.userId;
      
      console.log('💰 Pagamento PIX aprovado:', { externalId, userId, amount: pixData.amount });

      // Validação de segurança: verificar se externalId tem formato esperado
      if (!externalId || !externalId.startsWith('confix_')) {
        console.error('❌ ExternalId inválido ou ausente:', externalId);
        return new Response(
          JSON.stringify({ error: 'ExternalId inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Criar client do Supabase com service role
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      console.log('🔍 Buscando cotação temporária com externalId:', externalId);

      // Buscar cotação temporária usando externalId
      const { data: tempQuote, error: quoteError } = await supabase
        .from('temp_quotes')
        .select('*')
        .eq('external_id', externalId)
        .eq('status', 'pending_payment')
        .single();

      if (quoteError || !tempQuote) {
        console.error('❌ Erro ao buscar cotação temporária:', quoteError);
        console.error('ExternalId procurado:', externalId);
        
        // Log detalhado para debug
        const { data: allQuotes } = await supabase
          .from('temp_quotes')
          .select('external_id, status, created_at')
          .limit(5);
        console.log('📋 Cotações disponíveis:', allQuotes);
        
        return new Response(
          JSON.stringify({ error: 'Cotação não encontrada para este pagamento' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Cotação temporária encontrada:', tempQuote.id);
      
      // Usar dados da cotação para criar endereços completos
      const senderData = tempQuote.sender_data;
      const recipientData = tempQuote.recipient_data;
      const packageData = tempQuote.package_data;
      const quoteOptions = tempQuote.quote_options;

      console.log('📦 Dados da cotação:', { 
        isB2B: quoteOptions?.isB2B, 
        senderData: senderData?.clientId,
        packageData 
      });

      // =====================================================
      // FLUXO B2B - Criar remessa na tabela b2b_shipments
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

        // Gerar código de rastreamento B2B
        const trackingCode = `B2B-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

        // Criar remessa B2B
        const b2bShipmentData = {
          b2b_client_id: b2bClientId,
          tracking_code: trackingCode,
          volume_count: packageData?.volumeCount || 1,
          delivery_date: recipientData?.deliveryDate || new Date().toISOString().split('T')[0],
          status: 'PAGO',
          observations: JSON.stringify({
            vehicle_type: recipientData?.vehicleType || quoteOptions?.vehicleType,
            delivery_ceps: recipientData?.deliveryCeps || [],
            volume_weights: packageData?.volumeWeights || [],
            total_weight: packageData?.totalWeight || 0,
            amount_paid: pixData.amount / 100,
            payment_id: pixData.id,
            external_id: externalId,
            paid_at: new Date().toISOString()
          })
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

        console.log('✅ Remessa B2B criada com sucesso:', newB2BShipment);

        // Marcar cotação temporária como processada
        await supabase
          .from('temp_quotes')
          .update({ 
            status: 'processed',
            updated_at: new Date().toISOString()
          })
          .eq('id', tempQuote.id);

        console.log('✅ Cotação temporária marcada como processada');

        // Log do webhook B2B
        await supabase
          .from('webhook_logs')
          .insert([{
            event_type: 'b2b_shipment.payment_received',
            shipment_id: newB2BShipment.id,
            payload: {
              b2b_shipment: newB2BShipment,
              payment: {
                method: 'pix',
                amount: pixData.amount / 100,
                pixPaymentId: pixData.id,
                externalId: externalId,
                userId: userId,
                status: 'paid',
                paidAt: new Date().toISOString()
              }
            },
            response_status: 200,
            response_body: { success: true, message: 'B2B shipment created' }
          }]);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Pagamento B2B processado e remessa criada',
            trackingCode: trackingCode,
            shipmentId: newB2BShipment.id,
            type: 'b2b'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // =====================================================
      // FLUXO NORMAL - Criar remessa na tabela shipments
      // =====================================================
      console.log('📦 Fluxo normal - criando remessa padrão');

      // Dados do cliente do PIX para fallback
      const customerData = pixData.customer?.metadata || {};

      // Criar endereço de origem (remetente) usando dados da cotação
      const { data: senderAddress, error: senderError } = await supabase
        .from('addresses')
        .insert([{
          name: senderData.name,
          street: senderData.address?.street,
          number: senderData.address?.number,
          neighborhood: senderData.address?.neighborhood,
          city: senderData.address?.city,
          state: senderData.address?.state,
          cep: senderData.address?.cep,
          address_type: 'sender',
          user_id: userId
        }])
        .select()
        .single();

      if (senderError) {
        console.error('❌ Erro ao criar endereço do remetente:', senderError);
        throw senderError;
      }

      // Criar endereço de destino (destinatário) usando dados da cotação
      const { data: recipientAddress, error: recipientError } = await supabase
        .from('addresses')
        .insert([{
          name: recipientData.name,
          street: recipientData.address?.street,
          number: recipientData.address?.number,
          neighborhood: recipientData.address?.neighborhood,
          city: recipientData.address?.city,
          state: recipientData.address?.state,
          cep: recipientData.address?.cep,
          address_type: 'recipient',
          user_id: userId
        }])
        .select()
        .single();

      if (recipientError) {
        console.error('❌ Erro ao criar endereço do destinatário:', recipientError);
        throw recipientError;
      }

      // Gerar código de rastreamento no formato ID2025XXXXXX
      const trackingCode = `ID${new Date().getFullYear()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Criar remessa usando dados completos da cotação
      const shipmentData = {
        user_id: userId,
        tracking_code: trackingCode,
        sender_address_id: senderAddress.id,
        recipient_address_id: recipientAddress.id,
        quote_data: {
          ...quoteOptions,
          paymentMethod: 'pix',
          pixPaymentId: pixData.id,
          externalId: externalId,
          amount: pixData.amount / 100,
          paidAt: new Date().toISOString(),
          customer: customerData,
          originalQuote: tempQuote.id
        },
        selected_option: quoteOptions.selectedOption || 'standard',
        pickup_option: quoteOptions.pickupOption || 'dropoff',
        weight: packageData.weight || 1,
        length: packageData.length || 20,
        width: packageData.width || 20, 
        height: packageData.height || 20,
        format: packageData.format || 'caixa',
        status: 'PAID',
        payment_data: {
          method: 'pix',
          status: 'paid',
          pixData: pixData,
          webhookData: webhookData.data,
          externalId: externalId,
          paidAt: new Date().toISOString(),
          quoteId: tempQuote.id
        }
      };

      // Inserir remessa
      const { data: newShipment, error: shipmentError } = await supabase
        .from('shipments')
        .insert([shipmentData])
        .select()
        .single();

      if (shipmentError) {
        console.error('❌ Erro ao criar remessa:', shipmentError);
        throw shipmentError;
      }

      console.log('✅ Remessa criada com sucesso:', newShipment);

      // Marcar cotação temporária como processada
      await supabase
        .from('temp_quotes')
        .update({ 
          status: 'processed',
          updated_at: new Date().toISOString()
        })
        .eq('id', tempQuote.id);

      console.log('✅ Cotação temporária marcada como processada');

      // Criar histórico de status
      const { error: historyError } = await supabase
        .from('shipment_status_history')
        .insert([{
          shipment_id: newShipment.id,
          status: 'PAID',
          observacoes: `Pagamento PIX aprovado via webhook. Valor: R$ ${(pixData.amount / 100).toFixed(2)}. ExternalId: ${externalId}. Cotação: ${tempQuote.id}. ${userId ? `Cliente: ${userId}` : 'Cliente anônimo.'}`
        }]);

      if (historyError) {
        console.error('⚠️ Erro ao criar histórico:', historyError);
      }

      // Disparar webhook para integrações
      try {
        const webhookPayload = {
          event: 'shipment.payment_received',
          data: {
            shipment: newShipment,
            payment: {
              method: 'pix',
              amount: pixData.amount / 100,
              pixPaymentId: pixData.id,
              externalId: externalId,
              userId: userId,
              status: 'paid',
              paidAt: new Date().toISOString()
            }
          }
        };

        // Buscar integrações ativas
        const { data: integrations, error: integrationsError } = await supabase
          .from('integrations')
          .select('*')
          .eq('active', true);

        if (!integrationsError && integrations) {
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

              // Log do webhook
              await supabase
                .from('webhook_logs')
                .insert([{
                  event_type: 'shipment.payment_received',
                  shipment_id: newShipment.id,
                  payload: webhookPayload,
                  response_status: webhookResponse.status,
                  response_body: webhookResponse.status < 400 ? 
                    { success: true } : 
                    { error: await webhookResponse.text() }
                }]);

              console.log(`✅ Webhook enviado para ${integration.name}: ${webhookResponse.status}`);
              
            } catch (error) {
              console.error(`❌ Erro ao enviar webhook para ${integration.name}:`, error);
              
              // Log do erro
              await supabase
                .from('webhook_logs')
                .insert([{
                  event_type: 'shipment.payment_received',
                  shipment_id: newShipment.id,
                  payload: webhookPayload,
                  response_status: 500,
                  response_body: { error: error.message }
                }]);
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
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      console.log('⏭️ Webhook ignorado - não é um pagamento PIX aprovado');
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook recebido mas ignorado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
