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

    // Handle payment events - ONLY update payment status, nothing else
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

      // Find temp quote - accept any status that indicates waiting for payment
      const { data: tempQuote, error: quoteError } = await supabase
        .from('temp_quotes')
        .select('*')
        .eq('external_id', externalReference)
        .in('status', ['pending_payment', 'awaiting_payment'])
        .single();

      if (quoteError || !tempQuote) {
        console.error('❌ Erro ao buscar cotação temporária:', quoteError);
        
        // Check if already processed
        const { data: processedQuote } = await supabase
          .from('temp_quotes')
          .select('id, status')
          .eq('external_id', externalReference)
          .single();
        
        if (processedQuote && ['payment_confirmed', 'processed'].includes(processedQuote.status)) {
          console.log('⏭️ Pagamento já confirmado anteriormente');
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
      
      // SIMPLE: Just update the temp_quote status to payment_confirmed
      // The frontend (PaymentSuccessAsaas) will handle creating the shipment
      const { error: updateError } = await supabase
        .from('temp_quotes')
        .update({ 
          status: 'payment_confirmed',
          updated_at: new Date().toISOString(),
          quote_options: {
            ...tempQuote.quote_options,
            paymentConfirmed: true,
            paymentId: paymentId,
            paymentAmount: amount,
            paymentMethod: billingType,
            paymentProvider: 'asaas',
            paymentConfirmedAt: new Date().toISOString()
          }
        })
        .eq('id', tempQuote.id);

      if (updateError) {
        console.error('❌ Erro ao atualizar status:', updateError);
        throw updateError;
      }

      console.log('✅ Status atualizado para payment_confirmed');

      // Log the webhook event
      await supabase.from('webhook_logs').insert([{
        event_type: 'asaas.payment_confirmed',
        shipment_id: tempQuote.id, // Using temp_quote id as reference
        payload: {
          event: event,
          payment: {
            id: paymentId,
            amount: amount,
            billingType: billingType,
            externalReference: externalReference
          },
          tempQuoteId: tempQuote.id,
          message: 'Pagamento confirmado via webhook Asaas. Remessa será criada pelo frontend.'
        },
        response_status: 200,
        response_body: { success: true }
      }]);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Pagamento confirmado com sucesso',
          tempQuoteId: tempQuote.id,
          externalReference: externalReference
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