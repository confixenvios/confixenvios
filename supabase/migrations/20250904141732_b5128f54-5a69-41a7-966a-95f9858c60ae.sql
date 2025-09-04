-- Corrigir search_path das funções para segurança
CREATE OR REPLACE FUNCTION public.hash_motorista_senha()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só fazer hash se a senha não estiver já hasheada
  IF NEW.senha IS NOT NULL AND NOT (NEW.senha ~ '^\$2[abxy]?\$\d+\$') THEN
    NEW.senha := crypt(NEW.senha, gen_salt('bf', 8));
  END IF;
  RETURN NEW;
END;
$$;

-- Corrigir função de autenticação também
CREATE OR REPLACE FUNCTION public.authenticate_motorista(input_email TEXT, input_password TEXT)
RETURNS TABLE(motorista_id UUID, nome TEXT, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.nome, m.status
  FROM public.motoristas m
  WHERE m.email = input_email 
    AND m.status = 'ativo'
    AND (m.senha = input_password OR m.senha = crypt(input_password, m.senha));
END;
$$;