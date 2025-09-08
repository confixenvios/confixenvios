-- Simplify trigger function to use async processing
CREATE OR REPLACE FUNCTION public.trigger_shipment_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only trigger for INSERT operations (new shipments)  
  IF TG_OP = 'INSERT' THEN
    -- Log that webhook should be triggered
    INSERT INTO public.webhook_logs (
      event_type,
      shipment_id,
      payload,
      response_status,
      response_body
    ) VALUES (
      'shipment_created_trigger',
      NEW.id::text,
      jsonb_build_object(
        'shipment_id', NEW.id,
        'tracking_code', NEW.tracking_code,
        'status', NEW.status,
        'created_at', NEW.created_at,
        'trigger_type', 'automatic_database_trigger'
      ),
      200,
      jsonb_build_object('status', 'webhook_scheduled_for_processing')
    );
    
    -- Use pg_notify to trigger async webhook processing
    PERFORM pg_notify('webhook_dispatch', jsonb_build_object(
      'shipment_id', NEW.id,
      'event_type', 'shipment_created'
    )::text);
  END IF;
  
  RETURN NEW;
END;
$function$;