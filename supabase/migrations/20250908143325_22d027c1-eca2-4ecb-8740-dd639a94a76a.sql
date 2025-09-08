-- Criar função segura para registro público de motoristas
CREATE OR REPLACE FUNCTION public.register_motorista_public(
  p_nome text,
  p_cpf text, 
  p_telefone text,
  p_email text,
  p_senha text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_motorista_id uuid;
  result json;
BEGIN
  -- Validações básicas
  IF LENGTH(p_nome) < 2 THEN
    RETURN json_build_object('success', false, 'error', 'Nome deve ter pelo menos 2 caracteres');
  END IF;
  
  IF LENGTH(p_senha) < 6 THEN
    RETURN json_build_object('success', false, 'error', 'Senha deve ter pelo menos 6 caracteres');
  END IF;
  
  -- Verificar se email já existe
  IF EXISTS (SELECT 1 FROM public.motoristas WHERE email = p_email) THEN
    RETURN json_build_object('success', false, 'error', 'E-mail já cadastrado');
  END IF;
  
  -- Verificar se CPF já existe  
  IF EXISTS (SELECT 1 FROM public.motoristas WHERE cpf = p_cpf) THEN
    RETURN json_build_object('success', false, 'error', 'CPF já cadastrado');
  END IF;
  
  -- Inserir novo motorista
  INSERT INTO public.motoristas (nome, cpf, telefone, email, senha, status)
  VALUES (p_nome, p_cpf, p_telefone, p_email, p_senha, 'pendente')
  RETURNING id INTO new_motorista_id;
  
  -- Retornar sucesso
  RETURN json_build_object(
    'success', true, 
    'message', 'Cadastro realizado com sucesso! Aguarde aprovação do administrador.',
    'motorista_id', new_motorista_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', 'Erro interno: ' || SQLERRM);
END;
$$;

-- Permitir acesso público à função
GRANT EXECUTE ON FUNCTION public.register_motorista_public(text, text, text, text, text) TO anon, authenticated;