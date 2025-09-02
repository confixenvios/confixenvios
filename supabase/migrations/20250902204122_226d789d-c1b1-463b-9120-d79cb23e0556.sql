-- Atualizar preços das regiões GOCAP.01 e GOCAP.02 para R$ 1,00
UPDATE public.shipping_pricing 
SET 
  price = 1.00,
  updated_at = now()
WHERE zone_code IN ('GOCAP.01', 'GOCAP.02');