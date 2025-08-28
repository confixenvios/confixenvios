-- Drop existing coverage_areas table if it exists
DROP TABLE IF EXISTS public.coverage_areas CASCADE;

-- Create zones table for CEP mapping
CREATE TABLE public.shipping_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_code TEXT NOT NULL UNIQUE, -- e.g., 'SPCAP.01', 'SPINT.01', 'RJCAP.01'
  state TEXT NOT NULL, -- e.g., 'SP', 'RJ', 'MG'
  zone_type TEXT NOT NULL CHECK (zone_type IN ('CAP', 'INT')), -- Capital or Interior
  zone_number TEXT, -- e.g., '01', '02', '03'
  delivery_days INTEGER NOT NULL DEFAULT 5, -- Standard delivery time
  express_delivery_days INTEGER NOT NULL DEFAULT 3, -- Express delivery time
  cep_start TEXT NOT NULL,
  cep_end TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pricing table
CREATE TABLE public.shipping_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  weight_min NUMERIC(10,3) NOT NULL,
  weight_max NUMERIC(10,3) NOT NULL,
  zone_code TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (zone_code) REFERENCES public.shipping_zones(zone_code)
);

-- Enable RLS on both tables
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_pricing ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (needed for quote calculations)
CREATE POLICY "Public read access to shipping zones" 
ON public.shipping_zones 
FOR SELECT 
USING (true);

CREATE POLICY "Public read access to shipping pricing" 
ON public.shipping_pricing 
FOR SELECT 
USING (true);

-- Insert zone definitions with CEP ranges
INSERT INTO public.shipping_zones (zone_code, state, zone_type, zone_number, delivery_days, express_delivery_days, cep_start, cep_end) VALUES
-- São Paulo zones
('SPCAP.01', 'SP', 'CAP', '01', 2, 1, '01000000', '05999999'),
('SPCAP.02', 'SP', 'CAP', '02', 2, 1, '06000000', '08999999'),
('SPCAP.03', 'SP', 'CAP', '03', 2, 1, '09000000', '09999999'),
('SPMET.01', 'SP', 'CAP', '01', 3, 2, '06000000', '09999999'),
('SPINT.01', 'SP', 'INT', '01', 4, 3, '10000000', '14999999'),
('SPINT.02', 'SP', 'INT', '02', 4, 3, '15000000', '18999999'),
('SPINT.03', 'SP', 'INT', '03', 5, 3, '19000000', '19999999'),
('SPINT.04', 'SP', 'INT', '04', 5, 4, '10000000', '19999999'),

-- Rio de Janeiro zones
('RJCAP.01', 'RJ', 'CAP', '01', 3, 2, '20000000', '24999999'),
('RJINT.01', 'RJ', 'INT', '01', 5, 4, '25000000', '28999999'),
('RJINT.02', 'RJ', 'INT', '02', 5, 4, '27000000', '28999999'),
('RJINT.03', 'RJ', 'INT', '03', 6, 4, '28000000', '28999999'),

-- Minas Gerais zones  
('MGCAP.01', 'MG', 'CAP', '01', 4, 3, '30000000', '32999999'),
('MGINT.01', 'MG', 'INT', '01', 6, 4, '35000000', '37999999'),
('MGINT.02', 'MG', 'INT', '02', 6, 4, '38000000', '38999999'),
('MGINT.03', 'MG', 'INT', '03', 7, 5, '39000000', '39999999'),

-- Goiás zones (nossa origem)
('GOCAP.01', 'GO', 'CAP', '01', 1, 1, '74000000', '74999999'), -- Goiânia
('GOCAP.02', 'GO', 'CAP', '02', 1, 1, '72800000', '72999999'), -- Aparecida de Goiânia
('GOINT.01', 'GO', 'INT', '01', 3, 2, '73000000', '76999999'), -- Interior GO

