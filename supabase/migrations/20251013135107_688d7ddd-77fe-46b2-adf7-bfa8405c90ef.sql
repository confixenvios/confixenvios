-- Corrige o prazo de entrega da zona CAP de Alagoas (Magalog)
-- CEP 57180-000 deve ter prazo de 10 dias, não 12 dias

UPDATE shipping_zones_magalog
SET
  delivery_days = 10,
  express_delivery_days = 8,
  updated_at = now()
WHERE
  state = 'AL'
  AND zone_type = 'CAP'
  AND cep_start = '57000000'
  AND cep_end = '57999999';