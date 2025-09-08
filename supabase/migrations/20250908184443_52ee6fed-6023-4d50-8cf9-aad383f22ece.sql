-- Criar função pública para motoristas acessarem suas remessas
CREATE OR REPLACE FUNCTION public.get_motorista_shipments_public(motorista_uuid uuid)
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
BEGIN
  -- Verificar se o motorista está ativo
  IF NOT EXISTS (
    SELECT 1 FROM public.motoristas 
    WHERE public.motoristas.id = motorista_uuid 
    AND status = 'ativo'
  ) THEN
    RAISE EXCEPTION 'Motorista não encontrado ou inativo';
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
  FROM public.shipments s
  LEFT JOIN public.addresses sender ON s.sender_address_id = sender.id
  LEFT JOIN public.addresses recipient ON s.recipient_address_id = recipient.id
  WHERE s.motorista_id = motorista_uuid
  AND s.status NOT IN ('CANCELLED', 'DRAFT')
  ORDER BY s.created_at DESC;
END;
$$;