-- Add fields for excess weight pricing rules to pricing_tables
ALTER TABLE public.pricing_tables
ADD COLUMN excess_weight_threshold_kg NUMERIC DEFAULT 30,
ADD COLUMN excess_weight_charge_per_kg NUMERIC DEFAULT 10.00;

COMMENT ON COLUMN public.pricing_tables.excess_weight_threshold_kg IS 'Peso limite em kg acima do qual será aplicada cobrança adicional';
COMMENT ON COLUMN public.pricing_tables.excess_weight_charge_per_kg IS 'Valor em reais cobrado por cada kg excedente acima do limite';