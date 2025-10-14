-- Corrigir tariff_type para CEP 69931-000 (Capixaba - Interior 3)
UPDATE jadlog_zones 
SET tariff_type = 'INTERIOR 3'
WHERE cep_start = '69931000' 
  AND cep_end = '69931999' 
  AND state = 'AC';