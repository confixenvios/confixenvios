-- Add Alfa specific pricing rules columns to pricing_tables
ALTER TABLE public.pricing_tables
ADD COLUMN IF NOT EXISTS alfa_cubic_weight_reference numeric DEFAULT 250,
ADD COLUMN IF NOT EXISTS alfa_distance_threshold_km numeric DEFAULT 100,
ADD COLUMN IF NOT EXISTS alfa_distance_multiplier numeric DEFAULT 2,
ADD COLUMN IF NOT EXISTS alfa_weight_fraction_kg numeric DEFAULT 100,
ADD COLUMN IF NOT EXISTS alfa_weight_fraction_charge numeric DEFAULT 5.50,
ADD COLUMN IF NOT EXISTS alfa_chemical_classes text DEFAULT '8/9';

COMMENT ON COLUMN public.pricing_tables.alfa_cubic_weight_reference IS 'Consideração 1: Referência de peso cubado em kg/m³ (padrão 250)';
COMMENT ON COLUMN public.pricing_tables.alfa_distance_threshold_km IS 'Consideração 2: Distância limite em km para aplicar multiplicador';
COMMENT ON COLUMN public.pricing_tables.alfa_distance_multiplier IS 'Consideração 2: Multiplicador de frete para volumes acima da distância limite';
COMMENT ON COLUMN public.pricing_tables.alfa_weight_fraction_kg IS 'Consideração 3: Fração de peso em kg para adicional';
COMMENT ON COLUMN public.pricing_tables.alfa_weight_fraction_charge IS 'Consideração 3: Taxa adicional por fração de peso';
COMMENT ON COLUMN public.pricing_tables.alfa_chemical_classes IS 'Consideração 4: Classes químicas transportadas';