-- Add Diolog-specific configuration fields to pricing_tables
ALTER TABLE public.pricing_tables
ADD COLUMN IF NOT EXISTS distance_multiplier_threshold_km numeric DEFAULT 100,
ADD COLUMN IF NOT EXISTS distance_multiplier_value numeric DEFAULT 2.0,
ADD COLUMN IF NOT EXISTS transports_chemical_classes text DEFAULT '8/9',
ADD COLUMN IF NOT EXISTS chemical_classes_enabled boolean DEFAULT false;

COMMENT ON COLUMN public.pricing_tables.distance_multiplier_threshold_km IS 'Distância em KM para aplicar multiplicador (ex: 100 km)';
COMMENT ON COLUMN public.pricing_tables.distance_multiplier_value IS 'Valor do multiplicador a ser aplicado no frete (ex: 2.0 = multiplicar por 2)';
COMMENT ON COLUMN public.pricing_tables.transports_chemical_classes IS 'Classes de químicos transportados (ex: 8/9)';
COMMENT ON COLUMN public.pricing_tables.chemical_classes_enabled IS 'Se a transportadora aceita produtos químicos';