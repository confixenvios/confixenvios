-- Criar endereços de teste simples (sem documento)
INSERT INTO addresses (name, cep, street, number, neighborhood, city, state, address_type)
VALUES 
  ('Remetente Teste', '01310-100', 'Avenida Paulista', '1000', 'Bela Vista', 'São Paulo', 'SP', 'sender'),
  ('Destinatário Teste', '04038-001', 'Rua Vergueiro', '2000', 'Vila Mariana', 'São Paulo', 'SP', 'recipient');

-- Inserir remessas de teste disponíveis para motoristas
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

-- Criar mais uma remessa com status LABEL_GENERATED
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
  'LABEL_GENERATED',
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

-- Criar uma remessa com status PAID também
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
  'PAID',
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