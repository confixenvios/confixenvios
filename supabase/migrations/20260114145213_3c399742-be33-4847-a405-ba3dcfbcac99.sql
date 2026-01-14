-- Atualizar a remessa TEMP2026QIH7V4 para usar o código Jadlog como tracking_code
-- e adicionar o carrier_barcode extraído da etiqueta
UPDATE shipments 
SET tracking_code = '548656850',
    carrier_barcode = '14094800000031001072310010'
WHERE id = '620e0a9c-d9c1-4e66-9b8b-993f0164a497';

-- Atualizar também o cte_emissoes para manter consistência
UPDATE cte_emissoes 
SET remessa_id = '548656850'
WHERE shipment_id = '620e0a9c-d9c1-4e66-9b8b-993f0164a497';