import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { 
      origin_cep, 
      destination_cep, 
      total_weight, 
      volumes_data, 
      user_id, 
      session_id 
    } = await req.json();

    console.log('[AI Quote Agent] Processing quote request', {
      origin_cep,
      destination_cep,
      total_weight,
    });

    // Verificar se o agente está ativo
    const { data: config } = await supabaseClient
      .from('ai_quote_config')
      .select('*')
      .single();

    if (!config?.is_active) {
      console.log('[AI Quote Agent] Agent is inactive');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Agente IA está desativado' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Buscar todas as tabelas de preço ativas
    const { data: pricingTables } = await supabaseClient
      .from('pricing_tables')
      .select('*')
      .eq('is_active', true);

    if (!pricingTables || pricingTables.length === 0) {
      console.log('[AI Quote Agent] No active pricing tables found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nenhuma tabela de preços ativa encontrada' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Buscar adicionais ativos
    const { data: additionals } = await supabaseClient
      .from('freight_additionals')
      .select('*')
      .eq('is_active', true);

    // Calcular volume total
    const total_volume = volumes_data.reduce((acc: number, vol: any) => {
      return acc + ((vol.length * vol.width * vol.height) / 1000000);
    }, 0);

    // Preparar contexto para a IA
    const aiContext = {
      origin_cep,
      destination_cep,
      total_weight,
      total_volume,
      priority_mode: config.priority_mode,
      additional_rules: config.additional_rules,
      pricing_tables: pricingTables.map(t => ({
        id: t.id,
        name: t.name,
        source_type: t.source_type,
      })),
      additionals: additionals || [],
    };

    // Chamar Lovable AI para analisar e selecionar a melhor tabela
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const aiPrompt = `Você é um agente especialista em cotações de frete. Analise os dados abaixo e determine qual tabela de preços oferece a melhor opção baseado na prioridade definida.

Dados da Cotação:
- CEP Origem: ${origin_cep}
- CEP Destino: ${destination_cep}
- Peso Total: ${total_weight} kg
- Volume Total: ${total_volume} m³
- Prioridade: ${config.priority_mode} (lowest_price = menor preço, fastest_delivery = menor prazo, balanced = equilíbrio)

Tabelas Disponíveis:
${JSON.stringify(pricingTables, null, 2)}

Adicionais a Aplicar:
${JSON.stringify(additionals || [], null, 2)}

Regras Adicionais: ${config.additional_rules || 'Nenhuma'}

IMPORTANTE:
1. Analise cada tabela e calcule o preço base estimado
2. Aplique os adicionais relevantes (ad_valorem, gris, insurance, weight_fee, etc.)
3. Considere a prioridade definida
4. Retorne APENAS um objeto JSON válido (sem markdown) com esta estrutura:
{
  "selected_table_id": "uuid-da-tabela",
  "selected_table_name": "nome-da-tabela",
  "base_price": 100.00,
  "delivery_days": 5,
  "additionals_applied": [
    {
      "name": "Ad Valorem",
      "type": "ad_valorem",
      "value": 10.00
    }
  ],
  "final_price": 110.00,
  "reasoning": "Explicação breve da escolha"
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um especialista em logística e cotações de frete. Sempre retorne respostas em JSON válido sem formatação markdown.' 
          },
          { role: 'user', content: aiPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[AI Quote Agent] AI API error:', errorText);
      throw new Error(`Erro na API de IA: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;
    
    if (!aiContent) {
      throw new Error('Resposta da IA vazia');
    }

    console.log('[AI Quote Agent] AI raw response:', aiContent);

    // Extrair JSON da resposta (remover markdown se houver)
    let aiResult;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0]);
      } else {
        aiResult = JSON.parse(aiContent);
      }
    } catch (e) {
      console.error('[AI Quote Agent] Failed to parse AI response:', aiContent);
      throw new Error('Resposta da IA inválida');
    }

    // Salvar log da cotação
    const { error: logError } = await supabaseClient
      .from('ai_quote_logs')
      .insert([{
        user_id: user_id || null,
        session_id: session_id || null,
        origin_cep,
        destination_cep,
        total_weight,
        total_volume,
        volumes_data,
        selected_pricing_table_id: aiResult.selected_table_id,
        selected_pricing_table_name: aiResult.selected_table_name,
        base_price: aiResult.base_price,
        additionals_applied: aiResult.additionals_applied || [],
        final_price: aiResult.final_price,
        delivery_days: aiResult.delivery_days,
        priority_used: config.priority_mode,
        all_options_analyzed: {
          tables_analyzed: pricingTables.length,
          reasoning: aiResult.reasoning,
        },
      }]);

    if (logError) {
      console.error('[AI Quote Agent] Error saving log:', logError);
    }

    console.log('[AI Quote Agent] Quote processed successfully', {
      table: aiResult.selected_table_name,
      final_price: aiResult.final_price,
    });

    return new Response(
      JSON.stringify({
        success: true,
        quote: {
          economicPrice: aiResult.final_price,
          economicDays: aiResult.delivery_days,
          expressPrice: aiResult.final_price * 1.3, // Expresso 30% mais caro
          expressDays: Math.max(1, aiResult.delivery_days - 2),
          zone: `Tabela: ${aiResult.selected_table_name}`,
          additionals_applied: aiResult.additionals_applied,
          reasoning: aiResult.reasoning,
        },
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );
  } catch (error) {
    console.error('[AI Quote Agent] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});