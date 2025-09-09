-- Simplificar função para usar apenas pg_notify (mais confiável)
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
    202,
    jsonb_build_object('status', 'webhook_queued_for_processing')
  );

  -- Usar pg_notify para processamento assíncrono
  PERFORM pg_notify('company_branch_webhook', webhook_payload::text);

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Criar função administrativa para testar webhook manualmente
CREATE OR REPLACE FUNCTION public.manual_company_branch_webhook_dispatch(branch_uuid uuid, webhook_event_type text DEFAULT 'company_branch_updated')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Apenas admins podem disparar webhooks manualmente
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can manually dispatch company branch webhooks';
  END IF;
  
  -- Log da solicitação manual
  INSERT INTO public.webhook_logs (
    event_type,
    shipment_id,
    payload,
    response_status,
    response_body
  ) VALUES (
    'manual_company_branch_webhook_requested',
    branch_uuid::text,
    jsonb_build_object(
      'requested_by', auth.uid(),
      'branch_id', branch_uuid,
      'event_type', webhook_event_type,
      'timestamp', now()
    ),
    200,
    jsonb_build_object('status', 'manual_dispatch_requested')
  );
  
  -- Retornar instruções para chamar a edge function
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Company branch webhook dispatch requested successfully',
    'branch_id', branch_uuid,
    'event_type', webhook_event_type,
    'instruction', 'Call the company-branch-webhook-dispatch edge function with this branch ID and event type'
  );
END;
$function$;