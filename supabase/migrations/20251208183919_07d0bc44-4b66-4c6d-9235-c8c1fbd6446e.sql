-- Create table for B2B pickup addresses
CREATE TABLE public.b2b_pickup_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  b2b_client_id UUID NOT NULL REFERENCES public.b2b_clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  cep TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  reference TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.b2b_pickup_addresses ENABLE ROW LEVEL SECURITY;

-- RLS policy: clients can only see their own pickup addresses
CREATE POLICY "B2B clients can view own pickup addresses"
  ON public.b2b_pickup_addresses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.b2b_clients
      WHERE b2b_clients.id = b2b_pickup_addresses.b2b_client_id
      AND b2b_clients.user_id = auth.uid()
    )
  );

CREATE POLICY "B2B clients can insert own pickup addresses"
  ON public.b2b_pickup_addresses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.b2b_clients
      WHERE b2b_clients.id = b2b_pickup_addresses.b2b_client_id
      AND b2b_clients.user_id = auth.uid()
    )
  );

CREATE POLICY "B2B clients can update own pickup addresses"
  ON public.b2b_pickup_addresses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.b2b_clients
      WHERE b2b_clients.id = b2b_pickup_addresses.b2b_client_id
      AND b2b_clients.user_id = auth.uid()
    )
  );

CREATE POLICY "B2B clients can delete own pickup addresses"
  ON public.b2b_pickup_addresses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.b2b_clients
      WHERE b2b_clients.id = b2b_pickup_addresses.b2b_client_id
      AND b2b_clients.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_b2b_pickup_addresses_updated_at
  BEFORE UPDATE ON public.b2b_pickup_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_b2b_updated_at();