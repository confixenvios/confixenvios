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
    console.log(`Iniciando cálculo de frete - CEP: ${destinyCep}, Peso: ${weight}kg, Qtd: ${quantity}`);
    
    // Validar peso máximo primeiro
    if (weight > 30) {
      throw new Error(`Não atendemos envios acima de 30kg. Peso informado: ${weight}kg. Para cargas maiores, entre em contato conosco.`);
    }

    // OTIMIZAÇÃO: Verificar cache local primeiro (evita chamadas repetidas)
    const cacheKey = `pricing_tables_${Date.now()}`;
    const cachedResult = sessionStorage.getItem('pricing_fallback_' + destinyCep + '_' + weight);
    
    if (cachedResult) {
      console.log('Usando resultado em cache');
      return JSON.parse(cachedResult);
    }

    // Tentar buscar cotação das tabelas com timeout rápido
    let multiTableQuote: ShippingQuote | null = null;
    try {
      console.log('Tentando cotação via tabelas de preços...');
      multiTableQuote = await Promise.race([
        PricingTableService.getMultiTableQuote({ destinyCep, weight, quantity }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)) // 3 segundos máximo
      ]);
    } catch (error) {
      console.warn('Erro nas tabelas, usando fallback:', error);
      multiTableQuote = null;
    }

    if (multiTableQuote) {
      console.log('Cotação encontrada via tabelas:', multiTableQuote);
      // Cache por 5 minutos
      sessionStorage.setItem('pricing_fallback_' + destinyCep + '_' + weight, JSON.stringify(multiTableQuote));
      return multiTableQuote;
    }

    // Fallback IMEDIATO para o sistema legado
    console.log('Usando sistema legado como fallback');
    const legacyQuote = await calculateLegacyShippingQuote({ destinyCep, weight, quantity });
    
    // Cache o resultado do fallback por 2 minutos
    sessionStorage.setItem('pricing_fallback_' + destinyCep + '_' + weight, JSON.stringify(legacyQuote));
    
    return legacyQuote;
    
  } catch (error) {
    console.error('Erro ao calcular frete:', error);
    
    // Se for erro de validação nosso, manter a mensagem amigável
    if (error instanceof Error && (error.message.includes('não') || error.message.includes('kg'))) {
      throw error;
    }
    
    // Para outros erros, dar mensagem específica
    throw new Error('Erro no cálculo do frete. Verifique se o CEP de destino está correto e tente novamente.');
  }
};

// Função do sistema antigo renomeada
const calculateLegacyShippingQuote = async ({
  destinyCep,
  weight,
  quantity = 1
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
    .from('shipping_zones')
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
      `Faixas disponíveis: ${ranges}. Entre em contato conosco para este peso específico.`
    );
  }

  const basePrice = pricing[0].price;
  console.log(`Preço base encontrado: R$ ${basePrice}`);
  
  // Multiplica o preço base pela quantidade de pacotes
  const basePriceWithQuantity = basePrice * quantity;
  
  // Preço econômico é o preço base multiplicado pela quantidade
  const economicPrice = basePriceWithQuantity;
  
  // Preço expresso tem 60% de acréscimo
  const expressPrice = basePriceWithQuantity * 1.6;

  const result = {
    economicPrice: Number(economicPrice.toFixed(2)),
    expressPrice: Number(expressPrice.toFixed(2)),
    economicDays: zone.delivery_days,
    expressDays: zone.express_delivery_days,
    zone: zone.zone_code,
    zoneName: `${zone.state} - ${zone.zone_type === 'CAP' ? 'Capital' : 'Interior'}`,
    tableId: 'legacy',
    tableName: 'Sistema Legado Confix',
    cnpj: '00000000000000'
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