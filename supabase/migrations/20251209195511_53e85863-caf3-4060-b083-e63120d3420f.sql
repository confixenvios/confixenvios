
-- Recriar a função com search_path correto
DROP FUNCTION IF EXISTS public.accept_shipment(uuid, uuid);

CREATE OR REPLACE FUNCTION public.accept_shipment(p_shipment_id uuid, p_motorista_uuid uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id uuid;
  found_shipment_id uuid;
  shipment_status text;
BEGIN
  -- Usar auth.uid() se motorista_uuid não for fornecido
  current_user_id := COALESCE(p_motorista_uuid, auth.uid());
  
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
  
  -- Tentar buscar em shipments normais - usar FOR UPDATE para lock
  SELECT id, status INTO found_shipment_id, shipment_status
  FROM shipments
  WHERE id = p_shipment_id
  AND motorista_id IS NULL
  AND status IN ('PAID', 'PAYMENT_CONFIRMED', 'LABEL_GENERATED', 'PAGO_AGUARDANDO_ETIQUETA')
  FOR UPDATE SKIP LOCKED;
  
  IF found_shipment_id IS NOT NULL THEN
    -- Atualizar shipment
    UPDATE shipments
    SET 
      motorista_id = current_user_id,
      status = 'COLETA_ACEITA',
      updated_at = now()
    WHERE id = p_shipment_id
    AND motorista_id IS NULL;
    
    -- Verificar se realmente atualizou
    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Remessa já foi aceita por outro motorista'
      );
    END IF;
    
    -- Registrar no histórico
    INSERT INTO shipment_status_history (shipment_id, motorista_id, status, status_description)
    VALUES (p_shipment_id, current_user_id, 'COLETA_ACEITA', 'Coleta aceita pelo motorista');
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Remessa aceita com sucesso!',
      'shipment_type', 'normal'
    );
  END IF;
  
  -- Tentar buscar em b2b_shipments
  SELECT id INTO found_shipment_id
  FROM b2b_shipments
  WHERE id = p_shipment_id
  AND status = 'PENDENTE'
  FOR UPDATE SKIP LOCKED;
  
  IF found_shipment_id IS NOT NULL THEN
    -- Atualizar B2B shipment
    UPDATE b2b_shipments
    SET 
      status = 'ACEITA',
      updated_at = now()
    WHERE id = p_shipment_id;
    
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
