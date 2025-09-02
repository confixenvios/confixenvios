-- SECURITY FIX: Prevent anonymous users from viewing other users' personal data
-- Remove the insecure policy that allows anonymous users to see all recent addresses
DROP POLICY IF EXISTS "Anonymous users can view addresses by session" ON public.addresses;

-- Add session_id column to track anonymous user sessions securely
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Create index for better performance on session_id lookups
CREATE INDEX IF NOT EXISTS idx_addresses_session_id ON public.addresses(session_id);

-- Create secure policy for anonymous users - they can only see their own session addresses
CREATE POLICY "Anonymous users can view own session addresses"
ON public.addresses
FOR SELECT
USING (
  user_id IS NULL 
  AND session_id IS NOT NULL 
  AND session_id = current_setting('request.headers', true)::jsonb->>'x-session-id'
);

-- Update the anonymous insert policy to require session_id
DROP POLICY IF EXISTS "Anonymous users can create addresses with restrictions" ON public.addresses;
CREATE POLICY "Anonymous users can create addresses with session"
ON public.addresses
FOR INSERT
WITH CHECK (
  user_id IS NULL 
  AND session_id IS NOT NULL
  AND session_id = current_setting('request.headers', true)::jsonb->>'x-session-id'
  AND created_at IS NOT NULL
);

-- Update the anonymous update policy to be more restrictive
DROP POLICY IF EXISTS "Anonymous users can update recent addresses" ON public.addresses;
CREATE POLICY "Anonymous users can update own session addresses"
ON public.addresses
FOR UPDATE
USING (
  user_id IS NULL 
  AND session_id IS NOT NULL
  AND session_id = current_setting('request.headers', true)::jsonb->>'x-session-id'
  AND created_at > (now() - '24:00:00'::interval)
)
WITH CHECK (
  user_id IS NULL 
  AND session_id IS NOT NULL
  AND session_id = current_setting('request.headers', true)::jsonb->>'x-session-id'
);