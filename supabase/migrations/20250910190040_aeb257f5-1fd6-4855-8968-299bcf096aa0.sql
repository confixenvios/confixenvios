-- Corrigir trigger de webhook de remessa - remover dependências primeiro

-- Remover trigger existente
DROP TRIGGER IF EXISTS on_shipment_created ON public.shipments;

-- Remover função existente com CASCADE
DROP FUNCTION IF EXISTS public.trigger_shipment_webhook() CASCADE;

-- Recriar função corrigida com todos os dados necessários
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
  sender_personal_data record;
  recipient_personal_data record;
  declaration_data jsonb;
  company_branch_data jsonb;
BEGIN
  -- Apenas para INSERT (novas remessas) e UPDATE de status importantes
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status IN ('PAID', 'PAYMENT_CONFIRMED', 'LABEL_GENERATED')) THEN
    
    -- Buscar dados do endereço do remetente
    SELECT to_jsonb(a.*) INTO sender_address_data
    FROM public.addresses a
    WHERE a.id = NEW.sender_address_id;
    
    -- Buscar dados do endereço do destinatário
    SELECT to_jsonb(a.*) INTO recipient_address_data
    FROM public.addresses a
    WHERE a.id = NEW.recipient_address_id;
    
    -- Buscar dados pessoais criptografados do remetente (se existir)
    BEGIN
      SELECT document, phone, email INTO sender_personal_data
      FROM public.decrypt_personal_data(
        (SELECT id FROM public.secure_personal_data WHERE address_id = NEW.sender_address_id LIMIT 1)
      );
    EXCEPTION WHEN OTHERS THEN
      sender_personal_data := NULL;
    END;
    
    -- Buscar dados pessoais criptografados do destinatário (se existir)
    BEGIN
      SELECT document, phone, email INTO recipient_personal_data
      FROM public.decrypt_personal_data(
        (SELECT id FROM public.secure_personal_data WHERE address_id = NEW.recipient_address_id LIMIT 1)
      );
    EXCEPTION WHEN OTHERS THEN
      recipient_personal_data := NULL;
    END;
    
    -- Buscar dados da filial principal da empresa
    SELECT to_jsonb(cb.*) INTO company_branch_data
    FROM public.company_branches cb
    WHERE cb.is_main_branch = true AND cb.active = true
    LIMIT 1;
    
    -- Extrair dados da declaração de conteúdo se existirem
    declaration_data := NULL;
    IF NEW.document_type = 'declaracao_conteudo' AND NEW.quote_data IS NOT NULL THEN
      declaration_data := jsonb_build_object(
        'document_number', COALESCE(NEW.quote_data->'fiscalData'->>'declarationNumber', NEW.quote_data->'documentData'->'declarationData'->>'documentNumber', '01'),
        'issue_date', COALESCE(NEW.quote_data->'fiscalData'->>'issueDate', NEW.quote_data->'documentData'->'declarationData'->>'issueDate', date_trunc('day', now())::text),
        'delivery_forecast', COALESCE(NEW.quote_data->'fiscalData'->>'deliveryForecast', NEW.quote_data->'documentData'->'declarationData'->>'deliveryForecast'),
        'total_value', COALESCE(NEW.quote_data->'fiscalData'->'totalValue', NEW.quote_data->'documentData'->'declarationData'->'totalValue', NEW.quote_data->'merchandiseDetails'->>'totalValue', NEW.quote_data->'totalMerchandiseValue', 0),
        'content_description', COALESCE(NEW.quote_data->'fiscalData'->>'contentDescription', NEW.quote_data->'documentData'->>'merchandiseDescription', NEW.quote_data->>'merchandiseDescription', 'Mercadoria')
      );
    END IF;
    
    -- Preparar payload completo para webhook com TODOS os dados necessários para CTE
    webhook_payload := jsonb_build_object(
      'event_type', CASE WHEN TG_OP = 'INSERT' THEN 'shipment_created' ELSE 'shipment_status_updated' END,
      'shipment_id', NEW.id,
      'tracking_code', NEW.tracking_code,
      
      -- Dados completos da remessa
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
        'user_id', NEW.user_id,
        
        -- Dados completos do remetente (com dados pessoais descriptografados)
        'sender_address', jsonb_build_object(
          'id', sender_address_data->>'id',
          'name', sender_address_data->>'name',
          'cep', sender_address_data->>'cep',
          'street', sender_address_data->>'street',
          'number', sender_address_data->>'number',
          'complement', sender_address_data->>'complement',
          'neighborhood', sender_address_data->>'neighborhood',
          'city', sender_address_data->>'city',
          'state', sender_address_data->>'state',
          -- Dados pessoais descriptografados
          'document', CASE WHEN sender_personal_data IS NOT NULL THEN sender_personal_data.document ELSE NULL END,
          'phone', CASE WHEN sender_personal_data IS NOT NULL THEN sender_personal_data.phone ELSE NULL END,
          'email', CASE WHEN sender_personal_data IS NOT NULL THEN sender_personal_data.email ELSE NULL END
        ),
        
        -- Dados completos do destinatário (com dados pessoais descriptografados)
        'recipient_address', jsonb_build_object(
          'id', recipient_address_data->>'id',
          'name', recipient_address_data->>'name',
          'cep', recipient_address_data->>'cep',
          'street', recipient_address_data->>'street',
          'number', recipient_address_data->>'number',
          'complement', recipient_address_data->>'complement',
          'neighborhood', recipient_address_data->>'neighborhood',
          'city', recipient_address_data->>'city',
          'state', recipient_address_data->>'state',
          -- Dados pessoais descriptografados
          'document', CASE WHEN recipient_personal_data IS NOT NULL THEN recipient_personal_data.document ELSE NULL END,
          'phone', CASE WHEN recipient_personal_data IS NOT NULL THEN recipient_personal_data.phone ELSE NULL END,
          'email', CASE WHEN recipient_personal_data IS NOT NULL THEN recipient_personal_data.email ELSE NULL END
        ),
        
        -- Dados da empresa/filial principal
        'company_branch', company_branch_data,
        
        -- Dados da declaração de conteúdo (se aplicável)
        'declaration_data', declaration_data,
        
        -- Dados da NFe se aplicável
        'nfe_data', CASE 
          WHEN NEW.document_type = 'nota_fiscal_eletronica' THEN 
            jsonb_build_object(
              'access_key', COALESCE(NEW.quote_data->'fiscalData'->>'nfeAccessKey', NEW.quote_data->'documentData'->>'nfeKey')
            )
          ELSE null
        END,
        
        -- Dados completos da cotação e pagamento
        'quote_data', NEW.quote_data,
        'payment_data', NEW.payment_data,
        
        -- Informações adicionais para CTE
        'shipping_details', jsonb_build_object(
          'service_type', CASE WHEN NEW.selected_option = 'express' THEN 'Expresso' ELSE 'Economico' END,
          'pickup_type', CASE WHEN NEW.pickup_option = 'pickup' THEN 'Domiciliar' ELSE 'Balcao' END,
          'estimated_price', COALESCE(NEW.quote_data->'shippingQuote'->>'economicPrice', NEW.quote_data->'shippingQuote'->>'expressPrice', 0),
          'estimated_days', COALESCE(NEW.quote_data->'shippingQuote'->>'economicDays', NEW.quote_data->'shippingQuote'->>'expressDays', 0),
          'merchandise_value', COALESCE(NEW.quote_data->'totalMerchandiseValue', NEW.quote_data->'merchandiseDetails'->>'totalValue', 0),
          'merchandise_description', COALESCE(NEW.quote_data->>'merchandiseDescription', declaration_data->>'content_description', 'Mercadoria')
        )
      ),
      'timestamp', now()
    );

    -- Log detalhado que webhook está sendo processado
    INSERT INTO public.webhook_logs (
      event_type,
      shipment_id,
      payload,
      response_status,
      response_body
    ) VALUES (
      CASE WHEN TG_OP = 'INSERT' THEN 'shipment_created_webhook_triggered' ELSE 'shipment_updated_webhook_triggered' END,
      NEW.id::text,
      webhook_payload,
      202,
      jsonb_build_object(
        'status', 'webhook_triggered_with_complete_data',
        'has_sender_personal_data', sender_personal_data IS NOT NULL,
        'has_recipient_personal_data', recipient_personal_data IS NOT NULL,
        'has_company_branch', company_branch_data IS NOT NULL,
        'has_declaration_data', declaration_data IS NOT NULL,
        'document_type', NEW.document_type,
        'trigger_operation', TG_OP
      )
    );

    -- Usar pg_notify para processamento assíncrono do webhook
    PERFORM pg_notify('shipment_webhook', jsonb_build_object(
      'shipment_id', NEW.id,
      'action', 'dispatch_webhook',
      'payload', webhook_payload
    )::text);
    
    -- Log adicional para debug
    RAISE NOTICE 'Webhook triggered for shipment % with complete data including personal info', NEW.tracking_code;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recriar trigger
CREATE TRIGGER on_shipment_created
  AFTER INSERT OR UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_shipment_webhook();