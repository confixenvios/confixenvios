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
            tableData.pricing_data = []; // Garantir vazio mas não pular
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
            tableData.pricing_data = []; // Garantir vazio mas não pular
          }

          const csvText = await response.text();
          const lines = csvText.split('\n').filter(l => l.trim());
          
          if (lines.length < 30) {
            console.log(`[AI Quote Agent] ⚠️ Planilha Jadlog vazia ou inválida (${lines.length} linhas)`);
            tableData.pricing_data = []; // Garantir vazio mas não pular
          }

          console.log(`[AI Quote Agent] Jadlog: Total de ${lines.length} linhas`);
          
          // A Jadlog tem 3 linhas de header:
          // Linha 1: ORIGEM
          // Linha 2: DESTINO (GO, SE, SP, etc)
          // Linha 3: REGIAO ATENDIDA (CAPITAL 1, CAPITAL 2, CAPITAL 3, etc)
          // Linha 4: PESO INICIAL (KG) e PESO FINAL (KG) nas colunas A e B
          
          if (lines.length < 5) {
            console.log(`[AI Quote Agent] ⚠️ Planilha Jadlog incompleta`);
            tableData.pricing_data = []; // Garantir vazio mas não pular
          }
          
          const row1 = lines[0].split(',').map(c => c.trim().replace(/"/g, '').toUpperCase());
          const row2 = lines[1].split(',').map(c => c.trim().replace(/"/g, '').toUpperCase());
          const row3 = lines[2].split(',').map(c => c.trim().replace(/"/g, '').toUpperCase());
          const row4 = lines[3].split(',').map(c => c.trim().replace(/"/g, ''));
          
          console.log(`[AI Quote Agent] DEBUG Jadlog headers:`);
          console.log(`Row1 (primeiras 10):`, row1.slice(0, 10));
          console.log(`Row2 (primeiras 10):`, row2.slice(0, 10));
          console.log(`Row3 (primeiras 10):`, row3.slice(0, 10));
          
          // Encontrar TODAS as colunas GO → destinationState → CAPITAL (1, 2 ou 3)
          // E também encontrar a coluna PRAZO
          interface JadlogColumn {
            columnIndex: number;
            capitalType: string;
            prazoColumnIndex?: number;
          }
          
          // Primeiro, encontrar a coluna PRAZO (deve estar no header linha 1 ou linha 3)
          let prazoColumnIndex = -1;
          for (let col = 0; col < row1.length; col++) {
            if (row1[col] === 'PRAZO' || row3[col] === 'PRAZO') {
              prazoColumnIndex = col;
              console.log(`[AI Quote Agent] ✅ Coluna PRAZO encontrada no índice ${col}`);
              break;
            }
          }
          
          const jadlogColumns: JadlogColumn[] = [];
          for (let col = 0; col < row1.length; col++) {
            if (row1[col] === destinationState && row3[col].includes('CAPITAL')) {
              jadlogColumns.push({
                columnIndex: col,
                capitalType: row3[col],
                prazoColumnIndex: prazoColumnIndex
              });
              console.log(`[AI Quote Agent] ✅ Coluna Jadlog encontrada: GO → ${destinationState} → ${row3[col]} (coluna ${col})`);
            }
          }
          
          if (jadlogColumns.length === 0) {
            console.log(`[AI Quote Agent] ⚠️ Nenhuma coluna GO → ${destinationState} → CAPITAL encontrada`);
            tableData.pricing_data = []; // Garantir vazio mas não pular
          } else {
            console.log(`[AI Quote Agent] ✅ TOTAL: ${jadlogColumns.length} colunas Jadlog encontradas para ${destinationState}`);
          }
          
          console.log(`[AI Quote Agent] Total de colunas Jadlog encontradas: ${jadlogColumns.length}`);
          
          // Extrair faixas de peso das colunas A (PESO INICIAL) e B (PESO FINAL)
          interface WeightRange {
            weight_min: number;
            weight_max: number;
            lineIndex: number;
          }
          
          const weightRanges: WeightRange[] = [];
          for (let i = 4; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
            const minStr = cols[0]; // Coluna A
            const maxStr = cols[1]; // Coluna B
            
            const min = parseFloat(minStr.replace(/[^\d,.]/g, '').replace(',', '.'));
            const max = parseFloat(maxStr.replace(/[^\d,.]/g, '').replace(',', '.'));
            
            if (!isNaN(min) && !isNaN(max) && max > 0) {
              weightRanges.push({
                weight_min: min,
                weight_max: max,
                lineIndex: i
              });
            }
          }
          
          console.log(`[AI Quote Agent] Faixas de peso Jadlog:`, weightRanges.map(r => `${r.weight_min}-${r.weight_max}kg`).slice(0, 5));
          
          // Para cada coluna e cada faixa de peso, extrair o preço E o prazo
          let recordCount = 0;
          for (const jadlogCol of jadlogColumns) {
            for (const range of weightRanges) {
              const cols = lines[range.lineIndex].split(',').map(c => c.trim().replace(/"/g, ''));
              const priceStr = cols[jadlogCol.columnIndex];
              
              // Ler prazo da linha, se a coluna PRAZO foi encontrada
              let deliveryDays = 2; // Valor padrão
              if (jadlogCol.prazoColumnIndex && jadlogCol.prazoColumnIndex >= 0) {
                const prazoStr = cols[jadlogCol.prazoColumnIndex];
                const prazo = parseInt(prazoStr);
                if (!isNaN(prazo) && prazo > 0) {
                  deliveryDays = prazo;
                }
              }
              
              if (!priceStr) continue;
              
              const price = parseFloat(priceStr.replace(/[^\d,.]/g, '').replace(',', '.'));
              if (isNaN(price) || price <= 0) continue;
              
              const pesoNaFaixa = total_weight > range.weight_min && total_weight <= range.weight_max;
              
              // Log detalhado quando há match
              if (pesoNaFaixa) {
                console.log(`[AI Quote Agent] 🎯 Jadlog MATCH: Peso ${total_weight}kg na faixa [${range.weight_min}-${range.weight_max}kg] coluna ${jadlogCol.capitalType} = R$ ${price.toFixed(2)} (prazo: ${deliveryDays} dias)`);
              }
              
              tableData.pricing_data.push({
                destination_cep: destinationState,
                weight_min: range.weight_min,
                weight_max: range.weight_max,
                price,
                delivery_days: deliveryDays, // Prazo lido da planilha
                express_delivery_days: deliveryDays,
                zone_code: `${destinationState}_${jadlogCol.capitalType}`,
                state: destinationState,
                matches_cep: true, // Jadlog não tem filtro por CEP específico
                matches_weight: pesoNaFaixa
              });
              recordCount++;
            }
          }

          console.log(`[AI Quote Agent] ✅ Jadlog: ${recordCount} registros processados da planilha`);
        } catch (error) {
          console.error(`[AI Quote Agent] Erro ao processar Jadlog Google Sheets:`, error);
        }
      }
      // TABELA ALFA: Processar Google Sheets e verificar cobertura de CEP na aba ABRANGENCIA
      else if (table.name.toLowerCase().includes('alfa') && table.source_type === 'google_sheets' && table.google_sheets_url) {
        console.log(`[AI Quote Agent] 📊 Processando Alfa do Google Sheets com verificação de CEP`);
        try {
          if (!destinationState || destinationState === 'UNKNOWN') {
            console.log(`[AI Quote Agent] ⚠️ Estado não identificado para CEP ${destination_cep}`);
            tableData.pricing_data = []; // Garantir vazio mas não pular
          }

          // Primeiro, verificar cobertura de CEP na aba ABRANGENCIA
          let abrangenciaUrl = table.google_sheets_url.replace(/gid=\d+/, 'gid=1'); // Aba ABRANGENCIA
          const spreadsheetIdMatch = table.google_sheets_url.match(/\/d\/([a-zA-Z0-9-_]+)/);
          
          if (spreadsheetIdMatch) {
            const spreadsheetId = spreadsheetIdMatch[1];
            abrangenciaUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=1`;
          }
          
          console.log(`[AI Quote Agent] Verificando cobertura Alfa CEP ${cleanDestinationCep} na aba ABRANGENCIA...`);
          
          let alfaCoberturaCep = false;
          try {
            const abrangenciaResponse = await fetch(abrangenciaUrl);
            if (abrangenciaResponse.ok) {
              const abrangenciaText = await abrangenciaResponse.text();
              const abrangenciaLines = abrangenciaText.split('\n').filter(l => l.trim());
              
              console.log(`[AI Quote Agent] 🔍 ALFA ABRANGENCIA: ${abrangenciaLines.length} linhas`);
              console.log(`[AI Quote Agent] 🔍 Primeira linha ABRANGENCIA:`, abrangenciaLines[0]);
              console.log(`[AI Quote Agent] 🔍 Segunda linha ABRANGENCIA:`, abrangenciaLines[1]);
              
              // Verificar cada linha da aba ABRANGENCIA
              for (let i = 1; i < abrangenciaLines.length; i++) {
                const cols = abrangenciaLines[i].split(',').map(c => c.trim().replace(/"/g, ''));
                const ufOrigem = cols[0];
                const ufDestino = cols[1];
                const cepInicial = cols[3]?.replace(/\D/g, '');
                const cepFinal = cols[4]?.replace(/\D/g, '');
                
                console.log(`[AI Quote Agent] 🔍 Linha ${i}: UF_ORIGEM=${ufOrigem}, UF_DESTINO=${ufDestino}, CEP_INICIAL=${cepInicial}, CEP_FINAL=${cepFinal}`);
                
                if (ufOrigem === 'GO' && ufDestino === destinationState && cepInicial && cepFinal) {
                  const cepInicialNum = parseInt(cepInicial);
                  const cepFinalNum = parseInt(cepFinal);
                  const cepDestinoNum = parseInt(cleanDestinationCep);
                  
                  console.log(`[AI Quote Agent] 🎯 MATCH GO → ${destinationState}: Verificando se ${cepDestinoNum} está entre ${cepInicialNum} e ${cepFinalNum}`);
                  
                  if (cepDestinoNum >= cepInicialNum && cepDestinoNum <= cepFinalNum) {
                    alfaCoberturaCep = true;
                    console.log(`[AI Quote Agent] ✅ Alfa ATENDE CEP ${destination_cep} (faixa: ${cepInicial}-${cepFinal})`);
                    break;
                  }
                }
              }
            } else {
              console.error(`[AI Quote Agent] ❌ Erro ao buscar ABRANGENCIA Alfa: status ${abrangenciaResponse.status}`);
            }
          } catch (err) {
            console.warn(`[AI Quote Agent] Erro ao verificar abrangência Alfa:`, err);
          }
          
          if (!alfaCoberturaCep) {
            console.log(`[AI Quote Agent] ❌ Alfa NÃO ATENDE CEP ${destination_cep}`);
            // Não usar continue - adicionar ao array com has_coverage: false
            tableData.pricing_data = []; // Garantir que não tenha dados
          }

          // Se chegou aqui, Alfa atende o CEP - buscar preços
          let sheetUrl = table.google_sheets_url;
          const gidMatch = sheetUrl.match(/[#&]gid=([0-9]+)/);
          
          if (spreadsheetIdMatch) {
            const spreadsheetId = spreadsheetIdMatch[1];
            let gid = gidMatch ? gidMatch[1] : '0';
            sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
          }
          
          const response = await fetch(sheetUrl);
          if (!response.ok) {
            console.error(`[AI Quote Agent] Falha ao buscar Alfa Sheets, status: ${response.status}`);
            tableData.pricing_data = []; // Garantir vazio mas não pular
          }

          const csvText = await response.text();
          const lines = csvText.split('\n').filter(l => l.trim());
          
          if (lines.length < 5) {
            console.log(`[AI Quote Agent] ⚠️ Planilha Alfa vazia ou inválida (${lines.length} linhas)`);
            tableData.pricing_data = []; // Garantir vazio mas não pular
          }

          console.log(`[AI Quote Agent] Alfa: Total de ${lines.length} linhas na planilha`);
          
          // Estrutura da Alfa:
          // Linha 1: UF ORIGEM (GO, GO, GO...)
          // Linha 2: UF DESTINO (DF, ES, ES, GO...)
          // Linha 3: REGIAO ATENDIDA (CAPITAL, INTERIOR, CAPITAL...)
          // Linha 4: PESO INICIAL (KG) - na coluna A
          // Linha 5: PESO FINAL (KG) - na coluna B
          // Linha 6+: preços (uma linha por faixa de peso)
          
          if (lines.length < 6) {
            console.log(`[AI Quote Agent] ⚠️ Planilha Alfa inválida (menos de 6 linhas)`);
            tableData.pricing_data = []; // Garantir vazio mas não pular
          }

          const row1 = lines[0].split(',').map(c => c.trim().replace(/"/g, '').toUpperCase());
          const row2 = lines[1].split(',').map(c => c.trim().replace(/"/g, '').toUpperCase());
          const row3 = lines[2].split(',').map(c => c.trim().replace(/"/g, '').toUpperCase());
          
          console.log(`[AI Quote Agent] DEBUG Alfa - Primeiras 10 colunas:`);
          console.log(`Row1 (UF ORIGEM):`, row1.slice(0, 10));
          console.log(`Row2 (UF DESTINO):`, row2.slice(0, 10));
          console.log(`Row3 (REGIAO):`, row3.slice(0, 10));
          
          // Encontrar TODAS as colunas GO → destinationState → CAPITAL
          interface AlfaColumn {
            columnIndex: number;
            region: string;
          }
          
          const alfaColumns: AlfaColumn[] = [];
          for (let col = 0; col < row1.length; col++) {
            if (row1[col] === 'GO' && 
                row2[col] === destinationState && 
                row3[col] === 'CAPITAL') {
              alfaColumns.push({
                columnIndex: col,
                region: row3[col]
              });
              console.log(`[AI Quote Agent] ✅ Coluna Alfa encontrada: GO → ${destinationState} → CAPITAL (coluna ${col})`);
            }
          }
          
          if (alfaColumns.length === 0) {
            console.log(`[AI Quote Agent] ⚠️ Nenhuma coluna GO → ${destinationState} → CAPITAL encontrada na Alfa`);
            // Não usar continue - deixar tableData.pricing_data vazio
          }

          console.log(`[AI Quote Agent] Total de colunas Alfa: ${alfaColumns.length}`);
          
          // Extrair faixas de peso das linhas 4+ 
          // Coluna A (índice 0): PESO INICIAL (KG)
          // Coluna B (índice 1): PESO FINAL (KG)
          // Coluna E+ (índice 4+): Preços para cada destino
          
          interface WeightRange {
            weight_min: number;
            weight_max: number;
            lineIndex: number;
          }
          
          const weightRanges: WeightRange[] = [];
          
          for (let i = 3; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
            const minStr = cols[0]; // Coluna A (PESO INICIAL)
            const maxStr = cols[1]; // Coluna B (PESO FINAL)
            
            if (!minStr || minStr.toUpperCase().includes('ADICIONAL')) break;
            
            const min = parseFloat(minStr.replace(/[^\d,.]/g, '').replace(',', '.'));
            const max = parseFloat(maxStr.replace(/[^\d,.]/g, '').replace(',', '.'));
            
            if (isNaN(min) || isNaN(max) || max <= 0) continue;
            
            weightRanges.push({
              weight_min: min,
              weight_max: max,
              lineIndex: i
            });
          }
          
          console.log(`[AI Quote Agent] Faixas de peso Alfa:`, weightRanges.map(r => `${r.weight_min}-${r.weight_max}kg`).slice(0, 5));
          
          // Para cada coluna Alfa e cada faixa de peso, extrair o preço
          let recordCount = 0;
          for (const alfaCol of alfaColumns) {
            for (const range of weightRanges) {
              const cols = lines[range.lineIndex].split(',').map(c => c.trim().replace(/"/g, ''));
              const priceStr = cols[alfaCol.columnIndex];
              
              if (!priceStr) continue;
              
              const price = parseFloat(priceStr.replace(/[^\d,.]/g, '').replace(',', '.'));
              if (isNaN(price) || price <= 0) continue;
              
              // Para 10kg: deve estar na faixa [10-20], não [5-10]
              // Portanto: peso > min E peso <= max
              const pesoNaFaixa = total_weight > range.weight_min && total_weight <= range.weight_max;
              
              // Log detalhado quando há match
              if (pesoNaFaixa) {
                console.log(`[AI Quote Agent] 🎯 Alfa MATCH: Peso ${total_weight}kg na faixa [${range.weight_min}-${range.weight_max}kg] = R$ ${price.toFixed(2)}`);
              }
              
              tableData.pricing_data.push({
                destination_cep: destinationState,
                weight_min: range.weight_min,
                weight_max: range.weight_max,
                price,
                delivery_days: 5, // Alfa prazo padrão
                express_delivery_days: 4,
                zone_code: `${destinationState}_CAPITAL`,
                state: destinationState,
                matches_cep: true, // Alfa não tem filtro por CEP específico
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
            tableData.pricing_data = []; // Garantir vazio mas não pular
          }

          if (!zones || zones.length === 0) {
            console.log(`[AI Quote Agent] ⚠️ Nenhuma zona Magalog encontrada para CEP ${destination_cep}`);
            tableData.pricing_data = []; // Garantir vazio mas não pular
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

      // SEMPRE adicionar tabela ao array, mesmo sem dados (para mostrar todas as opções)
      tablesWithData.push(tableData);
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
          // USAR APENAS O PREÇO DA TABELA - sem adicionar taxas extras
          // Os preços na tabela já incluem todos os custos necessários
          let base_price = priceRecord.price;
          
          console.log(`[AI Quote Agent] 📋 ${table.name} - PREÇO DA TABELA: R$ ${base_price.toFixed(2)} para ${peso_tarifavel}kg`);
          
          // Calcular seguro (1.3% do valor da mercadoria)
          let insurance_value = 0;
          if (merchandise_value && merchandise_value > 0) {
            insurance_value = merchandise_value * 0.013; // 1.3%
            console.log(`[AI Quote Agent] 🛡️ Seguro calculado: R$ ${insurance_value.toFixed(2)} (1.3% de R$ ${merchandise_value.toFixed(2)})`);
          }
          
          const final_price = base_price + insurance_value;

          console.log(`[AI Quote Agent] 💰 ${table.name} - CÁLCULO FINAL:`);
          console.log(`[AI Quote Agent]    Preço Base (tabela): R$ ${base_price.toFixed(2)}`);
          console.log(`[AI Quote Agent]    Seguro (1.3%): R$ ${insurance_value.toFixed(2)}`);
          console.log(`[AI Quote Agent]    ════════════════════════════`);
          console.log(`[AI Quote Agent]    TOTAL: R$ ${final_price.toFixed(2)}`);
          console.log(`[AI Quote Agent]    Prazo: ${priceRecord.delivery_days} dias`);

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
            excedente_kg: 0,
            valor_excedente: 0,
            peso_adicional_taxa: 0,
            insurance_value,
            final_price,
            delivery_days: priceRecord.delivery_days,
            peso_tarifavel,
            has_coverage: true,
            cubic_meter_equivalent: table.cubic_meter_kg_equivalent,
            transports_chemicals,
            dimension_rules: dimension_rules, // Manter como array, não converter para string
            volume_weight_rule: table.distance_multiplier_threshold_km ? 
              `Multiplica ${table.distance_multiplier_value}x se volume >${table.distance_multiplier_threshold_km}kg` : 
              null
          });
          
          console.log(`[AI Quote Agent] ${table.name} - Cobertura ENCONTRADA para CEP ${destination_cep} e peso ${peso_tarifavel}kg`);
          console.log(`  - Equivalência cúbica: ${table.cubic_meter_kg_equivalent} kg/m³`);
          if (dimension_rules.length > 0) {
            console.log(`  - Restrições de dimensões: ${dimension_rules.join('; ')}`);
          }
          console.log(`  - Preço da tabela: R$ ${base_price.toFixed(2)}`);
          console.log(`  - Seguro: R$ ${insurance_value.toFixed(2)}`);
          console.log(`  - Preço final: R$ ${final_price.toFixed(2)}`);
          console.log(`  - ${transports_chemicals}`);
        } else {
          // Tabela não tem cobertura para este CEP/peso
          console.log(`[AI Quote Agent] ${table.name} - Sem cobertura para CEP ${destination_cep} e peso ${peso_tarifavel}kg`);
          
          allTableQuotes.push({
            table_id: table.id,
            table_name: table.name,
            base_price: 0,
            excedente_kg: 0,
            valor_excedente: 0,
            peso_adicional_taxa: 0,
            insurance_value: 0,
            final_price: 0,
            delivery_days: 0,
            peso_tarifavel: 0,
            has_coverage: false,
            cubic_meter_equivalent: table.cubic_meter_kg_equivalent || 0,
            transports_chemicals: 'Sem cobertura para este CEP',
            dimension_rules: []
          });
        }
      } catch (error) {
        console.error(`[AI Quote Agent] Erro ao calcular preço para ${table.name}:`, error);
        
        allTableQuotes.push({
          table_id: table.id,
          table_name: table.name,
          base_price: 0,
          excedente_kg: 0,
          valor_excedente: 0,
          peso_adicional_taxa: 0,
          insurance_value: 0,
          final_price: 0,
          delivery_days: 0,
          peso_tarifavel: 0,
          has_coverage: false,
          cubic_meter_equivalent: table.cubic_meter_kg_equivalent || 0,
          transports_chemicals: 'Erro ao processar',
          dimension_rules: [],
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
      console.log(`[AI Quote Agent] Configuração: modelo=${config.model || 'gpt-4o-mini'}, temperature=${config.temperature || 0.3}`);
      
      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
      if (!OPENAI_API_KEY) {
        // Fallback: escolher melhor custo-benefício (mais barata com melhor prazo)
        console.warn('[AI Quote Agent] ⚠️ OpenAI API Key não encontrada, usando fallback (melhor custo-benefício)');
        
        // Ordenar por: 1) Preço (crescente), 2) Prazo (crescente)
        const sortedOptions = tablesWithCoverage.sort((a, b) => {
          const priceDiff = a.final_price - b.final_price;
          if (Math.abs(priceDiff) > 5) return priceDiff; // Se diferença > R$5, priorizar preço
          return a.delivery_days - b.delivery_days; // Senão, priorizar prazo
        });
        
        selectedQuote = sortedOptions[0];
        aiReasoning = `Melhor custo-benefício entre ${tablesWithCoverage.length} transportadoras (IA indisponível): ${selectedQuote.table_name} - R$ ${selectedQuote.final_price.toFixed(2)} em ${selectedQuote.delivery_days} dias.`;
      } else {
        try {
          // Preparar análise detalhada de cada transportadora
          const detailedAnalysis = tablesWithCoverage.map(q => ({
            nome: q.table_name,
            preco_final: `R$ ${q.final_price.toFixed(2)}`,
            prazo_dias: q.delivery_days,
            peso_tarifavel: `${q.peso_tarifavel}kg`,
            preco_base_tabela: `R$ ${q.base_price.toFixed(2)}`,
            seguro: `R$ ${q.insurance_value?.toFixed(2) || '0.00'}`,
            regras_aplicadas: [
              q.cubic_meter_equivalent ? `Peso cúbico: ${q.cubic_meter_equivalent}kg/m³` : null,
              q.transports_chemicals ? 'Transporta químicos' : 'NÃO transporta químicos',
              q.dimension_rules && q.dimension_rules.length > 0 ? q.dimension_rules.join('; ') : null
            ].filter(Boolean)
          }));
          
          const systemPrompt = config.system_prompt || 
            'Você é um especialista em logística que escolhe a melhor transportadora. REGRA ABSOLUTA: Use apenas valores fornecidos, nunca invente preços.';
          
          const aiPrompt = `Você é um especialista em logística. Escolha a MELHOR transportadora entre as opções disponíveis.

DADOS DO ENVIO:
- CEP Origem: ${origin_cep}
- CEP Destino: ${destination_cep}
- Peso Total: ${total_weight}kg
- Valor da Mercadoria: R$ ${merchandise_value.toFixed(2)}
- Prioridade Configurada: ${config.priority_mode}

TRANSPORTADORAS DISPONÍVEIS (TODAS COM COBERTURA):
${JSON.stringify(detailedAnalysis, null, 2)}

CRITÉRIOS DE DECISÃO:
${config.priority_mode === 'fastest' ? 
  '- PRIORIDADE MÁXIMA: Menor prazo de entrega (delivery_days)\n- SECUNDÁRIO: Preço competitivo' :
config.priority_mode === 'cheapest' ?
  '- PRIORIDADE MÁXIMA: Menor preço final (preco_final)\n- SECUNDÁRIO: Prazo razoável' :
  '- PRIORIDADE: Equilibrar preço e prazo para melhor custo-benefício\n- Considerar diferença de dias vs diferença de preço'
}

CONSIDERAÇÕES ESPECÍFICAS:
${config.consider_chemical_transport ? '- Cliente TRANSPORTA produtos químicos: dar preferência a transportadoras que aceitam' : '- Cliente NÃO transporta químicos'}
${config.prefer_no_dimension_restrictions ? '- PREFERIR transportadoras sem muitas restrições de dimensões' : '- Restrições de dimensões não são um problema'}
- Peso cúbico já foi calculado automaticamente para cada transportadora
- Seguro (1.3%) já está incluído no preço final
- Considere as regras específicas aplicadas (listadas em regras_aplicadas)

INSTRUÇÕES FINAIS:
1. **REGRA CRÍTICA**: Use APENAS os valores de "preco_final" fornecidos. NUNCA invente, calcule ou estime valores diferentes. Os preços vêm direto das tabelas oficiais e já incluem seguro.
2. Analise TODOS os fatores listados acima
3. Para prioridade "balanced", considere se vale pagar R$ X a mais para economizar Y dias
4. Retorne APENAS um JSON válido no formato abaixo
5. Seja específico no raciocínio, mencionando os valores EXATOS de "preco_final" que aparecem nas opções

FORMATO DE RESPOSTA (JSON válido):
{
  "selected_table_name": "Nome da Transportadora Escolhida",
  "reasoning": "Explicação detalhada: [Transportadora] foi escolhida porque [razão específica com números]. Comparado com [outras opções], oferece [vantagem]. Prioridade ${config.priority_mode} foi considerada."
}`;

          const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: config.model || 'gpt-4o-mini',
              messages: [
                { 
                  role: 'system', 
                  content: systemPrompt
                },
                { role: 'user', content: aiPrompt }
              ],
              max_tokens: config.max_tokens || 500,
              temperature: config.temperature || 0.3,
              response_format: { type: "json_object" }
            }),
          });

          if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error('[AI Quote Agent] ❌ Erro na API da OpenAI:', errorText);
            throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
          }

          const aiData = await aiResponse.json();
          console.log('[AI Quote Agent] ✅ Resposta da IA recebida:', JSON.stringify(aiData, null, 2));
          
          const aiContent = aiData.choices?.[0]?.message?.content;
          if (!aiContent) {
            throw new Error('IA não retornou conteúdo válido');
          }
          
          const aiSelection = JSON.parse(aiContent);
          
          selectedQuote = tablesWithCoverage.find(q => q.table_name === aiSelection.selected_table_name);
          
          if (!selectedQuote) {
            // Fallback: se IA retornar nome inválido, usar primeira opção
            console.warn('[AI Quote Agent] ⚠️ IA retornou nome inválido:', aiSelection.selected_table_name);
            console.warn('[AI Quote Agent] Transportadoras disponíveis:', tablesWithCoverage.map(q => q.table_name));
            selectedQuote = tablesWithCoverage[0];
            aiReasoning = `Primeira opção disponível (IA retornou resposta inválida: "${aiSelection.selected_table_name}"). Transportadora: ${selectedQuote.table_name}.`;
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
          aiReasoning = `Selecionada opção mais econômica (erro na IA: ${aiError.message}). Transportadora: ${selectedQuote.table_name}.`;
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
    console.log(`[AI Quote Agent] ID da tabela: ${selectedQuote.table_id}`);
    console.log(`[AI Quote Agent] Preço base: R$ ${selectedQuote.base_price.toFixed(2)}`);
    console.log(`[AI Quote Agent] Excedente: R$ ${selectedQuote.valor_excedente?.toFixed(2) || '0.00'}`);
    console.log(`[AI Quote Agent] Seguro: R$ ${selectedQuote.insurance_value?.toFixed(2) || '0.00'}`);
    console.log(`[AI Quote Agent] Preço final CORRETO: R$ ${selectedQuote.final_price.toFixed(2)}`);
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
      table_id: calculationResult.selected_table_id,
      base_price: calculationResult.base_price,
      final_price: calculationResult.final_price,
      delivery_days: calculationResult.delivery_days,
      reasoning: calculationResult.reasoning
    });

    // DEBUG: Verificar se o preço retornado é o correto
    console.log('[AI Quote Agent] 🔍 VERIFICAÇÃO FINAL ANTES DE RETORNAR:');
    console.log(`[AI Quote Agent] calculationResult.selected_table_name: ${calculationResult.selected_table_name}`);
    console.log(`[AI Quote Agent] calculationResult.final_price: R$ ${calculationResult.final_price.toFixed(2)}`);
    console.log(`[AI Quote Agent] calculationResult.delivery_days: ${calculationResult.delivery_days} dias`);
    console.log(`[AI Quote Agent] selectedQuote.table_name: ${selectedQuote.table_name}`);
    console.log(`[AI Quote Agent] selectedQuote.final_price: R$ ${selectedQuote.final_price.toFixed(2)}`);
    
    // Verificação crítica: garantir que estamos retornando o preço da tabela selecionada
    if (calculationResult.final_price !== selectedQuote.final_price) {
      console.error('[AI Quote Agent] ⚠️⚠️⚠️ ERRO CRÍTICO: Preço final diferente do selectedQuote!');
      console.error(`[AI Quote Agent] Corrigindo: ${calculationResult.final_price} → ${selectedQuote.final_price}`);
      calculationResult.final_price = selectedQuote.final_price;
    }
    
    const responsePayload = {
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
        valor_excedente: calculationResult.valor_excedente,
        // Todas as opções analisadas para comparação
        all_table_quotes: calculationResult.all_table_quotes,
        tables_with_coverage_count: calculationResult.tables_with_coverage_count
      },
    };
    
    console.log('[AI Quote Agent] 📤 PAYLOAD DE RESPOSTA:', JSON.stringify(responsePayload, null, 2));
    
    return new Response(
      JSON.stringify(responsePayload),
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
