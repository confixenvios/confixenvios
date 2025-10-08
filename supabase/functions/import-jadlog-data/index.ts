import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JadlogPricingRow {
  origin_state: string;
  destination_state: string;
  tariff_type: string;
  weight_min: number;
  weight_max: number;
  price: number;
}

interface JadlogZoneRow {
  zone_code: string;
  state: string;
  zone_type: string;
  tariff_type: string;
  cep_start?: string;
  cep_end?: string;
  delivery_days: number;
  express_delivery_days: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // URL da planilha do Google Sheets
    const GOOGLE_SHEETS_ID = '1GPAhV94gwZWkVGsO-ribwjAJNQJGAF2RAX79WXOajtc';
    const xlsxUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_ID}/export?format=xlsx`;
    
    console.log('🔍 Iniciando importação da tabela Jadlog via XLSX...');
    console.log('📥 Baixando planilha de:', xlsxUrl);
    
    // Import XLSX library (Deno-compatible)
    const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');
    
    // Buscar planilha como XLSX
    const response = await fetch(xlsxUrl);
    if (!response.ok) {
      throw new Error(`Erro ao acessar Google Sheets: ${response.status} - ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    
    console.log(`📊 Abas encontradas (${workbook.SheetNames.length}):`, workbook.SheetNames);
    
    let importedPricing = 0;
    let importedZones = 0;
    const processedSheets: string[] = [];
    
    // Limpar tabelas ANTES de processar qualquer aba
    console.log('🗑️ Limpando dados antigos de jadlog_pricing e jadlog_zones...');
    await supabaseClient.from('jadlog_pricing').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseClient.from('jadlog_zones').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Tabelas limpas');

    // Processar cada aba
    for (const sheetName of workbook.SheetNames) {
      console.log(`\n📋 ==================== Processando aba: ${sheetName} ====================`);
      
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
      
      console.log(`📝 Total de linhas na aba: ${jsonData.length}`);
      
      if (jsonData.length < 2) {
        console.log(`⚠️ Aba "${sheetName}" tem menos de 2 linhas, pulando...`);
        continue;
      }

      // Log apenas primeira linha para debug
      if (jsonData.length > 0) {
        console.log('🔍 Primeira linha:', jsonData[0].slice(0, 8));
      }

      // Detectar tipo de aba analisando estrutura e NOME da aba
      const sheetNameLower = sheetName.toLowerCase();
      const firstRow = jsonData[0].map(v => String(v).toLowerCase());
      const secondRow = jsonData[1]?.map(v => String(v).toLowerCase()) || [];
      const thirdRow = jsonData[2]?.map(v => String(v).toLowerCase()) || [];
      const columnA = jsonData.slice(0, 10).map(row => String(row[0] || '').toLowerCase());
      
      // Aba de ABRANGÊNCIA/PRAZOS: nome ou estrutura
      const isDeliveryTimeSheet = sheetNameLower.includes('abrang') || 
                                   (firstRow.some(cell => cell.includes('cep') && cell.includes('inicial')) && 
                                    firstRow.some(cell => cell.includes('prazo')));
      
      // Aba de PREÇOS: detectar por múltiplos critérios
      // IMPORTANTE: A aba de preços não pode ser detectada como aba de prazos
      const isPricingSheet = !isDeliveryTimeSheet && (
        // Por nome da aba
        (sheetNameLower.includes('tabela') && (sheetNameLower.includes('preco') || sheetNameLower.includes('preço'))) ||
        sheetNameLower.includes('preço') ||
        sheetNameLower.includes('preco') ||
        sheetNameLower === 'preços' ||
        sheetNameLower === 'precos' ||
        // Por estrutura: primeira linha tem "ORIGEM" ou "GO" repetido (mais de 3 vezes)
        firstRow.filter(cell => cell === 'go').length > 3 ||
        firstRow.some(cell => cell.includes('origem')) ||
        // Por estrutura: segunda linha tem estados (AC, AL, AM, BA, etc.) - mais de 3
        secondRow.filter(cell => cell.length === 2 && cell.match(/^[a-z]{2}$/)).length > 3 ||
        // Por estrutura: terceira linha tem "capital" ou "interior"
        thirdRow.some(cell => cell.includes('capital') || cell.includes('interior')) ||
        // Por estrutura: coluna A tem "peso"
        columnA.some(cell => cell.includes('peso')) ||
        // Por estrutura: muitas colunas com valores numéricos (preços)
        (jsonData.length > 5 && jsonData[5] && jsonData[5].filter((v: any) => typeof v === 'number' && v > 0).length > 10)
      );

      console.log(`🔍 Tipo: ${isDeliveryTimeSheet ? 'PRAZOS' : isPricingSheet ? 'PREÇOS' : 'OUTRO'}`);
      
      if (isDeliveryTimeSheet) {
        // ===== Processar aba de ABRANGÊNCIA/PRAZOS =====
        console.log('🗺️ Processando aba de ABRANGÊNCIA (prazos de entrega)...');
        const zonesData: JadlogZoneRow[] = [];
        
        // Mapear índices das colunas no cabeçalho
        const headers = jsonData[0].map(v => String(v).toLowerCase());
        const colOrigin = headers.findIndex(h => h.includes('origem'));
        const colUF = headers.findIndex(h => h === 'uf' || (h.includes('uf') && !h.includes('destino')));
        const colCity = headers.findIndex(h => h.includes('cidade'));
        const colCEPStart = headers.findIndex(h => h.includes('cep') && h.includes('inicial'));
        const colCEPEnd = headers.findIndex(h => h.includes('cep') && h.includes('final'));
        const colPrazo = headers.findIndex(h => h.includes('prazo'));
        const colTarifa = headers.findIndex(h => h.includes('tarifa'));
        
        // Mapeamento de colunas concluído
        
        // Processar cada linha de dados (pulando cabeçalho)
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length < 5) continue;
          
          const origin = colOrigin !== -1 ? String(row[colOrigin] || 'GO').trim() : 'GO';
          const state = colUF !== -1 ? String(row[colUF] || '').trim() : '';
          const city = colCity !== -1 ? String(row[colCity] || '').trim() : '';
          const cepStart = colCEPStart !== -1 ? String(row[colCEPStart] || '').trim().replace(/\D/g, '') : '';
          const cepEnd = colCEPEnd !== -1 ? String(row[colCEPEnd] || '').trim().replace(/\D/g, '') : '';
          const prazo = colPrazo !== -1 ? parseInt(String(row[colPrazo] || '5')) : 5;
          const tarifa = colTarifa !== -1 ? String(row[colTarifa] || 'STANDARD').trim() : 'STANDARD';
          
          // Validar dados essenciais
          if (!state || !cepStart || !cepEnd || cepStart.length < 5 || cepEnd.length < 5) continue;
          
          // Criar código único para a zona
          const zoneCode = `${origin}-${state}-${cepStart.substring(0, 5)}`;
          
          zonesData.push({
            zone_code: zoneCode,
            state: state,
            zone_type: city || 'STANDARD',
            tariff_type: tarifa,
            cep_start: cepStart.padStart(8, '0'),
            cep_end: cepEnd.padStart(8, '0'),
            delivery_days: isNaN(prazo) ? 5 : prazo,
            express_delivery_days: isNaN(prazo) ? 3 : Math.max(1, prazo - 2)
          });
        }
        
        // Remover duplicatas
        const uniqueZones = new Map();
        zonesData.forEach(zone => {
          const key = `${zone.state}-${zone.zone_type}-${zone.tariff_type}`;
          uniqueZones.set(key, zone);
        });
        const uniqueZonesArray = Array.from(uniqueZones.values());
        
        console.log(`📦 ${uniqueZonesArray.length} zonas únicas`);
        
        if (uniqueZonesArray.length > 0) {
          // Inserir em lotes maiores (500)
          for (let i = 0; i < uniqueZonesArray.length; i += 500) {
            const batch = uniqueZonesArray.slice(i, i + 500);
            const { error } = await supabaseClient.from('jadlog_zones').insert(batch);
            
            if (error) {
              console.error(`❌ Erro lote zonas:`, error.message);
            } else {
              importedZones += batch.length;
            }
          }
        } else {
          console.log('⚠️ Nenhuma zona válida encontrada');
        }
        
      } else if (isPricingSheet) {
        // ===== Processar aba de PREÇOS =====
        console.log('💰 Processando aba de PREÇOS (valores de frete)...');
        const pricingData: JadlogPricingRow[] = [];
        
        // Estrutura da planilha Jadlog:
        // Linha 0 (índice 0): Estados (AC, AC, AC, AL, AL, ...)
        // Linha 1 (índice 1): "REGIÃO" repetido
        // Linha 2 (índice 2): Tipos de tarifa (AC CAPITAL 1, AC CAPITAL 2, AC INTERIOR 1, ...)
        // Linha 3 (índice 3): Header "Peso Até (kg)" na coluna A, peso 0,25 na coluna B
        // Linha 4+ (índice 4+): Dados - coluna A = "Peso Até (kg)", coluna B = peso, coluna C+ = preços
        
        const stateRow = jsonData[0];      // Estados
        const tariffRow = jsonData[2];     // Tipos de tarifa
        const firstDataRowIndex = 4;       // Dados começam na linha 5 (índice 4)
        
        console.log(`📍 Estrutura FIXA Jadlog`);
        console.log(`📍 Linha 0 - Estados:`, stateRow?.slice(0, 10));
        console.log(`📍 Linha 2 - Tarifas:`, tariffRow?.slice(0, 10));
        console.log(`📍 Primeira linha de dados (índice ${firstDataRowIndex}):`, jsonData[firstDataRowIndex]?.slice(0, 10));
        
        // Processar linhas de dados (linha 5 em diante, índice 4+)
        let totalPrices = 0;
        let processedRows = 0;
        
        for (let i = firstDataRowIndex; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length < 3) continue; // Precisa coluna A, B e pelo menos C
          
          // Coluna B (índice 1): peso (0.25, 1, 2, 3, ...)
          const weightStr = String(row[1] || '').trim();
          
          // Log primeira linha para debug
          if (processedRows === 0) {
            console.log(`🔍 Primeira linha dados:`);
            console.log(`   - Coluna A: "${row[0]}"`);
            console.log(`   - Coluna B (peso): "${weightStr}"`);
            console.log(`   - Colunas C-G (preços):`, row.slice(2, 7));
          }
          
          // Pular linhas inválidas
          if (!weightStr || isNaN(parseFloat(weightStr.replace(',', '.')))) {
            if (processedRows < 3) console.log(`⏭️ Pulando linha ${i}: peso="${weightStr}"`);
            continue;
          }
          
          processedRows++;
          
          // Converter peso (pode ter vírgula como decimal)
          const weightMax = parseFloat(weightStr.replace(',', '.'));
          if (isNaN(weightMax) || weightMax <= 0) continue;
          
          // Peso mínimo é o peso máximo da linha anterior (ou 0 se primeira linha)
          let weightMin = 0;
          if (i > firstDataRowIndex) {
            const prevWeightStr = String(jsonData[i-1][0] || '').trim();
            const prevWeight = parseFloat(prevWeightStr.replace(',', '.'));
            if (!isNaN(prevWeight)) {
              weightMin = prevWeight;
            }
          }
          
          let pricesInRow = 0;
          
          // Log para debug nas primeiras 2 linhas
          if (processedRows <= 2) {
            console.log(`📦 Processando peso ${weightMin}-${weightMax}kg, ${row.length} colunas na linha`);
          }
          
          // Processar cada coluna de preço (SEMPRE a partir da coluna C, índice 2)
          const priceStartCol = 2;
          for (let j = priceStartCol; j < row.length && j < stateRow.length; j++) {
            const priceValue = row[j];
            
            // Log primeira célula para debug
            if (processedRows === 1 && j === priceStartCol) {
              console.log(`🔍 Primeira célula: coluna ${j}, valor="${priceValue}", tipo=${typeof priceValue}`);
            }
            
            // Pular células vazias
            if (priceValue === null || priceValue === undefined || priceValue === '') {
              if (processedRows === 1 && j < priceStartCol + 5) console.log(`⏭️ Célula vazia na coluna ${j}`);
              continue;
            }
            
            // Extrair preço (pode estar como número ou texto "R$ 39,60")
            let price = 0;
            if (typeof priceValue === 'number') {
              price = priceValue;
            } else {
              const priceStr = String(priceValue)
                .replace(/[R$\s]/g, '')  // Remove R$ e espaços
                .replace(/\./g, '')       // Remove separador de milhar
                .replace(',', '.');       // Substitui vírgula decimal por ponto
              price = parseFloat(priceStr);
            }
            
            if (processedRows === 1 && j === priceStartCol) {
              console.log(`💰 Preço extraído: ${price} (original: "${priceValue}")`);
            }
            
            if (isNaN(price) || price === 0) {
              if (processedRows === 1 && j < priceStartCol + 5) console.log(`⏭️ Preço inválido na coluna ${j}: ${price}`);
              continue;
            }
            
            // ORIGEM: SEMPRE GO (Goiás) - conforme especificação
            const originState = 'GO';
            
            // DESTINO: estado da linha 0 (índice 0)
            const destinationState = String(stateRow[j] || '').trim().toUpperCase();
            
            // REGIÃO/TARIFA: tipo da linha 2 (índice 2)
            const tariffType = String(tariffRow[j] || 'STANDARD').trim();
            
            if (processedRows === 1 && j === priceStartCol) {
              console.log(`📍 Primeira célula - Estado: "${destinationState}", Tarifa: "${tariffType}"`);
            }
            
            // Validar estado (deve ter 2 caracteres)
            if (!destinationState || destinationState.length > 2) {
              if (processedRows === 1 && j < priceStartCol + 5) console.log(`⏭️ Estado inválido na coluna ${j}: "${destinationState}"`);
              continue;
            }
            
            pricingData.push({
              origin_state: originState,
              destination_state: destinationState,
              tariff_type: tariffType,
              weight_min: weightMin,
              weight_max: weightMax,
              price: price
            });
            
            pricesInRow++;
            totalPrices++;
          }
          
          // Log progresso a cada 50 linhas
          if (processedRows % 50 === 0) {
            console.log(`📈 Progresso: ${processedRows} linhas, ${totalPrices} preços`);
          }
        }
        
        console.log(`💰 ${pricingData.length} preços extraídos (${processedRows} linhas processadas)`);
        
        if (pricingData.length > 0) {
          // Inserir em lotes maiores (500) para performance
          for (let i = 0; i < pricingData.length; i += 500) {
            const batch = pricingData.slice(i, i + 500);
            const { error } = await supabaseClient.from('jadlog_pricing').insert(batch);
            
            if (error) {
              console.error(`❌ Erro lote ${i}:`, error.message);
            } else {
              importedPricing += batch.length;
              if (i % 2000 === 0) console.log(`✅ ${importedPricing}/${pricingData.length}`);
            }
          }
        } else {
          console.log('⚠️ Nenhum preço válido encontrado');
        }
      }
      
      processedSheets.push(sheetName);
    }

    console.log('\n✅ ==================== Importação concluída! ====================');
    console.log(`📊 Total: ${importedPricing} preços, ${importedZones} zonas`);
    console.log(`📋 Abas processadas: ${processedSheets.join(', ')}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Importação concluída com sucesso',
        imported_pricing: importedPricing,
        imported_zones: importedZones,
        sheets_processed: processedSheets
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ ==================== Erro na importação ====================');
    console.error('Erro:', error);
    console.error('Stack:', error.stack);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