-- Other states (sample zones)
('DFCAP.01', 'DF', 'CAP', '01', 3, 2, '70000000', '72999999'),
('MSCAP.01', 'MS', 'CAP', '01', 4, 3, '79000000', '79999999'),
('MSINT.01', 'MS', 'INT', '01', 6, 4, '79100000', '79999999'),
('MTCAP.01', 'MT', 'CAP', '01', 5, 3, '78000000', '78999999');

-- Insert pricing data from the spreadsheet (sample data)
INSERT INTO public.shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
-- Weight range 0.001 - 0.200kg
(0.001, 0.200, 'SPCAP.01', 16.93),
(0.001, 0.200, 'SPCAP.02', 16.99),
(0.001, 0.200, 'SPCAP.03', 17.29),
(0.001, 0.200, 'SPMET.01', 18.65),
(0.001, 0.200, 'SPINT.01', 19.00),
(0.001, 0.200, 'SPINT.02', 19.52),
(0.001, 0.200, 'SPINT.03', 20.07),
(0.001, 0.200, 'SPINT.04', 23.73),
(0.001, 0.200, 'RJCAP.01', 17.70),
(0.001, 0.200, 'RJINT.01', 20.36),
(0.001, 0.200, 'RJINT.02', 20.74),
(0.001, 0.200, 'RJINT.03', 21.30),
(0.001, 0.200, 'MGCAP.01', 17.61),
(0.001, 0.200, 'MGINT.01', 21.01),
(0.001, 0.200, 'MGINT.02', 21.58),
(0.001, 0.200, 'MGINT.03', 22.19),
(0.001, 0.200, 'GOCAP.01', 18.00),
(0.001, 0.200, 'GOCAP.02', 18.00),
(0.001, 0.200, 'GOINT.01', 27.65),
(0.001, 0.200, 'DFCAP.01', 23.82),
(0.001, 0.200, 'MSCAP.01', 30.65),
(0.001, 0.200, 'MSINT.01', 36.05),
(0.001, 0.200, 'MTCAP.01', 22.87),

-- Weight range 0.201 - 0.350kg
(0.201, 0.350, 'SPCAP.01', 16.95),
(0.201, 0.350, 'SPCAP.02', 17.11),
(0.201, 0.350, 'SPCAP.03', 17.41),
(0.201, 0.350, 'SPMET.01', 18.78),
(0.201, 0.350, 'SPINT.01', 19.14),
(0.201, 0.350, 'SPINT.02', 19.66),
(0.201, 0.350, 'SPINT.03', 20.23),
(0.201, 0.350, 'SPINT.04', 23.91),
(0.201, 0.350, 'RJCAP.01', 17.81),
(0.201, 0.350, 'RJINT.01', 20.50),
(0.201, 0.350, 'RJINT.02', 20.89),
(0.201, 0.350, 'RJINT.03', 21.45),
(0.201, 0.350, 'MGCAP.01', 17.72),
(0.201, 0.350, 'MGINT.01', 21.16),
(0.201, 0.350, 'MGINT.02', 21.74),
(0.201, 0.350, 'MGINT.03', 22.36),
(0.201, 0.350, 'GOCAP.01', 18.00),
(0.201, 0.350, 'GOCAP.02', 18.00),
(0.201, 0.350, 'GOINT.01', 29.00),
(0.201, 0.350, 'DFCAP.01', 24.99),
(0.201, 0.350, 'MSCAP.01', 32.16),
(0.201, 0.350, 'MSINT.01', 37.01),
(0.201, 0.350, 'MTCAP.01', 23.98);

-- Add triggers for updated_at
CREATE TRIGGER update_shipping_zones_updated_at
BEFORE UPDATE ON public.shipping_zones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipping_pricing_updated_at
BEFORE UPDATE ON public.shipping_pricing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_shipping_zones_cep ON public.shipping_zones (cep_start, cep_end);
CREATE INDEX idx_shipping_zones_state ON public.shipping_zones (state);
CREATE INDEX idx_shipping_pricing_weight ON public.shipping_pricing (weight_min, weight_max);
CREATE INDEX idx_shipping_pricing_zone ON public.shipping_pricing (zone_code);