import { supabase } from "@/integrations/supabase/client";
import { calculateShippingQuote } from "./shippingService";

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

        // Verificar se vai até o peso máximo esperado (30kg)
        const lastPrice = sortedPrices[sortedPrices.length - 1];
        if (lastPrice.weight_max < 30) {
          issues.push({
            type: 'GAP',
            description: `Lacuna no final: falta faixa de ${lastPrice.weight_max}kg até 30kg`,
            weightMin: lastPrice.weight_max,
            weightMax: 30
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

// Testar todas as zonas com CEPs de exemplo e diferentes pesos
export const testAllZonesComplete = async (): Promise<{
  totalZones: number;
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  results: CompleteTestResult[];
  statesCovered: string[];
  expectedRegions: string[];
  missingRegions: string[];
}> => {
  try {
    // Lista completa de códigos de região esperados na tabela de preços
    const expectedRegions = [
      // São Paulo
      'SPCAP.01', 'SPCAP.02', 'SPCAP.03', 'SPMET.01', 'SPINT.01', 'SPINT.02', 'SPINT.03', 'SPINT.04',
      // Rio de Janeiro  
      'RJCAP.01', 'RJINT.01', 'RJINT.02', 'RJINT.03',
      // Minas Gerais
      'MGCAP.01', 'MGINT.01', 'MGINT.02', 'MGINT.03',
      // Espírito Santo
      'ESCAP.01', 'ESINT.01', 'ESINT.02', 'ESINT.03',
      // Paraná
      'PRCAP.01', 'PRCAP.02', 'PRINT.01', 'PRINT.02', 'PRINT.03',
      // Santa Catarina
      'SCCAP.01', 'SCINT.01', 'SCINT.02', 'SCINT.03',
      // Rio Grande do Sul
      'RSCAP.01', 'RSINT.01', 'RSINT.02', 'RSINT.03',
      // Distrito Federal
      'DFCAP.01',
      // Goiás
      'GOCAP.01', 'GOCAP.02', 'GOINT.01',
      // Mato Grosso do Sul
      'MSCAP.01', 'MSINT.01',
      // Mato Grosso
      'MTCAP.01',
      // Bahia
      'BACAP.01', 'BAINT.01', 'BAINT.02', 'BAINT.03',
      // Pernambuco
      'PECAP.01', 'PEINT.01', 'PEINT.02', 'PEINT.03',
      // Ceará
      'CECAP.01', 'CEINT.01',
      // Maranhão
      'MACAP.01',
      // Alagoas
      'ALCAP.01', 'ALINT.01',
      // Rio Grande do Norte
      'RNCAP.01', 'RNINT.01',
      // Paraíba
      'PBCAP.01', 'PBINT.01', 'PBINT.02', 'PBINT.03',
      // Piauí
      'PICAP.01',
      // Sergipe
      'SECAP.01',
      // Pará
      'PACAP.01', 'PAINT.01',
      // Tocantins
      'TOCAP.01', 'TOINT.01', 'TOINT.02'
    ];

    // Lista completa de estados brasileiros para validação
    const expectedStates = [
      'SP', 'RJ', 'MG', 'PR', 'SC', 'RS', 'DF', 'GO', 'MS', 
      'BA', 'PE', 'CE', 'SE', 'MA', 'RN', 'AL', 'PB', 'PI', 'PA', 'TO', 'ES', 'MT'
    ];

    // Buscar todas as zonas
    const { data: zones, error: zonesError } = await supabase
      .from('shipping_zones')
      .select('*')
      .order('zone_code');

    if (zonesError) throw zonesError;

    // Verificar quais estados estão presentes na base de dados
    const statesCovered = [...new Set((zones || []).map(zone => zone.state))].sort();
    const zonesInDb = (zones || []).map(zone => zone.zone_code);
    const missingRegions = expectedRegions.filter(region => !zonesInDb.includes(region));
    
    console.log('Estados encontrados na base:', statesCovered);
    console.log('Estados esperados:', expectedStates);
    console.log('Regiões esperadas:', expectedRegions.length);
    console.log('Regiões na base:', zonesInDb.length);
    console.log('Regiões faltando:', missingRegions);
    
    const missingStates = expectedStates.filter(state => !statesCovered.includes(state));
    if (missingStates.length > 0) {
      console.warn('Estados faltando na base de dados:', missingStates);
    }

    const results: CompleteTestResult[] = [];
    const testWeights = [0.5, 1, 2, 5, 10, 15, 20, 25, 30];
    
    let totalTests = 0;
    let successfulTests = 0;

    for (const zone of zones || []) {
      const zoneResult: CompleteTestResult = {
        zone: zone.zone_code,
        state: zone.state,
        zoneType: zone.zone_type === 'CAP' ? 'Capital' : 'Interior',
        cepRange: `${zone.cep_start}-${zone.cep_end}`,
        deliveryDays: zone.delivery_days,
        expressDeliveryDays: zone.express_delivery_days,
        testResults: [],
        hasAllPrices: true,
        missingWeights: []
      };

      // Gerar CEPs de teste para esta zona
      const testCeps = generateTestCepsForZone(zone.cep_start, zone.cep_end);

      for (const testCep of testCeps) {
        for (const weight of testWeights) {
          totalTests++;
          
          try {
            // Testar cálculo de frete usando nossa função atual
            const quote = await calculateShippingQuote({
              destinyCep: testCep,
              weight,
              quantity: 1
            });

            successfulTests++;
            zoneResult.testResults.push({
              cep: testCep,
              weight,
              success: true,
              economicPrice: quote.economicPrice,
              expressPrice: quote.expressPrice,
              economicDays: quote.economicDays,
              expressDays: quote.expressDays
            });

          } catch (error) {
            zoneResult.hasAllPrices = false;
            zoneResult.testResults.push({
              cep: testCep,
              weight,
              success: false,
              error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
            
            if (!zoneResult.missingWeights.includes(weight)) {
              zoneResult.missingWeights.push(weight);
            }
          }
        }
      }

      results.push(zoneResult);
    }

    return {
      totalZones: zones?.length || 0,
      totalTests,
      successfulTests,
      failedTests: totalTests - successfulTests,
      results,
      statesCovered,
      expectedRegions,
      missingRegions
    };

  } catch (error) {
    console.error('Erro no teste completo:', error);
    throw new Error('Erro ao executar teste completo das zonas');
  }
};

// Função auxiliar para gerar CEPs de teste dentro de uma faixa
const generateTestCepsForZone = (cepStart: string, cepEnd: string): string[] => {
  const start = parseInt(cepStart);
  const end = parseInt(cepEnd);
  
  const testCeps: string[] = [];
  
  // CEP inicial
  testCeps.push(cepStart.padStart(8, '0'));
  
  // CEP do meio
  const middle = Math.floor((start + end) / 2);
  testCeps.push(middle.toString().padStart(8, '0'));
  
  // CEP final
  testCeps.push(cepEnd.padStart(8, '0'));
  
  // Mais alguns CEPs aleatórios na faixa (se a faixa for grande)
  if (end - start > 10000) {
    const quarter = Math.floor((start + middle) / 2);
    const threeQuarter = Math.floor((middle + end) / 2);
    testCeps.push(quarter.toString().padStart(8, '0'));
    testCeps.push(threeQuarter.toString().padStart(8, '0'));
  }
  
  return testCeps;
};

export interface CompleteTestResult {
  zone: string;
  state: string;
  zoneType: string;
  cepRange: string;
  deliveryDays: number;
  expressDeliveryDays: number;
  testResults: TestResult[];
  hasAllPrices: boolean;
  missingWeights: number[];
}

export interface TestResult {
  cep: string;
  weight: number;
  success: boolean;
  economicPrice?: number;
  expressPrice?: number;
  economicDays?: number;
  expressDays?: number;
  error?: string;
}

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