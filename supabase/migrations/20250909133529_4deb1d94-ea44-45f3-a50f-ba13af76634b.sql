-- Update the trigger function to directly call the edge function via HTTP
CREATE OR REPLACE FUNCTION public.trigger_shipment_webhook()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  webhook_response record;
  shipment_payload jsonb;
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
    
    -- Build shipment payload with quote_data information
    SELECT jsonb_build_object(
      'addressData', NEW.quote_data->'addressData',
      'deliveryDetails', NEW.quote_data->'deliveryDetails', 
      'merchandiseDetails', NEW.quote_data->'merchandiseDetails',
      'technicalData', NEW.quote_data->'technicalData',
      'merchandiseDescription', NEW.quote_data->'merchandiseDescription',
      'documentType', NEW.document_type,
      'quoteData', NEW.quote_data->'quoteData',
      'documentData', NEW.quote_data->'documentData'
    ) INTO shipment_payload;
    
    -- Call the edge function directly via HTTP
    SELECT * INTO webhook_response FROM extensions.http((
      'POST',
      current_setting('app.supabase_url', true) || '/functions/v1/shipment-webhook-dispatch',
      ARRAY[
        extensions.http_header('Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)),
        extensions.http_header('Content-Type', 'application/json')
      ],
      'application/json',
      jsonb_build_object(
        'shipmentId', NEW.id,
        'shipmentData', shipment_payload
      )::text
    ));
    
    -- Log the webhook response
    INSERT INTO public.webhook_logs (
      event_type,
      shipment_id,
      payload,
      response_status,
      response_body
    ) VALUES (
      'webhook_http_call',
      NEW.id::text,
      jsonb_build_object(
        'http_request', 'edge_function_call',
        'function_name', 'shipment-webhook-dispatch',
        'shipment_payload', shipment_payload
      ),
      webhook_response.status_code,
      webhook_response.content::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$function$;