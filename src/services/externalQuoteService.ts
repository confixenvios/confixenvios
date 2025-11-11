import { supabase } from "@/integrations/supabase/client";

export interface ExternalQuoteRequest {
  destinyCep: string;
  weight: number;
  quantity?: number;
  merchandiseValue?: number;
  length?: number;
  width?: number;
  height?: number;
  tipo?: "Normal" | "Expresso";
}

export interface ExternalQuote {
  economicPrice: number;
  economicDays: number;
  expressPrice: number;
  expressDays: number;
  zone: string;
  zoneName: string;
  tableId: string;
  tableName: string;
  cnpj: string;
  insuranceValue?: number;
  basePrice?: number;
  cubicWeight?: number;
  appliedWeight?: number;
  additionals_applied?: any[];
}

/**
 * Calcula cotação de frete usando API externa Confix
 */
export async function calculateExternalQuote(
  request: ExternalQuoteRequest
): Promise<ExternalQuote> {
  console.log('[External Quote Service] Requesting quote:', request);

  try {
    const { data, error } = await supabase.functions.invoke('external-quote-api', {
      body: request
    });

    if (error) {
      console.error('[External Quote Service] Error:', error);
      throw new Error(`Erro ao calcular frete: ${error.message}`);
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Erro desconhecido ao calcular frete');
    }

    console.log('[External Quote Service] Quote received:', data.quote);
    return data.quote;
  } catch (error) {
    console.error('[External Quote Service] Exception:', error);
    throw error;
  }
}

/**
 * Valida CEP
 */
export function validateCep(cep: string): boolean {
  const cleanCep = cep.replace(/\D/g, '');
  return cleanCep.length === 8 && /^\d+$/.test(cleanCep);
}

/**
 * Formata CEP para padrão XXXXX-XXX
 */
export function formatCep(cep: string): string {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return cep;
  return `${cleanCep.substring(0, 5)}-${cleanCep.substring(5)}`;
}
