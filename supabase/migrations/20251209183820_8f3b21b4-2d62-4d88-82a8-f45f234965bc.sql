-- Atualizar a função accept_shipment para usar auth.uid() diretamente
CREATE OR REPLACE FUNCTION public.accept_shipment(shipment_id uuid, motorista_uuid uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  shipment_record record;
  is_b2b boolean := false;
BEGIN
  -- Usar auth.uid() se motorista_uuid não for fornecido
  current_user_id := COALESCE(motorista_uuid, auth.uid());
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Motorista não identificado'
    );
  END IF;
  
  -- Verificar se o usuário tem role de motorista
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = current_user_id 
    AND role = 'motorista'::app_role
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuário não tem permissão de motorista'
    );
  END IF;
  
  -- Verificar se é uma remessa B2B pelo formato do ID
  -- Tentar buscar primeiro em shipments normais
  SELECT * INTO shipment_record
  FROM shipments
  WHERE id = shipment_id
  AND motorista_id IS NULL
  AND status IN ('PAID', 'PAYMENT_CONFIRMED', 'LABEL_GENERATED', 'PAGO_AGUARDANDO_ETIQUETA');
  
  IF shipment_record IS NOT NULL THEN
    -- É uma remessa normal
    UPDATE shipments
    SET 
      motorista_id = current_user_id,
      status = 'COLETA_ACEITA',
      updated_at = now()
    WHERE id = shipment_id;
    
    -- Registrar no histórico
    INSERT INTO shipment_status_history (shipment_id, motorista_id, status, status_description)
    VALUES (shipment_id, current_user_id, 'COLETA_ACEITA', 'Coleta aceita pelo motorista');
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Remessa aceita com sucesso!',
      'shipment_type', 'normal'
    );
  END IF;
  
  -- Tentar buscar em b2b_shipments
  SELECT * INTO shipment_record
  FROM b2b_shipments
  WHERE id = shipment_id
  AND status = 'PENDENTE';
  
  IF shipment_record IS NOT NULL THEN
    -- É uma remessa B2B
    UPDATE b2b_shipments
    SET 
      status = 'ACEITA',
      updated_at = now()
    WHERE id = shipment_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Remessa B2B aceita com sucesso!',
      'shipment_type', 'b2b'
    );
  END IF;
  
  -- Nenhuma remessa encontrada
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Remessa não encontrada ou já foi aceita por outro motorista'
  );
END;
$$;

-- Atualizar função get_motorista_shipments_public para suportar auth.uid()
CREATE OR REPLACE FUNCTION public.get_motorista_shipments_public(motorista_uuid uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  tracking_code text,
  status text,
  created_at timestamp with time zone,
  weight numeric,
  length numeric,
  width numeric,
  height numeric,
  format text,
  selected_option text,
  pickup_option text,
  quote_data jsonb,
  payment_data jsonb,
  label_pdf_url text,
  cte_key text,
  sender_address jsonb,
  recipient_address jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Usar auth.uid() se motorista_uuid não for fornecido
  current_user_id := COALESCE(motorista_uuid, auth.uid());
  
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    s.id,
    s.tracking_code,
    s.status,
    s.created_at,
    s.weight,
    s.length,
    s.width,
    s.height,
    s.format,
    s.selected_option,
    s.pickup_option,
    s.quote_data,
    s.payment_data,
    s.label_pdf_url,
    s.cte_key,
    to_jsonb(sender.*) as sender_address,
    to_jsonb(recipient.*) as recipient_address
  FROM shipments s
  LEFT JOIN addresses sender ON s.sender_address_id = sender.id
  LEFT JOIN addresses recipient ON s.recipient_address_id = recipient.id
  WHERE s.motorista_id = current_user_id
  AND s.status NOT IN ('CANCELLED', 'DRAFT')
  ORDER BY s.created_at DESC;
END;
$$;