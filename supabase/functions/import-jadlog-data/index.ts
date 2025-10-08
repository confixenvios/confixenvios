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

      // Log das primeiras linhas para debug
      console.log('🔍 Primeiras 3 linhas da aba:');
      for (let i = 0; i < Math.min(3, jsonData.length); i++) {
        console.log(`  Linha ${i}:`, jsonData[i].slice(0, 10));
      }

      // Detectar tipo de aba analisando conteúdo
      const firstRow = jsonData[0].map(v => String(v).toLowerCase());
      const hasZoneKeywords = firstRow.some(cell => 
        cell.includes('zona') || 
        cell.includes('cep') || 
        cell.includes('prazo') ||
        cell.includes('days')
      );
      
      const hasPriceKeywords = firstRow.some(cell => 
        cell.includes('preço') ||
        cell.includes('preco') ||
        cell.includes('price') ||
        cell.includes('tarifa')
      );

      console.log(`🔍 Detectado: zona=${hasZoneKeywords}, preço=${hasPriceKeywords}`);
      
      if (hasZoneKeywords && !hasPriceKeywords) {
        // ===== Processar aba de ZONAS/PRAZOS =====
        console.log('🗺️ Processando como aba de zonas/prazos...');
        const zonesData: JadlogZoneRow[] = [];
        
        // Pular cabeçalho
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length < 4) {
            console.log(`  ⚠️ Linha ${i} inválida ou incompleta, pulando...`);
            continue;
          }
          
          // Mapear colunas
          const zoneCode = String(row[0] || '').trim();
          const state = String(row[1] || '').trim();
          const zoneType = String(row[2] || '').trim();
          const tariffType = String(row[3] || '').trim();
          const cepStart = String(row[4] || '').trim();
          const cepEnd = String(row[5] || '').trim();
          const deliveryDays = parseInt(String(row[6] || '5'));
          const expressDeliveryDays = parseInt(String(row[7] || '3'));
          
          if (zoneCode && state) {
            zonesData.push({
              zone_code: zoneCode,
              state: state,
              zone_type: zoneType || 'STANDARD',
              tariff_type: tariffType || 'PACKAGE',
              cep_start: cepStart || undefined,
              cep_end: cepEnd || undefined,
              delivery_days: isNaN(deliveryDays) ? 5 : deliveryDays,
              express_delivery_days: isNaN(expressDeliveryDays) ? 3 : expressDeliveryDays
            });
          }
        }
        
        if (zonesData.length > 0) {
          console.log(`📦 ${zonesData.length} zonas preparadas`);
          console.log('📋 Amostra (primeiras 2):', JSON.stringify(zonesData.slice(0, 2), null, 2));
          
          // Limpar dados existentes
          console.log('🗑️ Limpando dados antigos de jadlog_zones...');
          await supabaseClient.from('jadlog_zones').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          
          // Inserir em lotes de 100
          for (let i = 0; i < zonesData.length; i += 100) {
            const batch = zonesData.slice(i, i + 100);
            const { error } = await supabaseClient.from('jadlog_zones').insert(batch);
            
            if (error) {
              console.error(`❌ Erro ao inserir lote de zonas:`, error);
            } else {
              importedZones += batch.length;
              console.log(`✅ Progresso zonas: ${importedZones}/${zonesData.length}`);
            }
          }
        } else {
          console.log('⚠️ Nenhuma zona válida encontrada');
        }
        
      } else {
        // ===== Processar aba de PREÇOS =====
        console.log('💰 Processando como aba de preços...');
        const pricingData: JadlogPricingRow[] = [];
        
        // Estrutura esperada:
        // Linha 0: Estados de origem
        // Linha 1: Estados de destino  
        // Linha 2: Tipos de tarifa
        // Linha 3+: Faixas de peso e preços
        
        if (jsonData.length < 4) {
          console.log('⚠️ Aba de preços inválida (menos de 4 linhas)');
          continue;
        }
        
        const originRow = jsonData[0];
        const destRow = jsonData[1];
        const tariffRow = jsonData[2];
        
        console.log('📊 Estrutura detectada:');
        console.log('  - Origens (primeiras 5):', originRow.slice(0, 5));
        console.log('  - Destinos (primeiras 5):', destRow.slice(0, 5));
        console.log('  - Tarifas (primeiras 5):', tariffRow.slice(0, 5));
        
        // Processar linhas de dados (peso e preços)
        for (let i = 3; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length < 2) continue;
          
          // Primeira coluna: faixa de peso
          const weightStr = String(row[0] || '').trim();
          if (!weightStr) continue;
          
          let weightMin = 0;
          let weightMax = 0;
          
          if (weightStr.includes('-')) {
            const [min, max] = weightStr.split('-').map(w => parseFloat(w.trim()));
            weightMin = min || 0;
            weightMax = max || 0;
          } else {
            weightMax = parseFloat(weightStr);
            // Peso mínimo é o máximo da linha anterior
            if (i > 3) {
              const prevWeightStr = String(jsonData[i-1][0] || '').trim();
              if (prevWeightStr.includes('-')) {
                weightMin = parseFloat(prevWeightStr.split('-')[1]);
              } else {
                weightMin = parseFloat(prevWeightStr);
              }
            }
          }
          
          if (isNaN(weightMax) || weightMax === 0) {
            console.log(`  ⚠️ Linha ${i}: peso inválido "${weightStr}", pulando...`);
            continue;
          }
          
          let pricesFound = 0;
          
          // Processar cada coluna de preço (a partir da coluna 1)
          for (let j = 1; j < row.length && j < destRow.length; j++) {
            const priceValue = row[j];
            if (priceValue === null || priceValue === undefined || priceValue === '') continue;
            
            // Limpar e converter preço
            let price = 0;
            if (typeof priceValue === 'number') {
              price = priceValue;
            } else {
              const priceStr = String(priceValue)
                .replace(/[R$\s]/g, '')
                .replace(/\./g, '')
                .replace(',', '.');
              price = parseFloat(priceStr);
            }
            
            if (isNaN(price) || price === 0) continue;
            
            // Extrair informações dos cabeçalhos
            const originState = String(originRow[j] || 'GO').trim();
            const destinationState = String(destRow[j] || '').trim();
            const tariffType = String(tariffRow[j] || 'PACKAGE').trim();
            
            if (destinationState) {
              pricingData.push({
                origin_state: originState,
                destination_state: destinationState,
                tariff_type: tariffType,
                weight_min: weightMin,
                weight_max: weightMax,
                price: price
              });
              pricesFound++;
            }
          }
          
          if (pricesFound > 0) {
            console.log(`  ✅ Linha ${i} (${weightMin}-${weightMax}kg): ${pricesFound} preços processados`);
          }
        }
        
        if (pricingData.length > 0) {
          console.log(`💰 ${pricingData.length} preços preparados`);
          console.log('📋 Amostra (primeiros 3):', JSON.stringify(pricingData.slice(0, 3), null, 2));
          
          // Limpar dados existentes
          console.log('🗑️ Limpando dados antigos de jadlog_pricing...');
          await supabaseClient.from('jadlog_pricing').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          
          // Inserir em lotes de 100
          for (let i = 0; i < pricingData.length; i += 100) {
            const batch = pricingData.slice(i, i + 100);
            const { error } = await supabaseClient.from('jadlog_pricing').insert(batch);
            
            if (error) {
              console.error(`❌ Erro ao inserir lote de preços:`, error);
            } else {
              importedPricing += batch.length;
              console.log(`✅ Progresso preços: ${importedPricing}/${pricingData.length}`);
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
