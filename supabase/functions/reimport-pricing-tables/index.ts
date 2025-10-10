import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔄 Iniciando reimportação de tabelas Jadlog e Alfa...');

    // Reimportar Jadlog
    console.log('📦 Reimportando Jadlog...');
    const jadlogResponse = await supabase.functions.invoke('import-jadlog-data', {
      body: {}
    });

    if (jadlogResponse.error) {
      console.error('❌ Erro ao reimportar Jadlog:', jadlogResponse.error);
    } else {
      console.log('✅ Jadlog reimportado:', jadlogResponse.data);
    }

    // Reimportar Alfa
    console.log('📦 Reimportando Alfa...');
    const alfaResponse = await supabase.functions.invoke('import-alfa-data', {
      body: {}
    });

    if (alfaResponse.error) {
      console.error('❌ Erro ao reimportar Alfa:', alfaResponse.error);
    } else {
      console.log('✅ Alfa reimportado:', alfaResponse.data);
    }

    return new Response(
      JSON.stringify({
        success: true,
        jadlog: jadlogResponse.data,
        alfa: alfaResponse.data,
        message: 'Tabelas reimportadas com sucesso'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
