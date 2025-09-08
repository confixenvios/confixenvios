-- Create trigger function to automatically dispatch webhook on shipment creation
CREATE OR REPLACE FUNCTION public.trigger_shipment_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only trigger for INSERT operations (new shipments)
  IF TG_OP = 'INSERT' THEN
    -- Call the webhook dispatch function asynchronously
    -- This will not block the shipment creation if webhook fails
    PERFORM pg_notify('shipment_webhook_dispatch', 
      json_build_object(
        'shipment_id', NEW.id,
        'tracking_code', NEW.tracking_code,
        'status', NEW.status
      )::text
    );
    
    -- Log the webhook trigger
    INSERT INTO public.webhook_logs (
      event_type,
      shipment_id,
      payload,
      response_status,
      response_body
    ) VALUES (
      'shipment_webhook_triggered',
      NEW.id::text,
      json_build_object(
        'shipment_id', NEW.id,
        'tracking_code', NEW.tracking_code,
        'status', NEW.status,
        'trigger_time', now()
      ),
      200,
      '{"status": "webhook_triggered"}'::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger on shipments table
DROP TRIGGER IF EXISTS on_shipment_created ON public.shipments;
CREATE TRIGGER on_shipment_created
  AFTER INSERT ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_shipment_webhook();