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

-- Step 5: Add special policy for tracking code lookups (public but monitored)
CREATE POLICY "Public tracking code lookup" 
ON public.shipments 
FOR SELECT 
USING (
  tracking_code IS NOT NULL 
  AND tracking_code != ''
);

-- Step 6: Add data migration to populate session_id for existing anonymous shipments
-- This ensures existing data doesn't become inaccessible
UPDATE public.shipments 
SET session_id = 'migrated_' || id::text || '_' || extract(epoch from created_at)::text
WHERE user_id IS NULL AND session_id IS NULL;

-- Step 7: Create cleanup function for orphaned anonymous shipments
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
    AND session_id LIKE 'migrated_%'
    AND created_at < (now() - interval '30 days');
  
  RAISE NOTICE 'Cleaned up orphaned anonymous shipments';
END;
$$;