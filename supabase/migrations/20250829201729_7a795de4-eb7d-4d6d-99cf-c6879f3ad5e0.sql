-- Add new status columns and webhook data to shipments table
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS payment_data JSONB,
ADD COLUMN IF NOT EXISTS cte_key TEXT,
ADD COLUMN IF NOT EXISTS label_pdf_url TEXT;

-- Update status values to support webhook flow
COMMENT ON COLUMN public.shipments.status IS 'Possible values: PENDING_DOCUMENT, PENDING_PAYMENT, PAYMENT_CONFIRMED, AWAITING_LABEL, LABEL_AVAILABLE, SHIPPED, DELIVERED';

-- Create integrations table for webhook URLs
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  secret_key TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on integrations
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- Only admins can manage integrations
CREATE POLICY "Admin can manage integrations" ON public.integrations
  USING (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Add trigger for updated_at on integrations
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default integration for testing
INSERT INTO public.integrations (name, webhook_url, active) 
VALUES ('TMS System', 'https://api.exemplo.com/webhook', true)
ON CONFLICT DO NOTHING;