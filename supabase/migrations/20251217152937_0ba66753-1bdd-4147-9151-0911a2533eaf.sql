-- Corrigir telefones na remessa ID2025PR8T8E
-- Sender: (62) 36373-778 → (62) 3637-3778
-- Recipient: (62) 30965-700 → (62) 3096-5700

UPDATE shipments 
SET quote_data = jsonb_set(
  jsonb_set(
    quote_data::jsonb,
    '{addressData,sender,phone}',
    '"(62) 3637-3778"'
  ),
  '{addressData,recipient,phone}',
  '"(62) 3096-5700"'
)
WHERE tracking_code = 'ID2025PR8T8E';