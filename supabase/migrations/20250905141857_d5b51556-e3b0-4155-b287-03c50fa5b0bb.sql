-- Atualizar função generate_tracking_code para usar formato ID ao invés de TRK-
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a tracking code in format ID followed by YYYY and 6 random characters
    code := 'ID' || EXTRACT(YEAR FROM NOW()) || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    
    -- Check if this code already exists
    SELECT EXISTS(SELECT 1 FROM public.shipments WHERE tracking_code = code) INTO exists_check;
    
    -- If it doesn't exist, break the loop
    IF NOT exists_check THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN code;
END;
$$;