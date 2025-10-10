import { supabase } from "@/integrations/supabase/client";

export interface ShippingQuote {
  economicPrice: number;
  expressPrice: number;
  economicDays: number;
  expressDays: number;
  zone: string;
  zoneName: string;
  tableId?: string;
  tableName?: string;
  cnpj?: string;
  insuranceValue?: number;
  basePrice?: number;
}

export interface QuoteRequest {
  destinyCep: string;
  weight: number;
  quantity: number;
  length?: number;
  width?: number;
  height?: number;
  merchandiseValue?: number;
}

const ORIGIN_CEP = "74900000";

export const calculateShippingQuote = async ({
  destinyCep,
  weight,
  quantity = 1,
  length,
  width,
  height,
  merchandiseValue
}: QuoteRequest): Promise<ShippingQuote> => {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 [ShippingService] INÍCIO CÁLCULO');
    console.log('📍 CEP:', destinyCep, '| Peso:', weight, 'kg');
    console.log('📦 Dimensões:', { length, width, height });
    console.log('💰 Valor:', merchandiseValue);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Verificar se IA está ativa
    console.log('🔍 [ShippingService] Verificando configuração da IA...');
    const { data: aiConfig, error: aiConfigError } = await supabase
      .from('ai_quote_config')
      .select('*')
      .single();
    
    if (aiConfigError) {
      console.log('⚠️ [ShippingService] Erro ao buscar config da IA:', aiConfigError);
    }
    
    console.log('🤖 [ShippingService] Config da IA:', { 
      is_active: aiConfig?.is_active,
      hasConfig: !!aiConfig 
    });
    
    if (aiConfig?.is_active) {
      console.log('✅ [IA] ATIVA - Chamando agente...');
      
      try {
        let totalVolume = 0;
        if (length && width && height) {
          totalVolume = (length / 100) * (width / 100) * (height / 100) * quantity;
        }
        
        const { data: { user } } = await supabase.auth.getUser();
        
        console.log('📤 [IA] Enviando requisição com:', {
          origin_cep: ORIGIN_CEP,
          destination_cep: destinyCep,
          total_weight: weight,
          total_volume: totalVolume,
          merchandise_value: merchandiseValue || 0
        });
        
        const { data: aiQuote, error: aiError } = await supabase.functions.invoke('ai-quote-agent', {
          body: {
            origin_cep: ORIGIN_CEP,
            destination_cep: destinyCep,
            total_weight: weight,
            total_volume: totalVolume,
            merchandise_value: merchandiseValue || 0,
            user_id: user?.id || null,
            session_id: (window as any).anonymousSessionId || null,
            volumes_data: [{
              weight,
              length: length || 0,
              width: width || 0,
              height: height || 0,
              quantity
            }]
          }
        });
        
        console.log('📥 [IA] Resposta completa:', JSON.stringify(aiQuote, null, 2));
        console.log('📥 [IA] Erro (se houver):', aiError);
        
        if (aiError) {
          console.error('❌ [IA] Erro na chamada:', aiError);
          throw new Error('Falha na chamada da IA: ' + aiError.message);
        }
        
        if (!aiQuote?.success) {
          console.log('⚠️ [IA] Resposta não foi sucesso:', aiQuote);
          throw new Error('IA retornou sem sucesso');
        }
        
        if (!aiQuote?.quote) {
          console.log('⚠️ [IA] Sem quote na resposta');
          throw new Error('IA não retornou cotação');
        }
        
        const quote = aiQuote.quote;
        const price = quote.final_price || quote.economicPrice;
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ [IA] SUCESSO NA RESPOSTA');
        console.log('🏢 Transportadora:', quote.selected_table_name);
        console.log('🆔 Table ID:', quote.selected_table_id);
        console.log('💰 Preço Final:', price);
        console.log('📅 Prazo:', quote.economicDays || quote.delivery_days, 'dias');
        console.log('📊 Seguro:', quote.insuranceValue || 0);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (!price || price <= 0) {
          console.log('⚠️ [IA] Preço inválido:', price);
          throw new Error('Preço da IA é inválido');
        }
        
        const aiResult = {
          economicPrice: price,
          expressPrice: quote.expressPrice || price * 1.3,
          economicDays: quote.economicDays || quote.delivery_days,
          expressDays: quote.expressDays || Math.max(1, (quote.delivery_days || quote.economicDays) - 2),
          zone: `Tabela: ${quote.selected_table_name}`,
          zoneName: quote.selected_table_name,
          tableId: quote.selected_table_id || 'ai-agent',
          tableName: quote.selected_table_name,
          cnpj: '',
          insuranceValue: quote.insuranceValue || 0,
          basePrice: quote.basePrice || quote.base_price || price
        };
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎯 [IA] RETORNANDO RESULTADO:');
        console.log(JSON.stringify(aiResult, null, 2));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        return aiResult;
        
      } catch (err) {
        console.error('❌ [IA] Erro durante processamento:', err);
        console.log('⚠️ [IA] Falling back to legacy system due to error');
      }
    } else {
      console.log('⚠️ [IA] Desativada - usando sistema legado');
    }

    // Fallback: usar sistema legado
    console.log('🔄 [Fallback] Chamando sistema legado...');
    const legacyResult = await calculateLegacyShippingQuote({ 
      destinyCep, 
      weight, 
      quantity,
      merchandiseValue 
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 [Legacy] RETORNANDO RESULTADO:');
    console.log(JSON.stringify(legacyResult, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return legacyResult;
    
  } catch (error) {
    console.error('❌ [ShippingService] ERRO FATAL:', error);
    throw error;
  }
};

const calculateLegacyShippingQuote = async ({
  destinyCep,
  weight,
  quantity = 1,
  merchandiseValue
}: QuoteRequest): Promise<ShippingQuote> => {
  console.log(`[Legacy] Calculando - CEP: ${destinyCep}, Peso: ${weight}kg`);
  
  const cleanCep = destinyCep.replace(/\D/g, '').padStart(8, '0');
  
  if (cleanCep.length !== 8 || cleanCep === '00000000') {
    throw new Error(`CEP ${destinyCep} é inválido.`);
  }
  
  const { data: zones, error: zoneError } = await supabase
    .from('shipping_zones_magalog')
    .select('*')
    .lte('cep_start', cleanCep)
    .gte('cep_end', cleanCep)
    .limit(1);

  if (zoneError) {
    throw new Error(`Erro ao consultar zonas: ${zoneError.message}`);
  }

  if (!zones || zones.length === 0) {
    throw new Error(`CEP ${destinyCep} não é atendido.`);
  }

  const zone = zones[0];

  const { data: pricing, error: priceError } = await supabase
    .from('shipping_pricing_magalog')
    .select('*')
    .eq('zone_code', zone.zone_code)
    .lte('weight_min', weight)
    .gte('weight_max', weight)
    .limit(1);

  if (priceError) {
    throw new Error(`Erro ao consultar preços: ${priceError.message}`);
  }

  let basePrice: number;
  let excessWeightCharge = 0;

  if (!pricing || pricing.length === 0) {
    const { data: maxWeightPricing } = await supabase
      .from('shipping_pricing_magalog')
      .select('*')
      .eq('zone_code', zone.zone_code)
      .order('weight_max', { ascending: false })
      .limit(1);

    if (!maxWeightPricing || maxWeightPricing.length === 0) {
      throw new Error(`Peso ${weight}kg não encontrado na tabela.`);
    }

    basePrice = maxWeightPricing[0].price;
    
    if (weight > 30) {
      const excessWeight = weight - 30;
      excessWeightCharge = excessWeight * 10;
    }
  } else {
    basePrice = pricing[0].price;
  }
  
  const basePriceWithQuantity = (basePrice + excessWeightCharge) * quantity;
  
  let insuranceValue = 0;
  if (merchandiseValue && merchandiseValue > 0) {
    insuranceValue = merchandiseValue * 0.013;
  }
  
  const economicPrice = basePriceWithQuantity + insuranceValue;
  const expressPrice = (basePriceWithQuantity * 1.6) + insuranceValue;

  return {
    economicPrice: Number(economicPrice.toFixed(2)),
    expressPrice: Number(expressPrice.toFixed(2)),
    economicDays: zone.delivery_days,
    expressDays: zone.express_delivery_days,
    zone: zone.zone_code,
    zoneName: `${zone.state} - ${zone.zone_type === 'CAP' ? 'Capital' : 'Interior'}`,
    tableId: 'legacy',
    tableName: 'Sistema Legado Confix',
    cnpj: '00000000000000',
    insuranceValue: Number(insuranceValue.toFixed(2)),
    basePrice: Number(basePriceWithQuantity.toFixed(2))
  };
};

export const validateCep = (cep: string): boolean => {
  const cleanCep = cep.replace(/\D/g, '');
  return cleanCep.length === 8;
};

export const formatCep = (cep: string): string => {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return cep;
  return `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`;
};

export const clearQuoteCache = () => {
  const keys = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.startsWith('pricing_') || key.includes('quote'))) {
      keys.push(key);
    }
  }
  keys.forEach(key => sessionStorage.removeItem(key));
  console.log('Cache limpo:', keys.length, 'itens');
};
