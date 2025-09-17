-- Corrigir função audit_sensitive_operations que está causando erro JSON
CREATE OR REPLACE FUNCTION public.audit_sensitive_operations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'integrations' THEN
    INSERT INTO public.webhook_logs (
      event_type,
      shipment_id,
      payload,
      response_status,
      response_body
    ) VALUES (
      'audit_log',
      COALESCE(NEW.id, OLD.id)::text,
      jsonb_build_object(
        'operation', TG_OP,
        'table', TG_TABLE_NAME,
        'user_id', auth.uid(),
        'timestamp', NOW()
      ),
      200,
      jsonb_build_object('message', 'Audit log', 'status', 'success')
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$