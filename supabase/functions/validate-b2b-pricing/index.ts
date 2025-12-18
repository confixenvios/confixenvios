import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PricingRequest {
  volume_count: number;
  volume_weights: number[];
  unique_address_count: number;
  client_price?: number; // Preço calculado pelo cliente (para validação)
}

interface PricingResponse {
  success: boolean;
  calculated_price: number;
  breakdown: {
    base_price: number;
    address_count: number;
    weight_extra: number;
    volume_extra: number;
    total_weight: number;
    volume_count: number;
  };
  is_valid?: boolean;
  error?: string;
}

// Regras de precificação (centralizadas e seguras)
const PRICING_RULES = {
  BASE_PRICE_PER_ADDRESS: 15, // R$15 por endereço único
  WEIGHT_THRESHOLD_KG: 5,     // Limite de peso sem adicional
  WEIGHT_EXTRA_PER_KG: 1,     // R$1 por kg acima do limite
  VOLUME_THRESHOLD: 3,        // Limite de volumes sem adicional
  VOLUME_EXTRA_PER_UNIT: 5,   // R$5 por volume acima do limite
};

function calculateSecurePrice(data: PricingRequest): PricingResponse {
  try {
    // Validação de entrada
    if (!data.volume_count || data.volume_count < 1) {
      return {
        success: false,
        calculated_price: 0,
        breakdown: { base_price: 0, address_count: 0, weight_extra: 0, volume_extra: 0, total_weight: 0, volume_count: 0 },
        error: 'Quantidade de volumes inválida'
      };
    }

    if (!data.unique_address_count || data.unique_address_count < 1) {
      return {
        success: false,
        calculated_price: 0,
        breakdown: { base_price: 0, address_count: 0, weight_extra: 0, volume_extra: 0, total_weight: 0, volume_count: 0 },
        error: 'Quantidade de endereços inválida'
      };
    }

    // Calcular preço base por endereço
    const addressCount = Math.max(data.unique_address_count, 1);
    const basePrice = addressCount * PRICING_RULES.BASE_PRICE_PER_ADDRESS;

    // Calcular peso total
    const weights = data.volume_weights || [];
    const totalWeight = weights.reduce((sum, w) => sum + (parseFloat(String(w)) || 0), 0);

    // Adicional de peso: R$1 por kg acima de 5kg
    let weightExtra = 0;
    if (totalWeight > PRICING_RULES.WEIGHT_THRESHOLD_KG) {
      weightExtra = Math.ceil(totalWeight - PRICING_RULES.WEIGHT_THRESHOLD_KG) * PRICING_RULES.WEIGHT_EXTRA_PER_KG;
    }

    // Adicional de volumes: R$5 por volume a partir do 4º
    let volumeExtra = 0;
    if (data.volume_count > PRICING_RULES.VOLUME_THRESHOLD) {
      volumeExtra = (data.volume_count - PRICING_RULES.VOLUME_THRESHOLD) * PRICING_RULES.VOLUME_EXTRA_PER_UNIT;
    }

    const calculatedPrice = basePrice + weightExtra + volumeExtra;

    const response: PricingResponse = {
      success: true,
      calculated_price: calculatedPrice,
      breakdown: {
        base_price: basePrice,
        address_count: addressCount,
        weight_extra: weightExtra,
        volume_extra: volumeExtra,
        total_weight: totalWeight,
        volume_count: data.volume_count
      }
    };

    // Se o cliente enviou um preço, validar se está correto
    if (data.client_price !== undefined) {
      const priceDifference = Math.abs(data.client_price - calculatedPrice);
      // Tolerância de R$0.01 para erros de arredondamento
      response.is_valid = priceDifference < 0.01;
      
      if (!response.is_valid) {
        console.log(`[SECURITY] Price manipulation detected! Client: R$${data.client_price}, Server: R$${calculatedPrice}`);
        response.error = 'Preço inválido. O valor foi recalculado no servidor.';
      }
    }

    console.log(`[PRICING] Calculated: R$${calculatedPrice} | Addresses: ${addressCount} | Weight: ${totalWeight}kg | Volumes: ${data.volume_count}`);

    return response;
  } catch (error) {
    console.error('[PRICING ERROR]', error);
    return {
      success: false,
      calculated_price: 0,
      breakdown: { base_price: 0, address_count: 0, weight_extra: 0, volume_extra: 0, total_weight: 0, volume_count: 0 },
      error: 'Erro ao calcular preço'
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: PricingRequest = await req.json();
    
    console.log('[PRICING REQUEST]', JSON.stringify(data));
    
    const result = calculateSecurePrice(data);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: result.success ? 200 : 400
    });
  } catch (error) {
    console.error('[PRICING FUNCTION ERROR]', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Erro interno ao processar precificação',
      calculated_price: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
