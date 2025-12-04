-- Create table for B2B delivery addresses
CREATE TABLE public.b2b_delivery_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  b2b_client_id UUID NOT NULL REFERENCES public.b2b_clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_document TEXT,
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
ALTER TABLE public.b2b_delivery_addresses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "B2B clients can view own delivery addresses" 
ON public.b2b_delivery_addresses 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.b2b_clients 
  WHERE b2b_clients.id = b2b_delivery_addresses.b2b_client_id 
  AND b2b_clients.user_id = auth.uid()
));

CREATE POLICY "B2B clients can create own delivery addresses" 
ON public.b2b_delivery_addresses 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.b2b_clients 
  WHERE b2b_clients.id = b2b_delivery_addresses.b2b_client_id 
  AND b2b_clients.user_id = auth.uid()
));

CREATE POLICY "B2B clients can update own delivery addresses" 
ON public.b2b_delivery_addresses 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.b2b_clients 
  WHERE b2b_clients.id = b2b_delivery_addresses.b2b_client_id 
  AND b2b_clients.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.b2b_clients 
  WHERE b2b_clients.id = b2b_delivery_addresses.b2b_client_id 
  AND b2b_clients.user_id = auth.uid()
));

CREATE POLICY "B2B clients can delete own delivery addresses" 
ON public.b2b_delivery_addresses 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.b2b_clients 
  WHERE b2b_clients.id = b2b_delivery_addresses.b2b_client_id 
  AND b2b_clients.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all B2B delivery addresses" 
ON public.b2b_delivery_addresses 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_b2b_delivery_addresses_updated_at
BEFORE UPDATE ON public.b2b_delivery_addresses
FOR EACH ROW
EXECUTE FUNCTION public.update_b2b_updated_at();