-- Add proper fields for carrier integration data
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS carrier_order_id TEXT,
ADD COLUMN IF NOT EXISTS carrier_barcode TEXT;

-- Add index for carrier_order_id lookups
CREATE INDEX IF NOT EXISTS idx_shipments_carrier_order_id ON public.shipments(carrier_order_id);

-- Comment the columns for documentation
COMMENT ON COLUMN public.shipments.carrier_order_id IS 'ID do pedido na transportadora (ex: codigo Jadlog)';
COMMENT ON COLUMN public.shipments.carrier_barcode IS 'Código de barras da etiqueta da transportadora';