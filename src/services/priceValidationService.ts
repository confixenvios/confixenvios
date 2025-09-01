import { supabase } from "@/integrations/supabase/client";

export interface ValidationResult {
  zone: string;
  state: string;
  zoneType: string;
  issues: ValidationIssue[];
  hasCompleteRanges: boolean;
}

export interface ValidationIssue {
  type: 'GAP' | 'OVERLAP' | 'MISSING_ZONE' | 'INVALID_RANGE';
  description: string;
  weightMin?: number;
  weightMax?: number;
}

export interface PriceTestResult {
  zone: string;
  weight: number;
  found: boolean;
  price?: number;
  error?: string;
}

// Validar consistência completa das tabelas de preço
export const validatePricingTables = async (): Promise<ValidationResult[]> => {
  try {
    // Buscar todas as zonas
    const { data: zones, error: zonesError } = await supabase
      .from('shipping_zones')
      .select('*')
      .order('zone_code');

    if (zonesError) throw zonesError;

    const results: ValidationResult[] = [];

    for (const zone of zones || []) {
      // Buscar preços da zona
      const { data: prices, error: pricesError } = await supabase
        .from('shipping_pricing')
        .select('*')
        .eq('zone_code', zone.zone_code)
        .order('weight_min');

      if (pricesError) {
        results.push({
          zone: zone.zone_code,
          state: zone.state,
          zoneType: zone.zone_type,
          issues: [{
            type: 'MISSING_ZONE',
            description: `Erro ao consultar preços: ${pricesError.message}`
          }],
          hasCompleteRanges: false
        });
        continue;
      }

      const issues: ValidationIssue[] = [];

      if (!prices || prices.length === 0) {
        issues.push({
          type: 'MISSING_ZONE',
          description: 'Nenhum preço configurado para esta zona'
        });
      } else {
        // Verificar lacunas e sobreposições
        const sortedPrices = prices.sort((a, b) => a.weight_min - b.weight_min);
        
        // Verificar se começa do peso mínimo esperado (0.1kg)
        if (sortedPrices[0].weight_min > 0.1) {
          issues.push({
            type: 'GAP',
            description: `Lacuna no início: falta faixa de 0.1kg até ${sortedPrices[0].weight_min}kg`,
            weightMin: 0.1,
            weightMax: sortedPrices[0].weight_min
          });
        }

        // Verificar lacunas entre faixas
        for (let i = 0; i < sortedPrices.length - 1; i++) {
          const current = sortedPrices[i];
          const next = sortedPrices[i + 1];

          // Validar faixa individual
          if (current.weight_min >= current.weight_max) {
            issues.push({
              type: 'INVALID_RANGE',
              description: `Faixa inválida: peso mín (${current.weight_min}kg) >= peso máx (${current.weight_max}kg)`,
              weightMin: current.weight_min,
              weightMax: current.weight_max
            });
          }

          // Verificar lacuna
          if (next.weight_min > current.weight_max + 0.001) {
            issues.push({
              type: 'GAP',
              description: `Lacuna entre ${current.weight_max}kg e ${next.weight_min}kg`,
              weightMin: current.weight_max,
              weightMax: next.weight_min
            });
          }

          // Verificar sobreposição
          if (next.weight_min < current.weight_max) {
            issues.push({
              type: 'OVERLAP',
              description: `Sobreposição entre faixas: ${current.weight_min}-${current.weight_max}kg e ${next.weight_min}-${next.weight_max}kg`,
              weightMin: Math.max(current.weight_min, next.weight_min),
              weightMax: Math.min(current.weight_max, next.weight_max)
            });
          }
        }

        // Verificar se vai até o peso máximo esperado (50kg)
        const lastPrice = sortedPrices[sortedPrices.length - 1];
        if (lastPrice.weight_max < 50) {
          issues.push({
            type: 'GAP',
            description: `Lacuna no final: falta faixa de ${lastPrice.weight_max}kg até 50kg`,
            weightMin: lastPrice.weight_max,
            weightMax: 50
          });
        }
      }

      results.push({
        zone: zone.zone_code,
        state: zone.state,
        zoneType: zone.zone_type,
        issues,
        hasCompleteRanges: issues.length === 0
      });
    }

    return results;
  } catch (error) {
    console.error('Erro na validação das tabelas:', error);
    throw new Error('Erro ao validar tabelas de preço');
  }
};

// Testar preços específicos para diferentes pesos
export const testPriceCalculation = async (testWeights: number[] = [0.5, 1, 5, 10, 20, 30]): Promise<PriceTestResult[]> => {
  try {
    // Buscar uma amostra de zonas para teste
    const { data: zones, error: zonesError } = await supabase
      .from('shipping_zones')
      .select('zone_code')
      .limit(10);

    if (zonesError) throw zonesError;

    const results: PriceTestResult[] = [];

    for (const zone of zones || []) {
      for (const weight of testWeights) {
        try {
          const { data: pricing, error: priceError } = await supabase
            .from('shipping_pricing')
            .select('*')
            .eq('zone_code', zone.zone_code)
            .lte('weight_min', weight)
            .gte('weight_max', weight)
            .limit(1);

          if (priceError) {
            results.push({
              zone: zone.zone_code,
              weight,
              found: false,
              error: `Erro na consulta: ${priceError.message}`
            });
          } else if (!pricing || pricing.length === 0) {
            results.push({
              zone: zone.zone_code,
              weight,
              found: false,
              error: 'Faixa de peso não encontrada'
            });
          } else {
            results.push({
              zone: zone.zone_code,
              weight,
              found: true,
              price: pricing[0].price
            });
          }
        } catch (error) {
          results.push({
            zone: zone.zone_code,
            weight,
            found: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Erro no teste de preços:', error);
    throw new Error('Erro ao testar cálculo de preços');
  }
};

// Buscar zonas sem configuração de preço
export const findZonesWithoutPricing = async (): Promise<string[]> => {
  try {
    const { data: zones, error: zonesError } = await supabase
      .from('shipping_zones')
      .select('zone_code');

    if (zonesError) throw zonesError;

    const zonesWithoutPricing: string[] = [];

    for (const zone of zones || []) {
      const { data: pricing, error: priceError } = await supabase
        .from('shipping_pricing')
        .select('id')
        .eq('zone_code', zone.zone_code)
        .limit(1);

      if (priceError) {
        console.error(`Erro ao verificar zona ${zone.zone_code}:`, priceError);
        continue;
      }

      if (!pricing || pricing.length === 0) {
        zonesWithoutPricing.push(zone.zone_code);
      }
    }

    return zonesWithoutPricing;
  } catch (error) {
    console.error('Erro ao buscar zonas sem preço:', error);
    throw new Error('Erro ao verificar zonas sem configuração');
  }
};