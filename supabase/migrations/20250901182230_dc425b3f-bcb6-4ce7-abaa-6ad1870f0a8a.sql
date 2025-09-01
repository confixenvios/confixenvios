-- Corrigir prazos de entrega para São Paulo Capital de 5 para 3 dias
UPDATE shipping_zones 
SET 
  delivery_days = 3,
  express_delivery_days = 2
WHERE state = 'SP' AND zone_type = 'CAP';