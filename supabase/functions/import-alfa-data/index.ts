import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlfaPricingRow {
  origin_state: string;
  destination_state: string;
  tariff_type: string;
  weight_min: number;
  weight_max: number;
  price: number;
}

interface AlfaZoneRow {
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

    // URL da planilha do Google Sheets da Alfa (nova planilha correta)
    const GOOGLE_SHEETS_ID = '1SStSAWjYC_mLV9hQb3hyRduPxiLfzlC_q2tNr8STkUg';
    const xlsxUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_ID}/export?format=xlsx`;
    
    console.log('🔍 Iniciando importação da tabela Alfa via XLSX...');
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
    console.log('🗑️ Limpando dados antigos de alfa_pricing e alfa_zones...');
    await supabaseClient.from('alfa_pricing').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseClient.from('alfa_zones').delete().neq('id', '00000000-0000-0000-0000-000000000000');
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
                                   sheetNameLower.includes('prazo') ||
                                   (firstRow.some(cell => cell.includes('cep') && cell.includes('inicial')) && 
                                    firstRow.some(cell => cell.includes('prazo')));
      
      // Aba de PREÇOS: detectar por múltiplos critérios
      const isPricingSheet = !isDeliveryTimeSheet && (
        // Por nome da aba
        (sheetNameLower.includes('tabela') && (sheetNameLower.includes('preco') || sheetNameLower.includes('preço'))) ||
        sheetNameLower.includes('preço') ||
        sheetNameLower.includes('preco') ||
        sheetNameLower === 'preços' ||
        sheetNameLower === 'precos' ||
        // Por estrutura: primeira linha tem "ORIGEM" ou estados
        firstRow.filter(cell => cell.length === 2 && cell.match(/^[a-z]{2}$/)).length > 3 ||
        firstRow.some(cell => cell.includes('origem')) ||
        // Por estrutura: segunda linha tem estados (AC, AL, AM, BA, etc.)
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
        const zonesData: AlfaZoneRow[] = [];
        
        // Mapear índices das colunas no cabeçalho da ALFA
        // Estrutura: UF ORIGEM | UF DESTINO | CIDADE DESTINO | CEP INICIAL | CEP FINAL | PRAZO | REGIAO ATENDIDA
        const headers = jsonData[0].map(v => String(v).toLowerCase().trim());
        
        console.log(`🔍 Cabeçalhos encontrados:`, headers.slice(0, 8));
        
        // Buscar coluna "UF DESTINO" especificamente (não confundir com "UF ORIGEM")
        const colUFDestino = headers.findIndex(h => h.includes('destino') && (h.includes('uf') || h.includes('estado')));
        const colOrigemUF = headers.findIndex(h => h.includes('origem') && (h.includes('uf') || h.includes('estado')));
        const colCity = headers.findIndex(h => h.includes('cidade') && h.includes('destino'));
        const colCEPStart = headers.findIndex(h => h.includes('cep') && h.includes('inicial'));
        const colCEPEnd = headers.findIndex(h => h.includes('cep') && h.includes('final'));
        const colPrazo = headers.findIndex(h => h.includes('prazo') && !h.includes('previsao'));
        const colRegiao = headers.findIndex(h => h.includes('regiao') && h.includes('atendida'));
        
        console.log(`🔍 Mapeamento de colunas ALFA:`);
        console.log(`   UF Origem: índice ${colOrigemUF} (coluna ${String.fromCharCode(65 + colOrigemUF)})`);
        console.log(`   UF Destino: índice ${colUFDestino} (coluna ${String.fromCharCode(65 + colUFDestino)})`);
        console.log(`   Cidade Destino: índice ${colCity} (coluna ${String.fromCharCode(65 + colCity)})`);
        console.log(`   CEP Inicial: índice ${colCEPStart} (coluna ${String.fromCharCode(65 + colCEPStart)})`);
        console.log(`   CEP Final: índice ${colCEPEnd} (coluna ${String.fromCharCode(65 + colCEPEnd)})`);
        console.log(`   Prazo: índice ${colPrazo} (coluna ${String.fromCharCode(65 + colPrazo)})`);
        console.log(`   Região Atendida: índice ${colRegiao} (coluna ${String.fromCharCode(65 + colRegiao)})`);
        
        // Processar cada linha de dados (pulando cabeçalho)
        let processedZoneRows = 0;
        let rejectedZoneRows = 0;
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length < 5) continue;
          
          const origemUF = colOrigemUF !== -1 ? String(row[colOrigemUF] || 'GO').trim().toUpperCase() : 'GO';
          const destinoUF = colUFDestino !== -1 ? String(row[colUFDestino] || '').trim().toUpperCase() : '';
          const city = colCity !== -1 ? String(row[colCity] || '').trim() : '';
          const cepStart = colCEPStart !== -1 ? String(row[colCEPStart] || '').trim().replace(/\D/g, '') : '';
          const cepEnd = colCEPEnd !== -1 ? String(row[colCEPEnd] || '').trim().replace(/\D/g, '') : '';
          const prazo = colPrazo !== -1 ? parseInt(String(row[colPrazo] || '5')) : 5;
          const regiaoAtendida = colRegiao !== -1 ? String(row[colRegiao] || 'STANDARD').trim().toUpperCase() : 'STANDARD';
          
          // Log primeiras linhas para debug
          if (i <= 5) {
            console.log(`📝 Linha ${i} - Origem: "${origemUF}", Destino: "${destinoUF}", Cidade: "${city}", CEP: ${cepStart}-${cepEnd}, Prazo: ${prazo}, Região: "${regiaoAtendida}"`);
          }
          
          // Validar dados essenciais - CEPs devem ter exatamente 8 dígitos (ou pelo menos 5)
          if (!destinoUF || destinoUF.length !== 2 || !cepStart || !cepEnd || cepStart.length < 5 || cepEnd.length < 5) {
            rejectedZoneRows++;
            if (rejectedZoneRows <= 5) {
              console.log(`❌ Linha ${i} rejeitada - UF Destino: "${destinoUF}" (len: ${destinoUF.length}), CEP inicial: "${cepStart}" (len: ${cepStart.length}), CEP final: "${cepEnd}" (len: ${cepEnd.length})`);
            }
            continue;
          }
          
          processedZoneRows++;
          
          // Criar código único para a zona baseado na estrutura ALFA
          const zoneCode = `ALFA-${destinoUF}-${regiaoAtendida}`;
          
          zonesData.push({
            zone_code: zoneCode,
            state: destinoUF,
            zone_type: regiaoAtendida,
            tariff_type: city || 'STANDARD',
            cep_start: cepStart.padStart(8, '0'),
            cep_end: cepEnd.padStart(8, '0'),
            delivery_days: isNaN(prazo) ? 5 : prazo,
            express_delivery_days: isNaN(prazo) ? 4 : Math.max(1, prazo - 1)
          });
        }
        
        // Remover duplicatas baseado em CEP
        const uniqueZones = new Map();
        zonesData.forEach(zone => {
          const key = `${zone.state}-${zone.cep_start}-${zone.cep_end}`;
          if (!uniqueZones.has(key)) {
            uniqueZones.set(key, zone);
          }
        });
        const uniqueZonesArray = Array.from(uniqueZones.values());
        
        console.log(`📊 Total processado: ${processedZoneRows} linhas aceitas, ${rejectedZoneRows} linhas rejeitadas`);
        console.log(`📦 ${uniqueZonesArray.length} zonas únicas após remoção de duplicatas`);
        
        if (uniqueZonesArray.length > 0) {
          // Inserir em lotes (500)
          for (let i = 0; i < uniqueZonesArray.length; i += 500) {
            const batch = uniqueZonesArray.slice(i, i + 500);
            const { error } = await supabaseClient.from('alfa_zones').insert(batch);
            
            if (error) {
              console.error(`❌ Erro lote zonas:`, error.message);
            } else {
              importedZones += batch.length;
            }
          }
        }
        
      } else if (isPricingSheet) {
        // ===== Processar aba de PREÇOS =====
        console.log('💰 Processando aba de PREÇOS (valores de frete)...');
        const pricingData: AlfaPricingRow[] = [];
        
        // Estrutura similar à Jadlog:
        // Linha 0: Estados
        // Linha 1 ou 2: Tipos de tarifa
        // Dados começam após header
        
        const stateRow = jsonData[0];
        const tariffRow = jsonData[2] || jsonData[1];
        const firstDataRowIndex = 4;
        
        console.log(`📍 Estrutura Alfa`);
        console.log(`📍 Linha 0 - Origem/Regiões:`, stateRow?.slice(0, 10));
        console.log(`📍 Linha 2 - Códigos Tarifa:`, tariffRow?.slice(0, 10));
        console.log(`📍 Primeira linha de dados (índice ${firstDataRowIndex}):`, jsonData[firstDataRowIndex]?.slice(0, 10));
        
        let processedRows = 0;
        
        for (let i = firstDataRowIndex; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length < 3) continue;
          
          const weightStr = String(row[1] || '').trim();
          
          if (!weightStr || isNaN(parseFloat(weightStr.replace(',', '.')))) {
            continue;
          }
          
          processedRows++;
          
          const weightMax = parseFloat(weightStr.replace(',', '.'));
          if (isNaN(weightMax) || weightMax <= 0) continue;
          
          let weightMin = 0;
          if (i > firstDataRowIndex) {
            const prevWeightStr = String(jsonData[i-1][1] || '').trim();
            const prevWeight = parseFloat(prevWeightStr.replace(',', '.'));
            if (!isNaN(prevWeight)) {
              weightMin = prevWeight;
            }
          }
          
          const priceStartCol = 2;
          for (let j = priceStartCol; j < row.length && j < stateRow.length; j++) {
            const priceValue = row[j];
            
            if (priceValue === null || priceValue === undefined || priceValue === '') {
              continue;
            }
            
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
            
            if (isNaN(price) || price === 0) {
              continue;
            }
            
            const originState = 'GO'; // Alfa opera de GO
            const tariffCode = String(tariffRow[j] || 'STANDARD').trim();
            const destinationRegion = String(stateRow[j] || '').trim();
            
            // Alfa usa códigos de tarifa como SPCAP.01, SPMET.01, etc.
            // Não validar por tamanho de estado
            if (!tariffCode || !destinationRegion) {
              continue;
            }
            
            pricingData.push({
              origin_state: originState,
              destination_state: destinationRegion, // ✅ Região é o estado de destino
              tariff_type: tariffCode, // ✅ Código de tarifa é o tipo de tarifa
              weight_min: weightMin,
              weight_max: weightMax,
              price: price
            });
          }
          
          if (processedRows % 50 === 0) {
            console.log(`📈 Progresso: ${processedRows} linhas, ${pricingData.length} preços`);
          }
        }
        
        console.log(`💰 ${pricingData.length} preços extraídos`);
        
        if (pricingData.length > 0) {
          // Inserir em lotes (500)
          for (let i = 0; i < pricingData.length; i += 500) {
            const batch = pricingData.slice(i, i + 500);
            const { error } = await supabaseClient.from('alfa_pricing').insert(batch);
            
            if (error) {
              console.error(`❌ Erro lote ${i}:`, error.message);
            } else {
              importedPricing += batch.length;
              if (i % 2000 === 0) console.log(`✅ ${importedPricing}/${pricingData.length}`);
            }
          }
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
