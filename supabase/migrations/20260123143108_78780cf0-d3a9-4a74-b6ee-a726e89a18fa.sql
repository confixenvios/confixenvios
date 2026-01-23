-- Remove duplicates keeping only the most recent one (CFX20266CNF09)
DELETE FROM shipments 
WHERE quote_data->>'externalReference' = 'confix_1769178265138_o0s3sh'
  AND tracking_code != 'CFX20266CNF09';