import { calculateExternalQuote, type ExternalQuoteRequest } from './externalQuoteService';

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
  cubicWeight?: number;
  appliedWeight?: number;
}

export interface QuoteRequest {
  destinyCep: string;
  weight: number;
  quantity?: number;
  length?: number;
  width?: number;
  height?: number;
  merchandiseValue?: number;
}

/**
 * Calcula cotação de frete usando API externa Confix
 */
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
    console.log('[Shipping Service] Calculando cotação via API externa:', {
      destinyCep,
      weight,
      quantity,
      dimensions: { length, width, height },
      merchandiseValue
    });

    // Chamar API externa através do serviço
    const externalRequest: ExternalQuoteRequest = {
      destinyCep,
      weight,
      quantity,
      merchandiseValue,
      length,
      width,
      height,
      tipo: "Normal"
    };

    const quote = await calculateExternalQuote(externalRequest);

    console.log('[Shipping Service] Cotação recebida da API externa:', quote);

    return {
      economicPrice: quote.economicPrice,
      expressPrice: quote.expressPrice,
      economicDays: quote.economicDays,
      expressDays: quote.expressDays,
      zone: quote.zone,
      zoneName: quote.zoneName,
      tableId: quote.tableId,
      tableName: quote.tableName,
      cnpj: quote.cnpj || '',
      insuranceValue: quote.insuranceValue,
      basePrice: quote.basePrice,
      cubicWeight: quote.cubicWeight,
      appliedWeight: quote.appliedWeight
    };
  } catch (error) {
    console.error('[Shipping Service] Erro ao calcular cotação:', error);
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
