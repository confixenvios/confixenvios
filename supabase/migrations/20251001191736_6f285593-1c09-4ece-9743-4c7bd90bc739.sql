-- Adicionar campos de dimensões máximas permitidas na tabela pricing_tables
ALTER TABLE public.pricing_tables 
ADD COLUMN IF NOT EXISTS max_length_cm NUMERIC,
ADD COLUMN IF NOT EXISTS max_width_cm NUMERIC,
ADD COLUMN IF NOT EXISTS max_height_cm NUMERIC;

-- Adicionar comentários para documentar os campos
COMMENT ON COLUMN public.pricing_tables.max_length_cm IS 'Comprimento máximo permitido em centímetros (ex: 200). Se a mercadoria exceder, não realiza o frete';
COMMENT ON COLUMN public.pricing_tables.max_width_cm IS 'Largura máxima permitida em centímetros (ex: 200). Se a mercadoria exceder, não realiza o frete';
COMMENT ON COLUMN public.pricing_tables.max_height_cm IS 'Altura máxima permitida em centímetros (ex: 200). Se a mercadoria exceder, não realiza o frete';