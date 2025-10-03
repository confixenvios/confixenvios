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

    // Chamar OpenAI GPT-5 para analisar e selecionar a melhor tabela
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    const aiPrompt = `Você é um agente de IA especializado em cotação de fretes que trabalha para o site Confix Envios.
Sua função é calcular e comparar fretes de diferentes transportadoras a partir de tabelas fornecidas.

REGRAS DE CÁLCULO (SIGA ESTRITAMENTE):

1. PESO TARIFÁVEL:
   - Sempre considere o peso tarifável como o MAIOR entre:
     * Peso informado (peso real em kg): ${total_weight} kg
     * Peso cubado: volume total em cm³ dividido pelo divisor de cubagem da transportadora
     * Peso mínimo tarifável definido na transportadora
   - Volume total informado: ${total_volume} m³ (${total_volume * 1000000} cm³)

2. CÁLCULO DO FRETE BASE:
   - Use a tabela de faixas de peso da transportadora
   - Se o peso tarifável estiver dentro de uma faixa, use o preço fixo dessa faixa
   - Se ultrapassar o peso-limite definido em generalidades, cobrar o valor por kg excedente multiplicado pelos quilos acima do limite

3. VALIDAÇÃO DE DIMENSÕES:
   - Verifique se há limite máximo da maior dimensão ou limite da soma das dimensões
   - Se exceder o limite, RECUSE a cotação (status: "recusado")

4. AD VALOREM E GRIS:
   - Percentual informado nas generalidades (ad_valorem_percentage e gris_percentage)
   - Aplicar sobre o valor da mercadoria declarada
   - Somar ao frete

5. PREÇO FINAL:
   frete_base + excedente (se houver) + ad_valorem + gris + outros adicionais

DADOS DA COTAÇÃO:
- CEP Origem: ${origin_cep}
- CEP Destino: ${destination_cep}
- Peso Real: ${total_weight} kg
- Volume Total: ${total_volume} m³ (${total_volume * 1000000} cm³)
- Prioridade: ${config.priority_mode} (lowest_price = menor preço, fastest_delivery = menor prazo, balanced = equilíbrio)

TABELAS DISPONÍVEIS:
${JSON.stringify(pricingTables, null, 2)}

ADICIONAIS:
${JSON.stringify(additionals || [], null, 2)}

REGRAS ADICIONAIS: ${config.additional_rules || 'Nenhuma'}

SAÍDA ESPERADA:
Retorne APENAS um objeto JSON válido (sem markdown) com esta estrutura DETALHADA:
{
  "selected_table_id": "uuid-da-tabela",
  "selected_table_name": "nome-da-tabela",
  "peso_informado": ${total_weight},
  "peso_cubado": 0.00,
  "peso_tarifavel": 0.00,
  "base_price": 100.00,
  "excedente_kg": 0,
  "valor_excedente": 0.00,
  "delivery_days": 5,
  "additionals_applied": [
    {
      "name": "Ad Valorem",
      "type": "ad_valorem",
      "percentage": 0.30,
      "value": 10.00
    },
    {
      "name": "GRIS",
      "type": "gris",
      "percentage": 0.30,
      "value": 10.00
    }
  ],
  "final_price": 120.00,
  "status": "ok",
  "reasoning": "Explicação detalhada: peso tarifável calculado, faixas aplicadas, adicionais incluídos, motivo da escolha"
}

IMPORTANTE:
- Nunca ignore regras de generalidades
- Sempre priorize o MAIOR peso (real ou cubado)
- SEMPRE inclua ad valorem e gris no cálculo
- Se houver múltiplas tabelas, ordene por total_final menor (primeiro critério) e menor prazo (segundo critério)
- Retorne valores em R$ com 2 casas decimais`;

    console.log('[AI Quote Agent] Calling OpenAI GPT-5...');
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um especialista em logística e cotações de frete. Sempre retorne respostas em JSON válido sem formatação markdown.' 
          },
          { role: 'user', content: aiPrompt }
        ],
        max_completion_tokens: 2000,
        response_format: { type: "json_object" }
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