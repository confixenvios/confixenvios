-- CORREÇÃO COMPLETA DOS PREÇOS: Completar faixas faltantes
-- Inserir apenas se não existir (verificação manual de duplicatas)

-- Completar faixas de 25-30kg para SC (Santa Catarina)
INSERT INTO shipping_pricing (zone_code, weight_min, weight_max, price) 
SELECT 'SCCAP.01', 25.001, 26.000, 113.10
WHERE NOT EXISTS (SELECT 1 FROM shipping_pricing WHERE zone_code = 'SCCAP.01' AND weight_min = 25.001 AND weight_max = 26.000);

INSERT INTO shipping_pricing (zone_code, weight_min, weight_max, price) 
SELECT 'SCCAP.01', 26.001, 27.000, 119.26
WHERE NOT EXISTS (SELECT 1 FROM shipping_pricing WHERE zone_code = 'SCCAP.01' AND weight_min = 26.001 AND weight_max = 27.000);

INSERT INTO shipping_pricing (zone_code, weight_min, weight_max, price) 
SELECT 'SCCAP.01', 27.001, 28.000, 125.42
WHERE NOT EXISTS (SELECT 1 FROM shipping_pricing WHERE zone_code = 'SCCAP.01' AND weight_min = 27.001 AND weight_max = 28.000);

INSERT INTO shipping_pricing (zone_code, weight_min, weight_max, price) 
SELECT 'SCCAP.01', 28.001, 29.000, 131.58
WHERE NOT EXISTS (SELECT 1 FROM shipping_pricing WHERE zone_code = 'SCCAP.01' AND weight_min = 28.001 AND weight_max = 29.000);

INSERT INTO shipping_pricing (zone_code, weight_min, weight_max, price) 
SELECT 'SCCAP.01', 29.001, 30.000, 137.74
WHERE NOT EXISTS (SELECT 1 FROM shipping_pricing WHERE zone_code = 'SCCAP.01' AND weight_min = 29.001 AND weight_max = 30.000);

-- RS (Rio Grande do Sul)
INSERT INTO shipping_pricing (zone_code, weight_min, weight_max, price) 
SELECT 'RSCAP.01', 25.001, 26.000, 165.53
WHERE NOT EXISTS (SELECT 1 FROM shipping_pricing WHERE zone_code = 'RSCAP.01' AND weight_min = 25.001 AND weight_max = 26.000);

INSERT INTO shipping_pricing (zone_code, weight_min, weight_max, price) 
SELECT 'RSCAP.01', 26.001, 27.000, 174.39
WHERE NOT EXISTS (SELECT 1 FROM shipping_pricing WHERE zone_code = 'RSCAP.01' AND weight_min = 26.001 AND weight_max = 27.000);

INSERT INTO shipping_pricing (zone_code, weight_min, weight_max, price) 
SELECT 'RSCAP.01', 27.001, 28.000, 183.25
WHERE NOT EXISTS (SELECT 1 FROM shipping_pricing WHERE zone_code = 'RSCAP.01' AND weight_min = 27.001 AND weight_max = 28.000);

INSERT INTO shipping_pricing (zone_code, weight_min, weight_max, price) 
SELECT 'RSCAP.01', 28.001, 29.000, 192.11
WHERE NOT EXISTS (SELECT 1 FROM shipping_pricing WHERE zone_code = 'RSCAP.01' AND weight_min = 28.001 AND weight_max = 29.000);

INSERT INTO shipping_pricing (zone_code, weight_min, weight_max, price) 
SELECT 'RSCAP.01', 29.001, 30.000, 200.97
WHERE NOT EXISTS (SELECT 1 FROM shipping_pricing WHERE zone_code = 'RSCAP.01' AND weight_min = 29.001 AND weight_max = 30.000);

-- MS (Mato Grosso do Sul)
INSERT INTO shipping_pricing (zone_code, weight_min, weight_max, price) 
SELECT 'MSCAP.01', 25.001, 26.000, 159.59
WHERE NOT EXISTS (SELECT 1 FROM shipping_pricing WHERE zone_code = 'MSCAP.01' AND weight_min = 25.001 AND weight_max = 26.000);

INSERT INTO shipping_pricing (zone_code, weight_min, weight_max, price) 
SELECT 'MSCAP.01', 26.001, 27.000, 168.02
WHERE NOT EXISTS (SELECT 1 FROM shipping_pricing WHERE zone_code = 'MSCAP.01' AND weight_min = 26.001 AND weight_max = 27.000);

INSERT INTO shipping_pricing (zone_code, weight_min, weight_max, price) 
SELECT 'MSCAP.01', 27.001, 28.000, 176.45
WHERE NOT EXISTS (SELECT 1 FROM shipping_pricing WHERE zone_code = 'MSCAP.01' AND weight_min = 27.001 AND weight_max = 28.000);

INSERT INTO shipping_pricing (zone_code, weight_min, weight_max, price) 
SELECT 'MSCAP.01', 28.001, 29.000, 184.88
WHERE NOT EXISTS (SELECT 1 FROM shipping_pricing WHERE zone_code = 'MSCAP.01' AND weight_min = 28.001 AND weight_max = 29.000);

INSERT INTO shipping_pricing (zone_code, weight_min, weight_max, price) 
SELECT 'MSCAP.01', 29.001, 30.000, 193.31
WHERE NOT EXISTS (SELECT 1 FROM shipping_pricing WHERE zone_code = 'MSCAP.01' AND weight_min = 29.001 AND weight_max = 30.000);