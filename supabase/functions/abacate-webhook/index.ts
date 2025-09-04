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
    console.log('Webhook recebido da Abacate Pay:', webhookData);

    // Verificar se é um pagamento PIX aprovado
    if (webhookData.event === 'pix_qr_code.paid' && webhookData.data?.status === 'PAID') {
      const paymentData = webhookData.data;
      const externalId = paymentData.metadata?.externalId;
      
      console.log('Pagamento PIX aprovado:', { paymentData, externalId });

      // Criar client do Supabase com service role
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Buscar dados do shipment temporário (se houver um sistema de cache/sessão)
      // Por agora vamos criar uma remessa básica com os dados do pagamento

      // Gerar código de rastreamento
      const trackingCode = `TRK-${new Date().getFullYear()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Criar remessa no sistema
      const shipmentData = {
        tracking_code: trackingCode,
        quote_data: {
          paymentMethod: 'pix',
          pixPaymentId: paymentData.id,
          amount: paymentData.amount / 100, // Converter centavos para reais
          paidAt: new Date().toISOString(),
          customer: paymentData.customer || {}
        },
        selected_option: 'standard',
        pickup_option: 'dropoff',
        weight: 1, // Peso padrão - será atualizado quando tivermos mais dados
        length: 20,
        width: 20, 
        height: 20,
        format: 'caixa',
        status: 'PENDING_PICKUP',
        payment_data: {
          method: 'pix',
          status: 'paid',
          pixData: paymentData,
          paidAt: new Date().toISOString()
        }
      };

      // Inserir remessa
      const { data: newShipment, error: shipmentError } = await supabase
        .from('shipments')
        .insert([shipmentData])
        .select()
        .single();

      if (shipmentError) {
        console.error('Erro ao criar remessa:', shipmentError);
        throw shipmentError;
      }

      console.log('Remessa criada com sucesso:', newShipment);

      // Criar histórico de status
      const { error: historyError } = await supabase
        .from('shipment_status_history')
        .insert([{
          shipment_id: newShipment.id,
          status: 'PENDING_PICKUP',
          observacoes: `Pagamento PIX aprovado. Valor: R$ ${(paymentData.amount / 100).toFixed(2)}`
        }]);

      if (historyError) {
        console.error('Erro ao criar histórico:', historyError);
      }

      // Disparar webhook para integrações
      try {
        const webhookPayload = {
          event: 'shipment.payment_received',
          data: {
            shipment: newShipment,
            payment: {
              method: 'pix',
              amount: paymentData.amount / 100,
              pixPaymentId: paymentData.id,
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
              console.log(`Enviando webhook para: ${integration.webhook_url}`);
              
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

              console.log(`Webhook enviado para ${integration.name}: ${webhookResponse.status}`);
              
            } catch (error) {
              console.error(`Erro ao enviar webhook para ${integration.name}:`, error);
              
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
        console.error('Erro ao processar webhooks:', error);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Pagamento processado e remessa criada',
          trackingCode: trackingCode,
          shipmentId: newShipment.id
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      console.log('Webhook ignorado - não é um pagamento PIX aprovado');
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook recebido mas ignorado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Erro no webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});