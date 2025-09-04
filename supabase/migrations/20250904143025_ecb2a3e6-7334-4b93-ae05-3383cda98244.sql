-- Simplificar função para retornar resultado mais claro
CREATE OR REPLACE FUNCTION public.authenticate_motorista(input_email text, input_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_data json;
  motorista_record RECORD;
BEGIN
  -- Buscar motorista
  SELECT id, nome, status INTO motorista_record
  FROM public.motoristas m
  WHERE m.email = input_email 
    AND m.status = 'ativo'
    AND m.senha = crypt(input_password, m.senha);

  -- Verificar se encontrou
  IF motorista_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Credenciais inválidas');
  END IF;

  -- Retornar sucesso com dados
  RETURN json_build_object(
    'success', true,
    'motorista_id', motorista_record.id,
    'nome', motorista_record.nome,
    'status', motorista_record.status
  );
END;
$$;