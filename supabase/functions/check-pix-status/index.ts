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
    // FALLBACK: Criar remessa B2B automaticamente se PAID
    // =====================================================
    if (isPaid) {
      console.log('✅ Pagamento confirmado - verificando se precisa criar remessa B2B');
      
      try {
        // supabase já foi criado anteriormente
        // Buscar temp_quote que tenha esse paymentId nos webhook_logs
        const { data: webhookLogs } = await supabase
          .from('webhook_logs')
          .select('payload')
          .eq('event_type', 'pix_payment_created')
          .like('payload->>payment_id', paymentId)
          .limit(1);
        
        let externalId = null;
        
        // Se não encontrar nos logs, tentar buscar temp_quote por paymentId no metadata
        if (!webhookLogs || webhookLogs.length === 0) {
          console.log('🔍 Buscando temp_quote pendente mais recente...');
          
          // Buscar temp_quotes B2B pendentes das últimas 2 horas
          const { data: recentQuotes } = await supabase
            .from('temp_quotes')
            .select('*')
            .eq('status', 'pending_payment')
            .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: false });
          
          if (recentQuotes && recentQuotes.length > 0) {
            // Encontrar a quote B2B mais recente
            const b2bQuote = recentQuotes.find(q => q.quote_options?.isB2B === true);
            if (b2bQuote) {
              externalId = b2bQuote.external_id;
              console.log('📦 Encontrada temp_quote B2B:', externalId);
            }
          }
        }
        
        if (externalId) {
          // Buscar temp_quote
          const { data: tempQuote, error: quoteError } = await supabase
            .from('temp_quotes')
            .select('*')
            .eq('external_id', externalId)
            .eq('status', 'pending_payment')
            .single();
          
          if (tempQuote && tempQuote.quote_options?.isB2B === true) {
            console.log('🏢 Criando remessa B2B via fallback check-pix-status');
            
            const senderData = tempQuote.sender_data;
            const recipientData = tempQuote.recipient_data;
            const packageData = tempQuote.package_data;
            const quoteOptions = tempQuote.quote_options;
            const b2bClientId = senderData?.clientId;
            
            if (b2bClientId) {
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
                  amount_paid: quoteOptions?.amount || 0,
                  payment_id: paymentId,
                  external_id: externalId,
                  paid_at: new Date().toISOString(),
                  created_via: 'check-pix-status-fallback'
                })
              };
              
              const { data: newB2BShipment, error: b2bError } = await supabase
                .from('b2b_shipments')
                .insert([b2bShipmentData])
                .select()
                .single();
              
              if (b2bError) {
                console.error('❌ Erro ao criar remessa B2B via fallback:', b2bError);
              } else {
                console.log('✅ Remessa B2B criada via fallback:', newB2BShipment.id);
                
                // Marcar temp_quote como processada
                await supabase
                  .from('temp_quotes')
                  .update({ 
                    status: 'processed',
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', tempQuote.id);
                
                console.log('✅ Temp_quote marcada como processada');
                
                // Log do webhook
                await supabase
                  .from('webhook_logs')
                  .insert([{
                    event_type: 'b2b_shipment.created_via_fallback',
                    shipment_id: newB2BShipment.id,
                    payload: {
                      b2b_shipment: newB2BShipment,
                      payment_id: paymentId,
                      external_id: externalId,
                      created_via: 'check-pix-status-fallback'
                    },
                    response_status: 200,
                    response_body: { success: true }
                  }]);
              }
            }
          }
        }
      } catch (fallbackError) {
        console.error('⚠️ Erro no fallback de criação B2B (não crítico):', fallbackError);
        // Não falha a resposta principal
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
