-- Fix data type mismatch in RPC functions

-- Drop existing functions
DROP FUNCTION IF EXISTS get_motorista_shipments(UUID);
DROP FUNCTION IF EXISTS get_available_shipments();

-- Recreate get_motorista_shipments function with correct data types
CREATE OR REPLACE FUNCTION get_motorista_shipments(motorista_uuid UUID)
RETURNS TABLE (
  id UUID,
  tracking_code TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  weight NUMERIC,
  length NUMERIC,
  width NUMERIC,
  height NUMERIC,
  format TEXT,
  selected_option TEXT,
  pickup_option TEXT,
  quote_data JSONB,
  payment_data JSONB,
  label_pdf_url TEXT,
  cte_key TEXT,
  sender_address JSONB,
  recipient_address JSONB
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
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
  WHERE s.motorista_id = motorista_uuid
  AND s.status NOT IN ('CANCELLED', 'DRAFT')
  ORDER BY s.created_at DESC;
END;
$$;

-- Recreate get_available_shipments function with correct data types
CREATE OR REPLACE FUNCTION get_available_shipments()
RETURNS TABLE (
  id UUID,
  tracking_code TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  weight NUMERIC,
  length NUMERIC,
  width NUMERIC,
  height NUMERIC,
  format TEXT,
  selected_option TEXT,
  pickup_option TEXT,
  quote_data JSONB,
  payment_data JSONB,
  label_pdf_url TEXT,
  cte_key TEXT,
  sender_address JSONB,
  recipient_address JSONB
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
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
  WHERE s.motorista_id IS NULL
  AND s.status IN ('PAYMENT_CONFIRMED', 'PAID', 'PENDING_LABEL', 'LABEL_GENERATED')
  ORDER BY s.created_at ASC;
END;
$$;