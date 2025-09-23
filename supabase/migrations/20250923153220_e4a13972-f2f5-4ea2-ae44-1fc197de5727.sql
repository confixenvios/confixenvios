-- Corrigir search_path das funções de API key para segurança
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_api_key TEXT;
BEGIN
  -- Gerar uma API key com formato: conf_live_[32 caracteres aleatórios]
  new_api_key := 'conf_live_' || encode(gen_random_bytes(24), 'base64');
  -- Remover caracteres especiais que podem causar problemas
  new_api_key := replace(replace(replace(new_api_key, '+', ''), '/', ''), '=', '');
  
  RETURN new_api_key;
END;
$$;

-- Corrigir search_path da função de validação de API key
CREATE OR REPLACE FUNCTION public.validate_api_key(p_api_key TEXT)
RETURNS TABLE(
  key_id UUID,
  company_name TEXT,
  is_valid BOOLEAN,
  rate_limit_per_hour INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ak.id,
    ak.company_name,
    ak.is_active AND (ak.rate_limit_per_hour > COALESCE(
      (SELECT COUNT(*) FROM public.api_usage_logs 
       WHERE api_key_id = ak.id 
       AND created_at > (now() - interval '1 hour')), 0
    )) as is_valid,
    ak.rate_limit_per_hour
  FROM public.api_keys ak
  WHERE ak.api_key = p_api_key;
END;
$$;