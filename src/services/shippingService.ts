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
}

// Aparecida de Goiânia é sempre nossa origem
const ORIGIN_CEP = "74900000";

export const calculateShippingQuote = async ({
  destinyCep,
  weight
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
      throw new Error(`CEP ${destinyCep} não atendido`);
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

    if (priceError || !pricing || pricing.length === 0) {
      throw new Error(`Preço não encontrado para peso ${weight}kg na zona ${zone.zone_code}`);
    }

    const basePrice = pricing[0].price;
    
    // Preço econômico é o preço base
    const economicPrice = basePrice;
    
    // Preço expresso tem 60% de acréscimo
    const expressPrice = basePrice * 1.6;

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
    throw error;
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