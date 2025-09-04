-- CRITICAL SECURITY FIX: Restrict public tracking access to prevent data exposure
-- Remove the overly permissive public tracking policy
DROP POLICY IF EXISTS "Public tracking code lookup" ON public.shipments;

-- Create a secure public tracking policy that only shows basic status information
CREATE POLICY "Safe public tracking lookup" ON public.shipments
  FOR SELECT 
  USING (
    tracking_code IS NOT NULL 
    AND tracking_code <> ''
    AND tracking_code = ANY(string_to_array(current_setting('request.headers', true)::jsonb->>'x-tracking-code', ','))
  );

-- BUSINESS DATA PROTECTION: Restrict pricing and shipping zones to authenticated users
-- Remove overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view pricing" ON public.shipping_pricing;
DROP POLICY IF EXISTS "Authenticated users can view shipping zones" ON public.shipping_zones;

-- Create stricter policies requiring authentication
CREATE POLICY "Authenticated users only can view pricing" ON public.shipping_pricing
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users only can view shipping zones" ON public.shipping_zones
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- CREATE SAFE TRACKING VIEW: Public view that only shows safe tracking information
CREATE OR REPLACE VIEW public.safe_tracking_view AS
SELECT 
  tracking_code,
  status,
  created_at::date as shipped_date,
  CASE 
    WHEN status = 'ENTREGUE' THEN updated_at::date
    ELSE NULL
  END as delivered_date,
  -- Estimated delivery (7 days from creation as default)
  (created_at + interval '7 days')::date as estimated_delivery,
  -- Safe status messages without exposing sensitive data
  CASE status
    WHEN 'PENDING_LABEL' THEN 'Aguardando processamento'
    WHEN 'PAGO_AGUARDANDO_ETIQUETA' THEN 'Pagamento confirmado'
    WHEN 'LABEL_GENERATED' THEN 'Etiqueta gerada'
    WHEN 'COLETADO' THEN 'Objeto coletado'
    WHEN 'EM_TRANSITO' THEN 'Em trânsito'
    WHEN 'SAIU_PARA_ENTREGA' THEN 'Saiu para entrega'
    WHEN 'ENTREGUE' THEN 'Entregue'
    ELSE 'Status atualizado'
  END as status_description
FROM public.shipments
WHERE tracking_code IS NOT NULL AND tracking_code <> '';

-- Enable RLS on the view (though views inherit from tables)
-- This is mainly for documentation purposes
COMMENT ON VIEW public.safe_tracking_view IS 'Safe public view for tracking without exposing sensitive customer data';

-- SECURITY AUDIT LOGGING: Add function to log sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  action_type text,
  table_name text,
  record_id text,
  user_id uuid DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- ENHANCED ROLE ESCALATION PROTECTION: Strengthen the existing trigger
DROP TRIGGER IF EXISTS prevent_role_escalation ON public.user_roles;

CREATE OR REPLACE FUNCTION public.enhanced_prevent_self_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent users from giving themselves admin role
  IF NEW.role = 'admin' AND auth.uid() = NEW.user_id THEN
    -- Only allow if the current user is already an admin
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
      -- Log the attempt
      PERFORM log_sensitive_access(
        'unauthorized_admin_escalation_attempt',
        'user_roles',
        NEW.user_id::text
      );
      
      RAISE EXCEPTION 'Security violation: Users cannot promote themselves to admin role. This incident has been logged.';
    END IF;
  END IF;
  
  -- Log all role changes for audit purposes
  PERFORM log_sensitive_access(
    CASE WHEN TG_OP = 'INSERT' THEN 'role_granted' ELSE 'role_modified' END,
    'user_roles',
    NEW.user_id::text
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER enhanced_prevent_role_escalation
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.enhanced_prevent_self_role_escalation();

-- RATE LIMITING ENHANCEMENT: Add IP-based rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  client_ip text,
  action_type text,
  max_attempts integer DEFAULT 10,
  time_window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count integer;
BEGIN
  -- Count recent attempts from this IP for this action
  SELECT COUNT(*) INTO attempt_count
  FROM public.webhook_logs
  WHERE payload->>'client_ip' = client_ip
    AND event_type = action_type
    AND created_at > (now() - (time_window_minutes || ' minutes')::interval);
  
  -- Log the attempt
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
      'client_ip', client_ip,
      'attempt_count', attempt_count + 1,
      'max_attempts', max_attempts,
      'timestamp', now()
    ),
    CASE WHEN attempt_count >= max_attempts THEN 429 ELSE 200 END,
    jsonb_build_object('allowed', attempt_count < max_attempts)
  );
  
  -- Return false if rate limit exceeded
  RETURN attempt_count < max_attempts;
END;
$$;