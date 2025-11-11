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
    
    // Log detalhado das diferenças
    console.log('[External Quote API] COMPARAÇÃO:');
    console.log('  Mais Barato  :', externalData.maisbarato?.transportadora, 'R$', externalData.maisbarato?.preco_total, '-', externalData.maisbarato?.prazo, 'dias');
    console.log('  Mais Rápido  :', externalData.maisRapido?.transportadora, 'R$', externalData.maisRapido?.preco_total, '-', externalData.maisRapido?.prazo, 'dias');

    // Mapear resposta da API externa para formato esperado pelo sistema
    // A API retorna dois objetos: maisbarato (econômico) e maisRapido (expresso)
    const maisbarato = externalData.maisbarato || {};
    const maisRapido = externalData.maisRapido || {};
    
    const quote = {
      // Opção Econômica (mais barato)
      economicPrice: maisbarato.preco_total || 0,
      economicDays: maisbarato.prazo || 5,
      
      // Opção Expressa (mais rápido)
      expressPrice: maisRapido.preco_total || 0,
      expressDays: maisRapido.prazo || 3,
      
      // Metadados (usar dados da opção econômica como padrão)
      zone: maisbarato.transportadora || 'API Externa',
      zoneName: maisbarato.regiao || 'Padrão',
      tableId: 'external-api',
      tableName: `${maisbarato.transportadora || 'Confix API'}`,
      cnpj: '',
      
      // Valores técnicos
      insuranceValue: 0,
      basePrice: maisbarato.preco_unitario || 0,
      cubicWeight: maisbarato.peso_cubado || weight,
      appliedWeight: maisbarato.peso_real || weight,
      
      // Dados adicionais para referência
      additionals_applied: [],
      economicCarrier: maisbarato.transportadora || '',
      expressCarrier: maisRapido.transportadora || '',
      economicRegion: maisbarato.regiao || '',
      expressRegion: maisRapido.regiao || ''
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
