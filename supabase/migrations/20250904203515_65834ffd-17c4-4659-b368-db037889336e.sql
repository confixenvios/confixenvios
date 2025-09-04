-- FINAL SECURITY DEFINER OPTIMIZATION (Fixed)
-- Handle dependencies properly before dropping functions

-- 1. First drop the trigger that depends on audit_secure_data_access
DROP TRIGGER IF EXISTS audit_secure_personal_data_access ON public.secure_personal_data;

-- 2. Now we can safely drop the duplicate audit function
DROP FUNCTION IF EXISTS public.audit_secure_data_access();

-- 3. Create a single consolidated audit trigger function for personal data
CREATE OR REPLACE FUNCTION public.audit_personal_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER  -- Use SECURITY INVOKER since it just logs
SET search_path = public
AS $$
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
$$;

-- 4. Recreate the trigger with the new function
CREATE TRIGGER audit_personal_data_access_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.secure_personal_data
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_personal_data_access();

-- 5. Convert remaining functions to SECURITY INVOKER where safe
CREATE OR REPLACE FUNCTION public.get_current_session_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER  -- Changed from SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_token TEXT;
  session_id UUID;
BEGIN
  session_token := current_setting('request.headers', true)::jsonb->>'x-session-token';
  
  IF session_token IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT public.validate_anonymous_session(session_token) INTO session_id;
  RETURN session_id;
END;
$$;

-- 6. Update check_rate_limit to SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.check_rate_limit(client_ip text, action_type text, max_attempts integer DEFAULT 10, time_window_minutes integer DEFAULT 60)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER  -- Changed from SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count integer;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM public.webhook_logs
  WHERE payload->>'client_ip' = client_ip
    AND event_type = action_type
    AND created_at > (now() - (time_window_minutes || ' minutes')::interval);
  
  INSERT INTO public.webhook_logs (
    event_type, shipment_id, payload, response_status, response_body
  ) VALUES (
    action_type, 'rate_limit_check',
    jsonb_build_object(
      'client_ip', client_ip,
      'attempt_count', attempt_count + 1,
      'max_attempts', max_attempts,
      'timestamp', now()
    ),
    CASE WHEN attempt_count >= max_attempts THEN 429 ELSE 200 END,
    jsonb_build_object('allowed', attempt_count < max_attempts)
  );
  
  RETURN attempt_count < max_attempts;
END;
$$;

-- 7. Update get_masked_personal_data to SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.get_masked_personal_data(address_ref uuid)
RETURNS TABLE(masked_document text, masked_phone text, email_domain text)
LANGUAGE plpgsql
SECURITY INVOKER  -- Changed from SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  decrypted_record RECORD;
BEGIN
  SELECT * INTO decrypted_record 
  FROM public.decrypt_personal_data(
    (SELECT id FROM public.secure_personal_data WHERE address_id = address_ref LIMIT 1)
  );
  
  IF decrypted_record IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY SELECT
    CASE 
      WHEN LENGTH(decrypted_record.document) > 5 THEN
        SUBSTRING(decrypted_record.document FROM 1 FOR 3) || 
        REPEAT('*', LENGTH(decrypted_record.document) - 5) || 
        RIGHT(decrypted_record.document, 2)
      ELSE '***'
    END as masked_document,
    
    CASE 
      WHEN LENGTH(decrypted_record.phone) > 4 THEN
        LEFT(decrypted_record.phone, 4) || REPEAT('*', LENGTH(decrypted_record.phone) - 4)
      ELSE '****'
    END as masked_phone,
    
    CASE 
      WHEN POSITION('@' in decrypted_record.email) > 0 THEN
        SUBSTRING(decrypted_record.email FROM POSITION('@' in decrypted_record.email))
      ELSE '@***'
    END as email_domain;
END;
$$;

-- 8. Add comprehensive function documentation
COMMENT ON FUNCTION public.authenticate_motorista IS 'SECURITY DEFINER: Required to access password hashes and validate credentials';
COMMENT ON FUNCTION public.create_anonymous_session IS 'SECURITY DEFINER: Required to generate secure session tokens and hashes';
COMMENT ON FUNCTION public.validate_anonymous_session IS 'SECURITY DEFINER: Required to validate session hashes and manage cleanup';
COMMENT ON FUNCTION public.encrypt_personal_data IS 'SECURITY DEFINER: Required to access encryption keys and secure data';
COMMENT ON FUNCTION public.decrypt_personal_data IS 'SECURITY DEFINER: Required to access encryption keys with permission checks';
COMMENT ON FUNCTION public.has_role IS 'SECURITY DEFINER: Required to check roles regardless of user context';
COMMENT ON FUNCTION public.generate_tracking_code IS 'SECURITY DEFINER: Required to check uniqueness across all shipments';
COMMENT ON FUNCTION public.promote_to_admin IS 'SECURITY DEFINER: Required to assign admin roles with enhanced security';
COMMENT ON FUNCTION public.get_current_session_id IS 'SECURITY INVOKER: Converted to use caller permissions - delegates to secure validation';
COMMENT ON FUNCTION public.check_rate_limit IS 'SECURITY INVOKER: Converted to use caller permissions - logs rate limit attempts';
COMMENT ON FUNCTION public.get_masked_personal_data IS 'SECURITY INVOKER: Converted to use caller permissions - checks permissions via decrypt_personal_data';
COMMENT ON FUNCTION public.audit_personal_data_access IS 'SECURITY INVOKER: Consolidated audit function for personal data access logging';