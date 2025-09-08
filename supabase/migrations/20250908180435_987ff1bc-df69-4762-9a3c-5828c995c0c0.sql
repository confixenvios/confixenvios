-- Criar uma remessa de teste disponível para motoristas
INSERT INTO addresses (name, document, phone, email, cep, street, number, neighborhood, city, state, address_type)
VALUES 
  ('Remetente Teste', '12345678901', '11999999999', 'remetente@teste.com', '01310-100', 'Avenida Paulista', '1000', 'Bela Vista', 'São Paulo', 'SP', 'sender'),
  ('Destinatário Teste', '98765432109', '11888888888', 'destinatario@teste.com', '04038-001', 'Rua Vergueiro', '2000', 'Vila Mariana', 'São Paulo', 'SP', 'recipient');

-- Inserir uma remessa de teste disponível
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