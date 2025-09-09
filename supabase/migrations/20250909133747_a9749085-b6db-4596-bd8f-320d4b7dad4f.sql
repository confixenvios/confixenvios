-- Simplify the trigger function back to basic logging
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
    
    -- Use pg_notify for potential async processing
    PERFORM pg_notify('webhook_dispatch', jsonb_build_object(
      'shipment_id', NEW.id,
      'event_type', 'shipment_created'
    )::text);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create an admin function to manually dispatch webhooks
CREATE OR REPLACE FUNCTION public.manual_webhook_dispatch(shipment_uuid uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  -- Only allow admins to manually dispatch webhooks
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can manually dispatch webhooks';
  END IF;
  
  -- Log the manual dispatch request
  INSERT INTO public.webhook_logs (
    event_type,
    shipment_id,
    payload,
    response_status,
    response_body
  ) VALUES (
    'manual_webhook_dispatch_requested',
    shipment_uuid::text,
    jsonb_build_object(
      'requested_by', auth.uid(),
      'shipment_id', shipment_uuid,
      'timestamp', now()
    ),
    200,
    jsonb_build_object('status', 'dispatch_requested_manually')
  );
  
  -- For now, return success message - the edge function call will be handled by frontend
  SELECT jsonb_build_object(
    'success', true,
    'message', 'Webhook dispatch requested successfully',
    'shipment_id', shipment_uuid,
    'instruction', 'Call the shipment-webhook-dispatch edge function with this shipment ID'
  ) INTO result;
  
  RETURN result;
END;
$function$;