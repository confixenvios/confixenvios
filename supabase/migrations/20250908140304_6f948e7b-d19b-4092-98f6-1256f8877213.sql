-- Garantir que a extensão pgcrypto está instalada corretamente
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Verificar as funções disponíveis
SELECT * FROM pg_proc WHERE proname LIKE '%gen_salt%';

-- Corrigir a função usando a sintaxe correta do pgcrypto
CREATE OR REPLACE FUNCTION public.hash_motorista_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Hash da senha se foi alterada
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.senha IS DISTINCT FROM OLD.senha) THEN
    -- Verificar se a senha não está já hasheada (começa com $2)
    IF NEW.senha IS NOT NULL AND NOT (NEW.senha LIKE '$2%') THEN
      -- Usar a função correta do pgcrypto
      NEW.senha := public.crypt(NEW.senha, public.gen_salt('bf'));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;