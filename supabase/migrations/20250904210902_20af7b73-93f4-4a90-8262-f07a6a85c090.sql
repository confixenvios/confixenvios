-- CORREÇÕES CRÍTICAS DE SEGURANÇA
-- Habilitar RLS e corrigir políticas

-- 1. Habilitar RLS na tabela addresses (mantendo políticas existentes)
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- 2. Habilitar RLS na tabela integrations (apenas admin)
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- 3. Habilitar RLS na tabela motoristas (apenas admin)
ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;

-- 4. Melhorar política RLS na tabela profiles (usando 'id' em vez de 'user_id')
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Política mais restritiva - usuários só podem ver seu próprio perfil
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Admins podem ver todos os perfis
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles admin_check
    WHERE admin_check.user_id = auth.uid() 
    AND admin_check.role = 'admin'
  )
);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 5. Melhorar RLS na tabela webhook_logs (apenas admin)
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- 6. Melhorar política de shipments para ser mais restritiva
DROP POLICY IF EXISTS "Users can view shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can create shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can update shipments" ON public.shipments;

-- Política mais específica para shipments (corrigido para usar user_id correto)
CREATE POLICY "Users can view their own shipments" 
ON public.shipments 
FOR SELECT 
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Users can create shipments" 
ON public.shipments 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Users can update their own shipments" 
ON public.shipments 
FOR UPDATE 
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- 7. Adicionar auditoria para operações sensíveis
CREATE OR REPLACE FUNCTION public.audit_sensitive_operations()
RETURNS TRIGGER AS $$
BEGIN
  -- Log para operações em integrations
  IF TG_TABLE_NAME = 'integrations' THEN
    INSERT INTO public.webhook_logs (
      event_type,
      shipment_id,
      payload,
      response_status,
      response_body,
      created_at
    ) VALUES (
      'audit_log',
      COALESCE(NEW.id, OLD.id)::text,
      jsonb_build_object(
        'operation', TG_OP,
        'table', TG_TABLE_NAME,
        'user_id', auth.uid(),
        'timestamp', NOW()
      ),
      200,
      'Audit log'::jsonb,
      NOW()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para auditoria
DROP TRIGGER IF EXISTS audit_integrations_changes ON public.integrations;
CREATE TRIGGER audit_integrations_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_operations();

-- 8. Função para validação de entrada segura
CREATE OR REPLACE FUNCTION public.validate_input_security(input_text TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar se contém caracteres perigosos
  IF input_text ~ '[<>"'';&|`$()]' THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar tamanho máximo
  IF LENGTH(input_text) > 1000 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 9. Melhorar função de autenticação de motorista
CREATE OR REPLACE FUNCTION public.authenticate_motorista_secure(
  p_email TEXT,
  p_password TEXT
)
RETURNS TABLE(
  id UUID,
  nome TEXT,
  email TEXT,
  telefone TEXT,
  status TEXT
) AS $$
BEGIN
  -- Validar entrada
  IF NOT public.validate_input_security(p_email) OR 
     NOT public.validate_input_security(p_password) THEN
    RAISE EXCEPTION 'Invalid input parameters';
  END IF;

  -- Verificar credenciais com hash seguro
  RETURN QUERY
  SELECT 
    m.id,
    m.nome,
    m.email,
    m.telefone,
    m.status
  FROM public.motoristas m
  WHERE m.email = p_email 
    AND m.senha = crypt(p_password, m.senha)
    AND m.status = 'ativo';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Adicionar índices para performance de queries de segurança
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role ON public.user_roles(user_id, role);
CREATE INDEX IF NOT EXISTS idx_shipments_user_id ON public.shipments(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

-- 11. Comentários de documentação de segurança
COMMENT ON POLICY "Users can view their own profile" ON public.profiles IS 
'Security policy: Users can only access their own profile records';

COMMENT ON POLICY "Admins can view all profiles" ON public.profiles IS 
'Security policy: Admin users can view all profile records';

COMMENT ON FUNCTION public.validate_input_security(TEXT) IS 
'Security function: Validates input to prevent injection attacks and enforce size limits';

COMMENT ON FUNCTION public.authenticate_motorista_secure(TEXT, TEXT) IS 
'Security function: Secure authentication for drivers with input validation';