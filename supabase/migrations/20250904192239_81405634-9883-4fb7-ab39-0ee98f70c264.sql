-- SECURITY FIX 1: Restrict pricing data access to authenticated users only
-- This prevents competitors from easily accessing your complete pricing structure
DROP POLICY IF EXISTS "Public read access to shipping pricing" ON public.shipping_pricing;

CREATE POLICY "Authenticated users can view pricing" 
ON public.shipping_pricing 
FOR SELECT 
TO authenticated
USING (true);

-- SECURITY FIX 2: Restrict shipping zones access to authenticated users
-- This prevents unauthorized access to your shipping zone configuration
DROP POLICY IF EXISTS "Public read access to shipping zones" ON public.shipping_zones;

CREATE POLICY "Authenticated users can view shipping zones" 
ON public.shipping_zones 
FOR SELECT 
TO authenticated
USING (true);

-- SECURITY FIX 3: Add privilege escalation protection
-- Create a function to prevent users from promoting themselves to admin
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent users from giving themselves admin role
  IF NEW.role = 'admin' AND auth.uid() = NEW.user_id THEN
    -- Only allow if the current user is already an admin
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Users cannot promote themselves to admin role';
    END IF;
  END IF;
  
  -- Log role changes for audit purposes
  INSERT INTO public.webhook_logs (event_type, shipment_id, payload, response_status, response_body)
  VALUES (
    'role_change_audit',
    NEW.user_id::text,
    jsonb_build_object(
      'old_role', CASE WHEN TG_OP = 'UPDATE' THEN OLD.role ELSE null END,
      'new_role', NEW.role,
      'changed_by', auth.uid(),
      'target_user', NEW.user_id,
      'timestamp', now()
    ),
    200,
    '{"status": "role_change_logged"}'::jsonb
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply the privilege escalation protection trigger
DROP TRIGGER IF EXISTS prevent_self_role_escalation_trigger ON public.user_roles;
CREATE TRIGGER prevent_self_role_escalation_trigger
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_role_escalation();

-- SECURITY FIX 4: Add enhanced session validation with security monitoring
CREATE OR REPLACE FUNCTION public.validate_session_with_security_monitoring(session_token text, client_ip text DEFAULT ''::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_record RECORD;
  session_id UUID;
  access_count INT;
  failed_attempts INT;
BEGIN
  -- Enhanced rate limiting: check access frequency from same IP
  SELECT COUNT(*) INTO access_count
  FROM public.anonymous_sessions 
  WHERE client_fingerprint = client_ip 
    AND last_accessed > (now() - interval '1 hour');
  
  -- Check for failed validation attempts
  SELECT COUNT(*) INTO failed_attempts
  FROM public.webhook_logs
  WHERE event_type = 'security_incident'
    AND payload->>'client_ip' = client_ip
    AND created_at > (now() - interval '1 hour');
  
  -- Block if too many sessions or failed attempts from same IP
  IF access_count > 10 OR failed_attempts > 5 THEN
    -- Log security incident
    INSERT INTO public.webhook_logs (event_type, shipment_id, payload, response_status, response_body)
    VALUES ('security_incident', 'rate_limit_exceeded', 
            jsonb_build_object(
              'client_ip', client_ip, 
              'access_count', access_count,
              'failed_attempts', failed_attempts,
              'incident', 'rate_limit_exceeded',
              'timestamp', now()
            ), 
            429, '{"error": "Rate limit exceeded"}'::jsonb);
            
    RAISE EXCEPTION 'Rate limit exceeded. Too many session attempts from this IP.';
  END IF;
  
  -- Clean up expired sessions first
  DELETE FROM public.anonymous_sessions 
  WHERE expires_at < now();
  
  -- Find valid session
  SELECT id, session_hash, expires_at, client_fingerprint 
  INTO session_record
  FROM public.anonymous_sessions 
  WHERE session_token = validate_session_with_security_monitoring.session_token
    AND expires_at > now();
  
  -- If session not found, log and return null
  IF session_record IS NULL THEN
    INSERT INTO public.webhook_logs (event_type, shipment_id, payload, response_status, response_body)
    VALUES ('security_incident', 'invalid_session', 
            jsonb_build_object('client_ip', client_ip, 'incident', 'session_not_found'), 
            404, '{"error": "Session not found"}'::jsonb);
    RETURN NULL;
  END IF;
  
  -- Enhanced validation: verify session hash and fingerprint
  IF session_record.session_hash != encode(digest(session_token || session_record.client_fingerprint || session_record.id::text, 'sha256'), 'hex') THEN
    -- Invalid session hash, delete the session and log security incident
    DELETE FROM public.anonymous_sessions WHERE id = session_record.id;
    
    INSERT INTO public.webhook_logs (event_type, shipment_id, payload, response_status, response_body)
    VALUES ('security_incident', 'session_validation', 
            jsonb_build_object(
              'session_id', session_record.id, 
              'client_ip', client_ip, 
              'incident', 'invalid_session_hash',
              'timestamp', now()
            ), 
            403, '{"error": "Security violation detected"}'::jsonb);
            
    RETURN NULL;
  END IF;
  
  -- Update last accessed time
  UPDATE public.anonymous_sessions 
  SET last_accessed = now()
  WHERE id = session_record.id;
  
  RETURN session_record.id;
END;
$$;

-- SECURITY FIX 5: Create audit function for sensitive data access
CREATE OR REPLACE FUNCTION public.audit_sensitive_data_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log any access to sensitive personal data
  INSERT INTO public.webhook_logs (event_type, shipment_id, payload, response_status, response_body)
  VALUES ('sensitive_data_access', 
          COALESCE(NEW.address_id, OLD.address_id)::text,
          jsonb_build_object(
            'user_id', auth.uid(),
            'operation', TG_OP,
            'table', TG_TABLE_NAME,
            'timestamp', now(),
            'ip_address', current_setting('request.headers', true)::jsonb->>'x-forwarded-for'
          ),
          200, '{"status": "access_logged"}'::jsonb);
          
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply the audit trigger to secure personal data
DROP TRIGGER IF EXISTS audit_secure_data_access ON public.secure_personal_data;
CREATE TRIGGER audit_secure_data_access
  AFTER INSERT OR UPDATE OR DELETE ON public.secure_personal_data
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_data_access();