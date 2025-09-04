-- FIX: Add proper search_path to functions to address security linter warnings

-- Fix the validate_secure_tracking_request function
CREATE OR REPLACE FUNCTION public.validate_secure_tracking_request(
  tracking_code text,
  client_ip text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  validation_result boolean := false;
BEGIN
  -- Input validation
  IF tracking_code IS NULL OR LENGTH(tracking_code) < 3 OR LENGTH(tracking_code) > 50 THEN
    PERFORM log_sensitive_access(
      'invalid_tracking_code_format',
      'tracking_validation',
      tracking_code
    );
    RETURN false;
  END IF;
  
  -- Sanitize tracking code (alphanumeric and hyphens only)
  IF NOT (tracking_code ~ '^[A-Za-z0-9\-]+$') THEN
    PERFORM log_sensitive_access(
      'suspicious_tracking_code_characters',
      'tracking_validation', 
      tracking_code
    );
    RETURN false;
  END IF;
  
  -- Rate limiting check
  IF NOT check_rate_limit(client_ip, 'secure_tracking_lookup', 10, 15) THEN
    PERFORM log_sensitive_access(
      'tracking_rate_limit_exceeded',
      'tracking_validation',
      tracking_code
    );
    RETURN false;
  END IF;
  
  -- Check if tracking code exists
  SELECT EXISTS(
    SELECT 1 FROM public.shipments 
    WHERE tracking_code = validate_secure_tracking_request.tracking_code
  ) INTO validation_result;
  
  -- Log the validation attempt
  PERFORM log_sensitive_access(
    CASE WHEN validation_result THEN 'valid_tracking_lookup' ELSE 'invalid_tracking_code' END,
    'tracking_validation',
    tracking_code
  );
  
  RETURN validation_result;
END;
$function$;

-- Fix the monitor_security_events function
CREATE OR REPLACE FUNCTION public.monitor_security_events()
RETURNS TABLE(
  event_type text,
  event_count bigint,
  unique_ips bigint,
  last_occurrence timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow admins to view security monitoring data
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can access security monitoring data';
  END IF;
  
  RETURN QUERY
  SELECT 
    wl.event_type,
    COUNT(*) as event_count,
    COUNT(DISTINCT wl.payload->>'client_ip') as unique_ips,
    MAX(wl.created_at) as last_occurrence
  FROM public.webhook_logs wl
  WHERE wl.event_type LIKE '%security%' 
    OR wl.event_type LIKE '%rate_limit%'
    OR wl.event_type LIKE '%invalid%'
    OR wl.event_type LIKE '%suspicious%'
  AND wl.created_at > (now() - interval '24 hours')
  GROUP BY wl.event_type
  ORDER BY event_count DESC;
END;
$function$;

-- Fix the is_ip_blocked function
CREATE OR REPLACE FUNCTION public.is_ip_blocked(client_ip text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  security_incidents int;
  recent_rate_limits int;
BEGIN
  -- Check for recent security incidents from this IP
  SELECT COUNT(*) INTO security_incidents
  FROM public.webhook_logs
  WHERE event_type = 'security_incident'
    AND payload->>'client_ip' = client_ip
    AND created_at > (now() - interval '1 hour');
    
  -- Check for recent rate limit violations
  SELECT COUNT(*) INTO recent_rate_limits
  FROM public.webhook_logs
  WHERE event_type LIKE '%rate_limit%'
    AND payload->>'client_ip' = client_ip
    AND created_at > (now() - interval '30 minutes');
  
  -- Block IP if too many incidents or rate limits
  IF security_incidents >= 3 OR recent_rate_limits >= 5 THEN
    -- Log the IP blocking
    INSERT INTO public.webhook_logs (
      event_type, shipment_id, payload, response_status, response_body
    ) VALUES (
      'ip_blocked',
      'security_system',
      jsonb_build_object(
        'client_ip', client_ip,
        'security_incidents', security_incidents,
        'rate_limit_violations', recent_rate_limits,
        'blocked_at', now()
      ),
      403,
      jsonb_build_object('blocked', true)
    );
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$;

-- Fix the cleanup_security_logs function
CREATE OR REPLACE FUNCTION public.cleanup_security_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete webhook logs older than 30 days
  DELETE FROM public.webhook_logs 
  WHERE created_at < (now() - interval '30 days');
  
  -- Delete integration audit logs older than 90 days
  DELETE FROM public.integration_audit_logs 
  WHERE created_at < (now() - interval '90 days');
  
  RAISE NOTICE 'Cleaned up old security logs';
END;
$function$;