-- Primeiro remover a função antiga
DROP FUNCTION IF EXISTS public.accept_shipment(uuid, uuid);

-- Recriar a função corrigindo a ambiguidade de nomes de colunas
CREATE OR REPLACE FUNCTION public.accept_shipment(p_shipment_id uuid, p_motorista_uuid uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id uuid;
  shipment_record record;
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
  
  -- Tentar buscar primeiro em shipments normais
  SELECT * INTO shipment_record
  FROM shipments s
  WHERE s.id = p_shipment_id
  AND s.motorista_id IS NULL
  AND s.status IN ('PAID', 'PAYMENT_CONFIRMED', 'LABEL_GENERATED', 'PAGO_AGUARDANDO_ETIQUETA');
  
  IF shipment_record IS NOT NULL THEN
    -- É uma remessa normal
    UPDATE shipments
    SET 
      motorista_id = current_user_id,
      status = 'COLETA_ACEITA',
      updated_at = now()
    WHERE id = p_shipment_id;
    
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
  SELECT * INTO shipment_record
  FROM b2b_shipments b
  WHERE b.id = p_shipment_id
  AND b.status = 'PENDENTE';
  
  IF shipment_record IS NOT NULL THEN
    -- É uma remessa B2B
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
$function$;