-- Resolver problema do crypt usando uma abordagem diferente
DROP FUNCTION IF EXISTS public.authenticate_motorista(text, text);

CREATE OR REPLACE FUNCTION public.authenticate_motorista(input_email text, input_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  motorista_record RECORD;
  senha_hasheada TEXT;
BEGIN
  -- Buscar motorista pelo email e status
  SELECT id, nome, status, senha INTO motorista_record
  FROM public.motoristas m
  WHERE m.email = input_email 
    AND m.status = 'ativo';

  -- Verificar se encontrou o motorista
  IF motorista_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Credenciais inválidas');
  END IF;

  -- Verificar senha usando crypt diretamente
  IF NOT (motorista_record.senha = public.crypt(input_password, motorista_record.senha)) THEN
    RETURN json_build_object('success', false, 'error', 'Credenciais inválidas');
  END IF;

  -- Retornar dados do motorista
  RETURN json_build_object(
    'success', true,
    'motorista_id', motorista_record.id,
    'nome', motorista_record.nome,
    'status', motorista_record.status
  );
END;
$$;