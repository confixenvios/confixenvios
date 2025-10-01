-- Adicionar campos de regras de precificação na tabela pricing_tables
ALTER TABLE public.pricing_tables 
ADD COLUMN IF NOT EXISTS ad_valorem_percentage NUMERIC DEFAULT 0.30,
ADD COLUMN IF NOT EXISTS gris_percentage NUMERIC DEFAULT 0.30,
ADD COLUMN IF NOT EXISTS cubic_meter_kg_equivalent NUMERIC DEFAULT 167;

-- Adicionar comentários para documentar os campos
COMMENT ON COLUMN public.pricing_tables.ad_valorem_percentage IS 'Percentual de Ad Valorem aplicado sobre o valor da mercadoria (ex: 0.30 para 0,30%)';
COMMENT ON COLUMN public.pricing_tables.gris_percentage IS 'Percentual de GRIS (Gerenciamento de Risco) aplicado sobre o valor da mercadoria (ex: 0.30 para 0,30%)';
COMMENT ON COLUMN public.pricing_tables.cubic_meter_kg_equivalent IS 'Equivalência em kg por metro cúbico para cálculo de peso cubado (ex: 167 significa que 1m³ = 167kg)';