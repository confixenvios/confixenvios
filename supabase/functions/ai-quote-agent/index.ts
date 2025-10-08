// AI Quote Agent - Agente de cotação inteligente v3.0
// Atualizado: 2025-10-08 21:30 - OTIMIZADO: Queries filtradas por CEP e peso
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
    // Use SERVICE ROLE to access system tables (jadlog_zones, jadlog_pricing, etc.)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
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

    // Limpar CEP destino para busca
    const cleanDestinationCep = destination_cep.replace(/\D/g, '');
    const destinationCepNumeric = parseInt(cleanDestinationCep);
    
    // Determinar o estado de destino baseado no CEP (primeiros 2 dígitos)
    const cepPrefix = cleanDestinationCep.substring(0, 2);
    const stateMapping: { [key: string]: string } = {
      '69': 'AC', '57': 'AL', '68': 'AP', '69': 'AM',
      '40': 'BA', '60': 'CE', '70': 'DF', '29': 'ES',
      '72': 'GO', '73': 'GO', '74': 'GO', '75': 'GO', '76': 'GO',
      '65': 'MA', '78': 'MT', '79': 'MS',
      '30': 'MG', '31': 'MG', '32': 'MG', '33': 'MG', '34': 'MG', '35': 'MG', '36': 'MG', '37': 'MG', '38': 'MG', '39': 'MG',
      '66': 'PA', '68': 'PA',
      '58': 'PB', '80': 'PR', '81': 'PR', '82': 'PR', '83': 'PR', '84': 'PR', '85': 'PR', '86': 'PR', '87': 'PR',
      '50': 'PE', '51': 'PE', '52': 'PE', '53': 'PE', '54': 'PE', '55': 'PE', '56': 'PE',
      '64': 'PI', '20': 'RJ', '21': 'RJ', '22': 'RJ', '23': 'RJ', '24': 'RJ', '25': 'RJ', '26': 'RJ', '27': 'RJ', '28': 'RJ',
      '59': 'RN', '76': 'RO', '69': 'RR',
      '90': 'RS', '91': 'RS', '92': 'RS', '93': 'RS', '94': 'RS', '95': 'RS', '96': 'RS', '97': 'RS', '98': 'RS', '99': 'RS',
      '88': 'SC', '89': 'SC',
      '49': 'SE', '01': 'SP', '02': 'SP', '03': 'SP', '04': 'SP', '05': 'SP', '06': 'SP', '07': 'SP', '08': 'SP', '09': 'SP',
      '10': 'SP', '11': 'SP', '12': 'SP', '13': 'SP', '14': 'SP', '15': 'SP', '16': 'SP', '17': 'SP', '18': 'SP', '19': 'SP',
      '77': 'TO'
    };
    
    const destinationState = stateMapping[cepPrefix] || '';
    console.log(`[AI Quote Agent] CEP ${destination_cep} → Estado: ${destinationState}`);

    // Processar cada tabela e buscar APENAS os dados relevantes com queries filtradas
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

      // TABELA JADLOG: Query FILTRADA por estado e peso
      if (table.name.toLowerCase().includes('jadlog')) {
        console.log(`[AI Quote Agent] ⚡ OTIMIZADO: Buscando Jadlog FILTRADO por estado ${destinationState} e peso ${total_weight}kg`);
        try {
          if (!destinationState) {
            console.log(`[AI Quote Agent] ⚠️ Estado não identificado para CEP ${destination_cep}`);
            continue;
          }

          // 1. Buscar APENAS zonas do estado de destino com CEP matching
          console.log(`[AI Quote Agent] Query 1: Buscando zonas Jadlog para ${destinationState} e CEP ${cleanDestinationCep}...`);
          const { data: zones, error: zonesError } = await supabaseClient
            .from('jadlog_zones')
            .select('*')
            .eq('state', destinationState)
            .lte('cep_start', cleanDestinationCep)  // cep_start <= CEP buscado
            .gte('cep_end', cleanDestinationCep)    // cep_end >= CEP buscado
            .limit(50);
          
          console.log(`[AI Quote Agent] DEBUG Query Jadlog Zones: state=${destinationState}, CEP=${cleanDestinationCep}`);

          if (zonesError) {
            console.error(`[AI Quote Agent] Erro ao buscar jadlog_zones:`, zonesError);
            continue;
          }

          if (!zones || zones.length === 0) {
            console.log(`[AI Quote Agent] ⚠️ Nenhuma zona Jadlog encontrada para ${destinationState} - CEP ${destination_cep}`);
            continue;
          }

          console.log(`[AI Quote Agent] ✅ ${zones.length} zonas Jadlog encontradas para ${destinationState}`);

          // 2. Buscar APENAS preços para GO → destination_state que cobrem o peso
          console.log(`[AI Quote Agent] Query 2: Buscando preços Jadlog GO→${destinationState} para peso ${total_weight}kg...`);
          const { data: pricing, error: pricingError } = await supabaseClient
            .from('jadlog_pricing')
            .select('*')
            .eq('origin_state', 'GO')
            .eq('destination_state', destinationState)
            .lte('weight_min', total_weight)
            .gte('weight_max', total_weight)
            .limit(100);

          if (pricingError) {
            console.error(`[AI Quote Agent] Erro ao buscar jadlog_pricing:`, pricingError);
            continue;
          }

          if (!pricing || pricing.length === 0) {
            console.log(`[AI Quote Agent] ⚠️ Nenhum preço Jadlog GO→${destinationState} para ${total_weight}kg`);
            continue;
          }

          console.log(`[AI Quote Agent] ✅ ${pricing.length} preços Jadlog encontrados`);

          // 3. Combinar zonas com preços
          for (const zone of zones) {
            for (const priceItem of pricing) {
              tableData.pricing_data.push({
                destination_cep: `${zone.cep_start}-${zone.cep_end}`,
                weight_min: priceItem.weight_min,
                weight_max: priceItem.weight_max,
                price: priceItem.price,
                delivery_days: zone.delivery_days,
                express_delivery_days: zone.express_delivery_days,
                zone_code: zone.zone_code,
                tariff_type: zone.tariff_type,
                state: zone.state,
                origin_state: priceItem.origin_state,
                destination_state: priceItem.destination_state
              });
            }
          }

          console.log(`[AI Quote Agent] ✅ ${table.name}: ${tableData.pricing_data.length} registros (FILTRADO)`);
        } catch (error) {
          console.error(`[AI Quote Agent] Erro ao processar Jadlog:`, error);
        }
      }
      // TABELA MAGALOG: Query FILTRADA por CEP range e peso
      else if (table.name.toLowerCase().includes('magalog')) {
        console.log(`[AI Quote Agent] ⚡ OTIMIZADO: Buscando Magalog FILTRADO por CEP ${destination_cep} e peso ${total_weight}kg`);
        try {
          // 1. Buscar APENAS zonas que cobrem o CEP destino
          console.log(`[AI Quote Agent] Query 1: Buscando zonas Magalog para CEP ${cleanDestinationCep}...`);
          const { data: zones, error: zonesError } = await supabaseClient
            .from('shipping_zones_magalog')
            .select('*')
            .lte('cep_start', cleanDestinationCep)  // cep_start <= CEP buscado
            .gte('cep_end', cleanDestinationCep)    // cep_end >= CEP buscado
            .limit(10);
          
          console.log(`[AI Quote Agent] DEBUG Query Magalog Zones: CEP=${cleanDestinationCep}`);

          if (zonesError) {
            console.error(`[AI Quote Agent] Erro ao buscar shipping_zones_magalog:`, zonesError);
            continue;
          }

          if (!zones || zones.length === 0) {
            console.log(`[AI Quote Agent] ⚠️ Nenhuma zona Magalog encontrada para CEP ${destination_cep}`);
            continue;
          }

          console.log(`[AI Quote Agent] ✅ ${zones.length} zonas Magalog encontradas`);

          // 2. Para cada zona, buscar APENAS preços que cobrem o peso
          for (const zone of zones) {
            console.log(`[AI Quote Agent] Query 2: Buscando preços Magalog para zona ${zone.zone_code} e peso ${total_weight}kg...`);
            
            const { data: pricing, error: pricingError } = await supabaseClient
              .from('shipping_pricing_magalog')
              .select('*')
              .eq('zone_code', zone.zone_code)
              .lte('weight_min', total_weight)
              .gte('weight_max', total_weight)
              .limit(50); // Máximo 50 faixas de peso

            if (pricingError) {
              console.error(`[AI Quote Agent] Erro ao buscar shipping_pricing_magalog:`, pricingError);
              continue;
            }

            if (!pricing || pricing.length === 0) {
              console.log(`[AI Quote Agent] ⚠️ Nenhum preço Magalog para zona ${zone.zone_code} e peso ${total_weight}kg`);
              continue;
            }

            console.log(`[AI Quote Agent] ✅ ${pricing.length} preços Magalog encontrados para zona ${zone.zone_code}`);

            // 3. Combinar zona com preços (APENAS dados relevantes)
            for (const priceItem of pricing) {
              tableData.pricing_data.push({
                destination_cep: `${zone.cep_start}-${zone.cep_end}`,
                weight_min: priceItem.weight_min,
                weight_max: priceItem.weight_max,
                price: priceItem.price,
                delivery_days: zone.delivery_days,
                express_delivery_days: zone.express_delivery_days,
                zone_code: zone.zone_code,
                zone_type: zone.zone_type,
                state: zone.state
              });
            }
          }

          console.log(`[AI Quote Agent] ✅ ${table.name}: ${tableData.pricing_data.length} registros Magalog (FILTRADOS)`);
        } catch (error) {
          console.error(`[AI Quote Agent] Erro ao processar tabela Magalog:`, error);
        }
      }
      // OUTRAS TABELAS: Buscar do Google Sheets
      else if (table.source_type === 'google_sheets' && table.google_sheets_url) {
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
            let gid = gidMatch ? gidMatch[1] : '0';
            
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
              .map((row, index) => {
                const cols = row.split(',').map(col => col.trim().replace(/^"|"$/g, ''));
                
                let destination_cep = cols[0] || '';
                let weight_min = parseFloat(cols[1]) || 0;
                let weight_max = parseFloat(cols[2]) || 999;
                let price = parseFloat(cols[3]) || 0;
                let delivery_days = parseInt(cols[4]) || 5;
                
                return {
                  destination_cep,
                  weight_min,
                  weight_max,
                  price,
                  delivery_days
                };
              })
              .filter((item) => {
                const cepValid = /\d{5}/.test(item.destination_cep);
                const priceValid = item.price > 0;
                const weightValid = item.weight_min >= 0 && item.weight_max > 0;
                return cepValid && priceValid && weightValid;
              });
            
            console.log(`[AI Quote Agent] ${table.name}: ${tableData.pricing_data.length} registros válidos carregados`);
            
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
    const cepNumerico = parseInt(destination_cep.replace(/\D/g, ''));
    const allTableQuotes = [];

    for (const table of tablesWithData) {
      try {
        // Calcular peso tarifável
        const peso_cubado = (total_volume * 1000000) / table.cubic_meter_kg_equivalent;
        const peso_tarifavel = Math.max(total_weight, peso_cubado);
        
        console.log(`[AI Quote Agent] Buscando preço em ${table.name}:`);
        console.log(`  - CEP: ${destination_cep}, Peso: ${peso_tarifavel}kg`);
        
        // Encontrar registro de preço correspondente ao CEP e peso
        const priceRecord = table.pricing_data.find(p => {
          // Verificar match de peso
          const weightMatch = peso_tarifavel >= p.weight_min && peso_tarifavel <= p.weight_max;
          
          // Verificar match de CEP - suportar diferentes formatos
          const recordCep = p.destination_cep.replace(/\D/g, '');
          
          // Formato 1: Range de CEPs (ex: 69908643-69924999) - JADLOG
          const rangeMatch = p.destination_cep.match(/(\d{5,8})\s*-\s*(\d{5,8})/);
          let cepMatch = false;
          
          if (rangeMatch) {
            const rangeStart = parseInt(rangeMatch[1]);
            const rangeEnd = parseInt(rangeMatch[2]);
            cepMatch = cepNumerico >= rangeStart && cepNumerico <= rangeEnd;
          }
          // Formato 2: CEP exato ou prefixo (ex: 69918)
          else if (recordCep.length <= 5) {
            cepMatch = cepPrefix.startsWith(recordCep);
          }
          // Formato 3: CEP completo exato (ex: 69918308)
          else if (recordCep.length === 8) {
            cepMatch = cepNumerico === parseInt(recordCep);
          }
          // Fallback: prefixo simples
          else {
            cepMatch = cepPrefix.startsWith(recordCep.substring(0, 5));
          }
          
          const finalMatch = weightMatch && cepMatch;
          
          // Log quando encontrar match
          if (finalMatch) {
            console.log(`[AI Quote Agent] ✅ MATCH encontrado em ${table.name}:`, {
              cep: p.destination_cep,
              peso: `${p.weight_min}-${p.weight_max}kg`,
              price: p.price,
              weightMatch,
              cepMatch
            });
          }
          
          return finalMatch;
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
          
          console.log(`[AI Quote Agent] ${table.name} - Cobertura ENCONTRADA para CEP ${destination_cep} e peso ${peso_tarifavel}kg - Preço: R$ ${final_price}`);
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
          
          console.log(`[AI Quote Agent] ${table.name} - Sem cobertura para CEP ${destination_cep} e peso ${peso_tarifavel}kg`);
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
