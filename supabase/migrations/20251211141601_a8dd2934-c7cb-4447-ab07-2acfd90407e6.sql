-- Habilitar pgcrypto no schema extensions (padrão Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Recriar função de registro referenciando extensions.gen_salt e extensions.crypt
CREATE OR REPLACE FUNCTION public.register_cd_user(
    p_nome text,
    p_cpf text,
    p_email text,
    p_telefone text,
    p_senha text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    -- Verificar se email já existe
    IF EXISTS (SELECT 1 FROM cd_users WHERE email = p_email) THEN
        RETURN json_build_object('success', false, 'error', 'Email já cadastrado');
    END IF;
    
    -- Verificar se CPF já existe
    IF EXISTS (SELECT 1 FROM cd_users WHERE cpf = p_cpf) THEN
        RETURN json_build_object('success', false, 'error', 'CPF já cadastrado');
    END IF;
    
    -- Inserir novo usuário CD
    INSERT INTO cd_users (nome, cpf, email, telefone, senha, status)
    VALUES (p_nome, p_cpf, p_email, p_telefone, extensions.crypt(p_senha, extensions.gen_salt('bf')), 'pendente')
    RETURNING id INTO v_user_id;
    
    RETURN json_build_object('success', true, 'user_id', v_user_id);
END;
$$;

-- Recriar função de autenticação
CREATE OR REPLACE FUNCTION public.authenticate_cd_user(p_email text, p_password text)
RETURNS TABLE(id uuid, nome text, email text, status text, telefone text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_user cd_users%ROWTYPE;
BEGIN
    SELECT * INTO v_user
    FROM cd_users cu
    WHERE cu.email = p_email
    AND cu.senha = extensions.crypt(p_password, cu.senha);
    
    IF v_user.id IS NULL THEN
        RETURN;
    END IF;
    
    IF v_user.status != 'ativo' THEN
        RETURN;
    END IF;
    
    RETURN QUERY SELECT v_user.id, v_user.nome, v_user.email, v_user.status, v_user.telefone;
END;
$$;