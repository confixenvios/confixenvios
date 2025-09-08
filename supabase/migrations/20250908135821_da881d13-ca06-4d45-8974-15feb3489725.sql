-- Corrigir função de hash de senha dos motoristas
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
      -- Usar gen_salt com parâmetros explícitos para evitar erro de tipo
      NEW.senha := crypt(NEW.senha, gen_salt('bf', 8));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Verificar se a função foi criada corretamente
DO $$
BEGIN
  -- Testar a função gen_salt diretamente
  PERFORM gen_salt('bf', 8);
  RAISE NOTICE 'Função gen_salt funcionando corretamente';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao testar gen_salt: %', SQLERRM;
END $$;