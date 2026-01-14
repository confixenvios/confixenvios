-- Associar CTe 40 ao shipment correto
UPDATE cte_emissoes 
SET shipment_id = 'c40afbaa-5aac-48b4-8803-b815da3f3ac7',
    remessa_id = '548666631'
WHERE chave_cte = '52260154007348000130570010000000401756400088';

-- Atualizar cte_key e carrier_barcode no shipment
UPDATE shipments 
SET cte_key = '52260154007348000130570010000000401756400088',
    carrier_barcode = '14094800000032001072310010'
WHERE id = 'c40afbaa-5aac-48b4-8803-b815da3f3ac7';