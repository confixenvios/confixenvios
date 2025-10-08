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
            // Se tem sheet_name configurado, tentar encontrar o gid
            // Senão, usar o gid da URL ou tentar diferentes gids comuns
            let gid = gidMatch ? gidMatch[1] : '0';
            
            // Para tabela Jadlog, tentar gid=2031699923 (aba específica dos dados)
            if (table.name.toLowerCase().includes('jadlog') && !gidMatch) {
              gid = '2031699923';
              console.log(`[AI Quote Agent] Usando gid específico para Jadlog: ${gid}`);
            }
            
            sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
            console.log(`[AI Quote Agent] URL CSV convertida: ${sheetUrl} (gid=${gid})`);
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
                // Validar que é um registro válido (CEP deve ter 5+ dígitos e preço válido)
                const cepValid = /^\d{5,8}/.test(item.destination_cep);
                const priceValid = item.price > 0;
                const weightValid = item.weight_min >= 0 && item.weight_max > 0;
                const isValid = cepValid && priceValid && weightValid;
                
                if (!isValid) {
                  console.log(`[AI Quote Agent] Linha inválida ignorada (table: ${table.name}):`, item);
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

    // Preparar contexto simplificado para a IA (apenas para escolha da tabela)
    const aiContext = {
      origin_cep,
      destination_cep,
      total_weight,
      total_volume,
      priority_mode: config.priority_mode,
      pricing_tables: tablesWithData.map(t => ({
        id: t.id,
        name: t.name,
        cnpj: t.cnpj,
        total_records: t.pricing_data.length,
        sample_ceps: t.pricing_data.slice(0, 3).map(p => p.destination_cep),
        cubic_meter_kg_equivalent: t.cubic_meter_kg_equivalent,
      })),
    };

    // Chamar OpenAI para escolher a melhor tabela
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    const aiPrompt = `Você é um especialista em seleção de transportadoras para o site Confix Envios.

SUA FUNÇÃO: Escolher a melhor tabela de preços e EXPLICAR detalhadamente o porquê dessa escolha.

DADOS DA COTAÇÃO:
- CEP Origem: ${origin_cep}
- CEP Destino: ${destination_cep}
- Peso: ${total_weight} kg
- Volume: ${total_volume} m³
- Prioridade: ${config.priority_mode}

TABELAS DISPONÍVEIS:
${JSON.stringify(aiContext.pricing_tables, null, 2)}

CRITÉRIOS DE ESCOLHA:
1. Qual tabela tem cobertura para o CEP ${destination_cep}?
2. Considerando o modo de prioridade: ${config.priority_mode}
   - lowest_price: prefira tabela com menores preços históricos
   - fastest_delivery: prefira tabela com menores prazos
   - balanced: equilibre preço e prazo

SAÍDA ESPERADA:
Retorne JSON com sua escolha e explicação DETALHADA:
{
  "selected_table_id": "uuid-da-tabela-escolhida",
  "selected_table_name": "nome-da-tabela",
  "reasoning": "Explicação DETALHADA: Por que escolhi esta tabela? Qual a cobertura de CEP? Por que não escolhi as outras tabelas disponíveis? Como a prioridade ${config.priority_mode} influenciou minha decisão?"
}

IMPORTANTE: 
- Compare TODAS as tabelas disponíveis
- Explique POR QUE você escolheu uma e NÃO escolheu as outras
- Seja específico sobre cobertura de CEP e critérios de prioridade`;

    console.log('[AI Quote Agent] Calling OpenAI for table selection...');
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
            content: 'Você é um especialista em seleção de transportadoras. Escolha a melhor tabela e explique detalhadamente o motivo.' 
          },
          { role: 'user', content: aiPrompt }
        ],
        max_tokens: 500,
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

    console.log('[AI Quote Agent] AI selection response:', aiContent);

    // Parse da resposta da IA
    let aiSelection;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiSelection = JSON.parse(jsonMatch[0]);
      } else {
        aiSelection = JSON.parse(aiContent);
      }
    } catch (e) {
      console.error('[AI Quote Agent] Failed to parse AI response:', aiContent);
      throw new Error('Resposta da IA inválida');
    }

    // Encontrar a tabela selecionada pela IA
    const selectedTable = tablesWithData.find(t => t.id === aiSelection.selected_table_id);
    
    if (!selectedTable) {
      throw new Error(`Tabela selecionada não encontrada: ${aiSelection.selected_table_id}`);
    }

    console.log('[AI Quote Agent] Selected table:', selectedTable.name);
    console.log('[AI Quote Agent] AI Reasoning:', aiSelection.reasoning);

    // CALCULAR O PREÇO PARA TODAS AS TABELAS DISPONÍVEIS
    const cepPrefix = destination_cep.replace(/\D/g, '').substring(0, 5);
    const allTableQuotes = [];

    for (const table of tablesWithData) {
      try {
        // Calcular peso tarifável
        const peso_cubado = (total_volume * 1000000) / table.cubic_meter_kg_equivalent;
        const peso_tarifavel = Math.max(total_weight, peso_cubado);
        
        // Encontrar registro de preço correspondente ao CEP e peso
        const priceRecord = table.pricing_data.find(p => {
          const recordCepPrefix = p.destination_cep.replace(/\D/g, '').substring(0, 5);
          const cepMatch = recordCepPrefix === cepPrefix;
          const weightMatch = peso_tarifavel >= p.weight_min && peso_tarifavel <= p.weight_max;
          return cepMatch && weightMatch;
        });

        if (priceRecord) {
          // Calcular excedente de peso se aplicável
          let excedente_kg = 0;
          let valor_excedente = 0;
          
          if (peso_tarifavel > table.excess_weight_threshold_kg) {
            excedente_kg = peso_tarifavel - table.excess_weight_threshold_kg;
            valor_excedente = excedente_kg * table.excess_weight_charge_per_kg;
          }

          const base_price = priceRecord.price;
          const final_price = base_price + valor_excedente;

          allTableQuotes.push({
            table_id: table.id,
            table_name: table.name,
            base_price,
            excedente_kg,
            valor_excedente,
            final_price,
            delivery_days: priceRecord.delivery_days,
            peso_tarifavel,
            has_coverage: true
          });
        } else {
          // Tabela não tem cobertura para este CEP/peso
          allTableQuotes.push({
            table_id: table.id,
            table_name: table.name,
            base_price: 0,
            excedente_kg: 0,
            valor_excedente: 0,
            final_price: 0,
            delivery_days: 0,
            peso_tarifavel: 0,
            has_coverage: false
          });
        }
      } catch (error) {
        console.error(`[AI Quote Agent] Error calculating price for table ${table.name}:`, error);
        allTableQuotes.push({
          table_id: table.id,
          table_name: table.name,
          base_price: 0,
          excedente_kg: 0,
          valor_excedente: 0,
          final_price: 0,
          delivery_days: 0,
          peso_tarifavel: 0,
          has_coverage: false,
          error: error.message
        });
      }
    }

    // Encontrar o resultado da tabela selecionada
    const selectedQuote = allTableQuotes.find(q => q.table_id === selectedTable.id);
    
    if (!selectedQuote || !selectedQuote.has_coverage) {
      throw new Error(`Tabela selecionada ${selectedTable.name} não tem cobertura para CEP ${destination_cep} e peso ${selectedQuote?.peso_tarifavel || total_weight}kg`);
    }

    const calculationResult = {
      selected_table_id: selectedTable.id,
      selected_table_name: selectedTable.name,
      peso_informado: total_weight,
      peso_cubado: selectedQuote.peso_tarifavel > total_weight ? (total_volume * 1000000) / selectedTable.cubic_meter_kg_equivalent : 0,
      peso_tarifavel: selectedQuote.peso_tarifavel,
      base_price: selectedQuote.base_price,
      excedente_kg: selectedQuote.excedente_kg,
      valor_excedente: selectedQuote.valor_excedente,
      delivery_days: selectedQuote.delivery_days,
      final_price: selectedQuote.final_price,
      reasoning: aiSelection.reasoning,
      all_table_quotes: allTableQuotes
    };

    console.log('[AI Quote Agent] All table quotes calculated:', allTableQuotes);
    console.log('[AI Quote Agent] Final selected calculation:', calculationResult);

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
        selected_pricing_table_id: calculationResult.selected_table_id,
        selected_pricing_table_name: calculationResult.selected_table_name,
        base_price: calculationResult.base_price,
        additionals_applied: [],
        final_price: calculationResult.final_price,
        delivery_days: calculationResult.delivery_days,
        priority_used: config.priority_mode,
        all_options_analyzed: {
          tables_analyzed: tablesWithData.length,
          reasoning: calculationResult.reasoning,
          all_quotes: calculationResult.all_table_quotes,
          calculation_details: {
            peso_informado: calculationResult.peso_informado,
            peso_cubado: calculationResult.peso_cubado,
            peso_tarifavel: calculationResult.peso_tarifavel,
            base_price: calculationResult.base_price,
            excedente_kg: calculationResult.excedente_kg,
            valor_excedente: calculationResult.valor_excedente
          }
        },
      }]);

    if (logError) {
      console.error('[AI Quote Agent] Error saving log:', logError);
    }

    console.log('[AI Quote Agent] Quote processed successfully', {
      table: calculationResult.selected_table_name,
      final_price: calculationResult.final_price,
      reasoning: calculationResult.reasoning
    });

    return new Response(
      JSON.stringify({
        success: true,
        quote: {
          economicPrice: calculationResult.final_price,
          economicDays: calculationResult.delivery_days,
          expressPrice: calculationResult.final_price * 1.3,
          expressDays: Math.max(1, calculationResult.delivery_days - 2),
          zone: `Tabela: ${calculationResult.selected_table_name}`,
          additionals_applied: [],
          reasoning: calculationResult.reasoning,
          // Dados detalhados para histórico
          selected_table_id: calculationResult.selected_table_id,
          selected_table_name: calculationResult.selected_table_name,
          base_price: calculationResult.base_price,
          final_price: calculationResult.final_price,
          delivery_days: calculationResult.delivery_days,
          peso_tarifavel: calculationResult.peso_tarifavel,
          peso_cubado: calculationResult.peso_cubado,
          peso_informado: calculationResult.peso_informado,
          excedente_kg: calculationResult.excedente_kg,
          valor_excedente: calculationResult.valor_excedente
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
