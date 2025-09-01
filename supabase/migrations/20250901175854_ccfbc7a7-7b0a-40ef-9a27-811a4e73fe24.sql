-- Atualização dos prazos de entrega baseado na distância de Aparecida de Goiânia - GO

-- Regiões locais (Goiás e Distrito Federal) - mais próximas
UPDATE shipping_zones SET delivery_days = 2, express_delivery_days = 1 
WHERE state IN ('GO', 'DF');

-- Mato Grosso (próximo)
UPDATE shipping_zones SET delivery_days = 2, express_delivery_days = 1 
WHERE state = 'MT';

-- Mato Grosso do Sul (próximo)
UPDATE shipping_zones SET delivery_days = 2, express_delivery_days = 1 
WHERE state = 'MS';

-- Minas Gerais (região próxima)
UPDATE shipping_zones SET delivery_days = 2, express_delivery_days = 1 
WHERE state = 'MG';

-- São Paulo (centro-sudeste)
UPDATE shipping_zones SET delivery_days = 3, express_delivery_days = 2 
WHERE state = 'SP';

-- Rio de Janeiro (centro-sudeste)
UPDATE shipping_zones SET delivery_days = 3, express_delivery_days = 2 
WHERE state = 'RJ';

-- Espírito Santo (centro-sudeste)
UPDATE shipping_zones SET delivery_days = 3, express_delivery_days = 2 
WHERE state = 'ES';

-- Paraná (sul)
UPDATE shipping_zones SET delivery_days = 4, express_delivery_days = 3 
WHERE state = 'PR';

-- Santa Catarina (sul)
UPDATE shipping_zones SET delivery_days = 4, express_delivery_days = 3 
WHERE state = 'SC';

-- Rio Grande do Sul (sul)
UPDATE shipping_zones SET delivery_days = 5, express_delivery_days = 3 
WHERE state = 'RS';

-- Bahia (nordeste - mais próximo)
UPDATE shipping_zones SET delivery_days = 4, express_delivery_days = 3 
WHERE state = 'BA';

-- Tocantins (norte próximo)
UPDATE shipping_zones SET delivery_days = 3, express_delivery_days = 2 
WHERE state = 'TO';

-- Pernambuco (nordeste)
UPDATE shipping_zones SET delivery_days = 5, express_delivery_days = 3 
WHERE state = 'PE';

-- Ceará (nordeste)
UPDATE shipping_zones SET delivery_days = 5, express_delivery_days = 3 
WHERE state = 'CE';

-- Paraíba (nordeste)
UPDATE shipping_zones SET delivery_days = 5, express_delivery_days = 3 
WHERE state = 'PB';

-- Rio Grande do Norte (nordeste)
UPDATE shipping_zones SET delivery_days = 5, express_delivery_days = 3 
WHERE state = 'RN';

-- Alagoas (nordeste)
UPDATE shipping_zones SET delivery_days = 5, express_delivery_days = 3 
WHERE state = 'AL';

-- Sergipe (nordeste)
UPDATE shipping_zones SET delivery_days = 5, express_delivery_days = 3 
WHERE state = 'SE';

-- Piauí (nordeste)
UPDATE shipping_zones SET delivery_days = 5, express_delivery_days = 3 
WHERE state = 'PI';

-- Maranhão (nordeste)
UPDATE shipping_zones SET delivery_days = 6, express_delivery_days = 4 
WHERE state = 'MA';

-- Pará (norte - mais distante)
UPDATE shipping_zones SET delivery_days = 7, express_delivery_days = 5 
WHERE state = 'PA';