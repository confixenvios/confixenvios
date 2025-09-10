-- Função para disparar webhook manualmente para remessa específica
CREATE OR REPLACE FUNCTION public.manual_dispatch_webhook_by_tracking_code(p_tracking_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  shipment_record record;
  webhook_payload jsonb;
  sender_address_data jsonb;
  recipient_address_data jsonb;
  sender_personal_data record;
  recipient_personal_data record;
  declaration_data jsonb;
  company_branch_data jsonb;
BEGIN
  -- Verificar se user é admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can manually dispatch webhooks';
  END IF;
  
  -- Buscar remessa pelo tracking code
  SELECT * INTO shipment_record
  FROM public.shipments
  WHERE tracking_code = p_tracking_code;
  
  IF shipment_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Shipment not found with tracking code: ' || p_tracking_code
    );
  END IF;
  
  -- Buscar dados do endereço do remetente
  SELECT to_jsonb(a.*) INTO sender_address_data
  FROM public.addresses a
  WHERE a.id = shipment_record.sender_address_id;
  
  -- Buscar dados do endereço do destinatário
  SELECT to_jsonb(a.*) INTO recipient_address_data
  FROM public.addresses a
  WHERE a.id = shipment_record.recipient_address_id;
  
  -- Buscar dados pessoais criptografados do remetente (se existir)
  BEGIN
    SELECT document, phone, email INTO sender_personal_data
    FROM public.decrypt_personal_data(
      (SELECT id FROM public.secure_personal_data WHERE address_id = shipment_record.sender_address_id LIMIT 1)
    );
  EXCEPTION WHEN OTHERS THEN
    sender_personal_data := NULL;
  END;
  
  -- Buscar dados pessoais criptografados do destinatário (se existir)
  BEGIN
    SELECT document, phone, email INTO recipient_personal_data
    FROM public.decrypt_personal_data(
      (SELECT id FROM public.secure_personal_data WHERE address_id = shipment_record.recipient_address_id LIMIT 1)
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
  IF shipment_record.document_type = 'declaracao_conteudo' AND shipment_record.quote_data IS NOT NULL THEN
    declaration_data := jsonb_build_object(
      'document_number', COALESCE(shipment_record.quote_data->'fiscalData'->>'declarationNumber', shipment_record.quote_data->'documentData'->'declarationData'->>'documentNumber', '01'),
      'issue_date', COALESCE(shipment_record.quote_data->'fiscalData'->>'issueDate', shipment_record.quote_data->'documentData'->'declarationData'->>'issueDate', date_trunc('day', now())::text),
      'delivery_forecast', COALESCE(shipment_record.quote_data->'fiscalData'->>'deliveryForecast', shipment_record.quote_data->'documentData'->'declarationData'->>'deliveryForecast'),
      'total_value', COALESCE(shipment_record.quote_data->'fiscalData'->'totalValue', shipment_record.quote_data->'documentData'->'declarationData'->'totalValue', shipment_record.quote_data->'merchandiseDetails'->>'totalValue', shipment_record.quote_data->'totalMerchandiseValue', 0),
      'content_description', COALESCE(shipment_record.quote_data->'fiscalData'->>'contentDescription', shipment_record.quote_data->'documentData'->>'merchandiseDescription', shipment_record.quote_data->>'merchandiseDescription', 'Mercadoria')
    );
  END IF;
  
  -- Montar payload completo
  webhook_payload := jsonb_build_object(
    'event_type', 'shipment_created_manual_dispatch',
    'shipment_id', shipment_record.id,
    'tracking_code', shipment_record.tracking_code,
    
    'shipment_data', jsonb_build_object(
      'id', shipment_record.id,
      'tracking_code', shipment_record.tracking_code,
      'status', shipment_record.status,
      'document_type', shipment_record.document_type,
      'weight', shipment_record.weight,
      'length', shipment_record.length,
      'width', shipment_record.width,
      'height', shipment_record.height,
      'format', shipment_record.format,
      'selected_option', shipment_record.selected_option,
      'pickup_option', shipment_record.pickup_option,
      'created_at', shipment_record.created_at,
      'updated_at', shipment_record.updated_at,
      'user_id', shipment_record.user_id,
      
      -- Dados completos do remetente
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
      
      -- Dados completos do destinatário
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
      
      'company_branch', company_branch_data,
      'declaration_data', declaration_data,
      
      -- Dados da NFe se aplicável
      'nfe_data', CASE 
        WHEN shipment_record.document_type = 'nota_fiscal_eletronica' THEN 
          jsonb_build_object(
            'access_key', COALESCE(shipment_record.quote_data->'fiscalData'->>'nfeAccessKey', shipment_record.quote_data->'documentData'->>'nfeKey')
          )
        ELSE null
      END,
      
      'quote_data', shipment_record.quote_data,
      'payment_data', shipment_record.payment_data,
      
      'shipping_details', jsonb_build_object(
        'service_type', CASE WHEN shipment_record.selected_option = 'express' THEN 'Expresso' ELSE 'Economico' END,
        'pickup_type', CASE WHEN shipment_record.pickup_option = 'pickup' THEN 'Domiciliar' ELSE 'Balcao' END,
        'estimated_price', COALESCE(shipment_record.quote_data->'shippingQuote'->>'economicPrice', shipment_record.quote_data->'shippingQuote'->>'expressPrice', 0),
        'estimated_days', COALESCE(shipment_record.quote_data->'shippingQuote'->>'economicDays', shipment_record.quote_data->'shippingQuote'->>'expressDays', 0),
        'merchandise_value', COALESCE(shipment_record.quote_data->'totalMerchandiseValue', shipment_record.quote_data->'merchandiseDetails'->>'totalValue', 0),
        'merchandise_description', COALESCE(shipment_record.quote_data->>'merchandiseDescription', declaration_data->>'content_description', 'Mercadoria')
      )
    ),
    'timestamp', now()
  );
  
  -- Log webhook dispatch manual
  INSERT INTO public.webhook_logs (
    event_type,
    shipment_id,
    payload,
    response_status,
    response_body
  ) VALUES (
    'manual_webhook_dispatch_complete_data',
    shipment_record.id::text,
    webhook_payload,
    200,
    jsonb_build_object(
      'status', 'manual_dispatch_with_complete_data',
      'has_sender_personal_data', sender_personal_data IS NOT NULL,
      'has_recipient_personal_data', recipient_personal_data IS NOT NULL,
      'has_company_branch', company_branch_data IS NOT NULL,
      'has_declaration_data', declaration_data IS NOT NULL,
      'dispatched_by', auth.uid(),
      'tracking_code', p_tracking_code
    )
  );
  
  -- Notificar para processamento assíncrono
  PERFORM pg_notify('shipment_webhook', jsonb_build_object(
    'shipment_id', shipment_record.id,
    'action', 'manual_dispatch_webhook',
    'payload', webhook_payload
  )::text);
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Webhook dispatch manual executado com sucesso',
    'shipment_id', shipment_record.id,
    'tracking_code', p_tracking_code,
    'payload_preview', jsonb_build_object(
      'has_sender_data', sender_personal_data IS NOT NULL,
      'has_recipient_data', recipient_personal_data IS NOT NULL,
      'has_company_data', company_branch_data IS NOT NULL,
      'document_type', shipment_record.document_type
    )
  );
END;
$function$;