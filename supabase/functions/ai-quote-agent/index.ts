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
        max_length_cm: table.max_length_cm,
        max_width_cm: table.max_width_cm,
        max_height_cm: table.max_height_cm,
        max_dimension_sum_cm: (table as any).max_dimension_sum_cm,
        distance_multiplier_threshold_km: (table as any).distance_multiplier_threshold_km,
        distance_multiplier_value: (table as any).distance_multiplier_value,
        chemical_classes_enabled: (table as any).chemical_classes_enabled,
        transports_chemical_classes: (table as any).transports_chemical_classes,
        peso_adicional_30_50kg: (table as any).peso_adicional_30_50kg || 55.00,
        peso_adicional_acima_50kg: (table as any).peso_adicional_acima_50kg || 100.00,
        alfa_cubic_weight_reference: (table as any).alfa_cubic_weight_reference || 250,
        alfa_distance_threshold_km: (table as any).alfa_distance_threshold_km || 100,
        alfa_distance_multiplier: (table as any).alfa_distance_multiplier || 2,
        alfa_weight_fraction_kg: (table as any).alfa_weight_fraction_kg || 100,
        alfa_weight_fraction_charge: (table as any).alfa_weight_fraction_charge || 5.50,
        alfa_chemical_classes: (table as any).alfa_chemical_classes || '8/9',
        pricing_data: []
      };

      // TABELA JADLOG: Processar Google Sheets com estrutura específica
      if (table.name.toLowerCase().includes('jadlog') && table.source_type === 'google_sheets' && table.google_sheets_url) {
        console.log(`[AI Quote Agent] 📊 Processando Jadlog do Google Sheets para estado ${destinationState}`);
        try {
          if (!destinationState || destinationState === 'UNKNOWN') {
            console.log(`[AI Quote Agent] ⚠️ Estado não identificado para CEP ${destination_cep}`);
            continue;
          }

          let sheetUrl = table.google_sheets_url;
          const spreadsheetIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
          const gidMatch = sheetUrl.match(/[#&]gid=([0-9]+)/);
          
          if (spreadsheetIdMatch) {
            const spreadsheetId = spreadsheetIdMatch[1];
            let gid = gidMatch ? gidMatch[1] : '0';
            sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
          }
          
          const response = await fetch(sheetUrl);
          if (!response.ok) {
            console.error(`[AI Quote Agent] Falha ao buscar Jadlog Sheets, status: ${response.status}`);
            continue;
          }

          const csvText = await response.text();
          const lines = csvText.split('\n').filter(l => l.trim());
          
          if (lines.length < 30) {
            console.log(`[AI Quote Agent] ⚠️ Planilha Jadlog vazia ou inválida (${lines.length} linhas)`);
            continue;
          }

          // Procurar linha que contém ORIGEM, DESTINO (header real)
          let headerLineIndex = -1;
          for (let i = 0; i < Math.min(30, lines.length); i++) {
            const line = lines[i].toUpperCase();
            if (line.includes('ORIGEM') && line.includes('DESTINO') && line.includes('REGIAO')) {
              headerLineIndex = i;
              console.log(`[AI Quote Agent] Header Jadlog encontrado na linha ${i + 1}`);
              break;
            }
          }
          
          if (headerLineIndex === -1) {
            console.log(`[AI Quote Agent] ⚠️ Linha de header ORIGEM/DESTINO não encontrada na Jadlog`);
            continue;
          }

          const headers = lines[headerLineIndex].split(',').map(h => h.trim().replace(/"/g, ''));
          console.log(`[AI Quote Agent] Headers Jadlog: ${headers.length} colunas`);
          console.log(`[AI Quote Agent] Primeiras 5 colunas:`, headers.slice(0, 5));
          console.log(`[AI Quote Agent] Procurando coluna com: GO→${destinationState} ou GO ${destinationState}`);
          
          // Procurar coluna GO → SP CAPITAL 1
          let stateColumnIndex = -1;
          for (let i = 0; i < headers.length; i++) {
            const h = headers[i].toUpperCase();
            
            // Aceitar tanto "GO→SP" quanto "GO SP"
            const hasGO = h.includes('GO');
            const hasState = h.includes(destinationState);
            const hasCapital = h.includes('CAPITAL');
            const hasOne = h.includes('1');
            
            if (hasGO && hasState && hasCapital && hasOne) {
              stateColumnIndex = i;
              console.log(`[AI Quote Agent] ✅ Coluna Jadlog encontrada: "${headers[i]}" (index ${i})`);
              break;
            }
          }
          
          if (stateColumnIndex === -1) {
            console.log(`[AI Quote Agent] ⚠️ Coluna GO→${destinationState} CAPITAL 1 não encontrada na Jadlog`);
            console.log(`[AI Quote Agent] Amostra de headers:`, headers.slice(0, 20));
            continue;
          }

          // Processar linhas de peso (próximas linhas após header)
          let recordCount = 0;
          const dataStartLine = headerLineIndex + 1;
          
          for (let i = dataStartLine; i < lines.length && recordCount < 50; i++) {
            const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
            
            const weightStart = cols[0]; // Coluna A
            const weightEnd = cols[1];   // Coluna B
            const priceStr = cols[stateColumnIndex];
            
            if (!weightStart || !weightEnd || !priceStr) continue;
            
            const price = parseFloat(priceStr.replace(/[^\d,.]/g, '').replace(',', '.'));
            if (isNaN(price) || price <= 0) continue;
            
            const weight_min = parseFloat(weightStart);
            const weight_max = parseFloat(weightEnd);
            
            if (isNaN(weight_min) || isNaN(weight_max)) continue;
            
            // SP Capital 1: CEPs 01000-000 até 05999-999
            const cepInicio = '01000000';
            const cepFim = '05999999';
            
            const cepNumerico = parseInt(cleanDestinationCep);
            const cepInicioNum = parseInt(cepInicio);
            const cepFimNum = parseInt(cepFim);
            
            const cepNaFaixa = cepNumerico >= cepInicioNum && cepNumerico <= cepFimNum;
            const pesoNaFaixa = total_weight >= weight_min && total_weight <= weight_max;
            
            tableData.pricing_data.push({
              destination_cep: `${cepInicio}-${cepFim}`,
              cep_start: cepInicio,
              cep_end: cepFim,
              weight_min,
              weight_max,
              price,
              delivery_days: 3,
              express_delivery_days: 2,
              zone_code: `${destinationState}_CAPITAL_1`,
              state: destinationState,
              matches_cep: cepNaFaixa,
              matches_weight: pesoNaFaixa
            });
            recordCount++;
          }

          console.log(`[AI Quote Agent] ✅ Jadlog: ${recordCount} registros processados da planilha`);
        } catch (error) {
          console.error(`[AI Quote Agent] Erro ao processar Jadlog Google Sheets:`, error);
        }
      }
      // TABELA ALFA: Processar Google Sheets com faixas de CEP por linha
      else if (table.name.toLowerCase().includes('alfa') && table.source_type === 'google_sheets' && table.google_sheets_url) {
        console.log(`[AI Quote Agent] 📊 Processando Alfa do Google Sheets (estrutura: múltiplas faixas de CEP)`);
        try {
          if (!destinationState || destinationState === 'UNKNOWN') {
            console.log(`[AI Quote Agent] ⚠️ Estado não identificado para CEP ${destination_cep}`);
            continue;
          }

          let sheetUrl = table.google_sheets_url;
          const spreadsheetIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
          const gidMatch = sheetUrl.match(/[#&]gid=([0-9]+)/);
          
          if (spreadsheetIdMatch) {
            const spreadsheetId = spreadsheetIdMatch[1];
            let gid = gidMatch ? gidMatch[1] : '0';
            sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
          }
          
          const response = await fetch(sheetUrl);
          if (!response.ok) {
            console.error(`[AI Quote Agent] Falha ao buscar Alfa Sheets, status: ${response.status}`);
            continue;
          }

          const csvText = await response.text();
          const lines = csvText.split('\n').filter(l => l.trim());
          
          if (lines.length < 5) {
            console.log(`[AI Quote Agent] ⚠️ Planilha Alfa vazia ou inválida (${lines.length} linhas)`);
            continue;
          }

          console.log(`[AI Quote Agent] Alfa: Total de ${lines.length} linhas na planilha`);
          
          // Estrutura da Alfa:
          // Linha 1: UF ORIGEM (GO, GO, GO...)
          // Linha 2: UF DESTINO (DF, ES, ES, GO...)
          // Linha 3: REGIAO ATENDIDA (CAPITAL, INTERIOR, CAPITAL...)
          // Linha 4: INICIAL (KG) - peso mínimo de cada faixa
          // Linha 5: PESO FINAL (KG) - peso máximo de cada faixa
          // Linha 6+: dados (cep_inicio, cep_fim, preços por coluna)
          
          if (lines.length < 6) {
            console.log(`[AI Quote Agent] ⚠️ Planilha Alfa inválida (menos de 6 linhas)`);
            continue;
          }

          const row1 = lines[0].split(',').map(c => c.trim().replace(/"/g, '').toUpperCase());
          const row2 = lines[1].split(',').map(c => c.trim().replace(/"/g, '').toUpperCase());
          const row3 = lines[2].split(',').map(c => c.trim().replace(/"/g, '').toUpperCase());
          const row4 = lines[3].split(',').map(c => c.trim().replace(/"/g, ''));
          const row5 = lines[4].split(',').map(c => c.trim().replace(/"/g, ''));
          
          // Encontrar coluna: GO → destinationState → CAPITAL
          let targetColumnIndex = -1;
          for (let col = 0; col < row1.length; col++) {
            if (row1[col] === 'GO' && 
                row2[col] === destinationState && 
                row3[col] === 'CAPITAL') {
              targetColumnIndex = col;
              console.log(`[AI Quote Agent] ✅ Coluna encontrada: GO → ${destinationState} → CAPITAL (coluna ${col})`);
              break;
            }
          }
          
          if (targetColumnIndex === -1) {
            console.log(`[AI Quote Agent] ⚠️ Coluna GO → ${destinationState} → CAPITAL não encontrada`);
            continue;
          }

          // Extrair faixas de peso
          interface WeightRange {
            columnIndex: number;
            weight_min: number;
            weight_max: number;
          }
          
          const weightRanges: WeightRange[] = [];
          for (let col = 0; col < row4.length; col++) {
            if (row1[col] === 'GO' && row2[col] === destinationState && row3[col] === 'CAPITAL') {
              const minStr = row4[col];
              const maxStr = row5[col];
              const min = parseFloat(minStr.replace(/[^\d,.]/g, '').replace(',', '.'));
              const max = parseFloat(maxStr.replace(/[^\d,.]/g, '').replace(',', '.'));
              
              if (!isNaN(min) && !isNaN(max) && max > 0) {
                weightRanges.push({
                  columnIndex: col,
                  weight_min: min,
                  weight_max: max
                });
              }
            }
          }
          
          console.log(`[AI Quote Agent] Faixas de peso encontradas:`, weightRanges.map(r => `${r.weight_min}-${r.weight_max}kg`));
          
          // Processar linhas de dados (a partir da linha 6, que é linha[5] no array)
          let recordCount = 0;
          for (let i = 5; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
            
            // Primeiras colunas são metadados (varia por planilha, mas geralmente incluem CEP)
            // Tentar identificar colunas de CEP inicio/fim nas primeiras colunas
            let cepInicio = '';
            let cepFim = '';
            
            // Buscar padrão de CEP (5 ou 8 dígitos)
            for (let c = 0; c < Math.min(10, cols.length); c++) {
              const cleaned = cols[c].replace(/\D/g, '');
              if (cleaned.length >= 5 && cleaned.length <= 8) {
                if (!cepInicio) {
                  cepInicio = cleaned;
                } else if (!cepFim && cleaned !== cepInicio) {
                  cepFim = cleaned;
                  break;
                }
              }
            }
            
            if (!cepInicio || !cepFim) continue;
            
            // Verificar se CEP buscado está nesta faixa
            const cepNumerico = parseInt(cleanDestinationCep);
            const cepInicioNum = parseInt(cepInicio);
            const cepFimNum = parseInt(cepFim);
            
            if (isNaN(cepInicioNum) || isNaN(cepFimNum)) continue;
            
            const cepNaFaixa = cepNumerico >= cepInicioNum && cepNumerico <= cepFimNum;
            
            // Para cada faixa de peso, pegar o preço da coluna correspondente
            for (const range of weightRanges) {
              const priceStr = cols[range.columnIndex];
              
              if (!priceStr) continue;
              
              const price = parseFloat(priceStr.replace(/[^\d,.]/g, '').replace(',', '.'));
              if (isNaN(price) || price <= 0) continue;
              
              const pesoNaFaixa = total_weight > range.weight_min && total_weight <= range.weight_max;
              
              tableData.pricing_data.push({
                destination_cep: `${cepInicio}-${cepFim}`,
                cep_start: cepInicio,
                cep_end: cepFim,
                weight_min: range.weight_min,
                weight_max: range.weight_max,
                price,
                delivery_days: 4,
                express_delivery_days: 3,
                zone_code: `${destinationState}_CAPITAL`,
                state: destinationState,
                matches_cep: cepNaFaixa,
                matches_weight: pesoNaFaixa
              });
              recordCount++;
            }
          }

          console.log(`[AI Quote Agent] ✅ Alfa: ${recordCount} registros processados da planilha`);
        } catch (error) {
          console.error(`[AI Quote Agent] Erro ao processar Alfa Google Sheets:`, error);
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
        // ALFA: usa 250 kg/m³, outras usam o configurado (ex: Jadlog 167 kg/m³)
        let cubic_equivalent = table.cubic_meter_kg_equivalent;
        if (table.name.toLowerCase().includes('alfa')) {
          cubic_equivalent = table.alfa_cubic_weight_reference || 250;
        }
        const peso_cubado = total_volume * cubic_equivalent;
        const peso_tarifavel = Math.max(total_weight, peso_cubado);
        
        console.log(`[AI Quote Agent] Buscando preço em ${table.name}:`);
        console.log(`  - CEP: ${destination_cep}, Peso: ${peso_tarifavel}kg (Cubagem: ${cubic_equivalent} kg/m³)`);
        
        // VALIDAÇÃO DE DIMENSÕES (Magalog/Jadlog/outras transportadoras)
        let dimensions_valid = true;
        let dimension_violation = '';
        
        if (table.max_length_cm || table.max_width_cm || table.max_height_cm || (table as any).max_dimension_sum_cm) {
          for (const vol of volumes_data) {
            // JADLOG: Validações específicas
            if (table.name.toLowerCase().includes('jadlog')) {
              // Verificar dimensão individual máxima (170cm)
              const maxDimension = Math.max(vol.length, vol.width, vol.height);
              if (table.max_length_cm && maxDimension > table.max_length_cm) {
                dimensions_valid = false;
                dimension_violation = `Dimensão individual ${maxDimension}cm excede máximo de ${table.max_length_cm}cm`;
                break;
              }
              
              // Verificar soma das dimensões (240cm)
              if ((table as any).max_dimension_sum_cm) {
                const dimension_sum = vol.length + vol.width + vol.height;
                if (dimension_sum > (table as any).max_dimension_sum_cm) {
                  dimensions_valid = false;
                  dimension_violation = `Soma das dimensões ${dimension_sum}cm (${vol.length}+${vol.width}+${vol.height}) excede máximo de ${(table as any).max_dimension_sum_cm}cm`;
                  break;
                }
              }
            }
            // OUTRAS TRANSPORTADORAS: Validações padrão
            else {
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
          
          // CONSIDERAÇÃO 2 (Jadlog): Taxas adicionais por peso
          let peso_adicional_taxa = 0;
          if (table.name.toLowerCase().includes('jadlog')) {
            if (peso_tarifavel >= 30 && peso_tarifavel <= 50) {
              peso_adicional_taxa = table.peso_adicional_30_50kg || 55.00;
              console.log(`[AI Quote Agent] ${table.name} - Taxa adicional 30-50kg: R$ ${peso_adicional_taxa.toFixed(2)}`);
            } else if (peso_tarifavel > 50) {
              peso_adicional_taxa = table.peso_adicional_acima_50kg || 100.00;
              console.log(`[AI Quote Agent] ${table.name} - Taxa adicional >50kg: R$ ${peso_adicional_taxa.toFixed(2)}`);
            }
          }
          
          // CONSIDERAÇÃO 3 (Alfa): Acrescentar taxa a cada fração de 100kg
          let alfa_weight_fraction_charge = 0;
          if (table.name.toLowerCase().includes('alfa')) {
            const alfa_fraction_kg = table.alfa_weight_fraction_kg || 100;
            const alfa_charge_per_fraction = table.alfa_weight_fraction_charge || 5.50;
            
            if (peso_tarifavel > 0) {
              const num_fractions = Math.ceil(peso_tarifavel / alfa_fraction_kg);
              alfa_weight_fraction_charge = num_fractions * alfa_charge_per_fraction;
              console.log(`[AI Quote Agent] ${table.name} - CONSIDERAÇÃO 3: ${peso_tarifavel}kg em ${num_fractions} frações de ${alfa_fraction_kg}kg = R$ ${alfa_weight_fraction_charge.toFixed(2)}`);
            }
          }
          
          // CONSIDERAÇÃO 2 (Alfa): Multiplicador de distância por volume >100km
          // CONSIDERAÇÃO 2 (Diolog): Se algum VOLUME individual pesar mais de X kg, multiplicar frete
          let volume_weight_multiplier_applied = false;
          let alfa_distance_multiplier_applied = false;
          
          if (table.name.toLowerCase().includes('alfa')) {
            // Para Alfa: aplicar multiplicador se houver volumes com distância >100km
            // Nota: Isso requer dados de distância que não temos no contexto atual
            // Por hora, aplicamos baseado no peso como proxy
            const alfa_threshold_km = table.alfa_distance_threshold_km || 100;
            const alfa_multiplier = table.alfa_distance_multiplier || 2;
            
            // TODO: Implementar lógica de distância real quando disponível
            // Por ora, consideramos volume pesado como proxy de distância longa
            const hasHeavyVolume = volumes_data.some((vol: any) => vol.weight > alfa_threshold_km);
            
            if (hasHeavyVolume) {
              base_price = base_price * alfa_multiplier;
              alfa_distance_multiplier_applied = true;
              console.log(`[AI Quote Agent] ${table.name} - CONSIDERAÇÃO 2 aplicada: Volume pesado detectado (proxy distância >${alfa_threshold_km}km), frete multiplicado por ${alfa_multiplier}x`);
            }
          } else if (table.distance_multiplier_threshold_km && table.distance_multiplier_value) {
            // Verificar se algum volume individual excede o limite de peso (Diolog)
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
          
          const final_price = base_price + valor_excedente + peso_adicional_taxa + alfa_weight_fraction_charge + insurance_value;

          // CONSIDERAÇÃO 4 (Diolog/Alfa): Informar se transporta químicos
          let transports_chemicals = 'Não transporta químicos';
          if (table.name.toLowerCase().includes('alfa')) {
            transports_chemicals = `Transporta químicos classes ${table.alfa_chemical_classes || '8/9'}`;
          } else if (table.chemical_classes_enabled) {
            transports_chemicals = `Transporta químicos classes ${table.transports_chemical_classes}`;
          }
          
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
            peso_adicional_taxa,
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
          if (peso_adicional_taxa > 0) {
            console.log(`  - Taxa adicional peso: R$ ${peso_adicional_taxa.toFixed(2)} (CONSIDERAÇÃO 2 Jadlog)`);
          }
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
