-- Criar remessas de teste usando endereços existentes
INSERT INTO shipments (
  sender_address_id,
  recipient_address_id,
  weight,
  length,
  width,
  height,
  format,
  selected_option,
  pickup_option,
  status,
  tracking_code,
  motorista_id,
  quote_data,
  payment_data
)
SELECT 
  (SELECT id FROM addresses LIMIT 1),
  (SELECT id FROM addresses LIMIT 1 OFFSET 1),
  2.5,
  20,
  15,
  10,
  'caixa',
  'express',
  'pickup',
  'PAYMENT_CONFIRMED',
  'TEST01-' || generate_random_uuid()::text,
  NULL, -- Sem motorista para ficar disponível
  '{"express_price": 25.50, "economic_price": 15.30}'::jsonb,
  '{"status": "paid", "method": "pix"}'::jsonb
WHERE (SELECT COUNT(*) FROM addresses) >= 2;