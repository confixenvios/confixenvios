-- Criar função para disparar webhook quando houver mudanças nas filiais
CREATE OR REPLACE FUNCTION public.trigger_company_branch_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log que webhook deve ser disparado para filiais
  INSERT INTO public.webhook_logs (
    event_type,
    shipment_id,
    payload,
    response_status,
    response_body
  ) VALUES (
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'company_branch_created'
      WHEN TG_OP = 'UPDATE' THEN 'company_branch_updated'
      WHEN TG_OP = 'DELETE' THEN 'company_branch_deleted'
    END,
    COALESCE(NEW.id, OLD.id)::text,
    jsonb_build_object(
      'branch_id', COALESCE(NEW.id, OLD.id),
      'operation', TG_OP,
      'branch_data', CASE 
        WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
        ELSE to_jsonb(NEW)
      END,
      'timestamp', now(),
      'trigger_type', 'company_branch_change'
    ),
    200,
    jsonb_build_object('status', 'webhook_scheduled_for_processing')
  );
  
  -- Usar pg_notify para processamento assíncrono
  PERFORM pg_notify('company_branch_webhook', jsonb_build_object(
    'branch_id', COALESCE(NEW.id, OLD.id),
    'event_type', CASE 
      WHEN TG_OP = 'INSERT' THEN 'company_branch_created'
      WHEN TG_OP = 'UPDATE' THEN 'company_branch_updated'
      WHEN TG_OP = 'DELETE' THEN 'company_branch_deleted'
    END,
    'branch_data', CASE 
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      ELSE to_jsonb(NEW)
    END
  )::text);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Criar trigger para mudanças nas filiais
DROP TRIGGER IF EXISTS company_branch_webhook_trigger ON public.company_branches;
CREATE TRIGGER company_branch_webhook_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.company_branches
  FOR EACH ROW EXECUTE FUNCTION public.trigger_company_branch_webhook();