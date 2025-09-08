-- Criar remessas de teste com status válidos
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
  sender.id,
  recipient.id,
  2.5,
  20,
  15,
  10,
  'caixa',
  'express',
  'pickup',
  'PAYMENT_CONFIRMED',
  'ID2025TEST01',
  NULL, -- Sem motorista para ficar disponível
  '{"express_price": 25.50, "economic_price": 15.30}'::jsonb,
  '{"status": "paid", "method": "pix"}'::jsonb
FROM 
  addresses sender,
  addresses recipient
WHERE 
  sender.name = 'Remetente Teste' AND sender.address_type = 'sender'
  AND recipient.name = 'Destinatário Teste' AND recipient.address_type = 'recipient'
LIMIT 1;

-- Criar mais uma remessa com status PAID
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
  sender.id,
  recipient.id,
  1.2,
  30,
  20,
  5,
  'envelope',
  'economic',
  'pickup',
  'PAID',
  'ID2025TEST02',
  NULL, -- Sem motorista para ficar disponível
  '{"express_price": 18.90, "economic_price": 12.50}'::jsonb,
  '{"status": "paid", "method": "card"}'::jsonb
FROM 
  addresses sender,
  addresses recipient
WHERE 
  sender.name = 'Remetente Teste' AND sender.address_type = 'sender'
  AND recipient.name = 'Destinatário Teste' AND recipient.address_type = 'recipient'
LIMIT 1;

-- Criar uma remessa com status PAGO_AGUARDANDO_ETIQUETA
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
  sender.id,
  recipient.id,
  3.8,
  25,
  18,
  12,
  'caixa',
  'economic',
  'delivery',
  'PAGO_AGUARDANDO_ETIQUETA',
  'ID2025TEST03',
  NULL, -- Sem motorista para ficar disponível
  '{"express_price": 32.40, "economic_price": 22.80}'::jsonb,
  '{"status": "paid", "method": "boleto"}'::jsonb
FROM 
  addresses sender,
  addresses recipient
WHERE 
  sender.name = 'Remetente Teste' AND sender.address_type = 'sender'
  AND recipient.name = 'Destinatário Teste' AND recipient.address_type = 'recipient'
LIMIT 1;