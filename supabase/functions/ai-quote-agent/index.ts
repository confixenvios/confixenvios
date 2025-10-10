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
      session_id,
      merchandise_value 
    } = await req.json();

    console.log('[AI Quote Agent] Processing quote request', {
      origin_cep,
      destination_cep,
      total_weight,
      merchandise_value
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
    
    // Determinar o estado de destino baseado no CEP - usando primeiros 5 dígitos para maior precisão
    const cepPrefix5 = cleanDestinationCep.substring(0, 5);
    const cepPrefix2 = cleanDestinationCep.substring(0, 2);
    
    // Função para determinar estado com base no CEP
    const getStateFromCep = (cep: string): string => {
      // CEPs do Acre (69900-69999)
      if (cep >= '69900' && cep <= '69999') return 'AC';
      
      // CEPs do Amazonas (69000-69299, 69400-69899)
      if ((cep >= '69000' && cep <= '69299') || (cep >= '69400' && cep <= '69899')) return 'AM';
      
      // CEPs de Roraima (69300-69389)
      if (cep >= '69300' && cep <= '69389') return 'RR';
      
      // Mapeamento padrão por 2 dígitos
      const stateMapping: { [key: string]: string } = {
        '57': 'AL', '68': 'AP',
        '40': 'BA', '41': 'BA', '42': 'BA', '43': 'BA', '44': 'BA', '45': 'BA', '46': 'BA', '47': 'BA', '48': 'BA',
        '60': 'CE', '61': 'CE', '62': 'CE', '63': 'CE',
        '70': 'DF', '71': 'DF', '72': 'DF', '73': 'DF',
        '29': 'ES',
        '72': 'GO', '73': 'GO', '74': 'GO', '75': 'GO', '76': 'GO',
        '65': 'MA',
        '78': 'MT',
        '79': 'MS',
        '30': 'MG', '31': 'MG', '32': 'MG', '33': 'MG', '34': 'MG', '35': 'MG', '36': 'MG', '37': 'MG', '38': 'MG', '39': 'MG',
        '66': 'PA', '67': 'PA',
        '58': 'PB',
        '80': 'PR', '81': 'PR', '82': 'PR', '83': 'PR', '84': 'PR', '85': 'PR', '86': 'PR', '87': 'PR',
        '50': 'PE', '51': 'PE', '52': 'PE', '53': 'PE', '54': 'PE', '55': 'PE', '56': 'PE',
        '64': 'PI',
        '20': 'RJ', '21': 'RJ', '22': 'RJ', '23': 'RJ', '24': 'RJ', '25': 'RJ', '26': 'RJ', '27': 'RJ', '28': 'RJ',
        '59': 'RN',
        '76': 'RO', '78': 'RO',
        '90': 'RS', '91': 'RS', '92': 'RS', '93': 'RS', '94': 'RS', '95': 'RS', '96': 'RS', '97': 'RS', '98': 'RS', '99': 'RS',
        '88': 'SC', '89': 'SC',
        '49': 'SE',
        '01': 'SP', '02': 'SP', '03': 'SP', '04': 'SP', '05': 'SP', '06': 'SP', '07': 'SP', '08': 'SP', '09': 'SP',
        '10': 'SP', '11': 'SP', '12': 'SP', '13': 'SP', '14': 'SP', '15': 'SP', '16': 'SP', '17': 'SP', '18': 'SP', '19': 'SP',
        '77': 'TO'
      };
      
      return stateMapping[cepPrefix2] || 'UNKNOWN';
    };
    
    const destinationState = getStateFromCep(cepPrefix5);
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

      // TABELA JADLOG: Buscar TODOS os dados do estado (sem filtros restritivos)
      if (table.name.toLowerCase().includes('jadlog')) {
        console.log(`[AI Quote Agent] 📊 Buscando TODOS os dados Jadlog para estado ${destinationState}`);
        try {
          if (!destinationState || destinationState === 'UNKNOWN') {
            console.log(`[AI Quote Agent] ⚠️ Estado não identificado para CEP ${destination_cep}`);
            continue;
          }

          // 1. Buscar TODAS as zonas do estado de destino (SEM filtro de CEP)
          console.log(`[AI Quote Agent] Query 1: Buscando TODAS zonas Jadlog para estado ${destinationState}...`);
          const { data: zones, error: zonesError } = await supabaseClient
            .from('jadlog_zones')
            .select('*')
            .eq('state', destinationState);

          if (zonesError) {
            console.error(`[AI Quote Agent] Erro ao buscar jadlog_zones:`, zonesError);
            continue;
          }

          if (!zones || zones.length === 0) {
            console.log(`[AI Quote Agent] ⚠️ Nenhuma zona Jadlog encontrada para estado ${destinationState}`);
            continue;
          }

          console.log(`[AI Quote Agent] ✅ ${zones.length} zonas Jadlog encontradas para ${destinationState}`);

          // 2. Buscar TODOS os preços para GO → destination_state (SEM filtro de peso)
          console.log(`[AI Quote Agent] Query 2: Buscando TODOS preços Jadlog GO→${destinationState}...`);
          const { data: pricing, error: pricingError } = await supabaseClient
            .from('jadlog_pricing')
            .select('*')
            .eq('origin_state', 'GO')
            .eq('destination_state', destinationState);

          if (pricingError) {
            console.error(`[AI Quote Agent] Erro ao buscar jadlog_pricing:`, pricingError);
            continue;
          }

          if (!pricing || pricing.length === 0) {
            console.log(`[AI Quote Agent] ⚠️ Nenhum preço Jadlog encontrado para GO→${destinationState}`);
            continue;
          }

          console.log(`[AI Quote Agent] ✅ ${pricing.length} preços Jadlog encontrados para GO→${destinationState}`);

          // 3. Combinar TODAS as zonas com TODOS os preços (filtrar em memória depois)
          for (const zone of zones) {
            // Verificar se o CEP buscado está na faixa desta zona
            const cepNumerico = parseInt(cleanDestinationCep);
            const cepStartNum = parseInt(zone.cep_start || '0');
            const cepEndNum = parseInt(zone.cep_end || '99999999');
            
            const cepNaFaixa = cepNumerico >= cepStartNum && cepNumerico <= cepEndNum;
            
            for (const priceItem of pricing) {
              // Verificar se o peso está na faixa
              const pesoNaFaixa = total_weight >= priceItem.weight_min && total_weight <= priceItem.weight_max;
              
              // Adicionar TODOS os registros (filtrar depois na busca de preço)
              tableData.pricing_data.push({
                destination_cep: `${zone.cep_start}-${zone.cep_end}`,
                cep_start: zone.cep_start,
                cep_end: zone.cep_end,
                weight_min: priceItem.weight_min,
                weight_max: priceItem.weight_max,
                price: priceItem.price,
                delivery_days: zone.delivery_days,
                express_delivery_days: zone.express_delivery_days,
                zone_code: zone.zone_code,
                tariff_type: zone.tariff_type,
                state: zone.state,
                origin_state: priceItem.origin_state,
                destination_state: priceItem.destination_state,
                // Flags para ajudar na busca
                matches_cep: cepNaFaixa,
                matches_weight: pesoNaFaixa
              });
            }
          }

          console.log(`[AI Quote Agent] ✅ ${table.name}: ${tableData.pricing_data.length} registros combinados (zonas x preços)`);
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

    // ETAPA 1: CALCULAR PREÇOS EM TODAS AS TABELAS DISPONÍVEIS (VERIFICAR COBERTURA)
    console.log('[AI Quote Agent] Calculando preços em TODAS as tabelas para verificar cobertura...');
    const cepNumerico = parseInt(destination_cep.replace(/\D/g, ''));
    const cepPrefix = destination_cep.replace(/\D/g, '').substring(0, 5);
    const allTableQuotes = [];

    for (const table of tablesWithData) {
      try {
        // Calcular peso tarifável
        // total_volume já está em m³, então basta multiplicar pelo equivalente
        const peso_cubado = total_volume * table.cubic_meter_kg_equivalent;
        const peso_tarifavel = Math.max(total_weight, peso_cubado);
        
        console.log(`[AI Quote Agent] Buscando preço em ${table.name}:`);
        console.log(`  - CEP: ${destination_cep}, Peso: ${peso_tarifavel}kg`);
        
        // VALIDAÇÃO DE DIMENSÕES (Magalog/outras transportadoras)
        let dimensions_valid = true;
        let dimension_violation = '';
        
        if (table.max_length_cm || table.max_width_cm || table.max_height_cm || (table as any).max_dimension_sum_cm) {
          for (const vol of volumes_data) {
            // Verificar dimensões individuais máximas
            if (table.max_length_cm && vol.length > table.max_length_cm) {
              dimensions_valid = false;
              dimension_violation = `Comprimento ${vol.length}cm excede máximo de ${table.max_length_cm}cm`;
              break;
            }
            if (table.max_width_cm && vol.width > table.max_width_cm) {
              dimensions_valid = false;
              dimension_violation = `Largura ${vol.width}cm excede máximo de ${table.max_width_cm}cm`;
              break;
            }
            if (table.max_height_cm && vol.height > table.max_height_cm) {
              dimensions_valid = false;
              dimension_violation = `Altura ${vol.height}cm excede máximo de ${table.max_height_cm}cm`;
              break;
            }
            
            // CONSIDERAÇÃO 2 (Magalog): Verificar soma das dimensões
            if ((table as any).max_dimension_sum_cm) {
              const dimension_sum = vol.length + vol.width + vol.height;
              if (dimension_sum > (table as any).max_dimension_sum_cm) {
                dimensions_valid = false;
                dimension_violation = `Soma das dimensões ${dimension_sum}cm (${vol.length}+${vol.width}+${vol.height}) excede máximo de ${(table as any).max_dimension_sum_cm}cm`;
                break;
              }
            }
          }
          
          if (!dimensions_valid) {
            console.log(`[AI Quote Agent] ❌ ${table.name} - Dimensões inválidas: ${dimension_violation}`);
            allTableQuotes.push({
              table_id: table.id,
              table_name: table.name,
              base_price: 0,
              excedente_kg: 0,
              valor_excedente: 0,
              insurance_value: 0,
              final_price: 0,
              delivery_days: 0,
              peso_tarifavel: 0,
              has_coverage: false,
              dimension_violation
            });
            continue; // Pular para próxima tabela
          }
        }
        
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
          
          // CONSIDERAÇÃO 3 (Diolog): A cada fração de peso excedente, acrescentar valor
          if (table.excess_weight_threshold_kg && table.excess_weight_charge_per_kg) {
            if (peso_tarifavel > table.excess_weight_threshold_kg) {
              excedente_kg = peso_tarifavel - table.excess_weight_threshold_kg;
              // Calcular quantas frações de threshold existem
              const num_fracoes = Math.ceil(excedente_kg / table.excess_weight_threshold_kg);
              valor_excedente = num_fracoes * table.excess_weight_charge_per_kg;
              console.log(`[AI Quote Agent] ${table.name} - Excedente calculado: ${excedente_kg}kg em ${num_fracoes} frações de ${table.excess_weight_threshold_kg}kg = R$ ${valor_excedente.toFixed(2)}`);
            }
          }

          let base_price = priceRecord.price;
          
          // CONSIDERAÇÃO 2 (Diolog): Se algum VOLUME individual pesar mais de X kg, multiplicar frete
          let volume_weight_multiplier_applied = false;
          if (table.distance_multiplier_threshold_km && table.distance_multiplier_value) {
            // Verificar se algum volume individual excede o limite de peso
            const hasHeavyVolume = volumes_data.some((vol: any) => vol.weight > table.distance_multiplier_threshold_km);
            
            if (hasHeavyVolume) {
              base_price = base_price * table.distance_multiplier_value;
              volume_weight_multiplier_applied = true;
              console.log(`[AI Quote Agent] ${table.name} - CONSIDERAÇÃO 2 aplicada: Volume pesado detectado (>${table.distance_multiplier_threshold_km}kg), frete multiplicado por ${table.distance_multiplier_value}x`);
            }
          }
          
          // Calcular seguro (1.3% do valor da mercadoria)
          let insurance_value = 0;
          if (merchandise_value && merchandise_value > 0) {
            insurance_value = merchandise_value * 0.013; // 1.3%
            console.log(`[AI Quote Agent] 🛡️ Seguro calculado: R$ ${insurance_value.toFixed(2)} (1.3% de R$ ${merchandise_value.toFixed(2)})`);
          }
          
          const final_price = base_price + valor_excedente + insurance_value;

          // CONSIDERAÇÃO 4 (Diolog): Informar se transporta químicos
          const transports_chemicals = table.chemical_classes_enabled ? 
            `Transporta químicos classes ${table.transports_chemical_classes}` : 
            'Não transporta químicos';
          
          // Informações sobre restrições de dimensões
          const dimension_rules = [];
          if (table.max_length_cm || table.max_width_cm || table.max_height_cm) {
            dimension_rules.push(`Dimensões máx: ${table.max_length_cm}×${table.max_width_cm}×${table.max_height_cm}cm`);
          }
          if ((table as any).max_dimension_sum_cm) {
            dimension_rules.push(`Soma máx: ${(table as any).max_dimension_sum_cm}cm`);
          }

          allTableQuotes.push({
            table_id: table.id,
            table_name: table.name,
            base_price,
            excedente_kg,
            valor_excedente,
            insurance_value,
            final_price,
            delivery_days: priceRecord.delivery_days,
            peso_tarifavel,
            has_coverage: true,
            cubic_meter_equivalent: table.cubic_meter_kg_equivalent,
            transports_chemicals,
            dimension_rules: dimension_rules.length > 0 ? dimension_rules.join('; ') : null,
            volume_weight_rule: volume_weight_multiplier_applied ? 
              `Multiplicador ${table.distance_multiplier_value}x aplicado (volume >${table.distance_multiplier_threshold_km}kg)` : 
              (table.distance_multiplier_threshold_km ? 
                `Multiplica ${table.distance_multiplier_value}x se volume >${table.distance_multiplier_threshold_km}kg` : 
                null)
          });
          
          console.log(`[AI Quote Agent] ${table.name} - Cobertura ENCONTRADA para CEP ${destination_cep} e peso ${peso_tarifavel}kg`);
          console.log(`  - Equivalência cúbica: ${table.cubic_meter_kg_equivalent} kg/m³ (CONSIDERAÇÃO 1)`);
          console.log(`  - Volume pesado: ${volume_weight_multiplier_applied ? 'SIM - Multiplicador aplicado!' : 'Não'} (CONSIDERAÇÃO 2 Diolog)`);
          if (dimension_rules.length > 0) {
            console.log(`  - Restrições de dimensões: ${dimension_rules.join('; ')} (CONSIDERAÇÃO 2 Magalog)`);
          }
          console.log(`  - Preço base: R$ ${base_price.toFixed(2)}`);
          console.log(`  - Excedente: R$ ${valor_excedente.toFixed(2)} (CONSIDERAÇÃO 3 Diolog)`);
          console.log(`  - Seguro: R$ ${insurance_value.toFixed(2)}`);
          console.log(`  - Preço final: R$ ${final_price.toFixed(2)}`);
          console.log(`  - ${transports_chemicals} (CONSIDERAÇÃO 4 Diolog)`);
        } else {
          // Tabela não tem cobertura para este CEP/peso
          allTableQuotes.push({
          table_id: table.id,
          table_name: table.name,
          base_price: 0,
          excedente_kg: 0,
          valor_excedente: 0,
          insurance_value: 0,
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
            insurance_value: 0,
            final_price: 0,
          delivery_days: 0,
          peso_tarifavel: 0,
          has_coverage: false,
          error: error.message
        });
      }
    }

    // ETAPA 2: FILTRAR APENAS TABELAS COM COBERTURA REAL
    const tablesWithCoverage = allTableQuotes.filter(q => q.has_coverage);
    
    console.log('[AI Quote Agent] ==========================================');
    console.log('[AI Quote Agent] RESULTADO DA VERIFICAÇÃO DE COBERTURA:');
    console.log(`[AI Quote Agent] Total de tabelas analisadas: ${allTableQuotes.length}`);
    console.log(`[AI Quote Agent] Tabelas COM cobertura: ${tablesWithCoverage.length}`);
    console.log('[AI Quote Agent] ==========================================');
    
    // Se NENHUMA tabela tem cobertura, erro claro
    if (tablesWithCoverage.length === 0) {
      const tableNames = allTableQuotes.map(q => q.table_name).join(', ');
      throw new Error(`Nenhuma transportadora disponível atende o CEP ${destination_cep} para peso ${total_weight}kg. Tabelas verificadas: ${tableNames}`);
    }
    
    // ETAPA 3: ESCOLHER A MELHOR ENTRE AS QUE TÊM COBERTURA
    let selectedQuote;
    let aiReasoning = '';
    
    // Se apenas UMA tabela tem cobertura, usar ela diretamente
    if (tablesWithCoverage.length === 1) {
      selectedQuote = tablesWithCoverage[0];
      aiReasoning = `Única transportadora com cobertura disponível para o CEP ${destination_cep}. Transportadora: ${selectedQuote.table_name}, Preço: R$ ${selectedQuote.final_price.toFixed(2)}, Prazo: ${selectedQuote.delivery_days} dias.`;
      
      console.log('[AI Quote Agent] ✅ Apenas UMA tabela com cobertura:', selectedQuote.table_name);
      console.log('[AI Quote Agent] Selecionada automaticamente (sem necessidade de IA)');
    } 
    // Se MÚLTIPLAS tabelas têm cobertura, usar IA para escolher a melhor
    else {
      console.log('[AI Quote Agent] ⚡ MÚLTIPLAS tabelas com cobertura detectadas!');
      console.log('[AI Quote Agent] Chamando IA para escolher a melhor opção...');
      
      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
      if (!OPENAI_API_KEY) {
        // Fallback: escolher a mais barata se IA não disponível
        console.warn('[AI Quote Agent] ⚠️ OpenAI API Key não encontrada, usando fallback (mais barata)');
        selectedQuote = tablesWithCoverage.sort((a, b) => a.final_price - b.final_price)[0];
        aiReasoning = `Selecionada opção mais econômica entre ${tablesWithCoverage.length} transportadoras disponíveis (IA indisponível). Transportadora: ${selectedQuote.table_name}.`;
      } else {
        try {
          const aiPrompt = `Você é um especialista em logística. Escolha a MELHOR transportadora entre as opções disponíveis.

DADOS DO ENVIO:
- CEP Destino: ${destination_cep}
- Peso: ${total_weight}kg
- Prioridade: ${config.priority_mode}

TRANSPORTADORAS DISPONÍVEIS (TODAS COM COBERTURA):
${JSON.stringify(tablesWithCoverage.map(q => ({
  table_id: q.table_id,
  table_name: q.table_name,
  price: q.final_price,
  delivery_days: q.delivery_days,
  weight: q.peso_tarifavel,
  cubic_meter_equivalent: q.cubic_meter_equivalent,
  transports_chemicals: q.transports_chemicals,
  dimension_rules: q.dimension_rules,
  volume_weight_rule: q.volume_weight_rule,
  base_price: q.base_price,
  excess_charge: q.valor_excedente
})), null, 2)}

CRITÉRIOS DE ESCOLHA (baseado em prioridade "${config.priority_mode}"):
- "fastest": Escolha a com MENOR prazo (delivery_days)
- "cheapest": Escolha a com MENOR preço (final_price)
- "balanced": Balance preço e prazo (melhor custo-benefício)

REGRAS ESPECÍFICAS DAS TRANSPORTADORAS:
- Cada transportadora tem regras diferentes (peso cúbico, dimensões, excedente, volume pesado, químicos)
- Magalog: Peso cúbico 167 kg/m³, restrições de dimensões individuais e soma máxima
- Diolog: Peso cúbico 250 kg/m³, multiplica frete se volume >100kg, cobra excedente, transporta químicos
- Considere todas as regras aplicadas no cálculo do preço final

Considere todos os fatores: preço final, prazo, regras específicas de cada transportadora.

Retorne APENAS JSON válido:
{
  "selected_table_id": "uuid-da-tabela",
  "selected_table_name": "Nome da Tabela",
  "reasoning": "Explicação breve da escolha considerando as regras específicas"
}`;

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
                  content: 'Você é um especialista em logística. Escolha a melhor transportadora baseado nos critérios fornecidos. Retorne APENAS JSON válido.' 
                },
                { role: 'user', content: aiPrompt }
              ],
              max_tokens: 300,
              temperature: 0.3,
              response_format: { type: "json_object" }
            }),
          });

          if (!aiResponse.ok) {
            throw new Error(`AI API error: ${aiResponse.status}`);
          }

          const aiData = await aiResponse.json();
          const aiContent = aiData.choices?.[0]?.message?.content;
          const aiSelection = JSON.parse(aiContent);
          
          selectedQuote = tablesWithCoverage.find(q => q.table_id === aiSelection.selected_table_id);
          
          if (!selectedQuote) {
            // Fallback: se IA retornar ID inválido, usar primeira opção
            console.warn('[AI Quote Agent] ⚠️ IA retornou ID inválido, usando primeira opção');
            selectedQuote = tablesWithCoverage[0];
            aiReasoning = `Primeira opção disponível (IA retornou resposta inválida). Transportadora: ${selectedQuote.table_name}.`;
          } else {
            aiReasoning = aiSelection.reasoning;
            console.log('[AI Quote Agent] ✅ IA escolheu:', selectedQuote.table_name);
            console.log('[AI Quote Agent] Raciocínio:', aiReasoning);
          }
        } catch (aiError) {
          // Fallback: escolher a mais barata se IA falhar
          console.error('[AI Quote Agent] ❌ Erro na IA:', aiError.message);
          console.log('[AI Quote Agent] Usando fallback: transportadora mais barata');
          selectedQuote = tablesWithCoverage.sort((a, b) => a.final_price - b.final_price)[0];
          aiReasoning = `Selecionada opção mais econômica (erro na IA). Transportadora: ${selectedQuote.table_name}.`;
        }
      }
    }

    // ETAPA 4: MONTAR RESULTADO FINAL
    const calculationResult = {
      selected_table_id: selectedQuote.table_id,
      selected_table_name: selectedQuote.table_name,
      peso_informado: total_weight,
      peso_cubado: selectedQuote.peso_tarifavel > total_weight ? (total_volume * 1000000) / 167 : 0,
      peso_tarifavel: selectedQuote.peso_tarifavel,
      base_price: selectedQuote.base_price,
      excedente_kg: selectedQuote.excedente_kg,
      valor_excedente: selectedQuote.valor_excedente,
      delivery_days: selectedQuote.delivery_days,
      final_price: selectedQuote.final_price,
      reasoning: aiReasoning,
      all_table_quotes: allTableQuotes,
      tables_with_coverage_count: tablesWithCoverage.length
    };

    console.log('[AI Quote Agent] ==========================================');
    console.log('[AI Quote Agent] COTAÇÃO FINALIZADA COM SUCESSO');
    console.log(`[AI Quote Agent] Transportadora selecionada: ${selectedQuote.table_name}`);
    console.log(`[AI Quote Agent] Preço final: R$ ${selectedQuote.final_price.toFixed(2)}`);
    console.log(`[AI Quote Agent] Prazo: ${selectedQuote.delivery_days} dias`);
    console.log(`[AI Quote Agent] Opções com cobertura: ${tablesWithCoverage.length}/${allTableQuotes.length}`);
    console.log('[AI Quote Agent] ==========================================');

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
          additionals_applied: [
            ...(selectedQuote.excedente_kg > 0 ? [{
              type: 'excess_weight',
              value: selectedQuote.valor_excedente,
              description: `Excedente de peso: ${selectedQuote.excedente_kg.toFixed(2)}kg`
            }] : []),
            ...(selectedQuote.insurance_value && selectedQuote.insurance_value > 0 ? [{
              type: 'insurance',
              value: selectedQuote.insurance_value,
              description: `Seguro (1.3% do valor declarado)`
            }] : [])
          ],
          reasoning: calculationResult.reasoning,
          insuranceValue: selectedQuote.insurance_value || 0,
          basePrice: calculationResult.base_price,
          // Dados detalhados para histórico
          selected_table_id: calculationResult.selected_table_id,
          selected_table_name: calculationResult.selected_table_name,
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
