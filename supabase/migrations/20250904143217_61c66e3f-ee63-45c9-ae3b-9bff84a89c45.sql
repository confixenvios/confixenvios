-- Dropar a função existente e recriar
DROP FUNCTION IF EXISTS public.authenticate_motorista(text, text);

-- Criar nova função com resposta JSON mais clara
CREATE OR REPLACE FUNCTION public.authenticate_motorista(input_email text, input_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  motorista_record RECORD;
BEGIN
  -- Buscar motorista com credenciais válidas
  SELECT id, nome, status INTO motorista_record
  FROM public.motoristas m
  WHERE m.email = input_email 
    AND m.status = 'ativo'
    AND m.senha = crypt(input_password, m.senha);

  -- Verificar se encontrou o motorista
  IF motorista_record IS NULL THEN
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