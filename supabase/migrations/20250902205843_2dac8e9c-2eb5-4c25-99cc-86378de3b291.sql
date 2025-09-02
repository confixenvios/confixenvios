-- Fix audit trigger to handle system operations without user authentication
CREATE OR REPLACE FUNCTION public.audit_integration_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only log if user is authenticated (skip system operations)
  IF auth.uid() IS NOT NULL THEN
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
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Now configure N8n webhook for automatic dispatch after payment
UPDATE public.integrations 
SET webhook_url = 'https://n8n.grupoconfix.com/webhook-test/confixenvios',
    name = 'N8n Production Webhook',
    active = true
WHERE name ILIKE '%n8n%' OR name ILIKE '%webhook%'
   OR webhook_url ILIKE '%n8n%';

-- Insert webhook configuration if not exists
INSERT INTO public.integrations (name, webhook_url, active)
SELECT 'N8n Production Webhook', 'https://n8n.grupoconfix.com/webhook-test/confixenvios', true
WHERE NOT EXISTS (
    SELECT 1 FROM public.integrations 
    WHERE webhook_url = 'https://n8n.grupoconfix.com/webhook-test/confixenvios'
);