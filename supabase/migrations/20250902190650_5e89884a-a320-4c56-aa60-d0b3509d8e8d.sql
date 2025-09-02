-- Add encrypted storage for secret keys and enhance security
-- This migration addresses the security issue by implementing proper encryption for sensitive data

-- First, add a new column for encrypted secret keys
ALTER TABLE public.integrations 
ADD COLUMN encrypted_secret_key TEXT;

-- Create a function to encrypt secret keys using Supabase vault
CREATE OR REPLACE FUNCTION public.encrypt_integration_secret(
  integration_id UUID,
  secret_value TEXT
) RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encrypted_value TEXT;
BEGIN
  -- Only allow admins to encrypt secrets
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can manage integration secrets';
  END IF;
  
  -- Use pgsodium to encrypt the secret (Supabase built-in encryption)
  encrypted_value := vault.create_secret(secret_value, integration_id::text);
  
  RETURN encrypted_value;
END;
$$;

-- Create a function to decrypt secret keys (with additional access controls)
CREATE OR REPLACE FUNCTION public.decrypt_integration_secret(
  integration_id UUID,
  encrypted_value TEXT
) RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  decrypted_value TEXT;
  access_audit_log JSONB;
BEGIN
  -- Only allow admins to decrypt secrets
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can access integration secrets';
  END IF;
  
  -- Audit log for secret access
  access_audit_log := jsonb_build_object(
    'user_id', auth.uid(),
    'integration_id', integration_id,
    'action', 'secret_accessed',
    'timestamp', now(),
    'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent'
  );
  
  -- Log the access attempt (you can expand this to a dedicated audit table if needed)
  INSERT INTO public.webhook_logs (event_type, shipment_id, payload, response_status, response_body)
  VALUES ('secret_access_audit', integration_id::text, access_audit_log, 200, '{"status": "secret_accessed"}'::jsonb);
  
  -- Decrypt using vault
  SELECT decrypted_secret INTO decrypted_value 
  FROM vault.decrypted_secrets 
  WHERE name = integration_id::text;
  
  RETURN decrypted_value;
END;
$$;

-- Create a secure view for integrations that doesn't expose raw secrets
CREATE OR REPLACE VIEW public.integrations_secure AS
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

-- Add RLS policy for the secure view
ALTER VIEW public.integrations_secure SET (security_barrier = true);

-- Create audit table for tracking secret access (better security monitoring)
CREATE TABLE IF NOT EXISTS public.integration_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.integration_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy for audit logs - only admins can view
CREATE POLICY "Admins can view integration audit logs" 
ON public.integration_audit_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" 
ON public.integration_audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Create trigger to automatically create audit logs for integration changes
CREATE OR REPLACE FUNCTION public.audit_integration_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log integration modifications
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
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach audit trigger to integrations table
CREATE TRIGGER integration_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.audit_integration_changes();

-- Add updated_at trigger for integration_audit_logs
CREATE TRIGGER update_integration_audit_logs_updated_at
  BEFORE UPDATE ON public.integration_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();