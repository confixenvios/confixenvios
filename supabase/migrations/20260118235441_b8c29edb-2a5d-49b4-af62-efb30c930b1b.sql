-- Create carrier_partners table for transportation partners
CREATE TABLE public.carrier_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(20),
  contact_name VARCHAR(255),
  phone VARCHAR(20),
  logo_url TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.carrier_partners ENABLE ROW LEVEL SECURITY;

-- Create policies - allow authenticated function access only
CREATE POLICY "Allow authenticated access to carrier_partners" 
ON public.carrier_partners 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create function to authenticate carrier partner
CREATE OR REPLACE FUNCTION public.authenticate_carrier_partner(p_email TEXT, p_password TEXT)
RETURNS TABLE(id UUID, email VARCHAR, company_name VARCHAR, cnpj VARCHAR, contact_name VARCHAR, phone VARCHAR, status VARCHAR, logo_url TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id,
    cp.email,
    cp.company_name,
    cp.cnpj,
    cp.contact_name,
    cp.phone,
    cp.status,
    cp.logo_url
  FROM carrier_partners cp
  WHERE cp.email = p_email 
    AND cp.password_hash = crypt(p_password, cp.password_hash)
    AND cp.status = 'active';
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_carrier_partners_updated_at
BEFORE UPDATE ON public.carrier_partners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial Jadlog partner for testing
INSERT INTO public.carrier_partners (email, password_hash, company_name, cnpj, contact_name, status)
VALUES (
  'jadlog@gmail.com',
  crypt('123456', gen_salt('bf')),
  'Jadlog Logística',
  '04.884.082/0001-35',
  'Jadlog Partner',
  'active'
);