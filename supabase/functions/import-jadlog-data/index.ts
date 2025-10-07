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
  cep_start: string;
  cep_end: string;
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
    const GOOGLE_SHEETS_ID = '1cAH3flP8wmCiDvngG0VUvDOTfBjrHEB7ZCRnwB6NHXk';
    
    console.log('🔍 Iniciando importação da tabela Jadlog...');

    // Buscar abas da planilha
    const sheetNames = ['PREÇO', 'PRAZO', 'ZONAS'];
    let importedPricing = 0;
    let importedZones = 0;

    for (const sheetName of sheetNames) {
      console.log(`📊 Processando aba: ${sheetName}`);
      
      // Converter para CSV e buscar dados
      const csvUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
      
      const response = await fetch(csvUrl);
      const csvText = await response.text();
      const lines = csvText.split('\n');
      
      console.log(`📝 ${lines.length} linhas encontradas na aba ${sheetName}`);

      if (sheetName === 'PREÇO') {
        // Processar dados de preços
        const pricingData: JadlogPricingRow[] = [];
        
        // Assumindo estrutura: primeira linha = cabeçalhos de destino, primeira coluna = origem
        for (let i = 3; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;
          
          const cells = line.split(',').map(c => c.replace(/"/g, '').trim());
          
          // Extrair origem, destino, tipo de tarifa e faixas de peso
          if (cells.length >= 4) {
            const originState = cells[0];
            const destinationState = cells[1];
            const tariffType = cells[2];
            const weightRange = cells[3];
            
            // Parse weight range (ex: "0-5", "5-10")
            const [weightMin, weightMax] = weightRange.split('-').map(w => parseFloat(w));
            
            for (let j = 4; j < cells.length; j++) {
              const price = parseFloat(cells[j]);
              if (!isNaN(price) && price > 0) {
                pricingData.push({
                  origin_state: originState,
                  destination_state: destinationState,
                  tariff_type: tariffType,
                  weight_min: weightMin || 0,
                  weight_max: weightMax || 999,
                  price: price
                });
              }
            }
          }
        }

        if (pricingData.length > 0) {
          // Limpar dados existentes
          await supabaseClient.from('jadlog_pricing').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          
          // Inserir em lotes de 100
          for (let i = 0; i < pricingData.length; i += 100) {
            const batch = pricingData.slice(i, i + 100);
            const { error } = await supabaseClient.from('jadlog_pricing').insert(batch);
            
            if (error) {
              console.error(`❌ Erro ao inserir lote de preços:`, error);
            } else {
              importedPricing += batch.length;
              console.log(`✅ ${importedPricing} preços importados...`);
            }
          }
        }
      } else if (sheetName === 'PRAZO' || sheetName === 'ZONAS') {
        // Processar dados de zonas e prazos
        const zonesData: JadlogZoneRow[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;
          
          const cells = line.split(',').map(c => c.replace(/"/g, '').trim());
          
          if (cells.length >= 8) {
            zonesData.push({
              zone_code: cells[0],
              state: cells[1],
              zone_type: cells[2],
              tariff_type: cells[3],
              cep_start: cells[4],
              cep_end: cells[5],
              delivery_days: parseInt(cells[6]) || 5,
              express_delivery_days: parseInt(cells[7]) || 3
            });
          }
        }

        if (zonesData.length > 0) {
          // Limpar dados existentes
          await supabaseClient.from('jadlog_zones').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          
          // Inserir em lotes de 100
          for (let i = 0; i < zonesData.length; i += 100) {
            const batch = zonesData.slice(i, i + 100);
            const { error } = await supabaseClient.from('jadlog_zones').insert(batch);
            
            if (error) {
              console.error(`❌ Erro ao inserir lote de zonas:`, error);
            } else {
              importedZones += batch.length;
              console.log(`✅ ${importedZones} zonas importadas...`);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Importação concluída com sucesso',
        imported_pricing: importedPricing,
        imported_zones: importedZones
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Erro na importação:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
