-- Atualizar função de webhook de remessas para incluir dados da declaração de conteúdo
CREATE OR REPLACE FUNCTION public.trigger_shipment_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  webhook_payload jsonb;
  sender_address_data jsonb;
  recipient_address_data jsonb;
  declaration_data jsonb;
BEGIN
  -- Apenas para INSERT (novas remessas)
  IF TG_OP = 'INSERT' THEN
    
    -- Buscar dados do endereço do remetente
    SELECT to_jsonb(a.*) INTO sender_address_data
    FROM public.addresses a
    WHERE a.id = NEW.sender_address_id;
    
    -- Buscar dados do endereço do destinatário
    SELECT to_jsonb(a.*) INTO recipient_address_data
    FROM public.addresses a
    WHERE a.id = NEW.recipient_address_id;
    
    -- Extrair dados da declaração de conteúdo se existirem
    declaration_data := NULL;
    IF NEW.document_type = 'declaracao_conteudo' AND NEW.quote_data IS NOT NULL THEN
      declaration_data := jsonb_build_object(
        'document_number', COALESCE(NEW.quote_data->'fiscalData'->>'declarationNumber', NEW.quote_data->'documentData'->'declarationData'->>'documentNumber'),
        'issue_date', COALESCE(NEW.quote_data->'fiscalData'->>'issueDate', NEW.quote_data->'documentData'->'declarationData'->>'issueDate'),
        'delivery_forecast', COALESCE(NEW.quote_data->'fiscalData'->>'deliveryForecast', NEW.quote_data->'documentData'->'declarationData'->>'deliveryForecast'),
        'total_value', COALESCE(NEW.quote_data->'fiscalData'->'totalValue', NEW.quote_data->'documentData'->'declarationData'->'totalValue'),
        'content_description', COALESCE(NEW.quote_data->'fiscalData'->>'contentDescription', NEW.quote_data->'documentData'->>'merchandiseDescription')
      );
    END IF;
    
    -- Preparar payload completo do webhook
    webhook_payload := jsonb_build_object(
      'event_type', 'shipment_created',
      'shipment_id', NEW.id,
      'tracking_code', NEW.tracking_code,
      'shipment_data', jsonb_build_object(
        'id', NEW.id,
        'tracking_code', NEW.tracking_code,
        'status', NEW.status,
        'document_type', NEW.document_type,
        'weight', NEW.weight,
        'length', NEW.length,
        'width', NEW.width,
        'height', NEW.height,
        'format', NEW.format,
        'selected_option', NEW.selected_option,
        'pickup_option', NEW.pickup_option,
        'created_at', NEW.created_at,
        'updated_at', NEW.updated_at,
        
        -- Dados dos endereços
        'sender_address', sender_address_data,
        'recipient_address', recipient_address_data,
        
        -- Dados da declaração de conteúdo (se aplicável)
        'declaration_data', declaration_data,
        
        -- Dados completos da cotação
        'quote_data', NEW.quote_data,
        'payment_data', NEW.payment_data
      ),
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
      'shipment_created',
      NEW.id::text,
      webhook_payload,
      202,
      jsonb_build_object('status', 'webhook_queued_for_processing')
    );

    -- Usar pg_notify para processamento assíncrono
    PERFORM pg_notify('shipment_webhook', webhook_payload::text);
  END IF;
  
  RETURN NEW;
END;
$function$;