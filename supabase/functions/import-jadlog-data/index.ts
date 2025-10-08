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

      // Log das primeiras linhas para debug
      console.log('🔍 Primeiras 3 linhas da aba:');
      for (let i = 0; i < Math.min(3, jsonData.length); i++) {
        console.log(`  Linha ${i}:`, jsonData[i].slice(0, 10));
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
      const isPricingSheet = 
        // Por nome da aba
        (sheetNameLower.includes('tabela') && (sheetNameLower.includes('preco') || sheetNameLower.includes('preço'))) ||
        sheetNameLower === 'preços' ||
        sheetNameLower === 'precos' ||
        // Por estrutura: primeira linha tem "ORIGEM" ou "GO" repetido
        firstRow.filter(cell => cell === 'go').length > 3 ||
        firstRow.some(cell => cell.includes('origem')) ||
        // Por estrutura: segunda linha tem estados (AC, AL, AM, BA, etc.)
        secondRow.filter(cell => cell.length === 2 && cell.match(/^[a-z]{2}$/)).length > 3 ||
        // Por estrutura: terceira linha tem "capital" ou "interior"
        thirdRow.some(cell => cell.includes('capital') || cell.includes('interior')) ||
        // Por estrutura: coluna A tem "peso"
        columnA.some(cell => cell.includes('peso'));

      console.log(`🔍 Nome da aba: "${sheetName}" (lower: "${sheetNameLower}")`);
      console.log(`🔍 Primeira linha:`, firstRow.slice(0, 8));
      console.log(`🔍 Segunda linha:`, secondRow.slice(0, 8));
      console.log(`🔍 Terceira linha:`, thirdRow.slice(0, 8));
      console.log(`🔍 Coluna A (primeiras 5):`, columnA.slice(0, 5));
      console.log(`🔍 Critérios detecção preços:`, {
        nomeTabela: sheetNameLower.includes('tabela') && sheetNameLower.includes('prec'),
        origemNaLinha1: firstRow.some(cell => cell.includes('origem')),
        goRepetido: firstRow.filter(cell => cell === 'go').length,
        estadosNaLinha2: secondRow.filter(cell => cell.length === 2).length,
        capitalNaLinha3: thirdRow.some(cell => cell.includes('capital')),
        pesoNaColunaA: columnA.some(cell => cell.includes('peso'))
      });
      console.log(`🔍 Tipo de aba detectado: ${isDeliveryTimeSheet ? 'ABRANGÊNCIA/PRAZOS' : isPricingSheet ? 'PREÇOS' : 'DESCONHECIDA'}`);
      
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
          // Remover duplicatas usando Map (manter última ocorrência)
          const uniqueZones = new Map();
          zonesData.forEach(zone => {
            const key = `${zone.state}-${zone.zone_type}-${zone.tariff_type}`;
            uniqueZones.set(key, zone);
          });
          const uniqueZonesArray = Array.from(uniqueZones.values());
          
          console.log(`📦 ${zonesData.length} zonas extraídas, ${uniqueZonesArray.length} únicas após remoção de duplicatas`);
          console.log('📋 Amostra (primeiras 2):', JSON.stringify(uniqueZonesArray.slice(0, 2), null, 2));
          
          // Inserir em lotes de 100
          for (let i = 0; i < uniqueZonesArray.length; i += 100) {
            const batch = uniqueZonesArray.slice(i, i + 100);
            const { error } = await supabaseClient.from('jadlog_zones').insert(batch);
            
            if (error) {
              console.error(`❌ Erro ao inserir lote de zonas:`, error);
            } else {
              importedZones += batch.length;
              console.log(`✅ Progresso zonas: ${importedZones}/${uniqueZonesArray.length}`);
            }
          }
        } else {
          console.log('⚠️ Nenhuma zona válida encontrada');
        }
        
      } else if (isPricingSheet) {
        // ===== Processar aba de PREÇOS =====
        console.log('💰 Processando aba de PREÇOS (valores de frete)...');
        const pricingData: JadlogPricingRow[] = [];
        
        // Encontrar a linha "ORIGEM" (primeira linha com "ORIGEM" na coluna A)
        let origemRowIndex = -1;
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const firstCell = String(jsonData[i][0] || '').toLowerCase();
          if (firstCell.includes('origem')) {
            origemRowIndex = i;
            break;
          }
        }
        
        if (origemRowIndex === -1 || jsonData.length < origemRowIndex + 4) {
          console.log('⚠️ Estrutura de aba de preços inválida (linha ORIGEM não encontrada), pulando');
          continue;
        }
        
        // Estrutura da planilha:
        // Linha N: ORIGEM | GO | GO | GO | ...
        // Linha N+1: DESTINO | AC | AC | AC | AL | AL | ...
        // Linha N+2: REGIÃO | AC CAPITAL 1 | AC CAPITAL 2 | AC CAPITAL 3 | AL CAPITAL 1 | ...
        // Linha N+3: Peso Até (kg) | 0,25 | (começa os dados)
        // Linha N+4+: Peso Até (kg) | 1 | ...
        const originRow = jsonData[origemRowIndex];
        const destRow = jsonData[origemRowIndex + 1];
        const regionRow = jsonData[origemRowIndex + 2];
        const firstDataRowIndex = origemRowIndex + 3;
        
        console.log(`📍 Estrutura encontrada: ORIGEM na linha ${origemRowIndex}`);
        console.log('📊 Cabeçalhos de preço:');
        console.log('  - Origens (primeiras 5):', originRow?.slice(0, 5));
        console.log('  - Destinos (primeiras 5):', destRow?.slice(0, 5));
        console.log('  - Regiões (primeiras 5):', regionRow?.slice(0, 5));
        
        // Processar linhas de dados (a partir de firstDataRowIndex)
        let totalPrices = 0;
        for (let i = firstDataRowIndex; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length < 2) continue;
          
          // Coluna A: "Peso Até (kg)" com valor (ex: 0,25, 1, 2, 3, ...)
          const weightStr = String(row[0] || '').trim();
          
          // Pular se não for um número válido
          if (!weightStr || weightStr.toLowerCase().includes('peso')) continue;
          
          // Converter peso (pode ter vírgula como decimal)
          const weightMax = parseFloat(weightStr.replace(',', '.'));
          if (isNaN(weightMax) || weightMax === 0) continue;
          
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
          
          // Processar cada coluna de preço (a partir da coluna B, índice 1)
          for (let j = 1; j < row.length && j < destRow.length; j++) {
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
            
            // ORIGEM: sempre GO (Goiás)
            const originState = 'GO';
            
            // DESTINO: sigla do estado (AC, AL, MA, SP, etc.)
            const destinationState = String(destRow[j] || '').trim().toUpperCase();
            
            // REGIÃO: tipo de tarifa completo (AC CAPITAL 1, AC INTERIOR 2, etc.)
            const tariffType = String(regionRow[j] || 'STANDARD').trim();
            
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
          
          if (pricesInRow > 0 && (i - firstDataRowIndex) % 10 === 0) {
            console.log(`  ✅ Linha ${i}: peso ${weightMin}-${weightMax}kg, ${pricesInRow} preços`);
          }
        }
        
        console.log(`💰 Total de ${totalPrices} preços extraídos`);
        
        if (pricingData.length > 0) {
          console.log(`💰 ${pricingData.length} preços preparados`);
          console.log('📋 Amostra (primeiros 3):', JSON.stringify(pricingData.slice(0, 3), null, 2));
          
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
