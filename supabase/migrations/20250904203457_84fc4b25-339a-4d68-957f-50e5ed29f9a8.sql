-- SECURITY DEFINER CLEANUP - Fix trigger dependencies
-- Drop dependent objects before removing the function

-- 1. Drop the trigger that depends on audit_secure_data_access
DROP TRIGGER IF EXISTS audit_secure_personal_data_access ON public.secure_personal_data;

-- 2. Now safely drop the duplicate audit function
DROP FUNCTION IF EXISTS public.audit_secure_data_access();

-- 3. Create a single, consolidated audit trigger function
CREATE OR REPLACE FUNCTION public.audit_personal_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER  -- Use SECURITY INVOKER for audit functions
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

-- 4. Re-create the trigger with the new function
CREATE TRIGGER audit_personal_data_access_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.secure_personal_data
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_personal_data_access();

-- 5. Also drop and consolidate the duplicate sensitive data audit function
DROP FUNCTION IF EXISTS public.audit_sensitive_data_access();

-- 6. Add documentation for the consolidated approach
COMMENT ON FUNCTION public.audit_personal_data_access IS 'SECURITY INVOKER: Consolidated audit function for personal data access logging';
COMMENT ON TRIGGER audit_personal_data_access_trigger ON public.secure_personal_data IS 'Trigger to log all access to encrypted personal data';

-- 7. Clean up duplicate password hashing functions
DROP FUNCTION IF EXISTS public.hash_motorista_senha();

-- 8. Document the remaining essential SECURITY DEFINER functions
CREATE OR REPLACE VIEW public.essential_security_definer_functions AS
SELECT 
    p.proname as function_name,
    obj_description(p.oid, 'pg_proc') as purpose,
    CASE 
        WHEN p.proname LIKE '%session%' THEN 'Session Management'
        WHEN p.proname LIKE '%encrypt%' OR p.proname LIKE '%decrypt%' THEN 'Data Encryption'
        WHEN p.proname LIKE '%auth%' OR p.proname LIKE '%role%' OR p.proname LIKE '%admin%' THEN 'Authentication & Authorization'
        WHEN p.proname LIKE '%hash%' OR p.proname LIKE '%password%' THEN 'Password Security'
        WHEN p.proname LIKE '%cleanup%' THEN 'System Maintenance'
        ELSE 'Other'
    END as category
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
    AND p.prosecdef = true
ORDER BY category, p.proname;

COMMENT ON VIEW public.essential_security_definer_functions IS 'Catalog of essential functions requiring elevated privileges with justification';