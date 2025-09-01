import { calculateShippingQuote } from '@/services/shippingService';

export const quickShippingTest = async () => {
  const testCases = [
    // São Paulo (Capital)
    { city: 'São Paulo', state: 'SP', cep: '01310-100', weight: 10 },
    // Rio de Janeiro (Capital)  
    { city: 'Rio de Janeiro', state: 'RJ', cep: '20040-020', weight: 10 },
    // Belo Horizonte (MG)
    { city: 'Belo Horizonte', state: 'MG', cep: '30112-000', weight: 10 },
    // Salvador (BA)
    { city: 'Salvador', state: 'BA', cep: '40070-110', weight: 10 },
    // Cuiabá (MT)
    { city: 'Cuiabá', state: 'MT', cep: '78000-000', weight: 10 },
    // Goiânia (GO) - Local
    { city: 'Goiânia', state: 'GO', cep: '74000-000', weight: 10 },
    // Brasília (DF)
    { city: 'Brasília', state: 'DF', cep: '70040-010', weight: 10 },
    // Porto Alegre (RS)
    { city: 'Porto Alegre', state: 'RS', cep: '90000-000', weight: 10 },
    // Recife (PE)
    { city: 'Recife', state: 'PE', cep: '50000-000', weight: 10 },
    // Fortaleza (CE)
    { city: 'Fortaleza', state: 'CE', cep: '60000-000', weight: 10 },
    // Belém (PA)
    { city: 'Belém', state: 'PA', cep: '66000-000', weight: 10 }
  ];

  console.log('🚀 TESTE RÁPIDO DO SISTEMA DE FRETE - 10KG');
  console.log('============================================');

  const results = [];

  for (const testCase of testCases) {
    try {
      const quote = await calculateShippingQuote({
        destinyCep: testCase.cep,
        weight: testCase.weight,
        quantity: 1
      });

      results.push({
        ...testCase,
        success: true,
        economicPrice: quote.economicPrice,
        expressPrice: quote.expressPrice,
        economicDays: quote.economicDays,
        expressDays: quote.expressDays,
        zone: quote.zone,
        zoneName: quote.zoneName
      });

      console.log(`✅ ${testCase.city}/${testCase.state} (${testCase.cep})`);
      console.log(`   Econômica: R$ ${quote.economicPrice.toFixed(2)} - ${quote.economicDays} dias`);
      console.log(`   Expressa: R$ ${quote.expressPrice.toFixed(2)} - ${quote.expressDays} dias`);
      console.log(`   Zona: ${quote.zone} (${quote.zoneName})`);
      console.log('');

    } catch (error) {
      results.push({
        ...testCase,
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });

      console.log(`❌ ${testCase.city}/${testCase.state} (${testCase.cep}) - ERRO:`);
      console.log(`   ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      console.log('');
    }
  }

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  const successRate = ((successCount / totalCount) * 100).toFixed(1);

  console.log('📊 RESUMO DO TESTE:');
  console.log(`Total: ${totalCount}`);
  console.log(`Sucessos: ${successCount}`);
  console.log(`Falhas: ${totalCount - successCount}`);
  console.log(`Taxa de sucesso: ${successRate}%`);

  if (successCount === totalCount) {
    console.log('🎉 TODOS OS TESTES PASSARAM! Sistema funcionando perfeitamente.');
  } else {
    console.log('⚠️ Alguns testes falharam. Verifique os erros acima.');
  }

  return results;
};