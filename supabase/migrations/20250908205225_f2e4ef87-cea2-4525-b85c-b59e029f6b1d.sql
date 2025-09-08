-- Update trigger to directly call webhook dispatch function
CREATE OR REPLACE FUNCTION public.trigger_shipment_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  webhook_result jsonb;
BEGIN
  -- Only trigger for INSERT operations (new shipments)
  IF TG_OP = 'INSERT' THEN
    -- Call the webhook dispatch edge function directly
    BEGIN
      SELECT content INTO webhook_result
      FROM net.http_request(
        url := 'https://dhznyjtisfdxzbnzinab.supabase.co/functions/v1/shipment-webhook-dispatch',
        method := 'POST',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object(
          'shipmentId', NEW.id,
          'shipmentData', jsonb_build_object(
            'tracking_code', NEW.tracking_code,
            'status', NEW.status,
            'created_at', NEW.created_at
          )
        )
      );
      
      -- Log successful webhook trigger
      INSERT INTO public.webhook_logs (
        event_type,
        shipment_id,
        payload,
        response_status,
        response_body
      ) VALUES (
        'auto_webhook_dispatched',
        NEW.id::text,
        jsonb_build_object(
          'shipment_id', NEW.id,
          'tracking_code', NEW.tracking_code,
          'trigger_type', 'database_trigger'
        ),
        200,
        webhook_result
      );
      
    EXCEPTION WHEN OTHERS THEN
      -- Log webhook dispatch failure (non-critical)
      INSERT INTO public.webhook_logs (
        event_type,
        shipment_id,
        payload,
        response_status,
        response_body
      ) VALUES (
        'auto_webhook_failed',
        NEW.id::text,
        jsonb_build_object(
          'shipment_id', NEW.id,
          'error', SQLERRM,
          'trigger_type', 'database_trigger'
        ),
        500,
        jsonb_build_object('error', SQLERRM)
      );
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;