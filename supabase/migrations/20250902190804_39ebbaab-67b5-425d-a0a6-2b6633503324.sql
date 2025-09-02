-- Fix the remaining critical security errors

-- The integrations_secure view needs to be handled differently since views can't have RLS directly
-- Let's create a more secure approach by using a function instead of a view

-- Drop the problematic view
DROP VIEW IF EXISTS public.integrations_secure;

-- Create a secure function that returns integration data with masked secrets
CREATE OR REPLACE FUNCTION public.get_secure_integrations()
RETURNS TABLE(
  id UUID,
  name TEXT,
  webhook_url TEXT,
  secret_status TEXT,
  active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to access this function
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can view integrations';
  END IF;
  
  RETURN QUERY
  SELECT 
    i.id,
    i.name,
    i.webhook_url,
    CASE 
      WHEN i.encrypted_secret_key IS NOT NULL THEN '***ENCRYPTED***'
      WHEN i.secret_key IS NOT NULL THEN '***LEGACY_SECRET***'
      ELSE NULL
    END as secret_status,
    i.active,
    i.created_at,
    i.updated_at
  FROM public.integrations i;
END;
$$;