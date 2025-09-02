-- Fix security warnings from the previous migration

-- Remove SECURITY DEFINER from the view to fix the security warning
DROP VIEW IF EXISTS public.integrations_secure;

-- Recreate the view without SECURITY DEFINER
CREATE VIEW public.integrations_secure AS
SELECT 
  id,
  name,
  webhook_url,
  CASE 
    WHEN encrypted_secret_key IS NOT NULL THEN '***ENCRYPTED***'
    WHEN secret_key IS NOT NULL THEN '***LEGACY_SECRET***'
    ELSE NULL
  END as secret_status,
  active,
  created_at,
  updated_at
FROM public.integrations;

-- Add proper RLS policy for the secure view
CREATE POLICY "Admins can view integrations secure view" 
ON public.integrations 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));