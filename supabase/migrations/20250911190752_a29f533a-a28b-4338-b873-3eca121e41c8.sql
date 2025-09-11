-- Fix security vulnerability in temp_quotes table
-- Remove the overly permissive "System can access temp quotes" policy
DROP POLICY IF EXISTS "System can access temp quotes for webhook processing" ON public.temp_quotes;

-- Create a more secure policy that only allows system access via service role
-- This policy will only allow webhook processing through service role functions
CREATE POLICY "System service role can access temp quotes for webhook processing" 
ON public.temp_quotes 
FOR SELECT 
USING (
  -- Only allow access if this is a service role request (for webhook processing)
  -- or if the quote belongs to the current user/session
  auth.role() = 'service_role' OR 
  (user_id IS NOT NULL AND auth.uid() = user_id) OR
  (user_id IS NULL AND session_id IS NOT NULL AND session_id = (validate_session_with_security_monitoring(
    (current_setting('request.headers', true)::jsonb->>'x-session-token'),
    (current_setting('request.headers', true)::jsonb->>'x-forwarded-for')
  ))::text)
);