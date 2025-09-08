-- Atualizar a função de autenticação para lidar com diferentes status
CREATE OR REPLACE FUNCTION public.authenticate_motorista(input_email text, input_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  motorista_record RECORD;
BEGIN
  -- Buscar motorista pelo email (incluindo pendentes e inativos para dar feedback adequado)
  SELECT id, nome, status, senha INTO motorista_record
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
    RETURN json_build_object('success', false, 'error', 'Cadastro pendente de aprovação pelo administrador');
  END IF;

  IF motorista_record.status = 'inativo' THEN
    RETURN json_build_object('success', false, 'error', 'Conta inativa. Entre em contato com o administrador');
  END IF;

  -- Se chegou até aqui, motorista está ativo
  RETURN json_build_object(
    'success', true,
    'motorista_id', motorista_record.id,
    'nome', motorista_record.nome,
    'status', motorista_record.status
  );
END;
$$;

-- Atualizar RLS policies para que motoristas pendentes não vejam remessas
-- Primeira, dropar a política existente se houver
DROP POLICY IF EXISTS "get_motorista_shipments" ON public.shipments;
DROP POLICY IF EXISTS "Motoristas can view assigned shipments" ON public.shipments;

-- Criar nova política que só permite motoristas ativos
CREATE POLICY "Motoristas ativos podem ver remessas designadas" 
ON public.shipments 
FOR SELECT 
USING (
  motorista_id IS NOT NULL 
  AND motorista_id::text IN (
    SELECT m.id::text 
    FROM motoristas m 
    WHERE m.id = shipments.motorista_id 
    AND m.status = 'ativo'
  )
);