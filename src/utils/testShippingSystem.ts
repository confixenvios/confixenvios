import { calculateShippingQuote } from '@/services/shippingService';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  state: string;
  cep: string;
  weight: number;
  success: boolean;
  economicPrice?: number;
  expressPrice?: number;
  economicDays?: number;
  expressDays?: number;
  error?: string;
}

// Função para testar cotações em uma amostra de CEPs de cada estado
export const testShippingSystem = async (): Promise<{
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  results: TestResult[];
  summary: { [state: string]: { success: number; total: number } };
}> => {
  // CEPs de teste para cada estado (capitais e algumas cidades do interior)
  const testCEPs = [
    // São Paulo
    { state: 'SP', cep: '01310-100' }, // São Paulo Capital
    { state: 'SP', cep: '13010-111' }, // Campinas
    { state: 'SP', cep: '14801-000' }, // Araraquara
    
    // Rio de Janeiro
    { state: 'RJ', cep: '20040-020' }, // Rio de Janeiro Capital
    { state: 'RJ', cep: '24000-000' }, // Niterói
    
    // Minas Gerais
    { state: 'MG', cep: '30112-000' }, // Belo Horizonte
    { state: 'MG', cep: '36010-000' }, // Juiz de Fora
    
    // Bahia
    { state: 'BA', cep: '40070-110' }, // Salvador
    { state: 'BA', cep: '45000-000' }, // Feira de Santana
    
    // Goiás
    { state: 'GO', cep: '74000-000' }, // Goiânia
    { state: 'GO', cep: '75000-000' }, // Anápolis
    
    // Distrito Federal
    { state: 'DF', cep: '70040-010' }, // Brasília
    
    // Mato Grosso
    { state: 'MT', cep: '78000-000' }, // Cuiabá
    
    // Mato Grosso do Sul
    { state: 'MS', cep: '79000-000' }, // Campo Grande
    
    // Paraná
    { state: 'PR', cep: '80010-000' }, // Curitiba
    { state: 'PR', cep: '87000-000' }, // Maringá
    
    // Santa Catarina
    { state: 'SC', cep: '88000-000' }, // Florianópolis
    
    // Rio Grande do Sul
    { state: 'RS', cep: '90000-000' }, // Porto Alegre
    
    // Espírito Santo
    { state: 'ES', cep: '29000-000' }, // Vitória
    
    // Pernambuco
    { state: 'PE', cep: '50000-000' }, // Recife
    
    // Ceará
    { state: 'CE', cep: '60000-000' }, // Fortaleza
    
    // Paraíba
    { state: 'PB', cep: '58000-000' }, // João Pessoa
    
    // Rio Grande do Norte
    { state: 'RN', cep: '59000-000' }, // Natal
    
    // Alagoas
    { state: 'AL', cep: '57000-000' }, // Maceió
    
    // Sergipe
    { state: 'SE', cep: '49000-000' }, // Aracaju
    
    // Piauí
    { state: 'PI', cep: '64000-000' }, // Teresina
    
    // Maranhão
    { state: 'MA', cep: '65000-000' }, // São Luís
    
    // Pará
    { state: 'PA', cep: '66000-000' }, // Belém
    
    // Tocantins
    { state: 'TO', cep: '77000-000' }, // Palmas
  ];

  const testWeights = [1, 5, 10, 15, 20]; // Pesos de teste em kg

  const results: TestResult[] = [];
  let successfulTests = 0;
  let failedTests = 0;

  console.log('🚀 Iniciando teste completo do sistema de frete...');

  for (const testCase of testCEPs) {
    for (const weight of testWeights) {
      try {
        const quote = await calculateShippingQuote({
          destinyCep: testCase.cep,
          weight,
          quantity: 1
        });

        results.push({
          state: testCase.state,
          cep: testCase.cep,
          weight,
          success: true,
          economicPrice: quote.economicPrice,
          expressPrice: quote.expressPrice,
          economicDays: quote.economicDays,
          expressDays: quote.expressDays
        });

        successfulTests++;
        console.log(`✅ ${testCase.state} ${testCase.cep} ${weight}kg - OK`);
      } catch (error) {
        results.push({
          state: testCase.state,
          cep: testCase.cep,
          weight,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });

        failedTests++;
        console.log(`❌ ${testCase.state} ${testCase.cep} ${weight}kg - ERRO: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }
  }

  // Calcular resumo por estado
  const summary: { [state: string]: { success: number; total: number } } = {};
  for (const result of results) {
    if (!summary[result.state]) {
      summary[result.state] = { success: 0, total: 0 };
    }
    summary[result.state].total++;
    if (result.success) {
      summary[result.state].success++;
    }
  }

  console.log('📊 Resultado do teste:', {
    totalTests: results.length,
    successfulTests,
    failedTests,
    successRate: `${((successfulTests / results.length) * 100).toFixed(1)}%`
  });

  return {
    totalTests: results.length,
    successfulTests,
    failedTests,
    results,
    summary
  };
};

// Função para validar configuração das zonas
export const validateZonesConfiguration = async () => {
  console.log('🔍 Validando configuração das zonas...');
  
  const { data: zones, error } = await supabase
    .from('shipping_zones')
    .select('*')
    .order('state, zone_code');

  if (error) {
    console.error('❌ Erro ao buscar zonas:', error);
    return { success: false, error: error.message };
  }

  const statesSummary: { [state: string]: number } = {};
  const allStates = ['SP', 'RJ', 'MG', 'PR', 'SC', 'RS', 'DF', 'GO', 'MS', 'MT', 'BA', 'PE', 'CE', 'PB', 'RN', 'AL', 'SE', 'PI', 'MA', 'PA', 'TO', 'ES'];
  
  zones?.forEach(zone => {
    statesSummary[zone.state] = (statesSummary[zone.state] || 0) + 1;
  });

  const missingStates = allStates.filter(state => !statesSummary[state]);
  
  console.log('📋 Estados configurados:', statesSummary);
  
  if (missingStates.length > 0) {
    console.log('⚠️ Estados faltando:', missingStates);
  } else {
    console.log('✅ Todos os estados estão configurados');
  }

  return {
    success: true,
    totalZones: zones?.length || 0,
    statesSummary,
    missingStates,
    zones: zones || []
  };
};