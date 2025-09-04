-- SECURITY DEFINER REVIEW AND FIXES
-- Fix functions that don't need elevated privileges

-- 1. log_sensitive_access - can be SECURITY INVOKER since it just logs
CREATE OR REPLACE FUNCTION public.log_sensitive_access(action_type text, table_name text, record_id text, user_id uuid DEFAULT auth.uid())
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER  -- Changed from SECURITY DEFINER
SET search_path = public
AS $$
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
      'action', action_type,
      'table', table_name,
      'user_id', user_id,
      'timestamp', now(),
      'ip_address', current_setting('request.headers', true)::jsonb->>'x-forwarded-for'
    ),
    200,
    jsonb_build_object('logged', true)
  );
END;
$$;

-- 2. update_updated_at_column - trigger function but doesn't need elevated privileges
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER  -- Changed from SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3. Enhanced audit functions - keep SECURITY DEFINER but add more security
CREATE OR REPLACE FUNCTION public.audit_integration_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- Keep SECURITY DEFINER but add validation
SET search_path = public
AS $$
BEGIN
  -- Only log if user is authenticated (skip system operations)
  -- Add additional validation: only admins can modify integrations
  IF auth.uid() IS NOT NULL THEN
    -- Verify admin permission for integration modifications
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Unauthorized: Only admins can modify integrations';
    END IF;
    
    INSERT INTO public.integration_audit_logs (
      integration_id,
      user_id,
      action,
      details,
      user_agent
    ) VALUES (
      COALESCE(NEW.id, OLD.id),
      auth.uid(),
      CASE 
        WHEN TG_OP = 'INSERT' THEN 'integration_created'
        WHEN TG_OP = 'UPDATE' THEN 'integration_updated'
        WHEN TG_OP = 'DELETE' THEN 'integration_deleted'
      END,
      jsonb_build_object(
        'old_values', to_jsonb(OLD),
        'new_values', to_jsonb(NEW),
        'operation', TG_OP
      ),
      current_setting('request.headers', true)::jsonb->>'user-agent'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Add function documentation for security review
COMMENT ON FUNCTION public.authenticate_motorista IS 'SECURITY DEFINER: Required to access password hashes and validate credentials';
COMMENT ON FUNCTION public.create_anonymous_session IS 'SECURITY DEFINER: Required to generate secure session tokens';
COMMENT ON FUNCTION public.validate_anonymous_session IS 'SECURITY DEFINER: Required to validate session hashes and manage cleanup';
COMMENT ON FUNCTION public.encrypt_personal_data IS 'SECURITY DEFINER: Required to access encryption keys';
COMMENT ON FUNCTION public.decrypt_personal_data IS 'SECURITY DEFINER: Required to access encryption keys';
COMMENT ON FUNCTION public.has_role IS 'SECURITY DEFINER: Required to check roles regardless of user context';
COMMENT ON FUNCTION public.generate_tracking_code IS 'SECURITY DEFINER: Required to check uniqueness across all shipments';
COMMENT ON FUNCTION public.promote_to_admin IS 'SECURITY DEFINER: Required to assign admin roles';

-- 5. Enhanced security for sensitive operations
-- Add rate limiting to admin promotion function
CREATE OR REPLACE FUNCTION public.promote_to_admin(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_record RECORD;
    current_admin_count INTEGER;
BEGIN
    -- Security check: Only existing admins can promote users
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can promote users to admin role';
    END IF;
    
    -- Rate limiting: Check for too many recent admin promotions
    SELECT COUNT(*) INTO current_admin_count
    FROM public.webhook_logs
    WHERE event_type = 'role_change_audit'
        AND payload->>'new_role' = 'admin'
        AND created_at > (now() - interval '1 hour');
    
    IF current_admin_count > 5 THEN
        RAISE EXCEPTION 'Rate limit exceeded: Too many admin promotions in the last hour';
    END IF;
    
    -- Find user by email
    SELECT auth.users.id INTO user_record
    FROM auth.users 
    WHERE auth.users.email = user_email;
    
    IF user_record.id IS NOT NULL THEN
        -- Insert admin role if not exists
        INSERT INTO public.user_roles (user_id, role)
        VALUES (user_record.id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Log the promotion
        INSERT INTO public.webhook_logs (event_type, shipment_id, payload, response_status, response_body)
        VALUES (
            'admin_promotion_audit',
            user_record.id::text,
            jsonb_build_object(
                'promoted_user_email', user_email,
                'promoted_by', auth.uid(),
                'timestamp', now()
            ),
            200,
            '{"status": "admin_promoted"}'::jsonb
        );
        
        RAISE NOTICE 'User % promoted to admin successfully by %', user_email, auth.uid();
    ELSE
        RAISE EXCEPTION 'User with email % not found', user_email;
    END IF;
END;
$$;

-- 6. Create secure function for checking function security modes (for monitoring)
CREATE OR REPLACE FUNCTION public.list_security_definer_functions()
RETURNS TABLE(
    schema_name text,
    function_name text,
    security_mode text,
    comment text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only allow admins to see this information
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can view security function information';
    END IF;
    
    RETURN QUERY
    SELECT 
        n.nspname::text as schema_name,
        p.proname::text as function_name,
        CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END::text as security_mode,
        COALESCE(obj_description(p.oid, 'pg_proc'), 'No comment')::text as comment
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    ORDER BY p.prosecdef DESC, p.proname;
END;
$$;

COMMENT ON FUNCTION public.list_security_definer_functions IS 'SECURITY DEFINER: Required to access system catalogs for security review';