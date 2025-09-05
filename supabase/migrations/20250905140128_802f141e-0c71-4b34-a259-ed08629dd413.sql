-- Função para motorista buscar suas remessas
CREATE OR REPLACE FUNCTION public.get_motorista_shipments(motorista_uuid uuid)
RETURNS TABLE (
  id uuid,
  tracking_code text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  weight numeric,
  length numeric,
  width numeric,
  height numeric,
  format text,
  selected_option text,
  pickup_option text,
  quote_data jsonb,
  payment_data jsonb,
  sender_address_id uuid,
  recipient_address_id uuid,
  sender_address jsonb,
  recipient_address jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o motorista existe e está ativo
  IF NOT EXISTS (
    SELECT 1 FROM public.motoristas m 
    WHERE m.id = motorista_uuid AND m.status = 'ativo'
  ) THEN
    RAISE EXCEPTION 'Motorista não encontrado ou inativo';
  END IF;

  -- Retornar remessas do motorista com dados dos endereços
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
    s.sender_address_id,
    s.recipient_address_id,
    -- Buscar dados do endereço do remetente
    (SELECT row_to_json(sa) FROM (
      SELECT sa.name, sa.street, sa.number, sa.neighborhood, 
             sa.city, sa.state, sa.cep, sa.complement, sa.reference
      FROM public.addresses sa WHERE sa.id = s.sender_address_id
    ) sa) as sender_address,
    -- Buscar dados do endereço do destinatário  
    (SELECT row_to_json(ra) FROM (
      SELECT ra.name, ra.street, ra.number, ra.neighborhood,
             ra.city, ra.state, ra.cep, ra.complement, ra.reference
      FROM public.addresses ra WHERE ra.id = s.recipient_address_id
    ) ra) as recipient_address
  FROM public.shipments s
  WHERE s.motorista_id = motorista_uuid
  ORDER BY s.created_at DESC;
END;
$$;