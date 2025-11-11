import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      destinyCep, 
      weight, 
      quantity = 1,
      merchandiseValue,
      length,
      width,
      height,
      tipo = "Normal" 
    } = await req.json();

    console.log('[External Quote API] Request:', { 
      destinyCep, weight, quantity, merchandiseValue, length, width, height 
    });

    // Validações
    if (!destinyCep || !weight) {
      throw new Error('CEP de destino e peso são obrigatórios');
    }

    // Obter token da API
    const CONFIX_API_TOKEN = Deno.env.get('CONFIX_API_TOKEN');
    if (!CONFIX_API_TOKEN) {
      console.error('[External Quote API] Token não configurado');
      throw new Error('Token da API não configurado');
    }

    // Limpar CEP (remover formatação)
    const cleanCep = destinyCep.replace(/\D/g, '');

    // Preparar payload para API externa
    const apiPayload = {
      cep: cleanCep,
      quantidade: quantity,
      valorDeclarado: merchandiseValue || 0,
      peso: weight,
      comprimento: length || 10,
      largura: width || 10,
      altura: height || 10,
      tipo: tipo
    };

    console.log('[External Quote API] Calling external API with:', apiPayload);

    // Chamar API externa
    const response = await fetch('https://api-freteconfix.onrender.com/frete/confix', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${CONFIX_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[External Quote API] API error:', response.status, errorText);
      throw new Error(`Erro na API externa: ${response.status} - ${errorText}`);
    }

    const externalData = await response.json();
    console.log('[External Quote API] External API response:', externalData);

    // Mapear resposta da API externa para formato esperado pelo sistema
    const quote = {
      economicPrice: externalData.valorFrete || 0,
      economicDays: externalData.prazoEntrega || 5,
      expressPrice: externalData.valorFreteExpresso || externalData.valorFrete || 0,
      expressDays: externalData.prazoEntregaExpresso || externalData.prazoEntrega || 3,
      zone: externalData.transportadora || 'API Externa',
      zoneName: externalData.tipoServico || 'Padrão',
      tableId: 'external-api',
      tableName: 'Confix API',
      cnpj: '',
      insuranceValue: externalData.valorSeguro || 0,
      basePrice: externalData.valorBase || externalData.valorFrete || 0,
      cubicWeight: externalData.pesoCubado || weight,
      appliedWeight: weight,
      additionals_applied: externalData.adicionais || []
    };

    console.log('[External Quote API] Mapped quote:', quote);

    return new Response(
      JSON.stringify({
        success: true,
        quote: quote
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[External Quote API] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro ao calcular frete'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
