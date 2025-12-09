-- Atualiza função de autenticação para retornar tipo_pedidos
CREATE OR REPLACE FUNCTION public.authenticate_motorista(input_email text, input_password text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  motorista_record RECORD;
BEGIN
  -- Buscar motorista pelo email (incluindo pendentes e inativos para dar feedback adequado)
  SELECT id, nome, status, senha, tipo_pedidos INTO motorista_record
  FROM public.motoristas m
  WHERE m.email = input_email;

  -- Verificar se encontrou o motorista
  IF motorista_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Credenciais inválidas');
  END IF;

  -- Verificar senha usando crypt
  IF NOT (motorista_record.senha = crypt(input_password, motorista_record.senha)) THEN
    RETURN json_build_object('success', false, 'error', 'Credenciais inválidas');
  END IF;

  -- Verificar status do motorista
  IF motorista_record.status = 'pendente' THEN
    -- Retorna sucesso mas com status pendente para permitir login e mostrar mensagem
    RETURN json_build_object(
      'success', true,
      'motorista_id', motorista_record.id,
      'nome', motorista_record.nome,
      'status', motorista_record.status,
      'tipo_pedidos', motorista_record.tipo_pedidos
    );
  END IF;

  IF motorista_record.status = 'inativo' THEN
    RETURN json_build_object('success', false, 'error', 'Conta inativa. Entre em contato com o administrador');
  END IF;

  -- Se chegou até aqui, motorista está ativo
  RETURN json_build_object(
    'success', true,
    'motorista_id', motorista_record.id,
    'nome', motorista_record.nome,
    'status', motorista_record.status,
    'tipo_pedidos', motorista_record.tipo_pedidos
  );
END;
$function$;