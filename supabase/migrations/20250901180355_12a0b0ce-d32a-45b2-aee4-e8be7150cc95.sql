-- Correção dos prazos de entrega baseado nos dados reais da planilha

-- Bahia - Salvador (Capital) - conforme mostrado na imagem: 9 dias
UPDATE shipping_zones SET delivery_days = 9, express_delivery_days = 6 
WHERE state = 'BA' AND zone_type = 'CAP';

-- Bahia - Interior - conforme mostrado na imagem: 12 dias
UPDATE shipping_zones SET delivery_days = 12, express_delivery_days = 8 
WHERE state = 'BA' AND zone_type = 'INT';

-- Mato Grosso - Cuiabá (Capital) - conforme mostrado na imagem: 11 dias  
UPDATE shipping_zones SET delivery_days = 11, express_delivery_days = 7 
WHERE state = 'MT' AND zone_type = 'CAP';

-- Mato Grosso - Várzea Grande e outras cidades - conforme mostrado na imagem: 9-12 dias
-- Assumindo que a maioria das cidades do interior do MT são 12 dias
UPDATE shipping_zones SET delivery_days = 12, express_delivery_days = 8 
WHERE state = 'MT' AND zone_type = 'INT';

-- Ajustes baseados na distância real de Aparecida de Goiânia
-- Estados próximos (Centro-Oeste)
UPDATE shipping_zones SET delivery_days = 2, express_delivery_days = 1 
WHERE state IN ('GO', 'DF');

UPDATE shipping_zones SET delivery_days = 3, express_delivery_days = 2 
WHERE state = 'MS';

-- Minas Gerais (região próxima)
UPDATE shipping_zones SET delivery_days = 5, express_delivery_days = 3 
WHERE state = 'MG';

-- São Paulo (sudeste)
UPDATE shipping_zones SET delivery_days = 5, express_delivery_days = 3 
WHERE state = 'SP';

-- Rio de Janeiro (sudeste)
UPDATE shipping_zones SET delivery_days = 6, express_delivery_days = 4 
WHERE state = 'RJ';

-- Espírito Santo (sudeste)
UPDATE shipping_zones SET delivery_days = 7, express_delivery_days = 5 
WHERE state = 'ES';

-- Sul
UPDATE shipping_zones SET delivery_days = 8, express_delivery_days = 5 
WHERE state = 'PR';

UPDATE shipping_zones SET delivery_days = 9, express_delivery_days = 6 
WHERE state = 'SC';

UPDATE shipping_zones SET delivery_days = 10, express_delivery_days = 7 
WHERE state = 'RS';

-- Tocantins (região próxima - Norte)
UPDATE shipping_zones SET delivery_days = 4, express_delivery_days = 3 
WHERE state = 'TO';

-- Nordeste
UPDATE shipping_zones SET delivery_days = 10, express_delivery_days = 7 
WHERE state = 'PE';

UPDATE shipping_zones SET delivery_days = 11, express_delivery_days = 8 
WHERE state = 'CE';

UPDATE shipping_zones SET delivery_days = 12, express_delivery_days = 8 
WHERE state IN ('PB', 'RN', 'AL', 'SE', 'PI');

UPDATE shipping_zones SET delivery_days = 13, express_delivery_days = 9 
WHERE state = 'MA';

-- Norte (mais distante)
UPDATE shipping_zones SET delivery_days = 15, express_delivery_days = 10 
WHERE state = 'PA';