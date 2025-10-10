-- Adicionar campos de taxas adicionais por peso para Jadlog
ALTER TABLE public.pricing_tables 
ADD COLUMN IF NOT EXISTS peso_adicional_30_50kg numeric DEFAULT 55.00,
ADD COLUMN IF NOT EXISTS peso_adicional_acima_50kg numeric DEFAULT 100.00;

COMMENT ON COLUMN public.pricing_tables.peso_adicional_30_50kg IS 'Taxa adicional em R$ para peso entre 30kg e 50kg (Jadlog)';
COMMENT ON COLUMN public.pricing_tables.peso_adicional_acima_50kg IS 'Taxa adicional em R$ para peso acima de 50kg (Jadlog)';