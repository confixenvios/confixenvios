-- Atualizar os registros existentes para extrair recipient_name e recipient_phone das observations
UPDATE b2b_shipments 
SET 
  recipient_name = COALESCE(
    (observations::jsonb->'volume_address'->>'recipient_name'),
    (observations::jsonb->'volume_address'->>'name'),
    recipient_name
  ),
  recipient_phone = COALESCE(
    (observations::jsonb->'volume_address'->>'recipient_phone'),
    (observations::jsonb->'volume_address'->>'phone'),
    recipient_phone
  )
WHERE 
  tracking_code LIKE 'B2B-%' 
  AND observations IS NOT NULL
  AND (recipient_phone IS NULL OR recipient_phone = '');