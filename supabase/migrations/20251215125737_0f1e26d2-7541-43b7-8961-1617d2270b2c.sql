-- Adicionar colunas faltantes na tabela cd_users
ALTER TABLE public.cd_users ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE public.cd_users ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE public.cd_users ADD COLUMN IF NOT EXISTS senha TEXT;

-- Criar ou atualizar a função de registro de usuário CD
CREATE OR REPLACE FUNCTION public.register_cd_user(
  p_nome TEXT,
  p_cpf TEXT,
  p_email TEXT,
  p_telefone TEXT,
  p_senha TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id UUID;
  result JSON;
BEGIN
  -- Verificar se email já existe
  IF EXISTS (SELECT 1 FROM public.cd_users WHERE email = p_email) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Email já cadastrado'
    );
  END IF;

  -- Verificar se CPF já existe
  IF EXISTS (SELECT 1 FROM public.cd_users WHERE cpf = p_cpf) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'CPF já cadastrado'
    );
  END IF;

  -- Inserir novo usuário CD
  INSERT INTO public.cd_users (
    nome,
    cpf,
    email,
    telefone,
    senha,
    status
  ) VALUES (
    p_nome,
    p_cpf,
    p_email,
    p_telefone,
    crypt(p_senha, gen_salt('bf')),
    'pendente'
  )
  RETURNING id INTO new_user_id;

  RETURN json_build_object(
    'success', true,
    'user_id', new_user_id,
    'message', 'Cadastro realizado com sucesso'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Atualizar função de autenticação do CD
CREATE OR REPLACE FUNCTION public.authenticate_cd_user(p_email TEXT, p_password TEXT)
RETURNS TABLE(id UUID, nome TEXT, email TEXT, status TEXT, telefone TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cu.id,
    cu.nome,
    cu.email,
    cu.status,
    cu.telefone
  FROM public.cd_users cu
  WHERE cu.email = p_email 
    AND cu.senha = crypt(p_password, cu.senha)
    AND cu.status = 'ativo';
END;
$$;