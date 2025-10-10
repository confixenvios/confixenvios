import { supabase } from "@/integrations/supabase/client";
import { PricingTableService } from "./pricingTableService";

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

// Aparecida de Goiânia é sempre nossa origem
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
    console.log('🚀 [ShippingService] INÍCIO');
    console.log('📍 CEP:', destinyCep, '| Peso:', weight, 'kg');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Chamar o pricing service (já tem lógica de IA interna)
    const multiTableQuote = await PricingTableService.getMultiTableQuote({ 
      destinyCep, 
      weight, 
      quantity, 
      length, 
      width, 
      height, 
      merchandiseValue 
    });

    if (multiTableQuote) {
      console.log('✅ [ShippingService] RESULTADO RECEBIDO:');
      console.log('   📦 Transportadora:', multiTableQuote.tableName);
      console.log('   💰 Preço:', multiTableQuote.economicPrice);
      console.log('   📅 Prazo:', multiTableQuote.economicDays, 'dias');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return multiTableQuote;
    }

    console.error('❌ [ShippingService] Pricing service retornou NULL');
    throw new Error('Serviço de cotação não disponível');
    
  } catch (error) {
    console.error('❌ [ShippingService] ERRO:', error);
    throw error;
  }
};

// Função do sistema antigo renomeada
const calculateLegacyShippingQuote = async ({
  destinyCep,
  weight,
  quantity = 1,
  merchandiseValue
}: QuoteRequest): Promise<ShippingQuote> => {
  console.log(`Calculando via sistema legado - CEP: ${destinyCep}, Peso: ${weight}kg`);
  
  // Remove formatação do CEP e garante 8 dígitos
  const cleanCep = destinyCep.replace(/\D/g, '').padStart(8, '0');
  
  // Validar CEP primeiro
  if (cleanCep.length !== 8 || cleanCep === '00000000') {
    throw new Error(`CEP ${destinyCep} é inválido. Verifique o formato e tente novamente.`);
  }
  
  // Busca a zona de destino baseada no CEP
  const { data: zones, error: zoneError } = await supabase
    .from('shipping_zones_magalog')
    .select('*')
    .lte('cep_start', cleanCep)
    .gte('cep_end', cleanCep)
    .limit(1);

  if (zoneError) {
    console.error('Erro na consulta de zonas:', zoneError);
    throw new Error(`Erro ao consultar zonas de entrega: ${zoneError.message}`);
  }

  if (!zones || zones.length === 0) {
    throw new Error(`CEP ${destinyCep} não é atendido pela nossa região de cobertura. Consulte outros CEPs próximos ou entre em contato conosco.`);
  }

  const zone = zones[0];
  console.log(`Zona encontrada: ${zone.zone_code} (${zone.state})`);

  // Busca o preço baseado no peso e zona
  const { data: pricing, error: priceError } = await supabase
    .from('shipping_pricing_magalog')
    .select('*')
    .eq('zone_code', zone.zone_code)
    .lte('weight_min', weight)
    .gte('weight_max', weight)
    .limit(1);

  if (priceError) {
    console.error('Erro na consulta de preços:', priceError);
    throw new Error(`Erro ao consultar tabela de preços: ${priceError.message}`);
  }

  let basePrice: number;
  let excessWeightCharge = 0;
  const EXCESS_WEIGHT_THRESHOLD = 30; // kg
  const EXCESS_WEIGHT_CHARGE_PER_KG = 10; // R$/kg

  if (!pricing || pricing.length === 0) {
    // Se não encontrou faixa exata, buscar a maior faixa disponível para aplicar excesso
    console.log(`⚠️ Peso ${weight}kg excede faixas disponíveis. Buscando maior faixa...`);
    
    const { data: maxWeightPricing, error: maxError } = await supabase
      .from('shipping_pricing_magalog')
      .select('*')
      .eq('zone_code', zone.zone_code)
      .order('weight_max', { ascending: false })
      .limit(1);

    if (maxError || !maxWeightPricing || maxWeightPricing.length === 0) {
      throw new Error(
        `Peso ${weight}kg não encontrado na tabela padrão para ${zone.state} ${zone.zone_type === 'CAP' ? 'Capital' : 'Interior'}. ` +
        `Entre em contato conosco ou consulte nossas tabelas especiais de preço.`
      );
    }

    basePrice = maxWeightPricing[0].price;
    
    // Aplicar cargo de excesso se o peso ultrapassar o limite
    if (weight > EXCESS_WEIGHT_THRESHOLD) {
      const excessWeight = weight - EXCESS_WEIGHT_THRESHOLD;
      excessWeightCharge = excessWeight * EXCESS_WEIGHT_CHARGE_PER_KG;
      console.log(`💰 Peso excedente: ${excessWeight}kg × R$${EXCESS_WEIGHT_CHARGE_PER_KG} = R$${excessWeightCharge.toFixed(2)}`);
    }
    
    console.log(`✅ Usando maior faixa disponível: até ${maxWeightPricing[0].weight_max}kg - Base: R$${basePrice} + Excesso: R$${excessWeightCharge.toFixed(2)}`);
  } else {
    basePrice = pricing[0].price;
    console.log(`Preço base encontrado: R$ ${basePrice}`);
  }
  
  // Multiplica o preço base pela quantidade de pacotes e adiciona cargo de excesso
  const basePriceWithQuantity = (basePrice + excessWeightCharge) * quantity;
  
  console.log(`📦 Cálculo base: R$${basePrice.toFixed(2)} + R$${excessWeightCharge.toFixed(2)} (excesso) × ${quantity} (qtd) = R$${basePriceWithQuantity.toFixed(2)}`);
  
  // Calcular seguro (1.3% do valor da mercadoria declarada)
  let insuranceValue = 0;
  if (merchandiseValue && merchandiseValue > 0) {
    const insurancePercentage = 0.013; // 1.3%
    insuranceValue = merchandiseValue * insurancePercentage;
    console.log(`🛡️ Valor da mercadoria: R$${merchandiseValue.toFixed(2)}`);
    console.log(`🛡️ Seguro (1.3%): R$${insuranceValue.toFixed(2)}`);
  }
  
  // Preço econômico é o preço base da tabela + seguro
  const economicPrice = basePriceWithQuantity + insuranceValue;
  
  console.log(`✅ Preço Econômico Final: R$${basePriceWithQuantity.toFixed(2)} (tabela) + R$${insuranceValue.toFixed(2)} (seguro) = R$${economicPrice.toFixed(2)}`);
  
  // Preço expresso tem 60% de acréscimo sobre o preço base + seguro
  const expressPrice = (basePriceWithQuantity * 1.6) + insuranceValue;

  const result = {
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
  
  console.log('Cotação calculada via sistema legado:', result);
  return result;
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

// Utility para limpar cache de cotações
export const clearQuoteCache = () => {
  const keys = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.startsWith('pricing_fallback_') || key.startsWith('active_pricing_tables'))) {
      keys.push(key);
    }
  }
  keys.forEach(key => sessionStorage.removeItem(key));
  console.log('Cache de cotações limpo:', keys.length, 'itens removidos');
};