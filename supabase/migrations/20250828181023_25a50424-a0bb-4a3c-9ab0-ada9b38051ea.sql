-- Create addresses table for sender and recipient data
CREATE TABLE public.addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  document TEXT NOT NULL, -- CPF/CNPJ
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  cep TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  reference TEXT,
  address_type TEXT NOT NULL CHECK (address_type IN ('sender', 'recipient')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shipments table for complete shipment data
CREATE TABLE public.shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_code TEXT UNIQUE,
  sender_address_id UUID NOT NULL REFERENCES public.addresses(id),
  recipient_address_id UUID NOT NULL REFERENCES public.addresses(id),
  quote_data JSONB NOT NULL, -- Store original quote data
  selected_option TEXT NOT NULL, -- "economic" or "express"
  pickup_option TEXT NOT NULL, -- "dropoff" or "pickup"
  weight DECIMAL NOT NULL,
  length DECIMAL NOT NULL,
  width DECIMAL NOT NULL,
  height DECIMAL NOT NULL,
  format TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_LABEL' CHECK (status IN ('PENDING_LABEL', 'PENDING_DOCUMENT', 'PENDING_PAYMENT', 'PAID', 'CTE_EMITTED', 'COLLECTED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a public shipping service)
CREATE POLICY "Anyone can create addresses" 
ON public.addresses 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view addresses" 
ON public.addresses 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create shipments" 
ON public.shipments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view shipments" 
ON public.shipments 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can update shipments" 
ON public.shipments 
FOR UPDATE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_addresses_updated_at
BEFORE UPDATE ON public.addresses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipments_updated_at
BEFORE UPDATE ON public.shipments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate tracking codes
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a tracking code in format TRK-YYYY followed by 6 random characters
    code := 'TRK-' || EXTRACT(YEAR FROM NOW()) || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    
    -- Check if this code already exists
    SELECT EXISTS(SELECT 1 FROM public.shipments WHERE tracking_code = code) INTO exists_check;
    
    -- If it doesn't exist, break the loop
    IF NOT exists_check THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;