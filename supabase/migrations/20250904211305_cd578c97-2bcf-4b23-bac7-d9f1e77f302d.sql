-- CORREÇÕES CRÍTICAS DE SEGURANÇA - Versão Simplificada

-- 1. Função para validação de entrada segura
CREATE OR REPLACE FUNCTION public.validate_input_security(input_text TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF input_text ~ '[<>"'';&|`$()]' THEN
    RETURN FALSE;
  END IF;
  
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

-- 3. Função para auditoria de integrações
CREATE OR REPLACE FUNCTION public.audit_sensitive_operations()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'integrations' THEN
    INSERT INTO public.webhook_logs (
      event_type,
      shipment_id,
      payload,
      response_status,
      response_body
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
      'Audit log'::jsonb
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

-- 4. Função de autenticação segura para motoristas
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
  IF NOT public.validate_input_security(p_email) OR 
     NOT public.validate_input_security(p_password) THEN
    RAISE EXCEPTION 'Invalid input parameters';
  END IF;

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

-- 5. Índices básicos para performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role ON public.user_roles(user_id, role);
CREATE INDEX IF NOT EXISTS idx_shipments_user_id ON public.shipments(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON public.webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs(created_at);

-- 6. Função de limpeza de logs
CREATE OR REPLACE FUNCTION public.cleanup_old_security_logs()
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.webhook_logs 
  WHERE created_at < (now() - interval '90 days');
  
  DELETE FROM public.anonymous_sessions 
  WHERE expires_at < now();
  
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

-- 7. Comentários de documentação
COMMENT ON FUNCTION public.validate_input_security(TEXT) IS 
'Security function: Validates input to prevent injection attacks';

COMMENT ON FUNCTION public.check_rate_limit_secure(TEXT, TEXT, INTEGER, INTEGER) IS 
'Security function: Implements rate limiting to prevent abuse';

COMMENT ON FUNCTION public.cleanup_old_security_logs() IS 
'Security function: Maintains security logs by removing old entries';

-- 8. Ativar monitoramento
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
    'timestamp', now()
  ),
  200,
  jsonb_build_object('status', 'monitoring_active')
);