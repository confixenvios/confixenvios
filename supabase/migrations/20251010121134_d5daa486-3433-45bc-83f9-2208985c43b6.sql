-- Add Magalog-specific configuration field
ALTER TABLE public.pricing_tables
ADD COLUMN IF NOT EXISTS max_dimension_sum_cm numeric DEFAULT NULL;

COMMENT ON COLUMN public.pricing_tables.max_dimension_sum_cm IS 'Soma máxima das três dimensões (altura + largura + comprimento) em CM';