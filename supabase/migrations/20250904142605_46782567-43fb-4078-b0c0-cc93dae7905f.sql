-- Simplificar a função de autenticação
CREATE OR REPLACE FUNCTION public.authenticate_motorista(input_email text, input_password text)
RETURNS TABLE(motorista_id uuid, nome text, status text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.nome, m.status
  FROM public.motoristas m
  WHERE m.email = input_email 
    AND m.status = 'ativo'
    AND m.senha = crypt(input_password, m.senha);
END;
$$;

-- Testar a função diretamente
SELECT public.authenticate_motorista('hugomarianolog@gmail.com', '123456');