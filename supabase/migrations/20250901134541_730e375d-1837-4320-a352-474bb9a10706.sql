-- CORREÇÃO: Completar zonas principais que ainda têm lacunas
-- CECAP.01, ESCAP.01, MGCAP.01, CEINT.01

INSERT INTO shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
-- CECAP.01 (Ceará Capital) - faixas 3-29kg
('CECAP.01', 3.001, 3.500, 97.18),
('CECAP.01', 3.501, 4.000, 106.71),
('CECAP.01', 4.001, 4.500, 118.62),
('CECAP.01', 4.501, 5.000, 128.35),
('CECAP.01', 5.001, 6.000, 142.95),
('CECAP.01', 6.001, 7.000, 162.42),
('CECAP.01', 7.001, 8.000, 181.88),
('CECAP.01', 8.001, 9.000, 201.34),
('CECAP.01', 9.001, 10.000, 220.81),
('CECAP.01', 10.001, 11.000, 247.46),
('CECAP.01', 11.001, 12.000, 266.92),
('CECAP.01', 12.001, 13.000, 286.38),
('CECAP.01', 13.001, 14.000, 305.85),
('CECAP.01', 14.001, 15.000, 325.31),
('CECAP.01', 15.001, 16.000, 344.78),
('CECAP.01', 16.001, 17.000, 364.24),
('CECAP.01', 17.001, 18.000, 383.71),
('CECAP.01', 18.001, 19.000, 403.17),
('CECAP.01', 19.001, 20.000, 422.63),
('CECAP.01', 20.001, 21.000, 449.28),
('CECAP.01', 21.001, 22.000, 468.75),
('CECAP.01', 22.001, 23.000, 488.21),
('CECAP.01', 23.001, 24.000, 507.67),
('CECAP.01', 24.001, 25.000, 527.14),
('CECAP.01', 25.001, 26.000, 546.60),
('CECAP.01', 26.001, 27.000, 566.07),
('CECAP.01', 27.001, 28.000, 585.53),
('CECAP.01', 28.001, 29.000, 604.99);

-- Remover possíveis duplicatas
DELETE FROM shipping_pricing 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY zone_code, weight_min, weight_max ORDER BY created_at) as rn
    FROM shipping_pricing
  ) ranked WHERE rn > 1
);