-- Criar tabela para usuários CD (Centro de Distribuição)
CREATE TABLE public.cd_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    cpf text NOT NULL UNIQUE,
    email text NOT NULL UNIQUE,
    telefone text NOT NULL,
    senha text NOT NULL,
    status text NOT NULL DEFAULT 'pendente',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.cd_users ENABLE ROW LEVEL SECURITY;

-- Política para admins gerenciarem usuários CD
CREATE POLICY "Admins can manage CD users"
ON public.cd_users
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Política para registro anônimo (status pendente)
CREATE POLICY "Allow anonymous CD registration"
ON public.cd_users
FOR INSERT
WITH CHECK (status = 'pendente');

-- Função para autenticar usuário CD
CREATE OR REPLACE FUNCTION public.authenticate_cd_user(p_email text, p_password text)
RETURNS TABLE(id uuid, nome text, email text, status text, telefone text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user cd_users%ROWTYPE;
BEGIN
    SELECT * INTO v_user
    FROM cd_users cu
    WHERE cu.email = p_email
    AND cu.senha = crypt(p_password, cu.senha);
    
    IF v_user.id IS NULL THEN
        RETURN;
    END IF;
    
    IF v_user.status != 'ativo' THEN
        RETURN;
    END IF;
    
    RETURN QUERY SELECT v_user.id, v_user.nome, v_user.email, v_user.status, v_user.telefone;
END;
$$;

-- Função para registro de usuário CD
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
SET search_path = public
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
    VALUES (p_nome, p_cpf, p_email, p_telefone, crypt(p_senha, gen_salt('bf')), 'pendente')
    RETURNING id INTO v_user_id;
    
    RETURN json_build_object('success', true, 'user_id', v_user_id);
END;
$$;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_cd_users_updated_at
BEFORE UPDATE ON public.cd_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();