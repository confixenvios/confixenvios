-- Drop existing function if exists
DROP FUNCTION IF EXISTS public.authenticate_carrier_partner(TEXT, TEXT);

-- Create function using the extensions schema for crypt
CREATE OR REPLACE FUNCTION public.authenticate_carrier_partner(p_email TEXT, p_password TEXT)
RETURNS TABLE(id UUID, email VARCHAR, company_name VARCHAR, cnpj VARCHAR, contact_name VARCHAR, phone VARCHAR, status VARCHAR, logo_url TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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
    AND cp.password_hash = extensions.crypt(p_password, cp.password_hash)
    AND cp.status = 'active';
END;
$$;