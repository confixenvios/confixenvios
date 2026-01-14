-- Corrigir associação do CTe 39 ao shipment TEMP2026QIH7V4
UPDATE cte_emissoes 
SET shipment_id = '620e0a9c-d9c1-4e66-9b8b-993f0164a497',
    remessa_id = 'TEMP2026QIH7V4'
WHERE chave_cte = '52260154007348000130570010000000391964047696';

-- Atualizar o shipment para ter o cte_key (status LABEL_AVAILABLE é válido)
UPDATE shipments 
SET cte_key = '52260154007348000130570010000000391964047696',
    status = 'LABEL_AVAILABLE'
WHERE id = '620e0a9c-d9c1-4e66-9b8b-993f0164a497';