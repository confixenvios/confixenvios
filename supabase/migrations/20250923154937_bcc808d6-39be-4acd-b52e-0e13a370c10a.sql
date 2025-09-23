-- Habilitar extensão pgcrypto se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Corrigir função para gerar API key usando gen_random_uuid e encode
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_api_key TEXT;
  random_part TEXT;
BEGIN
  -- Gerar parte aleatória usando gen_random_uuid e encode
  random_part := encode(decode(replace(gen_random_uuid()::text, '-', ''), 'hex'), 'base64');
  -- Remover caracteres especiais e truncar para tamanho adequado
  random_part := replace(replace(replace(random_part, '+', ''), '/', ''), '=', '');
  random_part := substring(random_part from 1 for 24);
  
  -- Criar API key com formato: conf_live_[24 caracteres aleatórios]
  new_api_key := 'conf_live_' || random_part;
  
  RETURN new_api_key;
END;
$$;