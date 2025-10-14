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
        throw new Error(`Erro ao calcular frete: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      }
    }
    
    // IA desativada - retornar erro
    throw new Error('Sistema de cotação não está ativo. Entre em contato com o suporte.');
    
  } catch (error) {
    console.error('❌ [ShippingService] ERRO FATAL:', error);
    throw error;
  }
};

// Sistema legado REMOVIDO - use apenas AI Quote Agent com tabelas Jadlog/Alfa/Magalog

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
