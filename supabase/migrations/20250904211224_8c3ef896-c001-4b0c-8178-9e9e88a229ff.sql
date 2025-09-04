-- SECURITY FIX: Add RLS policies to safe_tracking_view to prevent unauthorized access
-- This addresses the critical public tracking data exposure issue

-- First, enable RLS on the safe_tracking_view (if not already enabled)
ALTER TABLE public.safe_tracking_view ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow access via secure tracking validation (with tracking code in header)
CREATE POLICY "Secure tracking code access" ON public.safe_tracking_view
FOR SELECT 
USING (
  -- Allow access if tracking_code matches the one in the secure header
  tracking_code IS NOT NULL 
  AND tracking_code = current_setting('request.headers', true)::jsonb->>'x-tracking-code'
  -- AND the request is rate-limited and validated
  AND public.check_rate_limit(
    current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
    'secure_tracking_lookup',
    5, -- max 5 attempts
    15 -- per 15 minutes
  )
);

-- Policy 2: Allow authenticated users to view all tracking data
CREATE POLICY "Authenticated users can view all tracking" ON public.safe_tracking_view
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Policy 3: Allow admins full access
CREATE POLICY "Admins full tracking access" ON public.safe_tracking_view
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- SECURITY ENHANCEMENT: Create function to validate tracking requests with enhanced security
CREATE OR REPLACE FUNCTION public.validate_secure_tracking_request(
  tracking_code text,
  client_ip text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- SECURITY ENHANCEMENT: Enhanced security monitoring function
CREATE OR REPLACE FUNCTION public.monitor_security_events()
RETURNS TABLE(
  event_type text,
  event_count bigint,
  unique_ips bigint,
  last_occurrence timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
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

-- SECURITY ENHANCEMENT: Create function to block suspicious IPs
CREATE OR REPLACE FUNCTION public.is_ip_blocked(client_ip text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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