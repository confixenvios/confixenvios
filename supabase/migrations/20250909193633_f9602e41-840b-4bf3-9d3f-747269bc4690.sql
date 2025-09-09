-- Atualizar função para chamar automaticamente a edge function
CREATE OR REPLACE FUNCTION public.trigger_company_branch_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  webhook_payload jsonb;
BEGIN
  -- Preparar payload com dados da filial
  webhook_payload := jsonb_build_object(
    'branch_id', COALESCE(NEW.id, OLD.id),
    'event_type', CASE 
      WHEN TG_OP = 'INSERT' THEN 'company_branch_created'
      WHEN TG_OP = 'UPDATE' THEN 'company_branch_updated'
      WHEN TG_OP = 'DELETE' THEN 'company_branch_deleted'
    END,
    'branch_data', CASE 
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      ELSE to_jsonb(NEW)
    END,
    'timestamp', now()
  );

  -- Log que webhook está sendo processado
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
    webhook_payload,
    200,
    jsonb_build_object('status', 'webhook_dispatch_initiated')
  );

  -- Chamar edge function de forma assíncrona usando pg_notify
  -- A edge function será chamada por um worker que escuta as notificações
  PERFORM pg_notify('company_branch_webhook', webhook_payload::text);

  -- Também fazer uma chamada HTTP direta à edge function (em background)
  PERFORM net.http_post(
    url := 'https://dhznyjtisfdxzbnzinab.supabase.co/functions/v1/company-branch-webhook-dispatch',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
    body := webhook_payload
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$;