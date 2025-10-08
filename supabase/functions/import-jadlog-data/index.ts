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

      // Detectar tipo de aba analisando estrutura
      const firstRow = jsonData[0].map(v => String(v).toLowerCase());
      const columnA = jsonData.slice(0, 10).map(row => String(row[0] || '').toLowerCase());
      
      // Aba de ABRANGÊNCIA/PRAZOS: primeira linha tem colunas UF, CEP INICIAL, CEP FINAL, PRAZO
      const isDeliveryTimeSheet = firstRow.some(cell => cell.includes('cep') && cell.includes('inicial')) && 
                                   firstRow.some(cell => cell.includes('prazo'));
      
      // Aba de PREÇOS: coluna A contém "peso" em alguma das primeiras linhas
      const isPricingSheet = columnA.some(cell => cell.includes('peso'));

      console.log(`🔍 Tipo de aba: ${isDeliveryTimeSheet ? 'ABRANGÊNCIA/PRAZOS' : isPricingSheet ? 'PREÇOS' : 'DESCONHECIDA'}`);
      console.log(`🔍 Primeira linha:`, firstRow.slice(0, 8));
      console.log(`🔍 Coluna A (primeiras 5):`, columnA.slice(0, 5));
      
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
        
        console.log(`📍 Mapeamento: origem=${colOrigin}, uf=${colUF}, cep_start=${colCEPStart}, cep_end=${colCEPEnd}, prazo=${colPrazo}, tarifa=${colTarifa}`);
        
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
        
        console.log(`📦 ${zonesData.length} registros de prazo extraídos`);
      
        
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
        
      } else if (isPricingSheet) {
        // ===== Processar aba de PREÇOS =====
        console.log('💰 Processando aba de PREÇOS (valores de frete)...');
        const pricingData: JadlogPricingRow[] = [];
        
        // Encontrar a linha que contém "Peso Até (kg)" ou similar
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const firstCell = String(jsonData[i][0] || '').toLowerCase();
          if (firstCell.includes('peso')) {
            headerRowIndex = i;
            break;
          }
        }
        
        if (headerRowIndex === -1 || jsonData.length < headerRowIndex + 2) {
          console.log('⚠️ Estrutura de aba de preços inválida, pulando');
          continue;
        }
        
        // Cabeçalhos estão nas 3 linhas ANTES da linha de peso
        // Se "Peso Até" está na linha 3, então:
        // Linha 0: ORIGEM
        // Linha 1: DESTINO  
        // Linha 2: TIPO DE TARIFA
        // Linha 3+: Dados de peso e preços
        const originRow = jsonData[headerRowIndex - 3];
        const destRow = jsonData[headerRowIndex - 2];
        const tariffRow = jsonData[headerRowIndex - 1];
        
        console.log(`📍 Linha de cabeçalho "Peso" encontrada na linha ${headerRowIndex}`);
        console.log('📊 Cabeçalhos de preço:');
        console.log('  - Origens (primeiras 5):', originRow?.slice(0, 5));
        console.log('  - Destinos (primeiras 5):', destRow?.slice(0, 5));
        console.log('  - Tarifas (primeiras 5):', tariffRow?.slice(0, 5));
        
        // Processar linhas de dados (a partir da linha APÓS o cabeçalho de peso)
        let totalPrices = 0;
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length < 2) continue;
          
          // Coluna A (índice 0): "Peso Até (kg)" com valor (ex: 0,25, 1, 2, 3, ...)
          const weightStr = String(row[0] || '').trim();
          if (!weightStr || weightStr.toLowerCase().includes('peso')) continue;
          
          // Converter peso (pode ter vírgula como decimal)
          const weightMax = parseFloat(weightStr.replace(',', '.'));
          if (isNaN(weightMax) || weightMax === 0) continue;
          
          // Peso mínimo é o peso máximo da linha anterior (ou 0 se primeira linha de dados)
          let weightMin = 0;
          if (i > headerRowIndex + 1) {
            const prevWeightStr = String(jsonData[i-1][0] || '').trim();
            const prevWeight = parseFloat(prevWeightStr.replace(',', '.'));
            if (!isNaN(prevWeight)) {
              weightMin = prevWeight;
            }
          }
          
          let pricesInRow = 0;
          
          // Processar cada coluna de preço (a partir da coluna B, índice 1)
          for (let j = 1; j < row.length && destRow && j < destRow.length; j++) {
            const priceValue = row[j];
            
            // Pular células vazias
            if (priceValue === null || priceValue === undefined || priceValue === '') continue;
            
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
            
            if (isNaN(price) || price === 0) continue;
            
            // Extrair dados dos cabeçalhos (linhas 1, 2, 3)
            const originState = String(originRow[j] || 'GO').trim();
            const destinationState = String(destRow[j] || '').trim();
            const tariffType = String(tariffRow[j] || 'STANDARD').trim();
            
            if (!destinationState) continue;
            
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
          
          if (pricesInRow > 0 && i % 10 === 0) {
            console.log(`  ✅ Linha ${i}: peso ${weightMin}-${weightMax}kg, ${pricesInRow} preços`);
          }
        }
        
        console.log(`💰 Total de ${totalPrices} preços extraídos`);
        
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
