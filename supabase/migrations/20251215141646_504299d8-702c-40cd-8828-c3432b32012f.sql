-- Fix motorista auth functions to use pgcrypto (extensions schema) and return status for proper UI messaging

CREATE OR REPLACE FUNCTION public.authenticate_motorista_username(p_username text, p_password text)
RETURNS TABLE(id uuid, nome text, username text, telefone text, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.nome,
    m.username,
    m.telefone,
    m.status
  FROM public.motoristas m
  WHERE m.username = p_username
    AND m.senha = extensions.crypt(p_password, m.senha);
END;
$$;

CREATE OR REPLACE FUNCTION public.authenticate_motorista_secure(p_email text, p_password text)
RETURNS TABLE(id uuid, nome text, email text, telefone text, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.validate_input_security(p_email) OR 
     NOT public.validate_input_security(p_password) THEN
    RAISE EXCEPTION 'Invalid input parameters';
  END IF;

  RETURN QUERY
  SELECT 
    m.id,
    m.nome,
    m.email,
    m.telefone,
    m.status
  FROM public.motoristas m
  WHERE m.email = p_email
    AND m.senha = extensions.crypt(p_password, m.senha);
END;
$$;