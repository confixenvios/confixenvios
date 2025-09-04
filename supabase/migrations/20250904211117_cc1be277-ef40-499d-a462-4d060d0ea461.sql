-- CORREÇÕES CRÍTICAS DE SEGURANÇA - Versão Final Corrigida

-- 1. Função para validação de entrada segura
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

-- 2. Função para rate limiting seguro
CREATE OR REPLACE FUNCTION public.check_rate_limit_secure(
  client_identifier TEXT,
  action_type TEXT,
  max_attempts INTEGER DEFAULT 10,
  time_window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM public.webhook_logs
  WHERE payload->>'client_identifier' = client_identifier
    AND event_type = action_type
    AND created_at > (now() - (time_window_minutes || ' minutes')::interval);
  
  -- Log da tentativa
  INSERT INTO public.webhook_logs (
    event_type, 
    shipment_id, 
    payload, 
    response_status, 
    response_body
  ) VALUES (
    action_type, 
    'rate_limit_check',
    jsonb_build_object(
      'client_identifier', client_identifier,
      'attempt_count', attempt_count + 1,
      'max_attempts', max_attempts,
      'timestamp', now()
    ),
    CASE WHEN attempt_count >= max_attempts THEN 429 ELSE 200 END,
    jsonb_build_object('allowed', attempt_count < max_attempts)
  );
  
  RETURN attempt_count < max_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Função para logs de acesso a dados sensíveis
CREATE OR REPLACE FUNCTION public.log_sensitive_data_access(
  table_name TEXT,
  record_id TEXT,
  action_type TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.webhook_logs (
    event_type,
    shipment_id,
    payload,
    response_status,
    response_body
  ) VALUES (
    'sensitive_data_access',
    record_id,
    jsonb_build_object(
      'table', table_name,
      'action', action_type,
      'user_id', auth.uid(),
      'timestamp', now(),
      'ip_address', current_setting('request.headers', true)::jsonb->>'x-forwarded-for'
    ),
    200,
    jsonb_build_object('logged', true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger corrigido para auditoria de dados pessoais (sem SELECT)
CREATE OR REPLACE FUNCTION public.audit_personal_data_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log para operações de modificação em dados pessoais sensíveis
  PERFORM public.log_sensitive_data_access(
    TG_TABLE_NAME,
    COALESCE(NEW.address_id, OLD.address_id)::text,
    TG_OP
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger corrigido na tabela de dados pessoais seguros
DROP TRIGGER IF EXISTS audit_secure_personal_data_access ON public.secure_personal_data;
CREATE TRIGGER audit_secure_personal_data_access
  AFTER INSERT OR UPDATE OR DELETE ON public.secure_personal_data
  FOR EACH ROW EXECUTE FUNCTION public.audit_personal_data_access();

-- 5. Função para auditoria de integrações
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

-- Trigger para auditoria de integrações
DROP TRIGGER IF EXISTS audit_integrations_changes ON public.integrations;
CREATE TRIGGER audit_integrations_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_operations();

-- 6. Função de autenticação segura para motoristas
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

-- 7. Índices para performance de segurança
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role ON public.user_roles(user_id, role);
CREATE INDEX IF NOT EXISTS idx_shipments_user_id ON public.shipments(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type_created ON public.webhook_logs(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_payload_client ON public.webhook_logs USING GIN ((payload->>'client_identifier'));

-- 8. Função de monitoramento de segurança
CREATE OR REPLACE FUNCTION public.enable_security_monitoring()
RETURNS VOID AS $$
BEGIN
  -- Log da ativação do sistema de monitoramento
  INSERT INTO public.webhook_logs (
    event_type,
    shipment_id,
    payload,
    response_status,
    response_body
  ) VALUES (
    'security_system_status',
    'system_init',
    jsonb_build_object(
      'action', 'security_monitoring_enabled',
      'timestamp', now(),
      'enabled_by', COALESCE(auth.uid()::text, 'system')
    ),
    200,
    jsonb_build_object('status', 'monitoring_active')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Função para limpeza de logs antigos
CREATE OR REPLACE FUNCTION public.cleanup_old_security_logs()
RETURNS VOID AS $$
BEGIN
  -- Limpar logs de webhook antigos (manter apenas 90 dias)
  DELETE FROM public.webhook_logs 
  WHERE created_at < (now() - interval '90 days');
  
  -- Limpar sessões anônimas expiradas
  DELETE FROM public.anonymous_sessions 
  WHERE expires_at < now();
  
  -- Log da limpeza
  INSERT INTO public.webhook_logs (
    event_type,
    shipment_id,
    payload,
    response_status,
    response_body
  ) VALUES (
    'security_maintenance',
    'cleanup',
    jsonb_build_object(
      'action', 'old_logs_cleaned',
      'timestamp', now()
    ),
    200,
    jsonb_build_object('status', 'cleanup_completed')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Comentários de documentação
COMMENT ON FUNCTION public.validate_input_security(TEXT) IS 
'Security function: Validates input to prevent injection attacks and enforce size limits';

COMMENT ON FUNCTION public.check_rate_limit_secure(TEXT, TEXT, INTEGER, INTEGER) IS 
'Security function: Implements rate limiting to prevent abuse and brute force attacks';

COMMENT ON FUNCTION public.log_sensitive_data_access(TEXT, TEXT, TEXT) IS 
'Security function: Logs access to sensitive data for audit trail and compliance';

COMMENT ON FUNCTION public.cleanup_old_security_logs() IS 
'Security function: Maintains security logs by removing old entries and expired sessions';

-- Ativar o monitoramento de segurança
SELECT public.enable_security_monitoring();