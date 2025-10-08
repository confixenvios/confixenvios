-- Add RLS policy to allow reading active pricing tables for quote calculations
CREATE POLICY "Anyone can read active pricing tables"
ON public.pricing_tables
FOR SELECT
USING (is_active = true);