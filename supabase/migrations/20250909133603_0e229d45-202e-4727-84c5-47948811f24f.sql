-- Set required environment variables for HTTP calls
ALTER DATABASE postgres SET app.supabase_url TO 'https://dhznyjtisfdxzbnzinab.supabase.co';
ALTER DATABASE postgres SET app.supabase_service_role_key TO 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoem55anRpc2ZkeHpibnppbmFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQwMzI2MCwiZXhwIjoyMDcxOTc5MjYwfQ.X5O7LkU9vdlk7QdGm2vzWCpN5tTW5tRPeDkUf-gpafU';

-- Update the trigger function to handle errors better and use simpler approach
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
      jsonb_build_object('status', 'webhook_dispatch_initiated')
    );
    
    -- Use pg_notify to signal webhook dispatch needed (simpler approach)
    PERFORM pg_notify('webhook_dispatch', jsonb_build_object(
      'shipment_id', NEW.id,
      'event_type', 'shipment_created',
      'tracking_code', NEW.tracking_code,
      'quote_data', NEW.quote_data
    )::text);
    
    -- Log the notification sent
    INSERT INTO public.webhook_logs (
      event_type,
      shipment_id,
      payload,
      response_status,
      response_body
    ) VALUES (
      'webhook_notification_sent',
      NEW.id::text,
      jsonb_build_object(
        'notification_type', 'pg_notify',
        'channel', 'webhook_dispatch',
        'shipment_id', NEW.id
      ),
      200,
      jsonb_build_object('status', 'notification_sent')
    );
  END IF;
  
  RETURN NEW;
END;
$function$;