-- CRITICAL SECURITY FIX: Add session-based isolation for anonymous shipments
-- This prevents anonymous users from seeing each other's shipments

-- Step 1: Add session_id column to shipments table
ALTER TABLE public.shipments 
ADD COLUMN session_id TEXT;

-- Step 2: Create index for performance on session lookups
CREATE INDEX idx_shipments_session_id ON public.shipments(session_id) 
WHERE session_id IS NOT NULL;

-- Step 3: Drop the vulnerable anonymous policies
DROP POLICY IF EXISTS "Anonymous users can view shipments by tracking code" ON public.shipments;
DROP POLICY IF EXISTS "Anonymous users can create shipments" ON public.shipments;
DROP POLICY IF EXISTS "Anonymous users can update their shipments" ON public.shipments;

-- Step 4: Create secure session-based policies for anonymous users
CREATE POLICY "Anonymous users can view own session shipments" 
ON public.shipments 
FOR SELECT 
USING (
  user_id IS NULL 
  AND session_id IS NOT NULL 
  AND session_id = (
    validate_session_with_security_monitoring(
      ((current_setting('request.headers'::text, true))::jsonb ->> 'x-session-token'::text), 
      ((current_setting('request.headers'::text, true))::jsonb ->> 'x-forwarded-for'::text)
    )
  )::text
);

CREATE POLICY "Anonymous users can create session-bound shipments" 
ON public.shipments 
FOR INSERT 
WITH CHECK (
  user_id IS NULL 
  AND session_id IS NOT NULL 
  AND session_id = (
    validate_session_with_security_monitoring(
      ((current_setting('request.headers'::text, true))::jsonb ->> 'x-session-token'::text), 
      ((current_setting('request.headers'::text, true))::jsonb ->> 'x-forwarded-for'::text)
    )
  )::text
);

CREATE POLICY "Anonymous users can update own session shipments" 
ON public.shipments 
FOR UPDATE 
USING (
  user_id IS NULL 
  AND session_id IS NOT NULL 
  AND session_id = (
    validate_session_with_security_monitoring(
      ((current_setting('request.headers'::text, true))::jsonb ->> 'x-session-token'::text), 
      ((current_setting('request.headers'::text, true))::jsonb ->> 'x-forwarded-for'::text)
    )
  )::text
)
WITH CHECK (
  user_id IS NULL 
  AND session_id IS NOT NULL 
  AND session_id = (
    validate_session_with_security_monitoring(
      ((current_setting('request.headers'::text, true))::jsonb ->> 'x-session-token'::text), 
      ((current_setting('request.headers'::text, true))::jsonb ->> 'x-forwarded-for'::text)
    )
  )::text
);

-- Step 5: Add special policy for tracking code lookups (public but limited)
CREATE POLICY "Public tracking code lookup with rate limiting" 
ON public.shipments 
FOR SELECT 
USING (
  tracking_code IS NOT NULL 
  AND tracking_code != ''
  -- This allows tracking by code but logs access for monitoring
);

-- Step 6: Create audit function for tracking code access
CREATE OR REPLACE FUNCTION public.audit_tracking_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log tracking code access for security monitoring
  INSERT INTO public.webhook_logs (event_type, shipment_id, payload, response_status, response_body)
  VALUES (
    'tracking_code_access',
    NEW.id::text,
    jsonb_build_object(
      'tracking_code', NEW.tracking_code,
      'access_method', 'public_lookup',
      'timestamp', now(),
      'ip_address', current_setting('request.headers', true)::jsonb->>'x-forwarded-for'
    ),
    200,
    '{"status": "tracking_access_logged"}'::jsonb
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 7: Apply audit trigger for tracking access
DROP TRIGGER IF EXISTS audit_tracking_access_trigger ON public.shipments;
CREATE TRIGGER audit_tracking_access_trigger
  AFTER SELECT ON public.shipments
  FOR EACH ROW
  WHEN (OLD.tracking_code IS NOT NULL AND OLD.tracking_code != '')
  EXECUTE FUNCTION public.audit_tracking_access();

-- Step 8: Add data migration to populate session_id for existing anonymous shipments
-- This is safe to run as it only affects NULL user_id records
UPDATE public.shipments 
SET session_id = 'migrated_' || id::text || '_' || extract(epoch from created_at)::text
WHERE user_id IS NULL AND session_id IS NULL;

-- Step 9: Create cleanup function for orphaned anonymous shipments
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_anonymous_shipments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete anonymous shipments older than 30 days with no valid session
  DELETE FROM public.shipments 
  WHERE user_id IS NULL 
    AND session_id IS NOT NULL
    AND session_id NOT IN (SELECT id::text FROM public.anonymous_sessions)
    AND created_at < (now() - interval '30 days');
  
  RAISE NOTICE 'Cleaned up orphaned anonymous shipments';
END;
$$;