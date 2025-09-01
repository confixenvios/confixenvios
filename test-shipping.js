// Script para testar o sistema de frete
import { testShippingSystem, validateZonesConfiguration } from './src/utils/testShippingSystem.ts';

console.log('🔥 TESTE COMPLETO DO SISTEMA DE FRETE 🔥');
console.log('==========================================');

// Executar testes
async function runTests() {
  try {
    // 1. Validar configuração das zonas
    console.log('\n1️⃣ VALIDANDO CONFIGURAÇÃO DAS ZONAS...');
    const zonesValidation = await validateZonesConfiguration();
    
    if (zonesValidation.success) {
      console.log(`✅ Total de zonas configuradas: ${zonesValidation.totalZones}`);
      console.log('📊 Zonas por estado:', zonesValidation.statesSummary);
      
      if (zonesValidation.missingStates?.length > 0) {
        console.log('⚠️ Estados faltando:', zonesValidation.missingStates);
      }
    } else {
      console.error('❌ Erro na validação:', zonesValidation.error);
      return;
    }

    // 2. Testar cotações
    console.log('\n2️⃣ TESTANDO COTAÇÕES POR ESTADO...');
    const testResults = await testShippingSystem();
    
    console.log('\n📈 RESUMO GERAL:');
    console.log(`Total de testes: ${testResults.totalTests}`);
    console.log(`Sucessos: ${testResults.successfulTests}`);
    console.log(`Falhas: ${testResults.failedTests}`);
    console.log(`Taxa de sucesso: ${((testResults.successfulTests / testResults.totalTests) * 100).toFixed(1)}%`);
    
    console.log('\n📊 RESUMO POR ESTADO:');
    for (const [state, stats] of Object.entries(testResults.summary)) {
      const successRate = ((stats.success / stats.total) * 100).toFixed(1);
      const status = stats.success === stats.total ? '✅' : '⚠️';
      console.log(`${status} ${state}: ${stats.success}/${stats.total} (${successRate}%)`);
    }
    
    // 3. Mostrar erros se houver
    if (testResults.failedTests > 0) {
      console.log('\n❌ ERROS ENCONTRADOS:');
      const errors = testResults.results.filter(r => !r.success);
      errors.forEach(error => {
        console.log(`${error.state} ${error.cep} ${error.weight}kg: ${error.error}`);
      });
    }
    
    console.log('\n🎉 TESTE CONCLUÍDO!');
    
  } catch (error) {
    console.error('💥 Erro durante os testes:', error);
  }
}

runTests();