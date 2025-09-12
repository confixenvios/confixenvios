-- Atualizar o trigger para chamar a edge function de auto-dispatch após preparar os dados

CREATE OR REPLACE FUNCTION public.trigger_shipment_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  webhook_payload jsonb;
  sender_address_data jsonb;
  recipient_address_data jsonb;
  sender_personal_data record;
  recipient_personal_data record;
  declaration_data jsonb;
  company_branch_data jsonb;
  pricing_table_data jsonb;
  active_integration_exists boolean := false;
BEGIN
  -- Apenas para INSERT (novas remessas) e UPDATE de status importantes
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status IN ('PAID', 'PAYMENT_CONFIRMED', 'LABEL_GENERATED')) THEN
    
    -- Verificar se existe integração ativa antes de processar
    SELECT EXISTS(
      SELECT 1 FROM public.integrations 
      WHERE active = true AND webhook_url IS NOT NULL
    ) INTO active_integration_exists;
    
    IF NOT active_integration_exists THEN
      -- Se não há integração ativa, apenas logar
      INSERT INTO public.webhook_logs (
        event_type,
        shipment_id,
        payload,
        response_status,
        response_body
      ) VALUES (
        'no_active_integration',
        NEW.id::text,
        jsonb_build_object('tracking_code', NEW.tracking_code, 'status', NEW.status),
        202,
        jsonb_build_object('message', 'No active webhook integration configured')
      );
      RETURN NEW;
    END IF;
    
    -- Buscar dados do endereço do remetente
    SELECT to_jsonb(a.*) INTO sender_address_data
    FROM public.addresses a
    WHERE a.id = NEW.sender_address_id;
    
    -- Buscar dados do endereço do destinatário
    SELECT to_jsonb(a.*) INTO recipient_address_data
    FROM public.addresses a
    WHERE a.id = NEW.recipient_address_id;
    
    -- Buscar dados COMPLETOS da tabela de preços utilizada (se houver)
    IF NEW.pricing_table_id IS NOT NULL THEN
      SELECT to_jsonb(pt.*) INTO pricing_table_data
      FROM public.pricing_tables pt
      WHERE pt.id = NEW.pricing_table_id;
    ELSIF NEW.pricing_table_name IS NOT NULL THEN
      -- Fallback: buscar por nome se não houver ID
      SELECT to_jsonb(pt.*) INTO pricing_table_data
      FROM public.pricing_tables pt
      WHERE pt.name = NEW.pricing_table_name
      AND pt.is_active = true
      LIMIT 1;
    ELSE
      pricing_table_data := NULL;
    END IF;
    
    -- Buscar dados pessoais criptografados do remetente (extrair do quote_data se não houver na tabela segura)
    BEGIN
      SELECT document, phone, email INTO sender_personal_data
      FROM public.decrypt_personal_data(
        (SELECT id FROM public.secure_personal_data WHERE address_id = NEW.sender_address_id LIMIT 1)
      );
    EXCEPTION WHEN OTHERS THEN
      -- Se não tem dados criptografados, tentar buscar do quote_data (dados originais do formulário)
      IF NEW.quote_data IS NOT NULL THEN
        SELECT 
          COALESCE(NEW.quote_data->'addressData'->'sender'->>'document', NEW.quote_data->'senderData'->>'document') as document,
          COALESCE(NEW.quote_data->'addressData'->'sender'->>'phone', NEW.quote_data->'senderData'->>'phone') as phone,
          COALESCE(NEW.quote_data->'addressData'->'sender'->>'email', NEW.quote_data->'senderData'->>'email') as email
        INTO sender_personal_data;
      ELSE
        sender_personal_data := NULL;
      END IF;
    END;
    
    -- Buscar dados pessoais criptografados do destinatário (extrair do quote_data se não houver na tabela segura)
    BEGIN
      SELECT document, phone, email INTO recipient_personal_data
      FROM public.decrypt_personal_data(
        (SELECT id FROM public.secure_personal_data WHERE address_id = NEW.recipient_address_id LIMIT 1)
      );
    EXCEPTION WHEN OTHERS THEN
      -- Se não tem dados criptografados, tentar buscar do quote_data (dados originais do formulário)
      IF NEW.quote_data IS NOT NULL THEN
        SELECT 
          COALESCE(NEW.quote_data->'addressData'->'recipient'->>'document', NEW.quote_data->'recipientData'->>'document') as document,
          COALESCE(NEW.quote_data->'addressData'->'recipient'->>'phone', NEW.quote_data->'recipientData'->>'phone') as phone,
          COALESCE(NEW.quote_data->'addressData'->'recipient'->>'email', NEW.quote_data->'recipientData'->>'email') as email
        INTO recipient_personal_data;
      ELSE
        recipient_personal_data := NULL;
      END IF;
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
        'total_value', COALESCE((NEW.quote_data->'fiscalData'->'totalValue')::numeric, (NEW.quote_data->'documentData'->'declarationData'->'totalValue')::numeric, (NEW.quote_data->'merchandiseDetails'->>'totalValue')::numeric, (NEW.quote_data->>'totalMerchandiseValue')::numeric, 0),
        'content_description', COALESCE(NEW.quote_data->'fiscalData'->>'contentDescription', NEW.quote_data->'documentData'->>'merchandiseDescription', NEW.quote_data->>'merchandiseDescription', 'Mercadoria')
      );
    END IF;
    
    -- Preparar payload completo para webhook com TODOS os dados necessários incluindo tabela de preços completa
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
        'session_id', NEW.session_id,
        
        -- Informações COMPLETAS da tabela de preços utilizada
        'pricing_table_id', NEW.pricing_table_id,
        'pricing_table_name', NEW.pricing_table_name,
        'pricing_table_details', pricing_table_data,
        'pricing_table_applied', CASE WHEN pricing_table_data IS NOT NULL THEN true ELSE false END,
        
        -- Dados completos do remetente (com dados pessoais dos formulários originais)
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
          -- Dados pessoais (prioritizando dados originais do formulário)
          'document', CASE WHEN sender_personal_data IS NOT NULL THEN sender_personal_data.document ELSE NULL END,
          'phone', CASE WHEN sender_personal_data IS NOT NULL THEN sender_personal_data.phone ELSE NULL END,
          'email', CASE WHEN sender_personal_data IS NOT NULL THEN sender_personal_data.email ELSE NULL END
        ),
        
        -- Dados completos do destinatário (com dados pessoais dos formulários originais)
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
          -- Dados pessoais (prioritizando dados originais do formulário)
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
        
        -- Dados completos da cotação e pagamento (todos os dados originais do formulário)
        'quote_data', NEW.quote_data,
        'payment_data', NEW.payment_data,
        
        -- Informações adicionais para processamento
        'shipping_details', jsonb_build_object(
          'service_type', CASE WHEN NEW.selected_option = 'express' THEN 'Expresso' ELSE 'Economico' END,
          'pickup_type', CASE WHEN NEW.pickup_option = 'pickup' THEN 'Domiciliar' ELSE 'Balcao' END,
          'estimated_price', COALESCE((NEW.quote_data->'shippingQuote'->>'economicPrice')::numeric, (NEW.quote_data->'shippingQuote'->>'expressPrice')::numeric, 0),
          'estimated_days', COALESCE((NEW.quote_data->'shippingQuote'->>'economicDays')::integer, (NEW.quote_data->'shippingQuote'->>'expressDays')::integer, 0),
          'merchandise_value', COALESCE((NEW.quote_data->>'totalMerchandiseValue')::numeric, (NEW.quote_data->'merchandiseDetails'->>'totalValue')::numeric, 0),
          'merchandise_description', COALESCE(NEW.quote_data->>'merchandiseDescription', declaration_data->>'content_description', 'Mercadoria')
        )
      ),
      'timestamp', now()
    );

    -- Log que webhook está sendo processado automaticamente
    INSERT INTO public.webhook_logs (
      event_type,
      shipment_id,
      payload,
      response_status,
      response_body
    ) VALUES (
      CASE WHEN TG_OP = 'INSERT' THEN 'webhook_ready_for_dispatch' ELSE 'webhook_status_update_ready' END,
      NEW.id::text,
      webhook_payload,
      202,
      jsonb_build_object(
        'status', 'webhook_data_prepared_automatic',
        'has_sender_personal_data', sender_personal_data IS NOT NULL,
        'has_recipient_personal_data', recipient_personal_data IS NOT NULL,
        'has_company_branch', company_branch_data IS NOT NULL,
        'has_declaration_data', declaration_data IS NOT NULL,
        'has_pricing_table', pricing_table_data IS NOT NULL,
        'pricing_table_name', NEW.pricing_table_name,
        'pricing_table_id', NEW.pricing_table_id,
        'document_type', NEW.document_type,
        'trigger_operation', TG_OP,
        'note', 'Webhook data prepared - auto dispatcher will process it'
      )
    );
    
    -- Chamar a edge function de auto-dispatch para processar os webhooks preparados
    -- Usar pg_notify para sinalizar que há webhooks para processar
    PERFORM pg_notify('webhook_dispatch_ready', jsonb_build_object(
      'shipment_id', NEW.id::text,
      'tracking_code', NEW.tracking_code,
      'action', 'auto_dispatch_requested'
    )::text);
    
    -- Log adicional para debug
    RAISE NOTICE 'Webhook data prepared automatically for shipment % with complete data including pricing table: % - Auto dispatch signaled', NEW.tracking_code, CASE WHEN pricing_table_data IS NOT NULL THEN NEW.pricing_table_name ELSE 'NONE' END;
  END IF;
  
  RETURN NEW;
END;
$function$;