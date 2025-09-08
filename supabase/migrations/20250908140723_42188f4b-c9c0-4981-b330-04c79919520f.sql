-- Remover e recriar a função corretamente
DROP TRIGGER IF EXISTS hash_motorista_password_trigger ON public.motoristas;
DROP FUNCTION IF EXISTS public.hash_motorista_password();

-- Criar função correta sem prefixos problemáticos
CREATE OR REPLACE FUNCTION public.hash_motorista_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $function$
BEGIN
  -- Hash da senha apenas na inserção se não estiver já hasheada
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.senha IS DISTINCT FROM OLD.senha) THEN
    IF NEW.senha IS NOT NULL AND NOT (NEW.senha LIKE '$2%') THEN
      -- Usar crypt diretamente com gen_salt - extensão pgcrypto
      NEW.senha := crypt(NEW.senha, gen_salt('bf'));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recriar o trigger
CREATE TRIGGER hash_motorista_password_trigger 
BEFORE INSERT OR UPDATE ON public.motoristas 
FOR EACH ROW EXECUTE FUNCTION hash_motorista_password();