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

    // Buscar tabelas de preços ativas configuradas
    console.log('[AI Quote Agent] Buscando tabelas de preços ativas...');
    
    const { data: pricingTables, error: pricingError } = await supabaseClient
      .from('pricing_tables')
      .select('*')
      .eq('is_active', true);

    if (pricingError) {
      console.error('[AI Quote Agent] Erro ao buscar tabelas:', pricingError);
      throw new Error(`Erro ao buscar tabelas: ${pricingError.message}`);
    }

    if (!pricingTables || pricingTables.length === 0) {
      throw new Error('Nenhuma tabela de preços ativa encontrada');
    }

    console.log('[AI Quote Agent] Tabelas encontradas:', pricingTables.length);

    // Processar cada tabela e buscar seus dados
    const tablesWithData = [];
    
    for (const table of pricingTables) {
      console.log(`[AI Quote Agent] Processando tabela: ${table.name} (${table.source_type})`);
      
      let tableData: any = {
        id: table.id,
        name: table.name,
        cnpj: table.cnpj || '',
        source_type: table.source_type,
        ad_valorem_percentage: table.ad_valorem_percentage || 0.003,
        gris_percentage: table.gris_percentage || 0.003,
        cubic_meter_kg_equivalent: table.cubic_meter_kg_equivalent || 167,
        excess_weight_threshold_kg: table.excess_weight_threshold_kg || 30,
        excess_weight_charge_per_kg: table.excess_weight_charge_per_kg || 10,
        pricing_data: []
      };

      if (table.source_type === 'google_sheets' && table.google_sheets_url) {
        // Buscar dados do Google Sheets
        try {
          console.log(`[AI Quote Agent] Buscando dados do Google Sheets: ${table.google_sheets_url}`);
          
          // Converter URL do Google Sheets para CSV export
          let sheetUrl = table.google_sheets_url;
          
          // Extrair spreadsheet ID e gid
          const spreadsheetIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
          const gidMatch = sheetUrl.match(/[#&]gid=([0-9]+)/);
          
          if (spreadsheetIdMatch) {
            const spreadsheetId = spreadsheetIdMatch[1];
            const gid = gidMatch ? gidMatch[1] : '0';
            sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
            console.log(`[AI Quote Agent] URL CSV convertida: ${sheetUrl}`);
          }
          
          const response = await fetch(sheetUrl);
          console.log(`[AI Quote Agent] Response status: ${response.status}`);
          
          if (response.ok) {
            const csvText = await response.text();
            console.log(`[AI Quote Agent] CSV obtido, tamanho: ${csvText.length} caracteres`);
            
            const rows = csvText.split('\n');
            console.log(`[AI Quote Agent] Total de linhas: ${rows.length}`);
            
            // Pular primeira linha (cabeçalho)
            const dataRows = rows.slice(1);
            
            tableData.pricing_data = dataRows
              .filter(row => row.trim())
              .map(row => {
                // Parse CSV considerando vírgulas dentro de aspas
                const cols = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
                const cleanCols = cols.map(col => col.replace(/^"|"$/g, '').trim());
                
                return {
                  destination_cep: cleanCols[0] || '',
                  weight_min: parseFloat(cleanCols[1]) || 0,
                  weight_max: parseFloat(cleanCols[2]) || 999,
                  price: parseFloat(cleanCols[3]) || 0,
                  delivery_days: parseInt(cleanCols[4]) || 5
                };
              })
              .filter(item => {
                const isValid = item.destination_cep && item.price > 0;
                if (!isValid) {
                  console.log(`[AI Quote Agent] Linha inválida ignorada:`, item);
                }
                return isValid;
              });
            
            console.log(`[AI Quote Agent] ${table.name}: ${tableData.pricing_data.length} registros válidos carregados`);
            
            // Mostrar amostra dos primeiros 3 registros
            if (tableData.pricing_data.length > 0) {
              console.log(`[AI Quote Agent] Amostra dos dados:`, tableData.pricing_data.slice(0, 3));
            }
          } else {
            console.error(`[AI Quote Agent] Falha ao buscar Google Sheets, status: ${response.status}`);
          }
        } catch (error) {
          console.error(`[AI Quote Agent] Erro ao carregar Google Sheets para ${table.name}:`, error);
        }
      }

      if (tableData.pricing_data.length > 0) {
        tablesWithData.push(tableData);
      }
    }

    console.log('[AI Quote Agent] Total de tabelas com dados:', tablesWithData.length);

    if (tablesWithData.length === 0) {
      throw new Error('Nenhuma tabela com dados disponível para cotação');
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

    // Preparar contexto para a IA com dados do Supabase
    const aiContext = {
      origin_cep,
      destination_cep,
      total_weight,
      total_volume,
      priority_mode: config.priority_mode,
      weight_calculation_mode: config.weight_calculation_mode,
      additional_rules: config.additional_rules,
      pricing_tables: tablesWithData.map(t => ({
        id: t.id,
        name: t.name,
        cnpj: t.cnpj,
        source_type: t.source_type,
        ad_valorem_percentage: t.ad_valorem_percentage,
        gris_percentage: t.gris_percentage,
        cubic_meter_kg_equivalent: t.cubic_meter_kg_equivalent,
        pricing_data: t.pricing_data,
        zones_data: t.zones_data,
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
   MODO DE CÁLCULO CONFIGURADO: ${config.weight_calculation_mode}
   
   ${config.weight_calculation_mode === 'informed_weight' 
     ? `- Use APENAS o peso informado: ${total_weight} kg`
     : config.weight_calculation_mode === 'cubed_weight'
     ? `- Calcule e use APENAS o peso cubado: volume total em cm³ dividido pelo divisor de cubagem da transportadora
   - Volume total informado: ${total_volume} m³ (${total_volume * 1000000} cm³)`
     : `- Sempre considere o peso tarifável como o MAIOR entre:
      * Peso informado (peso real em kg): ${total_weight} kg
      * Peso cubado: volume total em cm³ dividido pelo divisor de cubagem da transportadora
      * Peso mínimo tarifável definido na transportadora
   - Volume total informado: ${total_volume} m³ (${total_volume * 1000000} cm³)`
   }

2. CÁLCULO DO FRETE BASE:
   
   **ESTRUTURA DAS TABELAS DE PREÇOS:**
   
   Cada tabela contém um array pricing_data com:
   - destination_cep: CEP de destino ou faixa inicial do CEP (ex: "01000" cobre 01000-000 a 01999-999)
   - weight_min: peso mínimo da faixa (kg)
   - weight_max: peso máximo da faixa (kg) 
   - price: preço do frete base (R$)
   - delivery_days: prazo de entrega (dias úteis)
   
   **FLUXO DE CÁLCULO:**
   1. Encontre o registro onde o CEP de destino ${destination_cep} corresponde ao destination_cep
      - Se destination_cep for "01000", ele cobre CEPs de 01000-000 até 01999-999
      - Compare os primeiros dígitos do CEP: ${destination_cep.substring(0, 5)} deve corresponder
   2. Encontre a faixa de peso onde weight_min <= peso_tarifavel <= weight_max
   3. Use o price como frete base
   4. Use delivery_days como prazo de entrega

3. EXCEDENTE DE PESO:
   - Se peso tarifável > excess_weight_threshold_kg (ex: 30kg)
   - Calcule: excedente_kg = peso_tarifavel - excess_weight_threshold_kg
   - Valor excedente = excedente_kg × excess_weight_charge_per_kg

4. SEGURO (AD VALOREM):
   - Use o percentual definido em ad_valorem_percentage (geralmente 0.003 = 0,3%)
   - Aplicar sobre o valor da mercadoria declarada
   - SEMPRE somar ao frete base + excedente

5. PREÇO FINAL:
   frete_base + excedente (se houver) + seguro (ad_valorem% × valor mercadoria) + outros adicionais

DADOS DA COTAÇÃO:
- CEP Origem: ${origin_cep}
- CEP Destino: ${destination_cep} (primeiros 5 dígitos: ${destination_cep.substring(0, 5)})
- Peso Real: ${total_weight} kg
- Volume Total: ${total_volume} m³ (${total_volume * 1000000} cm³)
- Prioridade: ${config.priority_mode} (lowest_price = menor preço, fastest_delivery = menor prazo, balanced = equilíbrio)

TABELAS DISPONÍVEIS:
${JSON.stringify(aiContext.pricing_tables, null, 2)}

ADICIONAIS:
${JSON.stringify(additionals || [], null, 2)}

REGRAS ADICIONAIS: ${config.additional_rules || 'Nenhuma'}

SAÍDA ESPERADA:
Retorne APENAS um objeto JSON válido (sem markdown, sem backticks) com esta estrutura:
{
  selected_table_id: "uuid-da-tabela",
  selected_table_name: "nome-da-tabela",
  peso_informado: ${total_weight},
  peso_cubado: 0.00,
  peso_tarifavel: 0.00,
  base_price: 100.00,
  excedente_kg: 0,
  valor_excedente: 0.00,
  delivery_days: 5,
  additionals_applied: [
    {
      name: "Seguro da Mercadoria",
      type: "insurance",
      percentage: 0.003,
      value: 0.00
    }
  ],
  final_price: 120.00,
  status: "ok",
  reasoning: "Explicação: CEP encontrado em qual tabela, peso tarifável calculado, faixas aplicadas, adicionais incluídos"
}

IMPORTANTE:
- Se não encontrar o CEP nas tabelas, retorne status: "not_found"
- Se peso exceder limites, retorne status: "rejected"
- Compare apenas os primeiros 5 dígitos do CEP (ex: 01307-001 → 01307)
- SEMPRE retorne JSON válido, sem markdown
- Inclua reasoning detalhado explicando cada cálculo`;

    console.log('[AI Quote Agent] Calling OpenAI GPT-5...');
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um especialista em logística e cotações de frete. Sempre retorne respostas em JSON válido sem formatação markdown.' 
          },
          { role: 'user', content: aiPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[AI Quote Agent] AI API error:', errorText);
      console.error('[AI Quote Agent] Response status:', aiResponse.status);
      throw new Error(`Erro na API de IA: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log('[AI Quote Agent] AI response structure:', JSON.stringify(aiData, null, 2));
    
    const aiContent = aiData.choices?.[0]?.message?.content;
    
    if (!aiContent) {
      console.error('[AI Quote Agent] Empty AI response. Full response:', JSON.stringify(aiData));
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
          tables_analyzed: tablesWithData.length,
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
          // Incluir dados originais da IA para debug/histórico
          selected_table_id: aiResult.selected_table_id,
          selected_table_name: aiResult.selected_table_name,
          base_price: aiResult.base_price,
          final_price: aiResult.final_price,
          delivery_days: aiResult.delivery_days,
          peso_tarifavel: aiResult.peso_tarifavel,
          peso_cubado: aiResult.peso_cubado,
          peso_informado: aiResult.peso_informado,
        },
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );
  } catch (error) {
    console.error('[AI Quote Agent] Error:', error);
    
    // Tentar salvar log do erro
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );
      
      const body = await req.json().catch(() => ({}));
      
      await supabaseClient
        .from('ai_quote_logs')
        .insert([{
          user_id: body.user_id || null,
          session_id: body.session_id || null,
          origin_cep: body.origin_cep || '',
          destination_cep: body.destination_cep || '',
          total_weight: body.total_weight || 0,
          total_volume: 0,
          volumes_data: body.volumes_data || [],
          base_price: 0,
          final_price: 0,
          delivery_days: 0,
          priority_used: 'error',
          all_options_analyzed: {
            error: error.message,
            timestamp: new Date().toISOString()
          },
        }]);
    } catch (logError) {
      console.error('[AI Quote Agent] Failed to log error:', logError);
    }
    
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
