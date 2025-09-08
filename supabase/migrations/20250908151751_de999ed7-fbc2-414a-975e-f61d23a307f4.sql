-- Criar função para listar remessas disponíveis para aceite pelos motoristas
CREATE OR REPLACE FUNCTION public.get_available_shipments()
RETURNS TABLE(
  id uuid,
  tracking_code text,
  status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  weight numeric,
  length numeric,
  width numeric,
  height numeric,
  format text,
  selected_option text,
  pickup_option text,
  quote_data jsonb,
  payment_data jsonb,
  cte_key text,
  sender_address_id uuid,
  recipient_address_id uuid,
  sender_address jsonb,
  recipient_address jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Retornar remessas que estão prontas para coleta e sem motorista atribuído
  RETURN QUERY
  SELECT 
    s.id,
    s.tracking_code,
    s.status,
    s.created_at,
    s.updated_at,
    s.weight,
    s.length,
    s.width,
    s.height,
    s.format,
    s.selected_option,
    s.pickup_option,
    s.quote_data,
    s.payment_data,
    s.cte_key,
    s.sender_address_id,
    s.recipient_address_id,
    -- Buscar dados completos do endereço do remetente
    COALESCE(
      (SELECT to_jsonb(sa) FROM (
        SELECT sa.name, sa.street, sa.number, sa.neighborhood, 
               sa.city, sa.state, sa.cep, sa.complement, sa.reference
        FROM public.addresses sa WHERE sa.id = s.sender_address_id
      ) sa), 
      '{}'::jsonb
    ) as sender_address,
    -- Buscar dados completos do endereço do destinatário  
    COALESCE(
      (SELECT to_jsonb(ra) FROM (
        SELECT ra.name, ra.street, ra.number, ra.neighborhood,
               ra.city, ra.state, ra.cep, ra.complement, ra.reference
        FROM public.addresses ra WHERE ra.id = s.recipient_address_id
      ) ra),
      '{}'::jsonb
    ) as recipient_address
  FROM public.shipments s
  WHERE s.motorista_id IS NULL
    AND s.status IN ('PAID', 'PAYMENT_CONFIRMED', 'LABEL_GENERATED', 'PAGO_AGUARDANDO_ETIQUETA')
  ORDER BY s.created_at ASC;
END;
$function$;

-- Criar função para motorista aceitar uma remessa
CREATE OR REPLACE FUNCTION public.accept_shipment(shipment_id uuid, motorista_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  shipment_exists boolean;
  motorista_active boolean;
BEGIN
  -- Verificar se o motorista está ativo
  SELECT EXISTS(
    SELECT 1 FROM public.motoristas m 
    WHERE m.id = motorista_uuid AND m.status = 'ativo'
  ) INTO motorista_active;
  
  IF NOT motorista_active THEN
    RETURN json_build_object('success', false, 'error', 'Motorista não encontrado ou inativo');
  END IF;
  
  -- Verificar se a remessa existe e está disponível
  SELECT EXISTS(
    SELECT 1 FROM public.shipments s 
    WHERE s.id = shipment_id 
      AND s.motorista_id IS NULL
      AND s.status IN ('PAID', 'PAYMENT_CONFIRMED', 'LABEL_GENERATED', 'PAGO_AGUARDANDO_ETIQUETA')
  ) INTO shipment_exists;
  
  IF NOT shipment_exists THEN
    RETURN json_build_object('success', false, 'error', 'Remessa não disponível para aceite');
  END IF;
  
  -- Atribuir o motorista à remessa e atualizar status
  UPDATE public.shipments 
  SET motorista_id = motorista_uuid,
      status = 'COLETA_ACEITA',
      updated_at = now()
  WHERE id = shipment_id;
  
  -- Registrar no histórico de status
  INSERT INTO public.shipment_status_history (
    shipment_id,
    status,
    motorista_id,
    observacoes
  ) VALUES (
    shipment_id,
    'COLETA_ACEITA',
    motorista_uuid,
    'Coleta aceita pelo motorista'
  );
  
  RETURN json_build_object('success', true, 'message', 'Remessa aceita com sucesso');
END;
$function$;

-- Atualizar políticas RLS para permitir acesso às remessas disponíveis
CREATE POLICY "Motoristas podem ver remessas disponíveis" 
ON public.shipments 
FOR SELECT 
USING (
  motorista_id IS NULL 
  AND status IN ('PAID', 'PAYMENT_CONFIRMED', 'LABEL_GENERATED', 'PAGO_AGUARDANDO_ETIQUETA')
);

CREATE POLICY "Motoristas podem aceitar remessas disponíveis" 
ON public.shipments 
FOR UPDATE 
USING (
  motorista_id IS NULL 
  AND status IN ('PAID', 'PAYMENT_CONFIRMED', 'LABEL_GENERATED', 'PAGO_AGUARDANDO_ETIQUETA')
)
WITH CHECK (
  motorista_id IS NOT NULL 
  AND status = 'COLETA_ACEITA'
);