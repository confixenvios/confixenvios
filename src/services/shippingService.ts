import { supabase } from "@/integrations/supabase/client";

export interface ShippingQuote {
  economicPrice: number;
  expressPrice: number;
  economicDays: number;
  expressDays: number;
  zone: string;
  zoneName: string;
}

export interface QuoteRequest {
  destinyCep: string;
  weight: number;
  quantity: number;
}

// Aparecida de Goiânia é sempre nossa origem
const ORIGIN_CEP = "74900000";

export const calculateShippingQuote = async ({
  destinyCep,
  weight,
  quantity = 1
}: QuoteRequest): Promise<ShippingQuote> => {
  try {
    // Remove formatação do CEP e garante 8 dígitos
    const cleanCep = destinyCep.replace(/\D/g, '').padStart(8, '0');
    
    // Busca a zona de destino baseada no CEP
    const { data: zones, error: zoneError } = await supabase
      .from('shipping_zones')
      .select('*')
      .lte('cep_start', cleanCep)
      .gte('cep_end', cleanCep)
      .limit(1);

    if (zoneError || !zones || zones.length === 0) {
      throw new Error(`CEP ${destinyCep} não é atendido pela nossa região de cobertura`);
    }

    const zone = zones[0];

    // Busca o preço baseado no peso e zona
    const { data: pricing, error: priceError } = await supabase
      .from('shipping_pricing')
      .select('*')
      .eq('zone_code', zone.zone_code)
      .lte('weight_min', weight)
      .gte('weight_max', weight)
      .limit(1);

    if (priceError) {
      console.error('Erro na consulta de preços:', priceError);
      throw new Error(`Erro ao consultar tabela de preços: ${priceError.message}`);
    }

    if (!pricing || pricing.length === 0) {
      // Busca faixas disponíveis para debug
      const { data: availableRanges } = await supabase
        .from('shipping_pricing')
        .select('weight_min, weight_max')
        .eq('zone_code', zone.zone_code)
        .order('weight_min');

      const ranges = availableRanges?.map(r => `${r.weight_min}-${r.weight_max}kg`).join(', ') || 'nenhuma';
      
      throw new Error(
        `Não há preço configurado para peso ${weight}kg na zona ${zone.zone_code} (${zone.state} ${zone.zone_type === 'CAP' ? 'Capital' : 'Interior'}). ` +
        `Faixas disponíveis: ${ranges}. Verifique a tabela de preços.`
      );
    }

    const basePrice = pricing[0].price;
    
    // Multiplica o preço base pela quantidade de pacotes
    const basePriceWithQuantity = basePrice * quantity;
    
    // Preço econômico é o preço base multiplicado pela quantidade
    const economicPrice = basePriceWithQuantity;
    
    // Preço expresso tem 60% de acréscimo
    const expressPrice = basePriceWithQuantity * 1.6;

    return {
      economicPrice: Number(economicPrice.toFixed(2)),
      expressPrice: Number(expressPrice.toFixed(2)),
      economicDays: zone.delivery_days,
      expressDays: zone.express_delivery_days,
      zone: zone.zone_code,
      zoneName: `${zone.state} ${zone.zone_type === 'CAP' ? 'Capital' : 'Interior'}`
    };
  } catch (error) {
    console.error('Erro ao calcular frete:', error);
    // Se for erro de validação nosso, manter a mensagem amigável
    if (error instanceof Error && error.message.includes('não')) {
      throw error;
    }
    // Para outros erros, dar mensagem genérica
    throw new Error('Erro interno no cálculo do frete. Tente novamente ou contate o suporte.');
  }
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