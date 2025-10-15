-- Atualizar preço Magalog para teste do CEP 01307-001 (São Paulo Capital)
-- CEP 01307-001 está na zona SPCAP.01 (faixa 01000000-05999999)
-- Alterando para R$ 1,00 na faixa de peso 5.001-10kg

UPDATE shipping_pricing_magalog
SET price = 1.00,
    updated_at = now()
WHERE zone_code = 'SPCAP.01'
  AND weight_min = 5.001
  AND weight_max = 10;